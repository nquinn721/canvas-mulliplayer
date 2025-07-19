import { Player } from "./Player";

export class AIEnemy extends Player {
  private lastShootTime: number = 0;
  private shootCooldown: number = 3000; // 3 seconds between shots
  private detectionRange: number = 400; // Range to detect and shoot at players
  private changeDirectionTime: number = 0;
  private directionChangeInterval: number = 2000; // Change direction every 2 seconds
  private currentMoveAngle: number = 0;
  private aggroTarget: string | null = null; // Current target player ID
  private aggroRange: number = 500; // Range to become aggressive
  private patrolRadius: number = 300; // Distance to patrol around spawn point
  private spawnX: number;
  private spawnY: number;

  constructor(
    id: string,
    x: number,
    y: number,
    color: string = "#ff4444" // Red color for AI enemies
  ) {
    super(id, "AI_Bot", x, y, color, 100, 200); // Same health and speed as players

    // Set AI-specific properties
    this.spawnX = x;
    this.spawnY = y;
    this.currentMoveAngle = Math.random() * Math.PI * 2; // Random initial direction
    this.laserUpgradeLevel = 1; // Start at base level like players
    this.missileUpgradeLevel = 1;

    // Make AI slightly different visually
    this.radius = 18; // Slightly larger than regular players
  }

  // Update AI behavior
  updateAI(
    deltaTime: number,
    players: Map<string, Player>,
    worldWidth: number,
    worldHeight: number,
    checkWallCollision?: (x: number, y: number, radius: number) => boolean,
    powerUps?: Map<string, any>
  ): void {
    const currentTime = Date.now();

    // Find closest player for targeting
    const closestPlayer = this.findClosestPlayer(players);

    if (closestPlayer) {
      const distanceToPlayer = this.getDistanceTo(
        closestPlayer.x,
        closestPlayer.y
      );

      // Set aggro target if player is within aggro range
      if (distanceToPlayer <= this.aggroRange) {
        this.aggroTarget = closestPlayer.id;
      } else if (distanceToPlayer > this.aggroRange * 1.5) {
        // Clear aggro if player moves too far away
        this.aggroTarget = null;
      }

      // Shooting behavior
      if (
        distanceToPlayer <= this.detectionRange &&
        currentTime - this.lastShootTime >= this.shootCooldown
      ) {
        this.shootAtPlayer(closestPlayer);
        this.lastShootTime = currentTime;
      }
    }

    // Movement behavior
    this.updateMovement(
      deltaTime,
      players,
      worldWidth,
      worldHeight,
      currentTime,
      checkWallCollision,
      powerUps
    );
  }

  private findClosestPlayer(players: Map<string, Player>): Player | null {
    let closestPlayer: Player | null = null;
    let closestDistance = Infinity;

    players.forEach((player) => {
      // Skip AI enemies (they shouldn't target each other)
      if (player instanceof AIEnemy) return;

      const distance = this.getDistanceTo(player.x, player.y);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestPlayer = player;
      }
    });

    return closestPlayer;
  }

  private shootAtPlayer(
    target: Player
  ): { weapon: "laser" | "missile"; angle: number } | null {
    // Calculate angle to target
    const angle = Math.atan2(target.y - this.y, target.x - this.x);

    // Choose weapon based on distance and random chance
    const distanceToTarget = this.getDistanceTo(target.x, target.y);
    const weapon =
      distanceToTarget > 250 && Math.random() < 0.3 ? "missile" : "laser";

    // Update AI's facing angle
    this.angle = angle;

    return { weapon, angle };
  }

  private updateMovement(
    deltaTime: number,
    players: Map<string, Player>,
    worldWidth: number,
    worldHeight: number,
    currentTime: number,
    checkWallCollision?: (x: number, y: number, radius: number) => boolean,
    powerUps?: Map<string, any>
  ): void {
    const deltaTimeSeconds = deltaTime / 1000;

    // Change direction periodically
    if (
      currentTime - this.changeDirectionTime >=
      this.directionChangeInterval
    ) {
      this.changeDirection(players, powerUps);
      this.changeDirectionTime = currentTime;
    }

    // AI boost logic - only use boost when it's full and in combat
    const shouldUseBoost =
      this.boostEnergy >= this.maxBoostEnergy && this.aggroTarget;

    if (shouldUseBoost && this.canUseBoost()) {
      this.activateBoost();
    } else {
      this.deactivateBoost();
    }

    // Update boost energy
    this.updateBoostEnergy(deltaTime);

    // Calculate move speed with boost multiplier (reduced from player speed for AI)
    const baseSpeed = this.speed * (deltaTime / 1000);
    const boostMultiplier = this.isBoostActive ? 2.5 : 1.0;
    const aiSpeedReduction = 0.6; // AI moves at 60% of player speed to account for continuous movement
    const moveSpeed = baseSpeed * boostMultiplier * aiSpeedReduction;

    // Move in current direction
    const moveX = Math.cos(this.currentMoveAngle) * moveSpeed;
    const moveY = Math.sin(this.currentMoveAngle) * moveSpeed;

    // Check patrol radius before moving
    const newX = this.x + moveX;
    const newY = this.y + moveY;
    const distanceFromSpawn = Math.sqrt(
      (newX - this.spawnX) ** 2 + (newY - this.spawnY) ** 2
    );

    // Only move if within patrol radius, otherwise turn around
    if (distanceFromSpawn <= this.patrolRadius) {
      // Use the same updatePosition method as human players for wall collision
      this.updatePosition(
        moveX,
        moveY,
        worldWidth,
        worldHeight,
        checkWallCollision
      );
    } else {
      // Turn around if hitting patrol limit
      this.currentMoveAngle += Math.PI + (Math.random() - 0.5) * 0.5; // Add some randomness
    }

    // Face movement direction when not aggressive
    if (!this.aggroTarget) {
      this.angle = this.currentMoveAngle;
    }
  }

  private changeDirection(
    players: Map<string, Player>,
    powerUps?: Map<string, any>
  ): void {
    if (this.aggroTarget) {
      // Move towards or around the target player
      const target = this.findPlayerById(players, this.aggroTarget);
      if (target) {
        const angleToTarget = Math.atan2(target.y - this.y, target.x - this.x);
        const distance = this.getDistanceTo(target.x, target.y);

        if (distance > 200) {
          // Move towards target
          this.currentMoveAngle = angleToTarget + (Math.random() - 0.5) * 0.3;
        } else {
          // Circle around target
          this.currentMoveAngle =
            angleToTarget + Math.PI / 2 + (Math.random() - 0.5) * 0.5;
        }
      }
    } else {
      // Look for nearby power-ups when not in combat
      let targetPowerUp: any = null;
      let closestPowerUpDistance = Infinity;

      if (powerUps) {
        powerUps.forEach((powerUp) => {
          if (powerUp.collected) return;

          const distance = this.getDistanceTo(powerUp.x, powerUp.y);
          if (distance < closestPowerUpDistance && distance < 200) {
            // Within 200 units
            closestPowerUpDistance = distance;
            targetPowerUp = powerUp;
          }
        });
      }

      if (targetPowerUp) {
        // Move towards power-up
        const angleToTarget = Math.atan2(
          targetPowerUp.y - this.y,
          targetPowerUp.x - this.x
        );
        this.currentMoveAngle = angleToTarget + (Math.random() - 0.5) * 0.2;
      } else {
        // Random patrol movement
        this.currentMoveAngle += (Math.random() - 0.5) * Math.PI; // Random direction change
      }
    }
  }

  // Override updatePosition to handle wall collisions for AI
  updatePosition(
    deltaX: number,
    deltaY: number,
    worldWidth: number,
    worldHeight: number,
    checkWallCollision?: (x: number, y: number, radius: number) => boolean
  ): void {
    const oldX = this.x;
    const oldY = this.y;

    // Call parent updatePosition method
    super.updatePosition(
      deltaX,
      deltaY,
      worldWidth,
      worldHeight,
      checkWallCollision
    );

    // Check if AI didn't move (hit a wall or boundary)
    const actuallyMoved =
      Math.abs(this.x - oldX) > 0.1 || Math.abs(this.y - oldY) > 0.1;

    if (!actuallyMoved && (Math.abs(deltaX) > 0.1 || Math.abs(deltaY) > 0.1)) {
      // AI hit a wall or boundary, turn around
      this.currentMoveAngle += Math.PI + (Math.random() - 0.5) * 0.8; // Turn around with some randomness
    }
  }

  private findPlayerById(
    players: Map<string, Player>,
    playerId: string
  ): Player | null {
    return players.get(playerId) || null;
  }

  // Get AI shooting info for the game loop
  getShootingInfo(): { weapon: "laser" | "missile"; angle: number } | null {
    // This method can be called by the game loop to check if AI wants to shoot
    return null; // Shooting is handled in updateAI method
  }

  // Override serialization to include AI-specific data
  serialize(): any {
    const baseData = super.serialize();
    return {
      ...baseData,
      isAI: true,
      aggroTarget: this.aggroTarget,
    };
  }

  // Create AI enemy from serialized data
  static deserialize(data: any): AIEnemy {
    const ai = new AIEnemy(data.id, data.x, data.y, data.color);

    // Copy all the base player properties
    ai.angle = data.angle;
    ai.health = data.health;
    ai.maxHealth = data.maxHealth;
    ai.radius = data.radius || 18;
    ai.speed = data.speed;
    ai.laserUpgradeLevel = data.laserUpgradeLevel || 2;
    ai.missileUpgradeLevel = data.missileUpgradeLevel || 1;
    ai.aggroTarget = data.aggroTarget;

    return ai;
  }
}
