/**
 * SwarmBase - Stationary structures that spawn swarm enemies
 * - 100 HP
 * - Spawns one swarm every 10 seconds
 * - Swarms patrol around the base until player comes near
 * - No health bars or names displayed
 * - 5 bases spawn randomly throughout the map
 */
export class SwarmBase {
  public readonly id: string;
  public readonly x: number;
  public readonly y: number;
  public health: number = 100;
  public readonly maxHealth: number = 100;
  public readonly radius: number = 25; // Visual size
  public readonly patrolRadius: number = 150; // Area where spawned swarms patrol
  public readonly spawnInterval: number = 10000; // 10 seconds
  public lastSpawnTime: number = 0;
  public isDestroyed: boolean = false;
  public spawnedSwarms: Set<string> = new Set(); // Track spawned swarms

  constructor(id: string, x: number, y: number) {
    this.id = id;
    this.x = x;
    this.y = y;
    this.lastSpawnTime = Date.now();
  }

  /**
   * Check if base should spawn a new swarm
   */
  shouldSpawn(): boolean {
    if (this.isDestroyed) return false;
    const now = Date.now();
    return now - this.lastSpawnTime >= this.spawnInterval;
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
