import { Projectile } from "./Projectile";

export class Missile extends Projectile {
  public trackingRange: number;
  public turnRate: number; // How fast the missile can turn (radians per second)
  public targetId: string | null; // ID of the target being tracked

  constructor(
    x: number,
    y: number,
    angle: number,
    ownerId: string,
    speed?: number,
    damage?: number,
    maxDistance?: number,
    trackingRange?: number,
    turnRate?: number
  ) {
    super(
      x,
      y,
      angle,
      ownerId,
      speed || 400, // speed (pixels per second)
      damage || 75, // damage
      maxDistance || 800, // max distance - reduced from 1500 to 800
      2000, // cooldown (ms)
      "missile"
    );

    this.trackingRange = trackingRange || 300; // Range within which missile will track enemies
    this.turnRate = turnRate || 3; // Radians per second turning rate
    this.targetId = null;
  }

  // Update missile with homing capability
  updateWithHoming(deltaTime: number, players: Map<string, any>): void {
    // Find the closest enemy within tracking range
    let closestEnemy: any = null;
    let closestDistance = this.trackingRange;

    players.forEach((player, playerId) => {
      // Don't track the missile owner
      if (playerId === this.ownerId) return;

      const distance = Math.sqrt(
        (player.x - this.x) ** 2 + (player.y - this.y) ** 2
      );

      if (distance < closestDistance) {
        closestEnemy = player;
        closestDistance = distance;
        this.targetId = playerId;
      }
    });

    // If we have a target, adjust trajectory
    if (closestEnemy) {
      // Calculate angle to target
      const targetAngle = Math.atan2(
        closestEnemy.y - this.y,
        closestEnemy.x - this.x
      );

      // Calculate current missile direction
      const currentAngle = Math.atan2(this.velocityY, this.velocityX);

      // Calculate the difference between angles
      let angleDiff = targetAngle - currentAngle;

      // Normalize angle difference to [-π, π]
      while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
      while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;

      // Limit turn rate
      const maxTurn = this.turnRate * (deltaTime / 1000);
      const turnAmount = Math.max(-maxTurn, Math.min(maxTurn, angleDiff));

      // Apply the turn
      const newAngle = currentAngle + turnAmount;
      this.velocityX = Math.cos(newAngle) * this.speed;
      this.velocityY = Math.sin(newAngle) * this.speed;
    } else {
      // Clear target if no enemy in range
      this.targetId = null;
    }

    // Update position
    this.update(deltaTime);
  }

  draw(ctx: CanvasRenderingContext2D): void {
    ctx.save();

    const angle = Math.atan2(this.velocityY, this.velocityX);

    ctx.translate(this.x, this.y);
    ctx.rotate(angle);

    // Draw tracking indicator if missile is homing
    if (this.targetId) {
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transformation for UI elements
      ctx.translate(this.x, this.y);

      // Draw targeting circle
      ctx.strokeStyle = "#ff0000";
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]); // Dashed line
      ctx.beginPath();
      ctx.arc(0, 0, 25, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]); // Reset dash

      ctx.restore();
    }

    // Draw exhaust trail first (behind missile)
    ctx.fillStyle = "#ff6600";
    ctx.shadowColor = "#ff6600";
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.ellipse(-12, 0, 8, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    // Inner exhaust glow
    ctx.fillStyle = "#ffaa00";
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.ellipse(-10, 0, 4, 1.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Reset shadow for missile body
    ctx.shadowBlur = 0;

    // Draw missile body (main cylinder)
    ctx.fillStyle = "#666666";
    ctx.fillRect(-4, -2, 12, 4);

    // Draw missile nose cone (pointed front)
    ctx.fillStyle = "#444444";
    ctx.beginPath();
    ctx.moveTo(8, 0);
    ctx.lineTo(4, -2);
    ctx.lineTo(4, 2);
    ctx.closePath();
    ctx.fill();

    // Draw missile fins (back stabilizers)
    ctx.fillStyle = "#555555";
    // Top fin
    ctx.beginPath();
    ctx.moveTo(-4, -2);
    ctx.lineTo(-8, -4);
    ctx.lineTo(-6, -2);
    ctx.closePath();
    ctx.fill();

    // Bottom fin
    ctx.beginPath();
    ctx.moveTo(-4, 2);
    ctx.lineTo(-8, 4);
    ctx.lineTo(-6, 2);
    ctx.closePath();
    ctx.fill();

    // Draw red stripe on missile body
    ctx.fillStyle = "#ff4444";
    ctx.fillRect(-2, -1, 6, 2);

    // Draw guidance system - color changes when tracking
    ctx.fillStyle = this.targetId ? "#ff0000" : "#ffff00"; // Red when tracking, yellow when not
    ctx.beginPath();
    ctx.arc(2, 0, 0.8, 0, Math.PI * 2); // Slightly larger when tracking
    ctx.fill();

    ctx.restore();
  }
}
