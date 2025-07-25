import {
  getSwarmConfig,
  getSwarmDifficultyIndicator,
  type SwarmDifficultyConfig,
} from "../config/SwarmConfig";
import { Player } from "./Player";

interface Point {
  x: number;
  y: number;
}

interface Wall {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface SwarmContext {
  deltaTime: number;
  players: Map<string, Player>;
  swarmMembers: Map<string, SwarmAI>;
  worldWidth: number;
  worldHeight: number;
  walls: Wall[];
  checkWallCollision?: (x: number, y: number, radius: number) => boolean;
  closestPlayer?: Player;
  distanceToPlayer: number;
  currentTime: number;
}

/**
 * SwarmAI - Small, fast, aggressive AI enemies that hunt in packs
 * - Small size (radius 8-12)
 * - High speed (1.5-2x normal player speed)
 * - Low health (5 HP)
 * - Rush behavior - charges directly at players
 * - Swarm intelligence - groups together and coordinates attacks
 * - No health bars or names displayed
 * - Damage scales with AI level (base 5 damage)
 */
export class SwarmAI extends Player {
  private difficulty: string = "MEDIUM";
  private settings: SwarmDifficultyConfig;
  public lastAttackTime: number = 0; // Made public for server access
  private attackCooldown: number = 1000; // Will be overridden by config
  private rushSpeed: number;
  private detectionRange: number;
  private attackRange: number;
  private baseAttackDamage: number = 5;

  // Swarm behavior properties
  private swarmCenter: Point = { x: 0, y: 0 };
  private separationRadius: number = 30; // Minimum distance from other swarm members
  private cohesionRadius: number = 100; // Distance to maintain group cohesion
  private alignmentRadius: number = 80; // Distance for velocity alignment

  // Target tracking
  private currentTarget: Player | null = null;
  private lastTargetUpdate: number = 0;
  private targetUpdateInterval: number = 200; // Update target every 200ms

  // Base patrol properties
  public baseId: string | null = null; // ID of the base this swarm belongs to
  public baseX: number = 0; // Base position for patrolling
  public baseY: number = 0;
  public patrolRadius: number = 150; // Patrol around base
  public patrolAngle: number = Math.random() * Math.PI * 2; // Random starting angle
  public patrolSpeed: number = 0.02; // Speed of patrol rotation
  public isPatrolling: boolean = true; // Whether currently patrolling or attacking

  // Movement properties
  private velocityX: number = 0;
  private velocityY: number = 0;
  private maxAcceleration: number = 0.3; // Reduced from 0.8 for smoother movement
  private rushMode: boolean = false;
  private rushStartTime: number = 0;
  private rushDuration: number = 2000; // 2 seconds of rushing
  private wasInAttackRange: boolean = false; // Track if we were in attack range last frame

  static getDifficultyIndicator(difficulty: string): string {
    return getSwarmDifficultyIndicator(difficulty);
  }

  constructor(
    id: string,
    x: number,
    y: number,
    difficulty: string = "MEDIUM",
    color: string = "#cc2244", // Darker red for aggressive appearance
    baseId?: string,
    baseX?: number,
    baseY?: number
  ) {
    const swarmConfig = getSwarmConfig(difficulty);

    // Use swarm-specific configuration
    const swarmName = SwarmAI.getDifficultyIndicator(difficulty);

    super(id, swarmName, x, y, color, swarmConfig.health, swarmConfig.speed);

    this.difficulty = difficulty;
    this.settings = swarmConfig;
    this.radius = swarmConfig.radius;
    this.maxHealth = swarmConfig.health;
    this.rushSpeed = swarmConfig.rushSpeed;

    // Use config values
    this.detectionRange = swarmConfig.detectionRange;
    this.attackRange = swarmConfig.attackRange;
    this.baseAttackDamage = swarmConfig.damage;

    // Set up base patrol if base info provided
    if (baseId && baseX !== undefined && baseY !== undefined) {
      this.setupBasePatrol(baseId, baseX, baseY);
    }
    this.attackCooldown = swarmConfig.attackCooldown;

    // Swarm behavior properties from config
    this.separationRadius = swarmConfig.separationRadius;
    this.cohesionRadius = swarmConfig.cohesionRadius;
    this.alignmentRadius = swarmConfig.alignmentRadius;
    this.maxAcceleration = swarmConfig.maxAcceleration;
    this.rushDuration = swarmConfig.rushDuration;

    // No weapon upgrades for swarm AI - they use melee attacks
    this.laserUpgradeLevel = 0;
    this.missileUpgradeLevel = 0;

    // Note: Visual properties (no health bars, no names) will be handled in rendering
  }

  /**
   * Set up base patrol behavior
   */
  setupBasePatrol(
    baseId: string,
    baseX: number,
    baseY: number,
    patrolRadius?: number
  ): void {
    this.baseId = baseId;
    this.baseX = baseX;
    this.baseY = baseY;
    this.isPatrolling = true;

    // Use provided patrol radius or keep default
    if (patrolRadius !== undefined) {
      this.patrolRadius = patrolRadius;
    }

    // Start at a random position around the base
    const angle = Math.random() * Math.PI * 2;
    const distance = this.patrolRadius * 0.7;
    this.x = baseX + Math.cos(angle) * distance;
    this.y = baseY + Math.sin(angle) * distance;
    this.patrolAngle = angle;
  }

  /**
   * Get patrol target position
   */
  getPatrolTarget(): { x: number; y: number } {
    this.patrolAngle += this.patrolSpeed;
    const distance = this.patrolRadius * 0.7;
    return {
      x: this.baseX + Math.cos(this.patrolAngle) * distance,
      y: this.baseY + Math.sin(this.patrolAngle) * distance,
    };
  }

  /**
   * Check if swarm should return to patrol (player moved away)
   */
  shouldReturnToPatrol(context: SwarmContext): boolean {
    if (!this.baseId) return false; // No base to patrol
    if (!this.currentTarget) return true; // No target, should patrol

    // Return to patrol if target is too far from base
    // Use detection range instead of patrol radius for chase distance
    const dx = this.currentTarget.x - this.baseX;
    const dy = this.currentTarget.y - this.baseY;
    const distanceFromBase = Math.sqrt(dx * dx + dy * dy);

    // Allow chasing up to 1.2x detection range from base (800px * 1.2 = 960px)
    return distanceFromBase > this.detectionRange * 1.2;
  }

  /**
   * Main update method for swarm AI behavior
   */
  update(context: SwarmContext): void {
    const currentTime = context.currentTime;

    // Debug logging every 5 seconds for debugging chase issues
    if (currentTime % 5000 < 50) {
      const playerCount = context.players.size;
      const hasPlayer = !!context.closestPlayer;
      const playerName = context.closestPlayer?.name || "none";
      const playerPos = context.closestPlayer
        ? `(${context.closestPlayer.x.toFixed(1)}, ${context.closestPlayer.y.toFixed(1)})`
        : "none";

      console.log(
        `[SWARM DEBUG] ${this.id}: pos=(${this.x.toFixed(1)}, ${this.y.toFixed(1)}), players=${playerCount}, closestPlayer=${playerName} at ${playerPos}, distanceToPlayer=${context.distanceToPlayer.toFixed(1)}, detectionRange=${this.detectionRange}, hasTarget=${!!this.currentTarget}, rushMode=${this.rushMode}, isPatrolling=${this.isPatrolling}, baseId=${this.baseId}`
      );
    }

    // Update target periodically
    if (currentTime - this.lastTargetUpdate > this.targetUpdateInterval) {
      this.updateTarget(context);
      this.lastTargetUpdate = currentTime;
    }

    // Check if any player is within detection range
    const hasNearbyPlayer =
      context.distanceToPlayer < this.detectionRange &&
      context.closestPlayer &&
      context.closestPlayer.health > 0;

    // Base patrol logic
    if (this.baseId) {
      if (hasNearbyPlayer && !this.shouldReturnToPatrol(context)) {
        // Switch to attack mode
        this.isPatrolling = false;
        this.currentTarget = context.closestPlayer;
      } else {
        // Switch to patrol mode
        this.isPatrolling = true;
        this.currentTarget = null;
      }
    } else {
      // No base - use original swarm behavior
      if (hasNearbyPlayer) {
        this.currentTarget = context.closestPlayer;
      } else {
        this.currentTarget = null;
      }
    }

    // Calculate movement forces based on current behavior
    let totalForceX = 0;
    let totalForceY = 0;

    if (this.isPatrolling && this.baseId) {
      // Patrol around base
      const patrolTarget = this.getPatrolTarget();
      const dx = patrolTarget.x - this.x;
      const dy = patrolTarget.y - this.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance > 0) {
        totalForceX = (dx / distance) * 0.5; // Gentle patrol movement
        totalForceY = (dy / distance) * 0.5;
      }

      // Add wall avoidance for patrol
      const wallAvoidanceForce = this.calculateWallAvoidanceForce(context);
      totalForceX += wallAvoidanceForce.x * 2; // Higher priority for walls
      totalForceY += wallAvoidanceForce.y * 2;
    } else {
      // Attack behavior - use original swarm logic
      const swarmForces = this.calculateSwarmForces(context);
      const huntForce = this.calculateHuntForce(context);
      const wallAvoidanceForce = this.calculateWallAvoidanceForce(context);

      // Combine forces with different weights
      const hasNearbyPlayer =
        context.distanceToPlayer < this.detectionRange &&
        context.closestPlayer &&
        context.closestPlayer.health > 0;

      if (hasNearbyPlayer) {
        // Enter rush mode immediately when detecting a player
        if (!this.rushMode) {
          this.enterRushMode(currentTime);
        }

        // AGGRESSIVE BITING BEHAVIOR - Direct charge at player
        const distanceToTarget = context.distanceToPlayer;
        const attackRange = this.attackRange;

        if (distanceToTarget > attackRange) {
          // CHARGE PHASE: When far from target, charge directly with maximum force
          this.wasInAttackRange = false;

          const huntingForceMultiplier = this.rushMode ? 5.0 : 3.0;
          totalForceX +=
            huntForce.x * this.settings.huntingForce * huntingForceMultiplier;
          totalForceY +=
            huntForce.y * this.settings.huntingForce * huntingForceMultiplier;

          // Add wall avoidance force with high priority during charge
          totalForceX += wallAvoidanceForce.x * 2.0;
          totalForceY += wallAvoidanceForce.y * 2.0;

          // Minimal swarm forces to prevent interference with charge
          const swarmForceReduction = 0.1;
          totalForceX +=
            swarmForces.separation.x *
            this.settings.separationForce *
            swarmForceReduction;
          totalForceY +=
            swarmForces.separation.y *
            this.settings.separationForce *
            swarmForceReduction;
        } else {
          // BITE PHASE: When in attack range, use "biting" pattern
          const biteForceMultiplier = this.rushMode ? 4.0 : 2.5;

          if (!this.wasInAttackRange) {
            this.lastAttackTime = 0;
          }
          this.wasInAttackRange = true;

          // Add some randomness to create erratic "biting" movement
          const biteRandomness = 0.3;
          const randomAngle = (Math.random() - 0.5) * biteRandomness;
          const biteAngle = Math.atan2(huntForce.y, huntForce.x) + randomAngle;

          totalForceX +=
            Math.cos(biteAngle) *
            this.settings.huntingForce *
            biteForceMultiplier;
          totalForceY +=
            Math.sin(biteAngle) *
            this.settings.huntingForce *
            biteForceMultiplier;

          // Add wall avoidance force during biting
          totalForceX += wallAvoidanceForce.x * 1.0;
          totalForceY += wallAvoidanceForce.y * 1.0;

          // Reduce cohesion to prevent orbiting behavior
          totalForceX +=
            swarmForces.separation.x * this.settings.separationForce * 0.8;
          totalForceY +=
            swarmForces.separation.y * this.settings.separationForce * 0.8;
        }
      } else {
        // Swarm behavior - stay together and patrol
        this.wasInAttackRange = false;

        totalForceX +=
          swarmForces.separation.x * (this.settings.separationForce * 1.2);
        totalForceY +=
          swarmForces.separation.y * (this.settings.separationForce * 1.2);
        totalForceX +=
          swarmForces.cohesion.x * (this.settings.cohesionForce * 1.5);
        totalForceY +=
          swarmForces.cohesion.y * (this.settings.cohesionForce * 1.5);
        totalForceX += swarmForces.alignment.x * this.settings.alignmentForce;
        totalForceY += swarmForces.alignment.y * this.settings.alignmentForce;

        // Add wall avoidance during patrol mode
        totalForceX += wallAvoidanceForce.x * 1.5;
        totalForceY += wallAvoidanceForce.y * 1.5;

        this.rushMode = false;
      }
    }

    // Apply movement
    this.applyMovement(totalForceX, totalForceY, context);

    // Handle rush mode timeout
    if (
      this.rushMode &&
      currentTime - this.rushStartTime > this.settings.rushDuration
    ) {
      this.rushMode = false;
    }
  }

  /**
   * Find and update the current target player
   */
  private updateTarget(context: SwarmContext): void {
    let closestPlayer: Player | null = null;
    let closestDistance = Infinity;

    context.players.forEach((player) => {
      if (player.health <= 0) return; // Skip dead players

      const distance = Math.sqrt(
        Math.pow(player.x - this.x, 2) + Math.pow(player.y - this.y, 2)
      );

      if (distance < this.detectionRange && distance < closestDistance) {
        closestDistance = distance;
        closestPlayer = player;
      }
    });

    this.currentTarget = closestPlayer;
  }

  /**
   * Calculate swarm intelligence forces (separation, cohesion, alignment)
   */
  private calculateSwarmForces(context: SwarmContext): {
    separation: Point;
    cohesion: Point;
    alignment: Point;
  } {
    let separationX = 0,
      separationY = 0;
    let cohesionX = 0,
      cohesionY = 0;
    let alignmentX = 0,
      alignmentY = 0;
    let separationCount = 0;
    let cohesionCount = 0;
    let alignmentCount = 0;

    context.swarmMembers.forEach((member) => {
      if (member.id === this.id) return; // Skip self

      const distance = Math.sqrt(
        Math.pow(member.x - this.x, 2) + Math.pow(member.y - this.y, 2)
      );

      // Separation - avoid getting too close
      if (distance < this.separationRadius && distance > 0) {
        const separationForce = this.separationRadius / distance;
        separationX += (this.x - member.x) * separationForce;
        separationY += (this.y - member.y) * separationForce;
        separationCount++;
      }

      // Cohesion - move toward group center
      if (distance < this.cohesionRadius) {
        cohesionX += member.x;
        cohesionY += member.y;
        cohesionCount++;
      }

      // Alignment - match group velocity
      if (distance < this.alignmentRadius) {
        alignmentX += member.velocityX;
        alignmentY += member.velocityY;
        alignmentCount++;
      }
    });

    // Normalize forces
    if (separationCount > 0) {
      separationX /= separationCount;
      separationY /= separationCount;
    }

    if (cohesionCount > 0) {
      cohesionX = cohesionX / cohesionCount - this.x;
      cohesionY = cohesionY / cohesionCount - this.y;
    }

    if (alignmentCount > 0) {
      alignmentX /= alignmentCount;
      alignmentY /= alignmentCount;
    }

    return {
      separation: { x: separationX, y: separationY },
      cohesion: { x: cohesionX, y: cohesionY },
      alignment: { x: alignmentX, y: alignmentY },
    };
  }

  /**
   * Calculate hunting force toward target player
   */
  private calculateHuntForce(context: SwarmContext): Point {
    if (!this.currentTarget) {
      return { x: 0, y: 0 };
    }

    const deltaX = this.currentTarget.x - this.x;
    const deltaY = this.currentTarget.y - this.y;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    if (distance === 0) return { x: 0, y: 0 };

    // Normalize and apply hunting force using config values
    const huntingStrength = this.rushMode
      ? this.settings.rushHuntingForce
      : this.settings.huntingForce;
    return {
      x: (deltaX / distance) * huntingStrength,
      y: (deltaY / distance) * huntingStrength,
    };
  }

  /**
   * Calculate wall avoidance force to navigate around obstacles
   */
  private calculateWallAvoidanceForce(context: SwarmContext): Point {
    if (!context.walls || !context.checkWallCollision) {
      return { x: 0, y: 0 };
    }

    let avoidanceX = 0;
    let avoidanceY = 0;
    const lookAheadDistance = 60; // How far ahead to look for walls
    const avoidanceStrength = 2.0; // How strong the avoidance force is

    // Check multiple directions around the swarm for walls
    const checkDirections = [
      { angle: 0, weight: 1.0 }, // Forward
      { angle: Math.PI / 4, weight: 0.8 }, // Forward-right
      { angle: -Math.PI / 4, weight: 0.8 }, // Forward-left
      { angle: Math.PI / 2, weight: 0.6 }, // Right
      { angle: -Math.PI / 2, weight: 0.6 }, // Left
    ];

    checkDirections.forEach(({ angle, weight }) => {
      const checkX = this.x + Math.cos(this.angle + angle) * lookAheadDistance;
      const checkY = this.y + Math.sin(this.angle + angle) * lookAheadDistance;

      if (context.checkWallCollision(checkX, checkY, this.radius)) {
        // Found a wall in this direction, apply avoidance force
        const avoidAngle = this.angle + angle + Math.PI; // Opposite direction
        avoidanceX += Math.cos(avoidAngle) * avoidanceStrength * weight;
        avoidanceY += Math.sin(avoidAngle) * avoidanceStrength * weight;
      }
    });

    // Also check for walls directly around the swarm
    context.walls.forEach((wall) => {
      const wallCenterX = wall.x + wall.width / 2;
      const wallCenterY = wall.y + wall.height / 2;
      const distanceToWall = Math.sqrt(
        Math.pow(wallCenterX - this.x, 2) + Math.pow(wallCenterY - this.y, 2)
      );

      // If close to a wall, add strong avoidance force
      if (distanceToWall < 80) {
        const avoidanceDistance = 80 - distanceToWall;
        const avoidanceForce = (avoidanceDistance / 80) * avoidanceStrength * 2;
        const avoidAngleFromWall = Math.atan2(
          this.y - wallCenterY,
          this.x - wallCenterX
        );

        avoidanceX += Math.cos(avoidAngleFromWall) * avoidanceForce;
        avoidanceY += Math.sin(avoidAngleFromWall) * avoidanceForce;
      }
    });

    return { x: avoidanceX, y: avoidanceY };
  }

  /**
   * Apply movement forces to velocity and position
   */
  private applyMovement(
    forceX: number,
    forceY: number,
    context: SwarmContext
  ): void {
    // Simplified acceleration - much more responsive
    const deltaTimeSeconds = context.deltaTime / 1000; // Convert to seconds
    const accelerationMultiplier = this.rushMode ? 2.0 : 1.5; // Extra acceleration when rushing

    this.velocityX +=
      forceX * this.settings.maxAcceleration * accelerationMultiplier;
    this.velocityY +=
      forceY * this.settings.maxAcceleration * accelerationMultiplier;

    // Apply light dampening to prevent jittery movement
    const dampening = 0.98;
    this.velocityX *= dampening;
    this.velocityY *= dampening;

    // Limit velocity to configured speed
    const currentSpeed = this.rushMode ? this.rushSpeed : this.speed;
    const velocityMagnitude = Math.sqrt(
      this.velocityX * this.velocityX + this.velocityY * this.velocityY
    );

    if (velocityMagnitude > currentSpeed) {
      this.velocityX = (this.velocityX / velocityMagnitude) * currentSpeed;
      this.velocityY = (this.velocityY / velocityMagnitude) * currentSpeed;
    }

    // Calculate new position - direct velocity application for responsive movement
    const newX = this.x + this.velocityX * deltaTimeSeconds;
    const newY = this.y + this.velocityY * deltaTimeSeconds;

    // Check wall collisions
    if (
      context.checkWallCollision &&
      !context.checkWallCollision(newX, newY, this.radius)
    ) {
      this.x = newX;
      this.y = newY;
    } else {
      // Bounce off walls
      if (
        context.checkWallCollision &&
        context.checkWallCollision(newX, this.y, this.radius)
      ) {
        this.velocityX *= -0.5;
      }
      if (
        context.checkWallCollision &&
        context.checkWallCollision(this.x, newY, this.radius)
      ) {
        this.velocityY *= -0.5;
      }
    }

    // Keep within world bounds
    this.x = Math.max(
      this.radius,
      Math.min(context.worldWidth - this.radius, this.x)
    );
    this.y = Math.max(
      this.radius,
      Math.min(context.worldHeight - this.radius, this.y)
    );

    // Update angle based on movement direction
    if (this.velocityX !== 0 || this.velocityY !== 0) {
      this.angle = Math.atan2(this.velocityY, this.velocityX);
    }
  }

  /**
   * Enter rush mode for aggressive attack
   */
  private enterRushMode(currentTime: number): void {
    this.rushMode = true;
    this.rushStartTime = currentTime;
  }

  /**
   * Try to attack the target if in range - DEPRECATED
   * This method is no longer used as attacks are handled entirely by the server
   */
  private tryAttack(context: SwarmContext): void {
    // DEPRECATED: All attack logic is now handled by the server in game.gateway.ts
    // This method is kept for reference but should not be called
    // The server handles attack timing, damage calculation, and cooldowns
  }

  /**
   * Calculate attack damage based on difficulty level
   */
  public calculateAttackDamage(): number {
    return this.baseAttackDamage;
  }

  /**
   * Get attack cooldown for server-side timing
   */
  public getAttackCooldown(): number {
    return this.settings.attackCooldown;
  }

  /**
   * Get current rush mode status for visual effects
   */
  public isInRushMode(): boolean {
    return this.rushMode;
  }

  /**
   * Get current target for debugging/visualization
   */
  public getCurrentTarget(): Player | null {
    return this.currentTarget;
  }

  /**
   * Get attack range for server-side collision detection
   */
  public getAttackRange(): number {
    return this.attackRange;
  }

  /**
   * Override to prevent swarm AI from using weapons
   */
  public canShoot(): boolean {
    return false; // Swarm AI uses melee attacks only
  }
}
