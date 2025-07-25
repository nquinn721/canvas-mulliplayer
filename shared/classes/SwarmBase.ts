import { getSwarmBaseConfig, SwarmBaseConfig, SwarmBaseType } from "../config/SwarmBaseConfig";

/**
 * SwarmBase - Stationary structures that spawn swarm enemies
 * - Configurable HP, spawn rates, and behavior
 * - Spawns swarms that patrol around the base until player comes near
 * - No health bars or names displayed
 * - Uses SwarmBaseConfig for all settings
 */
export class SwarmBase {
  public readonly id: string;
  public readonly x: number;
  public readonly y: number;
  public health: number;
  public readonly maxHealth: number;
  public readonly radius: number;
  public readonly patrolRadius: number;
  public readonly spawnInterval: number;
  public readonly maxSpawnedSwarms: number;
  public readonly spawnDistance: { min: number; max: number };
  public readonly spawnCooldownAfterDamage: number;
  public readonly xpReward: number;
  public lastSpawnTime: number = 0;
  public lastDamageTime: number = 0;
  public isDestroyed: boolean = false;
  public spawnedSwarms: Set<string> = new Set(); // Track spawned swarms
  private config: SwarmBaseConfig;

  constructor(id: string, x: number, y: number, type: SwarmBaseType = 'DEFAULT') {
    this.config = getSwarmBaseConfig(type);
    
    this.id = id;
    this.x = x;
    this.y = y;
    
    // Initialize from config
    this.health = this.config.health;
    this.maxHealth = this.config.maxHealth;
    this.radius = this.config.radius;
    this.patrolRadius = this.config.patrolRadius;
    this.spawnInterval = this.config.spawnInterval;
    this.maxSpawnedSwarms = this.config.maxSpawnedSwarms;
    this.spawnDistance = this.config.spawnDistance;
    this.spawnCooldownAfterDamage = this.config.spawnCooldownAfterDamage;
    this.xpReward = this.config.xpReward;
    
    this.lastSpawnTime = Date.now();
  }

  /**
   * Check if base should spawn a new swarm
   */
  shouldSpawn(): boolean {
    if (this.isDestroyed) return false;
    
    // Check if we have too many active swarms
    if (this.spawnedSwarms.size >= this.maxSpawnedSwarms) {
      return false;
    }
    
    const now = Date.now();
    
    // Check normal spawn interval
    const timeSinceLastSpawn = now - this.lastSpawnTime;
    if (timeSinceLastSpawn < this.spawnInterval) {
      return false;
    }
    
    // Check cooldown after taking damage
    const timeSinceLastDamage = now - this.lastDamageTime;
    if (timeSinceLastDamage < this.spawnCooldownAfterDamage) {
      return false;
    }
    
    return true;
  }

  /**
   * Mark that a swarm was spawned
   */
  markSpawned(): void {
    this.lastSpawnTime = Date.now();
  }

  /**
   * Take damage and check if destroyed
   */
  takeDamage(damage: number): boolean {
    if (this.isDestroyed) return false;
    
    this.lastDamageTime = Date.now(); // Track when damage was taken
    this.health -= damage;
    if (this.health <= 0) {
      this.health = 0;
      this.isDestroyed = true;
      return true; // Base was destroyed
    }
    return false;
  }

  /**
   * Remove a swarm from tracking when it dies
   */
  removeSwarm(swarmId: string): void {
    this.spawnedSwarms.delete(swarmId);
  }

  /**
   * Add a swarm to tracking when spawned
   */
  addSwarm(swarmId: string): void {
    this.spawnedSwarms.add(swarmId);
  }

  /**
   * Get spawn position for new swarm
   */
  getSpawnPosition(): { x: number; y: number } {
    const angle = Math.random() * Math.PI * 2;
    const distance = this.spawnDistance.min + Math.random() * (this.spawnDistance.max - this.spawnDistance.min);
    return {
      x: this.x + Math.cos(angle) * distance,
      y: this.y + Math.sin(angle) * distance
    };
  }

  /**
   * Get patrol position around base
   */
  getPatrolPosition(angle: number): { x: number; y: number } {
    const distance = this.patrolRadius * 0.7; // Patrol at 70% of radius
    return {
      x: this.x + Math.cos(angle) * distance,
      y: this.y + Math.sin(angle) * distance
    };
  }

  /**
   * Check if a position is within patrol range
   */
  isWithinPatrolRange(x: number, y: number): boolean {
    const dx = x - this.x;
    const dy = y - this.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance <= this.patrolRadius;
  }
}
