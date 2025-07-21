// Input interface for player controls
export interface KeyState {
  w: boolean;
  a: boolean;
  s: boolean;
  d: boolean;
  q: boolean;
  e: boolean;
  shift: boolean;
  ArrowUp: boolean;
  ArrowLeft: boolean;
  ArrowDown: boolean;
  ArrowRight: boolean;
}

// Player class that manages all player logic
import {
  POWER_UP_CONFIG,
  getBoostStats,
  getLaserStats,
  getMissileStats,
} from "../config";

export class Player {
  public id: string;
  public name: string;
  public x: number;
  public y: number;
  public angle: number;
  public color: string;
  public health: number;
  public maxHealth: number;
  public speed: number;
  public lastMissileTime: number;
  public radius: number;
  public boostEnergy: number;
  public maxBoostEnergy: number;
  public isBoostActive: boolean;
  public lastBoostRegenTime: number;
  public lastBoostDeactivatedTime: number;
  public boostUpgradeLevel: number;
  public boostUpgradeExpiration: number;
  public laserUpgradeLevel: number;
  public missileUpgradeLevel: number; // Missile upgrade level
  public rollAngle: number;
  public isRolling: boolean;
  public rollDirection: number; // -1 for left, 1 for right, 0 for none
  public lastRollTime: number;
  public rollCooldown: number; // Cooldown duration in milliseconds
  public strafeVelocityX: number; // Current strafe velocity X
  public strafeVelocityY: number; // Current strafe velocity Y
  public strafeDecayRate: number; // How quickly strafe velocity decays
  public shieldHealth: number; // Current shield health points
  public maxShieldHealth: number; // Maximum shield health points
  public shieldExpiration: number; // When the shield expires (timestamp)
  public hasShield: boolean; // Whether player currently has a shield
  public experience: number; // Total experience points
  public level: number; // Player level based on experience
  public flashUpgradeLevel: number; // Flash ability upgrade level
  public lastFlashTime: number; // Last time flash was used
  public flashCooldown: number; // Flash cooldown duration in milliseconds

  constructor(
    id: string,
    name: string,
    x: number,
    y: number,
    color?: string,
    health?: number,
    speed?: number
  ) {
    this.id = id;
    this.name = name;
    this.x = x;
    this.y = y;
    this.angle = 0;
    this.color = color || `hsl(${Math.random() * 360}, 70%, 50%)`;
    this.health = health || 100;
    this.maxHealth = 100;
    this.speed = speed || 200;
    this.lastMissileTime = 0;
    this.radius = 15;
    this.boostEnergy = 100;
    this.maxBoostEnergy = 100;
    this.isBoostActive = false;
    this.lastBoostRegenTime = 0;
    this.lastBoostDeactivatedTime = 0;
    this.boostUpgradeLevel = 0;
    this.boostUpgradeExpiration = 0;
    this.laserUpgradeLevel = 1; // Start at level 1 instead of 0
    this.missileUpgradeLevel = 1; // Start at level 1 instead of 0
    this.rollAngle = 0;
    this.isRolling = false;
    this.rollDirection = 0;
    this.lastRollTime = 0;
    this.rollCooldown = 1500; // 1.5 second cooldown
    this.strafeVelocityX = 0;
    this.strafeVelocityY = 0;
    this.strafeDecayRate = 0.85; // Velocity decays to 85% each frame (smooth deceleration)
    this.shieldHealth = 0;
    this.maxShieldHealth = 100;
    this.shieldExpiration = 0;
    this.hasShield = false;
    this.experience = 0;
    this.level = 1;
    this.flashUpgradeLevel = 1; // Start at level 1
    this.lastFlashTime = 0;
    this.flashCooldown = 5000; // 5 second cooldown
  }

  // Update player position with bounds checking
  updatePosition(
    deltaX: number,
    deltaY: number,
    worldWidth: number,
    worldHeight: number,
    checkWallCollision?: (x: number, y: number, radius: number) => boolean
  ): void {
    const newX = Math.max(
      this.radius,
      Math.min(worldWidth - this.radius, this.x + deltaX)
    );
    const newY = Math.max(
      this.radius,
      Math.min(worldHeight - this.radius, this.y + deltaY)
    );

    // Check wall collisions if collision function is provided
    if (checkWallCollision && !checkWallCollision(newX, newY, this.radius)) {
      this.x = newX;
      this.y = newY;
    } else if (!checkWallCollision) {
      this.x = newX;
      this.y = newY;
    }
  }

  // Update player angle for aiming
  updateAngle(angle: number): void {
    this.angle = angle;
  }

  // Speed boost management
  canUseBoost(): boolean {
    return this.boostEnergy > 0;
  }

  activateBoost(): boolean {
    if (this.canUseBoost()) {
      this.isBoostActive = true;
      return true;
    }
    return false;
  }

  deactivateBoost(): void {
    // Only set the deactivation time if boost was actually active
    if (this.isBoostActive) {
      this.lastBoostDeactivatedTime = Date.now();
    }
    this.isBoostActive = false;
  }

  updateBoostEnergy(deltaTime: number): void {
    const currentTime = Date.now();

    // Check if boost upgrade has expired
    if (
      this.boostUpgradeExpiration > 0 &&
      currentTime > this.boostUpgradeExpiration
    ) {
      this.boostUpgradeLevel = 0;
      this.boostUpgradeExpiration = 0;
    }

    // Calculate upgrade multipliers using config
    const boostStats = getBoostStats(this.boostUpgradeLevel);
    const drainRate = boostStats.drainRate;
    const regenRate = boostStats.regenRate * 2; // Make base replenish faster (2x)

    if (this.isBoostActive && this.boostEnergy > 0) {
      // Drain boost energy when active
      this.boostEnergy = Math.max(
        0,
        this.boostEnergy - (drainRate * deltaTime) / 1000
      );

      // Auto-deactivate when energy is depleted
      if (this.boostEnergy <= 0) {
        this.isBoostActive = false;
        this.lastBoostDeactivatedTime = currentTime;
      }
    } else if (!this.isBoostActive && this.boostEnergy < this.maxBoostEnergy) {
      // Regenerate boost energy only after 2 seconds of not using boost
      const timeSinceBoostDeactivated =
        currentTime - (this.lastBoostDeactivatedTime || 0);

      if (timeSinceBoostDeactivated > 2000) {
        // 2 seconds delay
        this.boostEnergy = Math.min(
          this.maxBoostEnergy,
          this.boostEnergy + (regenRate * deltaTime) / 1000
        );
      }
    }
  }

  // Apply boost upgrade
  applyBoostUpgrade(): void {
    const config = POWER_UP_CONFIG.boostUpgrade;
    this.boostUpgradeLevel = Math.min(
      config.maxLevel,
      this.boostUpgradeLevel + 1
    );

    // If durationMs is 0, make it permanent (no expiration)
    if (config.durationMs === 0) {
      this.boostUpgradeExpiration = 0; // 0 means permanent
    } else {
      this.boostUpgradeExpiration = Date.now() + config.durationMs;
    }

    this.addExperience(config.experienceReward);
    this.replenishBoostEnergy(config.energyRefillPercentage);
  }

  // Replenish boost energy by a percentage of max energy
  replenishBoostEnergy(percentage: number): void {
    const replenishAmount = this.maxBoostEnergy * percentage;
    this.boostEnergy = Math.min(
      this.maxBoostEnergy,
      this.boostEnergy + replenishAmount
    );
  }

  // Get boost speed multiplier based on upgrade level
  getBoostMultiplier(): number {
    if (!this.isBoostActive) {
      return 1.0;
    }

    // Check if boost upgrade has expired (only if it's not permanent)
    const currentTime = Date.now();
    if (
      this.boostUpgradeExpiration > 0 &&
      currentTime > this.boostUpgradeExpiration
    ) {
      this.boostUpgradeLevel = 0;
      this.boostUpgradeExpiration = 0;
    }

    // Use configuration to calculate multiplier
    const boostStats = getBoostStats(this.boostUpgradeLevel);
    return boostStats.speedMultiplier;
  }

  // Check if player can be healed (not at full health)
  canBeHealed(): boolean {
    return this.health < this.maxHealth;
  }

  // Check if player can pick up a shield (doesn't have full shield)
  canPickupShield(): boolean {
    return !this.hasShield || this.shieldHealth < this.maxShieldHealth;
  }

  // Apply shield pickup
  applyShield(): boolean {
    if (!this.canPickupShield()) {
      return false; // Can't pickup shield if already at full shield
    }

    const config = POWER_UP_CONFIG.shieldPickup;
    this.shieldHealth = config.shieldAmount;
    this.maxShieldHealth = config.shieldAmount;
    this.shieldExpiration = Date.now() + config.durationMs;
    this.hasShield = true;
    this.addExperience(config.experienceReward);
    return true; // Successfully picked up shield
  }

  // Apply health pickup
  applyHealthPickup(): boolean {
    const config = POWER_UP_CONFIG.healthPickup;
    const healed = this.heal(config.healAmount);
    if (healed) {
      this.addExperience(config.experienceReward);
    }
    return healed;
  }

  // Update shield status (call this regularly to check expiration)
  updateShield(): void {
    if (this.hasShield && this.shieldHealth <= 0) {
      this.hasShield = false;
      this.shieldHealth = 0;
      this.shieldExpiration = 0;
    }
  }

  // Get shield status info
  getShieldInfo(): {
    hasShield: boolean;
    shieldHealth: number;
    timeRemaining: number;
  } {
    this.updateShield();
    return {
      hasShield: this.hasShield,
      shieldHealth: this.shieldHealth,
      timeRemaining: 0, // No time limit on shields
    };
  }

  // Experience system methods
  addExperience(amount: number): void {
    this.experience += amount;
    this.updateLevel();
  }

  // Calculate level based on experience using the new progression system
  private updateLevel(): void {
    const oldLevel = this.level;

    // Import the calculateLevelFromExperience function
    // Note: We'll use a simple calculation here to avoid circular imports
    // The proper calculation is: Math.floor(Math.sqrt(this.experience / 50)) + 1
    // This creates a curve where levels require: 100, 200, 350, 550, 800, 1100, 1450, etc. XP
    let newLevel = 1;
    let totalXPNeeded = 0;
    const baseXP = 100;
    const multiplier = 1.5;

    // Calculate level based on exponential progression
    while (newLevel < 100) {
      // Max level 100
      const xpForNextLevel = Math.floor(
        baseXP * Math.pow(multiplier, newLevel - 1)
      );
      if (this.experience >= totalXPNeeded + xpForNextLevel) {
        totalXPNeeded += xpForNextLevel;
        newLevel++;
      } else {
        break;
      }
    }

    this.level = newLevel;

    // Check if player leveled up
    if (newLevel > oldLevel) {
      this.onLevelUp(newLevel, oldLevel);
    }
  }

  // Override this method in client-side player implementations to handle level-up events
  protected onLevelUp(newLevel: number, oldLevel: number): void {
    // Base implementation does nothing - override in client
  }

  // Get experience needed for next level
  getExperienceToNextLevel(): number {
    const currentLevelXP = (this.level - 1) * 100;
    const nextLevelXP = this.level * 100;
    return nextLevelXP - this.experience;
  }

  // Get progress to next level as percentage (0-1)
  getLevelProgress(): number {
    const currentLevelXP = (this.level - 1) * 100;
    const nextLevelXP = this.level * 100;
    const progressXP = this.experience - currentLevelXP;
    return progressXP / (nextLevelXP - currentLevelXP);
  }

  // Check if player has boost upgrade active
  hasBoostUpgrade(): boolean {
    return (
      this.boostUpgradeLevel > 0 &&
      (this.boostUpgradeExpiration === 0 ||
        Date.now() < this.boostUpgradeExpiration)
    );
  }

  // Apply laser upgrade
  applyLaserUpgrade(): void {
    const config = POWER_UP_CONFIG.laserUpgrade;
    this.laserUpgradeLevel = Math.min(
      config.maxLevel,
      this.laserUpgradeLevel + 1
    );
    this.addExperience(config.experienceReward);
    // Removed expiration - upgrades are now permanent
  }

  // Check if player has laser upgrade active
  hasLaserUpgrade(): boolean {
    return this.laserUpgradeLevel > 1; // Removed expiration check
  }

  // Apply missile upgrade
  applyMissileUpgrade(): void {
    const config = POWER_UP_CONFIG.missileUpgrade;
    this.missileUpgradeLevel = Math.min(
      config.maxLevel,
      this.missileUpgradeLevel + 1
    );
    this.addExperience(config.experienceReward);
    // Removed expiration - upgrades are now permanent
  }

  // Check if player has missile upgrade active
  hasMissileUpgrade(): boolean {
    return this.missileUpgradeLevel > 1; // Removed expiration check
  }

  // Apply flash upgrade
  applyFlashUpgrade(): void {
    const config = POWER_UP_CONFIG.flashUpgrade;
    this.flashUpgradeLevel = Math.min(
      config.maxLevel,
      this.flashUpgradeLevel + 1
    );
    this.addExperience(config.experienceReward);
  }

  // Check if player has flash upgrade active
  hasFlashUpgrade(): boolean {
    return this.flashUpgradeLevel > 1;
  }

  // Check if flash is available (not on cooldown)
  canFlash(currentTime: number): boolean {
    return currentTime - this.lastFlashTime >= this.flashCooldown;
  }

  // Get flash cooldown remaining time
  getFlashCooldownRemaining(currentTime: number): number {
    const remaining = this.flashCooldown - (currentTime - this.lastFlashTime);
    return Math.max(0, remaining);
  }

  // Get flash cooldown percentage (0 = ready, 1 = just used)
  getFlashCooldownPercent(currentTime: number): number {
    const elapsed = currentTime - this.lastFlashTime;
    return Math.max(0, Math.min(1, 1 - elapsed / this.flashCooldown));
  }

  // Get flash stats based on upgrade level
  getFlashStats(): {
    distance: number;
    cooldown: number;
  } {
    const baseDistance = 500;
    const baseCooldown = 5000;

    // Level 1 is the base level
    if (this.flashUpgradeLevel <= 1) {
      return {
        distance: baseDistance,
        cooldown: baseCooldown,
      };
    }

    // For levels 2+, each level increases distance by 20% and reduces cooldown by 10%
    const levelAboveBase = this.flashUpgradeLevel - 1;
    const distanceMultiplier = 1 + levelAboveBase * 0.2;
    const cooldownMultiplier = 1 - levelAboveBase * 0.1;

    return {
      distance: Math.floor(baseDistance * distanceMultiplier),
      cooldown: Math.floor(baseCooldown * cooldownMultiplier),
    };
  }

  // Perform flash teleportation
  flashTeleport(
    mouseX: number,
    mouseY: number,
    worldWidth: number,
    worldHeight: number,
    checkWallCollision?: (x: number, y: number, radius: number) => boolean
  ): { x: number; y: number; success: boolean } {
    const currentTime = Date.now();

    // Check if flash is on cooldown
    if (!this.canFlash(currentTime)) {
      return { x: this.x, y: this.y, success: false };
    }

    const flashStats = this.getFlashStats();

    // Calculate direction to mouse
    const directionToMouse = Math.atan2(mouseY - this.y, mouseX - this.x);

    // Calculate target position
    let targetX = this.x + Math.cos(directionToMouse) * flashStats.distance;
    let targetY = this.y + Math.sin(directionToMouse) * flashStats.distance;

    // Clamp to world bounds
    targetX = Math.max(
      this.radius,
      Math.min(worldWidth - this.radius, targetX)
    );
    targetY = Math.max(
      this.radius,
      Math.min(worldHeight - this.radius, targetY)
    );

    // Check for wall collision at target position
    if (
      checkWallCollision &&
      checkWallCollision(targetX, targetY, this.radius)
    ) {
      // Try to find a valid position by reducing distance gradually
      for (
        let distance = flashStats.distance * 0.8;
        distance > 100;
        distance -= 50
      ) {
        const testX = this.x + Math.cos(directionToMouse) * distance;
        const testY = this.y + Math.sin(directionToMouse) * distance;

        // Clamp to world bounds
        const clampedX = Math.max(
          this.radius,
          Math.min(worldWidth - this.radius, testX)
        );
        const clampedY = Math.max(
          this.radius,
          Math.min(worldHeight - this.radius, testY)
        );

        if (!checkWallCollision(clampedX, clampedY, this.radius)) {
          targetX = clampedX;
          targetY = clampedY;
          break;
        }
      }

      // If still colliding, flash fails
      if (checkWallCollision(targetX, targetY, this.radius)) {
        return { x: this.x, y: this.y, success: false };
      }
    }

    // Update last flash time and cooldown
    this.lastFlashTime = currentTime;
    this.flashCooldown = flashStats.cooldown;

    // Teleport to target position
    this.x = targetX;
    this.y = targetY;

    return { x: targetX, y: targetY, success: true };
  }

  // Update roll animation
  updateRoll(deltaTime: number): void {
    if (this.isRolling) {
      const rollSpeed = 15; // radians per second (faster single rotation)
      this.rollAngle += this.rollDirection * rollSpeed * deltaTime;

      // Complete roll after 2π radians (single 360-degree rotation)
      if (Math.abs(this.rollAngle) >= Math.PI * 2) {
        this.rollAngle = 0;
        this.isRolling = false;
        this.rollDirection = 0;
      }
    }
  }

  // Start roll animation with cooldown check
  startRoll(direction: number, currentTime: number): boolean {
    if (!this.isRolling && this.canRoll(currentTime)) {
      this.isRolling = true;
      this.rollDirection = direction; // -1 for left roll, 1 for right roll
      this.rollAngle = 0;
      this.lastRollTime = currentTime;
      return true;
    }
    return false;
  }

  // Check if roll is available (not on cooldown)
  canRoll(currentTime: number): boolean {
    return currentTime - this.lastRollTime >= this.rollCooldown;
  }

  // Get roll cooldown remaining time
  getRollCooldownRemaining(currentTime: number): number {
    const timeSinceLastRoll = currentTime - this.lastRollTime;
    return Math.max(0, this.rollCooldown - timeSinceLastRoll);
  }

  // Get roll cooldown percentage (0 = ready, 1 = just used)
  getRollCooldownPercent(currentTime: number): number {
    const remaining = this.getRollCooldownRemaining(currentTime);
    return remaining / this.rollCooldown;
  }

  // Apply strafe impulse when roll starts (Q/E keys - fast strafe)
  applyStrafe(direction: number): void {
    const strafeSpeed = 1200; // Increased velocity magnitude for more pronounced strafe movement
    const perpAngle = this.angle + (direction * Math.PI) / 2; // Perpendicular to facing direction
    this.strafeVelocityX = Math.cos(perpAngle) * strafeSpeed;
    this.strafeVelocityY = Math.sin(perpAngle) * strafeSpeed;
  }

  // Apply continuous slow strafe (A/D keys - slow strafe)
  applyContinuousStrafe(
    direction: number,
    deltaTime: number
  ): { deltaX: number; deltaY: number } {
    const slowStrafeSpeed = 200; // Much slower than the impulse strafe
    const perpAngle = this.angle + (direction * Math.PI) / 2; // Perpendicular to facing direction
    const strafeVelocityX = Math.cos(perpAngle) * slowStrafeSpeed;
    const strafeVelocityY = Math.sin(perpAngle) * slowStrafeSpeed;

    return {
      deltaX: strafeVelocityX * deltaTime,
      deltaY: strafeVelocityY * deltaTime,
    };
  }

  // Update strafe velocity (apply decay)
  updateStrafeVelocity(deltaTime: number): { deltaX: number; deltaY: number } {
    // Apply decay to velocity (more aggressive decay for quicker stop)
    this.strafeVelocityX *= Math.pow(0.75, deltaTime * 60); // Decay rate adjusted for frame rate
    this.strafeVelocityY *= Math.pow(0.75, deltaTime * 60);

    // Stop velocity when it becomes very small
    if (Math.abs(this.strafeVelocityX) < 1) this.strafeVelocityX = 0;
    if (Math.abs(this.strafeVelocityY) < 1) this.strafeVelocityY = 0;

    // Return movement delta based on current velocity
    return {
      deltaX: this.strafeVelocityX * deltaTime,
      deltaY: this.strafeVelocityY * deltaTime,
    };
  }

  // Get laser stats based on upgrade level
  getLaserStats(): {
    speed: number;
    damage: number;
    distance: number;
    fireRate: number;
    dualShot: boolean;
    hasBackwardLaser: boolean;
  } {
    const stats = getLaserStats(this.laserUpgradeLevel);
    return {
      ...stats,
      dualShot: this.laserUpgradeLevel >= 3,
      hasBackwardLaser: this.laserUpgradeLevel >= 5,
    };
  }

  // Get missile stats based on upgrade level
  getMissileStats(): {
    speed: number;
    damage: number;
    distance: number;
    trackingRange: number;
    turnRate: number;
    dualShot: boolean;
    missileCount: number;
  } {
    return getMissileStats(this.missileUpgradeLevel);
  }

  // Take damage with shield protection
  takeDamage(damage: number): boolean {
    this.updateShield(); // Check if shield is still active

    if (this.hasShield && this.shieldHealth > 0) {
      // Shield absorbs damage first
      const damageToShield = Math.min(damage, this.shieldHealth);
      this.shieldHealth -= damageToShield;
      const remainingDamage = damage - damageToShield;

      // If shield is depleted, take remaining damage to health
      if (this.shieldHealth <= 0) {
        this.hasShield = false;
        this.shieldHealth = 0;
        this.health = Math.max(0, this.health - remainingDamage);
      }
    } else {
      // No shield, take damage directly to health
      this.health = Math.max(0, this.health - damage);
    }

    return this.health <= 0; // Returns true if player is dead
  }

  // Heal player (returns true if healing was successful)
  heal(amount: number): boolean {
    if (this.health >= this.maxHealth) {
      return false; // Already at full health
    }
    this.health = Math.min(this.maxHealth, this.health + amount);
    return true; // Successfully healed
  }

  // Check if player can shoot missile (cooldown check)
  canShootMissile(currentTime: number, cooldownMs: number = 2000): boolean {
    return currentTime - this.lastMissileTime >= cooldownMs;
  }

  // Update last missile time
  updateMissileTime(currentTime: number): void {
    this.lastMissileTime = currentTime;
  }

  // Get player position as object
  getPosition(): { x: number; y: number } {
    return { x: this.x, y: this.y };
  }

  // Get distance to another point
  getDistanceTo(x: number, y: number): number {
    const dx = this.x - x;
    const dy = this.y - y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  // Check if point is within player radius
  containsPoint(x: number, y: number): boolean {
    return this.getDistanceTo(x, y) <= this.radius;
  }

  // Get health percentage
  getHealthPercentage(): number {
    return this.health / this.maxHealth;
  }

  // Check if player is alive
  isAlive(): boolean {
    return this.health > 0;
  }

  // Serialize player data for network transmission
  serialize(): {
    id: string;
    name: string;
    x: number;
    y: number;
    angle: number;
    color: string;
    health: number;
    maxHealth: number;
    speed: number;
    radius: number;
    lastMissileTime: number;
    boostEnergy: number;
    isBoostActive: boolean;
    boostUpgradeLevel: number;
    boostUpgradeExpiration: number;
    lastBoostDeactivatedTime: number;
    laserUpgradeLevel: number;
    missileUpgradeLevel: number;
    rollAngle: number;
    isRolling: boolean;
    rollDirection: number;
    lastRollTime: number;
    rollCooldown: number;
    shieldHealth: number;
    maxShieldHealth: number;
    shieldExpiration: number;
    hasShield: boolean;
    experience: number;
    level: number;
    flashUpgradeLevel: number;
    lastFlashTime: number;
  } {
    return {
      id: this.id,
      name: this.name,
      x: this.x,
      y: this.y,
      angle: this.angle,
      color: this.color,
      health: this.health,
      maxHealth: this.maxHealth,
      speed: this.speed,
      radius: this.radius,
      lastMissileTime: this.lastMissileTime,
      boostEnergy: this.boostEnergy,
      isBoostActive: this.isBoostActive,
      boostUpgradeLevel: this.boostUpgradeLevel,
      boostUpgradeExpiration: this.boostUpgradeExpiration,
      lastBoostDeactivatedTime: this.lastBoostDeactivatedTime,
      laserUpgradeLevel: this.laserUpgradeLevel,
      missileUpgradeLevel: this.missileUpgradeLevel,
      rollAngle: this.rollAngle,
      isRolling: this.isRolling,
      rollDirection: this.rollDirection,
      lastRollTime: this.lastRollTime,
      rollCooldown: this.rollCooldown,
      shieldHealth: this.shieldHealth,
      maxShieldHealth: this.maxShieldHealth,
      shieldExpiration: this.shieldExpiration,
      hasShield: this.hasShield,
      experience: this.experience,
      level: this.level,
      flashUpgradeLevel: this.flashUpgradeLevel,
      lastFlashTime: this.lastFlashTime,
    };
  }

  // Create player from serialized data
  static deserialize(data: {
    id: string;
    name: string;
    x: number;
    y: number;
    angle: number;
    color: string;
    health: number;
    maxHealth: number;
    speed: number;
    radius?: number;
    lastMissileTime: number;
    boostEnergy?: number;
    isBoostActive?: boolean;
    boostUpgradeLevel?: number;
    boostUpgradeExpiration?: number;
    lastBoostDeactivatedTime?: number;
    laserUpgradeLevel?: number;
    missileUpgradeLevel?: number;
    rollAngle?: number;
    isRolling?: boolean;
    rollDirection?: number;
    lastRollTime?: number;
    rollCooldown?: number;
    shieldHealth?: number;
    maxShieldHealth?: number;
    shieldExpiration?: number;
    hasShield?: boolean;
    experience?: number;
    level?: number;
    flashUpgradeLevel?: number;
    lastFlashTime?: number;
  }): Player {
    const player = new Player(
      data.id,
      data.name,
      data.x,
      data.y,
      data.color,
      data.health,
      data.speed
    );
    player.angle = data.angle;
    player.maxHealth = data.maxHealth;
    player.radius = data.radius || 15; // Default radius
    player.lastMissileTime = data.lastMissileTime;
    player.boostEnergy = data.boostEnergy || 100;
    player.isBoostActive = data.isBoostActive || false;
    player.boostUpgradeLevel = data.boostUpgradeLevel || 0;
    player.boostUpgradeExpiration = data.boostUpgradeExpiration || 0;
    player.lastBoostDeactivatedTime = data.lastBoostDeactivatedTime || 0;
    player.laserUpgradeLevel = data.laserUpgradeLevel || 1; // Default to level 1
    player.missileUpgradeLevel = data.missileUpgradeLevel || 1; // Default to level 1
    player.rollAngle = data.rollAngle || 0;
    player.isRolling = data.isRolling || false;
    player.rollDirection = data.rollDirection || 0;
    player.lastRollTime = data.lastRollTime || 0;
    player.rollCooldown = data.rollCooldown || 1500;
    player.shieldHealth = data.shieldHealth || 0;
    player.maxShieldHealth = data.maxShieldHealth || 100;
    player.shieldExpiration = data.shieldExpiration || 0;
    player.hasShield = data.hasShield || false;
    player.experience = data.experience || 0;
    player.level = data.level || 1;
    player.flashUpgradeLevel = data.flashUpgradeLevel || 1; // Default to level 1
    player.lastFlashTime = data.lastFlashTime || 0;
    return player;
  }

  // Client-side rendering method
  draw(
    ctx: CanvasRenderingContext2D,
    isCurrentPlayer: boolean = false,
    showHealthBar: boolean = true,
    showName: boolean = true
  ): void {
    // Player body
    ctx.fillStyle = isCurrentPlayer ? "#4ade80" : "#f87171";
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();

    // Player direction indicator
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(
      this.x + Math.cos(this.angle) * 25,
      this.y + Math.sin(this.angle) * 25
    );
    ctx.stroke();

    if (showName) {
      // Player name
      ctx.fillStyle = "#fff";
      ctx.font = "12px Arial";
      ctx.textAlign = "center";
      ctx.fillText(this.name, this.x, this.y - 25);
    }

    if (showHealthBar) {
      // Health bar background
      const healthPercent = this.getHealthPercentage();
      ctx.fillStyle = "#333";
      ctx.fillRect(this.x - 20, this.y - 35, 40, 6);

      // Health bar fill
      ctx.fillStyle =
        healthPercent > 0.5
          ? "#4ade80"
          : healthPercent > 0.25
            ? "#fbbf24"
            : "#f87171";
      ctx.fillRect(this.x - 20, this.y - 35, 40 * healthPercent, 6);
    }
  }
}
