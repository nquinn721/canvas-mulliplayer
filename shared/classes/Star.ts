// Star class for random exploding background stars
export class Star {
  public id: string;
  public x: number;
  public y: number;
  public radius: number;
  public damage: number;
  public explosionRadius: number;
  public createdAt: number;
  public lifespan: number; // How long before it explodes (ms)
  public isExploding: boolean;
  public explosionStartTime: number;
  public explosionDuration: number; // How long the explosion lasts
  public twinklePhase: number; // For twinkling animation
  public brightness: number;

  constructor(
    id: string,
    x: number,
    y: number,
    lifespan: number = 15000 // 15 seconds before explosion
  ) {
    this.id = id;
    this.x = x;
    this.y = y;
    this.radius = 3;
    this.damage = 60; // High damage for area effect
    this.explosionRadius = 150; // Large explosion radius
    this.createdAt = Date.now();
    this.lifespan = lifespan;
    this.isExploding = false;
    this.explosionStartTime = 0;
    this.explosionDuration = 2000; // Explosion lasts 2 seconds
    this.twinklePhase = Math.random() * Math.PI * 2;
    this.brightness = 0.8 + Math.random() * 0.2; // Random brightness variation
  }

  // Update star state
  update(deltaTime: number): boolean {
    const currentTime = Date.now();

    // Update twinkling animation
    this.twinklePhase += deltaTime * 0.003; // Slow twinkling

    // Check if it's time to explode
    if (!this.isExploding && currentTime - this.createdAt >= this.lifespan) {
      this.isExploding = true;
      this.explosionStartTime = currentTime;
      return true; // Signal that explosion just started
    }

    // If exploding, check if explosion is finished
    if (
      this.isExploding &&
      currentTime - this.explosionStartTime >= this.explosionDuration
    ) {
      return false; // Remove star after explosion
    }

    return true; // Keep star alive
  }

  // Check if a point is within explosion radius
  isInExplosionRadius(x: number, y: number): boolean {
    if (!this.isExploding) return false;

    const distance = Math.sqrt((x - this.x) ** 2 + (y - this.y) ** 2);
    return distance <= this.explosionRadius;
  }

  // Get explosion progress (0 to 1)
  getExplosionProgress(): number {
    if (!this.isExploding) return 0;

    const elapsed = Date.now() - this.explosionStartTime;
    return Math.min(elapsed / this.explosionDuration, 1);
  }

  // Get time until explosion (for warning effects)
  getTimeUntilExplosion(): number {
    if (this.isExploding) return 0;

    const elapsed = Date.now() - this.createdAt;
    return Math.max(0, this.lifespan - elapsed);
  }

  // Check if star is about to explode (last 3 seconds)
  isAboutToExplode(): boolean {
    return this.getTimeUntilExplosion() <= 3000 && !this.isExploding;
  }

  // Serialize for network transmission
  serialize() {
    return {
      id: this.id,
      x: this.x,
      y: this.y,
      radius: this.radius,
      damage: this.damage,
      explosionRadius: this.explosionRadius,
      createdAt: this.createdAt,
      lifespan: this.lifespan,
      isExploding: this.isExploding,
      explosionStartTime: this.explosionStartTime,
      explosionDuration: this.explosionDuration,
      twinklePhase: this.twinklePhase,
      brightness: this.brightness,
    };
  }

  // Create from serialized data
  static fromSerialized(data: any): Star {
    const star = new Star(data.id, data.x, data.y, data.lifespan);
    star.radius = data.radius;
    star.damage = data.damage;
    star.explosionRadius = data.explosionRadius;
    star.createdAt = data.createdAt;
    star.isExploding = data.isExploding;
    star.explosionStartTime = data.explosionStartTime;
    star.explosionDuration = data.explosionDuration;
    star.twinklePhase = data.twinklePhase;
    star.brightness = data.brightness;
    return star;
  }
}
