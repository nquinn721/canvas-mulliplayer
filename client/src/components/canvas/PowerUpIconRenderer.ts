import { CanvasComponent } from "./CanvasComponent";

/**
 * Handles rendering of power-up icons in the game world
 */
export class PowerUpIconRenderer extends CanvasComponent {
  render(): void {
    // Render all power-ups in the game world
    const powerUps = this.gameStore.gameState.powerUps || {};

    Object.values(powerUps).forEach((powerUp: any) => {
      if (!powerUp.collected) {
        this.drawPowerUpIcon(powerUp);
      }
    });
  }

  /**
   * Draw a single power-up icon
   */
  drawPowerUpIcon(powerUp: any): void {
    this.withCanvasState(() => {
      // Check if power-up is in view
      if (!this.gameStore.isPowerUpInView(powerUp)) return;
      if (powerUp.collected) return; // Don't draw collected power-ups

      // Draw glow effect first (background)
      this.ctx.shadowColor = this.getPowerUpColor(powerUp.type);
      this.ctx.shadowBlur = 20;
      this.ctx.globalAlpha = 0.8;

      // Draw outer glow ring
      this.ctx.beginPath();
      this.ctx.arc(powerUp.x, powerUp.y, 25, 0, Math.PI * 2);
      this.ctx.fillStyle = this.getPowerUpColor(powerUp.type);
      this.ctx.globalAlpha = 0.3;
      this.ctx.fill();

      // Reset shadow
      this.ctx.shadowBlur = 0;
      this.ctx.globalAlpha = 1;

      // Draw the main power-up icon
      this.drawPowerUpIconShape(
        powerUp.x,
        powerUp.y,
        powerUp.type,
        this.getPowerUpColor(powerUp.type)
      );

      // Draw floating animation effect
      const time = Date.now() * 0.002;
      const floatOffset = Math.sin(time + powerUp.x * 0.01) * 3;

      // Draw sparkle effects
      this.drawSparkleEffect(powerUp.x, powerUp.y + floatOffset, powerUp.type);
    });
  }

  /**
   * Draw the actual power-up icon shape
   */
  private drawPowerUpIconShape(
    x: number,
    y: number,
    type: string,
    color: string
  ): void {
    this.withCanvasState(() => {
      const size = 20;
      this.ctx.fillStyle = color;
      this.ctx.strokeStyle = "#ffffff";
      this.ctx.lineWidth = 2;

      switch (type) {
        case "health":
          // Health cross
          this.ctx.fillRect(
            x - size * 0.4,
            y - size * 0.1,
            size * 0.8,
            size * 0.2
          );
          this.ctx.fillRect(
            x - size * 0.1,
            y - size * 0.4,
            size * 0.2,
            size * 0.8
          );
          this.ctx.strokeRect(
            x - size * 0.4,
            y - size * 0.1,
            size * 0.8,
            size * 0.2
          );
          this.ctx.strokeRect(
            x - size * 0.1,
            y - size * 0.4,
            size * 0.2,
            size * 0.8
          );
          break;

        case "shield":
          // Shield shape
          this.ctx.beginPath();
          this.ctx.moveTo(x, y - size * 0.5);
          this.ctx.lineTo(x + size * 0.4, y - size * 0.2);
          this.ctx.lineTo(x + size * 0.4, y + size * 0.2);
          this.ctx.lineTo(x, y + size * 0.5);
          this.ctx.lineTo(x - size * 0.4, y + size * 0.2);
          this.ctx.lineTo(x - size * 0.4, y - size * 0.2);
          this.ctx.closePath();
          this.ctx.fill();
          this.ctx.stroke();
          break;

        case "speed":
          // Speed boost arrows
          for (let i = 0; i < 3; i++) {
            const offsetX = (i - 1) * size * 0.25;
            this.ctx.beginPath();
            this.ctx.moveTo(x + offsetX - size * 0.2, y - size * 0.3);
            this.ctx.lineTo(x + offsetX + size * 0.2, y);
            this.ctx.lineTo(x + offsetX - size * 0.2, y + size * 0.3);
            this.ctx.lineTo(x + offsetX - size * 0.1, y);
            this.ctx.closePath();
            this.ctx.globalAlpha = 0.8 - i * 0.2;
            this.ctx.fill();
          }
          this.ctx.globalAlpha = 1;
          break;

        case "weapon":
          // Weapon upgrade icon (crosshairs)
          this.ctx.beginPath();
          this.ctx.arc(x, y, size * 0.4, 0, Math.PI * 2);
          this.ctx.stroke();

          // Cross lines
          this.ctx.beginPath();
          this.ctx.moveTo(x - size * 0.6, y);
          this.ctx.lineTo(x + size * 0.6, y);
          this.ctx.moveTo(x, y - size * 0.6);
          this.ctx.lineTo(x, y + size * 0.6);
          this.ctx.stroke();
          break;

        case "flash":
          // Flash/teleport icon
          this.drawCustomIcon(x, y, "bolt", size, color);
          break;

        default:
          // Default star shape
          this.ctx.beginPath();
          for (let i = 0; i < 10; i++) {
            const angle = (i * Math.PI) / 5;
            const radius = i % 2 === 0 ? size * 0.4 : size * 0.2;
            const px = x + Math.cos(angle) * radius;
            const py = y + Math.sin(angle) * radius;
            if (i === 0) {
              this.ctx.moveTo(px, py);
            } else {
              this.ctx.lineTo(px, py);
            }
          }
          this.ctx.closePath();
          this.ctx.fill();
          this.ctx.stroke();
          break;
      }
    });
  }

  /**
   * Draw sparkle effects around power-ups
   */
  private drawSparkleEffect(x: number, y: number, type: string): void {
    this.withCanvasState(() => {
      const time = Date.now() * 0.003;
      const sparkleCount = 6;

      for (let i = 0; i < sparkleCount; i++) {
        const angle = (i / sparkleCount) * Math.PI * 2 + time;
        const distance = 35 + Math.sin(time * 2 + i) * 5;
        const sparkleX = x + Math.cos(angle) * distance;
        const sparkleY = y + Math.sin(angle) * distance;

        const sparkleSize = 3 + Math.sin(time * 3 + i) * 1;

        this.ctx.fillStyle = this.getPowerUpColor(type);
        this.ctx.globalAlpha = 0.6 + Math.sin(time * 4 + i) * 0.3;

        this.ctx.beginPath();
        this.ctx.arc(sparkleX, sparkleY, sparkleSize, 0, Math.PI * 2);
        this.ctx.fill();
      }

      this.ctx.globalAlpha = 1;
    });
  }

  /**
   * Get the color associated with a power-up type
   */
  private getPowerUpColor(type: string): string {
    const colors = {
      health: "#4ade80", // Green
      shield: "#3b82f6", // Blue
      speed: "#f59e0b", // Orange
      weapon: "#ef4444", // Red
      flash: "#8b5cf6", // Purple
      default: "#fbbf24", // Yellow
    };

    return colors[type as keyof typeof colors] || colors.default;
  }

  /**
   * Draw all power-ups in the game state
   */
  drawAllPowerUps(): void {
    Object.values(this.gameStore.gameState.powerUps).forEach((powerUp) => {
      this.drawPowerUpIcon(powerUp);
    });
  }
}
