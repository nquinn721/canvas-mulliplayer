import { Projectile } from "./Projectile";

export class Laser extends Projectile {
  constructor(
    x: number,
    y: number,
    angle: number,
    ownerId: string,
    speed?: number,
    damage?: number,
    maxDistance?: number
  ) {
    super(
      x,
      y,
      angle,
      ownerId,
      speed || 400, // Further reduced default speed
      damage || 12, // Further reduced default damage
      maxDistance || 500, // Further reduced default distance
      200, // Increased cooldown from 100ms to 200ms
      "laser"
    );
  }

  draw(ctx: CanvasRenderingContext2D): void {
    ctx.save();

    // Draw laser beam
    ctx.strokeStyle = "#44ff44";
    ctx.lineWidth = 3;
    ctx.shadowColor = "#44ff44";
    ctx.shadowBlur = 10;

    const angle = Math.atan2(this.velocityY, this.velocityX);
    const length = 20;

    ctx.beginPath();
    ctx.moveTo(
      this.x - (Math.cos(angle) * length) / 2,
      this.y - (Math.sin(angle) * length) / 2
    );
    ctx.lineTo(
      this.x + (Math.cos(angle) * length) / 2,
      this.y + (Math.sin(angle) * length) / 2
    );
    ctx.stroke();

    // Draw core
    ctx.strokeStyle = "#88ff88";
    ctx.lineWidth = 1;
    ctx.shadowBlur = 5;
    ctx.stroke();

    ctx.restore();
  }
}
