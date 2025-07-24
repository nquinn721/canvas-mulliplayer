import { Player } from "./Player";
import { getAIConfig, type AIDifficultyConfig } from "../config/AIConfig";

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
  private settings: AIDifficultyConfig;
  private lastAttackTime: number = 0;
  private attackCooldown: number = 1000; // 1 second between attacks
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
  
  // Movement properties
  private velocityX: number = 0;
  private velocityY: number = 0;
  private maxAcceleration: number = 0.8;
  private rushMode: boolean = false;
  private rushStartTime: number = 0;
  private rushDuration: number = 2000; // 2 seconds of rushing

  static getDifficultyIndicator(difficulty: string): string {
    switch (difficulty.toUpperCase()) {
      case "EASY":
        return "Drone-E";
      case "MEDIUM":
        return "Drone-M";
      case "HARD":
        return "Drone-H";
      case "EXPERT":
        return "Drone-X";
      case "NIGHTMARE":
        return "Drone-N";
      default:
        return "Drone-M";
    }
  }

  constructor(
    id: string,
    x: number,
    y: number,
    difficulty: string = "MEDIUM",
    color: string = "#cc2244" // Darker red for aggressive appearance
  ) {
    const aiConfig = getAIConfig(difficulty);
    
    // Override some properties for swarm characteristics
    const swarmName = SwarmAI.getDifficultyIndicator(difficulty);
    
    // Swarm AI has different stats than regular AI
    const swarmHealth = 5; // Always 5 HP regardless of difficulty
    const swarmRadius = 8 + (aiConfig.radius - 15) * 0.3; // Smaller than regular AI (8-12 radius)
    const swarmSpeed = aiConfig.speed * 1.8; // 80% faster than regular AI
    
    super(id, swarmName, x, y, color, swarmHealth, swarmSpeed);

    this.difficulty = difficulty;
    this.settings = aiConfig;
    this.radius = Math.max(8, Math.min(12, swarmRadius)); // Clamp between 8-12
    this.maxHealth = swarmHealth;
    this.rushSpeed = swarmSpeed * 1.4; // Even faster when rushing
    
    // Scale properties with difficulty
    this.detectionRange = 150 + (aiConfig.detectionRange - 200) * 0.5; // Shorter detection range
    this.attackRange = 15 + this.radius; // Close combat range
    this.baseAttackDamage = 5 + Math.floor(difficulty === "EASY" ? 0 : 
                                         difficulty === "MEDIUM" ? 1 :
                                         difficulty === "HARD" ? 2 :
                                         difficulty === "EXPERT" ? 3 : 4);
    
    // No weapon upgrades for swarm AI - they use melee attacks
    this.laserUpgradeLevel = 0;
    this.missileUpgradeLevel = 0;
    
    // Note: Visual properties (no health bars, no names) will be handled in rendering
  }

  /**
   * Main update method for swarm AI behavior
   */
  update(context: SwarmContext): void {
    const currentTime = context.currentTime;
    
    // Update target periodically
    if (currentTime - this.lastTargetUpdate > this.targetUpdateInterval) {
      this.updateTarget(context);
      this.lastTargetUpdate = currentTime;
    }
    
    // Calculate swarm behaviors
    const swarmForces = this.calculateSwarmForces(context);
    const huntForce = this.calculateHuntForce(context);
    
    // Combine forces with different weights
    let totalForceX = 0;
    let totalForceY = 0;
    
    if (this.currentTarget && context.distanceToPlayer < this.detectionRange) {
      // Hunting mode - prioritize chasing player
      totalForceX += huntForce.x * 0.7;
      totalForceY += huntForce.y * 0.7;
      
      // Add swarm forces for coordination
      totalForceX += swarmForces.separation.x * 0.4;
      totalForceY += swarmForces.separation.y * 0.4;
      totalForceX += swarmForces.cohesion.x * 0.1;
      totalForceY += swarmForces.cohesion.y * 0.1;
      totalForceX += swarmForces.alignment.x * 0.2;
      totalForceY += swarmForces.alignment.y * 0.2;
      
      // Check if we should enter rush mode
      if (context.distanceToPlayer < 60 && !this.rushMode) {
        this.enterRushMode(currentTime);
      }
    } else {
      // Swarm behavior - stay together and patrol
      totalForceX += swarmForces.separation.x * 0.6;
      totalForceY += swarmForces.separation.y * 0.6;
      totalForceX += swarmForces.cohesion.x * 0.3;
      totalForceY += swarmForces.cohesion.y * 0.3;
      totalForceX += swarmForces.alignment.x * 0.1;
      totalForceY += swarmForces.alignment.y * 0.1;
      
      this.rushMode = false;
    }
    
    // Apply movement
    this.applyMovement(totalForceX, totalForceY, context);
    
    // Try to attack if in range
    this.tryAttack(context);
    
    // Handle rush mode timeout
    if (this.rushMode && currentTime - this.rushStartTime > this.rushDuration) {
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
    let separationX = 0, separationY = 0;
    let cohesionX = 0, cohesionY = 0;
    let alignmentX = 0, alignmentY = 0;
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
      alignment: { x: alignmentX, y: alignmentY }
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
    
    // Normalize and apply hunting force
    const huntingStrength = this.rushMode ? 2.0 : 1.0;
    return {
      x: (deltaX / distance) * huntingStrength,
      y: (deltaY / distance) * huntingStrength
    };
  }

  /**
   * Apply movement forces to velocity and position
   */
  private applyMovement(forceX: number, forceY: number, context: SwarmContext): void {
    // Apply acceleration
    this.velocityX += forceX * this.maxAcceleration * context.deltaTime;
    this.velocityY += forceY * this.maxAcceleration * context.deltaTime;
    
    // Limit velocity
    const currentSpeed = this.rushMode ? this.rushSpeed : this.speed;
    const velocityMagnitude = Math.sqrt(this.velocityX * this.velocityX + this.velocityY * this.velocityY);
    
    if (velocityMagnitude > currentSpeed) {
      this.velocityX = (this.velocityX / velocityMagnitude) * currentSpeed;
      this.velocityY = (this.velocityY / velocityMagnitude) * currentSpeed;
    }
    
    // Calculate new position
    const newX = this.x + this.velocityX * context.deltaTime;
    const newY = this.y + this.velocityY * context.deltaTime;
    
    // Check wall collisions
    if (context.checkWallCollision && !context.checkWallCollision(newX, newY, this.radius)) {
      this.x = newX;
      this.y = newY;
    } else {
      // Bounce off walls
      if (context.checkWallCollision && context.checkWallCollision(newX, this.y, this.radius)) {
        this.velocityX *= -0.5;
      }
      if (context.checkWallCollision && context.checkWallCollision(this.x, newY, this.radius)) {
        this.velocityY *= -0.5;
      }
    }
    
    // Keep within world bounds
    this.x = Math.max(this.radius, Math.min(context.worldWidth - this.radius, this.x));
    this.y = Math.max(this.radius, Math.min(context.worldHeight - this.radius, this.y));
    
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
   * Try to attack the target if in range
   */
  private tryAttack(context: SwarmContext): void {
    if (!this.currentTarget || context.currentTime - this.lastAttackTime < this.attackCooldown) {
      return;
    }
    
    const distance = Math.sqrt(
      Math.pow(this.currentTarget.x - this.x, 2) + Math.pow(this.currentTarget.y - this.y, 2)
    );
    
    if (distance <= this.attackRange) {
      // Perform melee attack
      const damage = this.calculateAttackDamage();
      
      // Note: In actual implementation, this would be handled by the game server
      // This is just for the AI logic calculation
      this.lastAttackTime = context.currentTime;
      
      // TODO: Emit attack event to game server
      // server.emit('swarmAttack', { attackerId: this.id, targetId: this.currentTarget.id, damage });
    }
  }

  /**
   * Calculate attack damage based on difficulty level
   */
  public calculateAttackDamage(): number {
    return this.baseAttackDamage;
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
   * Override to prevent swarm AI from using weapons
   */
  public canShoot(): boolean {
    return false; // Swarm AI uses melee attacks only
  }
}
