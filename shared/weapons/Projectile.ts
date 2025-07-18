// Projectile data interface for network transmission
export interface ProjectileData {
  id: string;
  x: number;
  y: number;
  angle: number;
  speed: number;
  damage: number;
  ownerId: string;
  type: "laser" | "missile";
  createdAt: number;
}

// Base projectile class for all weapon projectiles
export abstract class Projectile {
  public id: string;
  public x: number;
  public y: number;
  public velocityX: number;
  public velocityY: number;
  public damage: number;
  public speed: number;
  public maxDistance: number;
  public traveledDistance: number;
  public ownerId: string;
  public cooldown: number;
  public type: string;
  public createdAt: number;

  constructor(
    x: number,
    y: number,
    angle: number,
    ownerId: string,
    speed: number,
    damage: number,
    maxDistance: number,
    cooldown: number,
    type: string
  ) {
    this.id = `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.x = x;
    this.y = y;
    this.speed = speed;
    this.velocityX = Math.cos(angle) * speed;
    this.velocityY = Math.sin(angle) * speed;
    this.damage = damage;
    this.maxDistance = maxDistance;
    this.traveledDistance = 0;
    this.ownerId = ownerId;
    this.cooldown = cooldown;
    this.type = type;
    this.createdAt = Date.now();
  }

  update(deltaTime: number): void {
    const distance = this.speed * (deltaTime / 1000);
    this.x += this.velocityX * (deltaTime / 1000);
    this.y += this.velocityY * (deltaTime / 1000);
    this.traveledDistance += distance;
  }

  abstract draw(ctx: CanvasRenderingContext2D): void;

  isExpired(): boolean {
    return this.traveledDistance >= this.maxDistance;
  }
}
