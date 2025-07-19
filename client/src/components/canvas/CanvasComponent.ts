import { GameStore } from "../../stores/GameStore";

/**
 * Base class for all canvas drawing components
 * Provides common functionality and shared context
 */
export abstract class CanvasComponent {
  protected gameStore: GameStore;
  protected ctx: CanvasRenderingContext2D;
  protected canvas: HTMLCanvasElement;

  constructor(
    gameStore: GameStore,
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement
  ) {
    this.gameStore = gameStore;
    this.ctx = ctx;
    this.canvas = canvas;
  }

  /**
   * Abstract render method that each component must implement
   */
  abstract render(): void;

  /**
   * Helper method to save and restore canvas state
   */
  protected withCanvasState(callback: () => void): void {
    this.ctx.save();
    try {
      callback();
    } finally {
      this.ctx.restore();
    }
  }

  /**
   * Helper method for drawing custom icons
   */
  protected drawCustomIcon(
    x: number,
    y: number,
    iconType: string,
    size: number,
    color: string = "#ffffff"
  ): void {
    this.withCanvasState(() => {
      this.ctx.fillStyle = color;
      this.ctx.strokeStyle = color;
      this.ctx.lineWidth = 2;

      const halfSize = size / 2;

      switch (iconType) {
        case "mouse":
          // Draw mouse shape - more elongated and realistic
          this.ctx.fillStyle = color;
          this.ctx.beginPath();
          // Create a more mouse-like shape with rounded top
          this.ctx.ellipse(
            x,
            y,
            halfSize * 0.5,
            halfSize * 1.1,
            0,
            0,
            Math.PI * 2
          );
          this.ctx.fill();

          // Draw mouse outline with thinner lines
          this.ctx.strokeStyle = "#000000";
          this.ctx.lineWidth = 1;
          this.ctx.stroke();

          // Draw middle line separating buttons (thinner)
          this.ctx.beginPath();
          this.ctx.moveTo(x, y - halfSize * 0.7);
          this.ctx.lineTo(x, y + halfSize * 0.1);
          this.ctx.stroke();
          break;

        case "mouseRight":
          // Draw mouse shape (outline) - more elongated and realistic
          this.ctx.strokeStyle = color;
          this.ctx.lineWidth = 1.5;
          this.ctx.beginPath();
          // Create a more mouse-like shape with rounded top
          this.ctx.ellipse(
            x,
            y,
            halfSize * 0.5,
            halfSize * 1.1,
            0,
            0,
            Math.PI * 2
          );
          this.ctx.stroke();

          // Draw middle line separating buttons (thinner)
          this.ctx.beginPath();
          this.ctx.moveTo(x, y - halfSize * 0.7);
          this.ctx.lineTo(x, y + halfSize * 0.1);
          this.ctx.stroke();

          // Fill the right button area (more realistic positioning)
          this.ctx.fillStyle = color;
          this.ctx.beginPath();
          // Create right button as a rounded rectangle area
          this.ctx.ellipse(
            x + halfSize * 0.25,
            y - halfSize * 0.3,
            halfSize * 0.2,
            halfSize * 0.35,
            0,
            0,
            Math.PI * 2
          );
          this.ctx.fill();
          break;

        case "rocket":
          // Draw rocket shape
          this.ctx.fillStyle = color;

          // Rocket body (main cylinder)
          this.ctx.beginPath();
          this.ctx.ellipse(
            x,
            y,
            halfSize * 0.3,
            halfSize * 0.7,
            0,
            0,
            Math.PI * 2
          );
          this.ctx.fill();

          // Rocket nose (pointed tip)
          this.ctx.beginPath();
          this.ctx.moveTo(x, y - halfSize * 0.9);
          this.ctx.lineTo(x - halfSize * 0.2, y - halfSize * 0.5);
          this.ctx.lineTo(x + halfSize * 0.2, y - halfSize * 0.5);
          this.ctx.closePath();
          this.ctx.fill();

          // Rocket fins
          this.ctx.beginPath();
          this.ctx.moveTo(x - halfSize * 0.4, y + halfSize * 0.4);
          this.ctx.lineTo(x - halfSize * 0.15, y + halfSize * 0.7);
          this.ctx.lineTo(x - halfSize * 0.15, y + halfSize * 0.4);
          this.ctx.closePath();
          this.ctx.fill();

          this.ctx.beginPath();
          this.ctx.moveTo(x + halfSize * 0.4, y + halfSize * 0.4);
          this.ctx.lineTo(x + halfSize * 0.15, y + halfSize * 0.7);
          this.ctx.lineTo(x + halfSize * 0.15, y + halfSize * 0.4);
          this.ctx.closePath();
          this.ctx.fill();
          break;

        case "bolt":
          // Draw lightning bolt for flash ability
          this.ctx.fillStyle = color;
          this.ctx.beginPath();

          // Lightning bolt shape
          this.ctx.moveTo(x - halfSize * 0.2, y - halfSize * 0.8);
          this.ctx.lineTo(x + halfSize * 0.3, y - halfSize * 0.2);
          this.ctx.lineTo(x + halfSize * 0.1, y - halfSize * 0.1);
          this.ctx.lineTo(x + halfSize * 0.4, y + halfSize * 0.5);
          this.ctx.lineTo(x - halfSize * 0.1, y + halfSize * 0.8);
          this.ctx.lineTo(x - halfSize * 0.3, y + halfSize * 0.1);
          this.ctx.lineTo(x - halfSize * 0.1, y - halfSize * 0.1);
          this.ctx.closePath();
          this.ctx.fill();
          break;

        case "magic":
          // Draw magic sparkle for flash ability
          this.ctx.fillStyle = color;

          // Draw a four-pointed star
          this.ctx.beginPath();
          for (let i = 0; i < 8; i++) {
            const angle = (i * Math.PI) / 4;
            const radius = i % 2 === 0 ? halfSize * 0.8 : halfSize * 0.3;
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
          break;
      }
    });
  }
}
