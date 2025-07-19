import { BaseCanvasComponent } from "./BaseCanvasComponent";

export class IconRenderer extends BaseCanvasComponent {
  // Helper method to draw custom icons in canvas (Font Awesome style)
  drawCustomIcon(
    x: number,
    y: number,
    iconType: string,
    size: number,
    color: string = "#ffffff"
  ) {
    this.ctx.save();
    this.ctx.fillStyle = color;
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = 2;

    const halfSize = size / 2;

    switch (iconType) {
      case "mouse":
        this.drawMouseIcon(x, y, halfSize, color);
        break;

      case "mouseRight":
        this.drawMouseRightIcon(x, y, halfSize, color);
        break;

      case "rocket":
        this.drawRocketIcon(x, y, halfSize, color);
        break;

      case "bolt":
        this.drawBoltIcon(x, y, halfSize, color);
        break;

      case "magic":
        this.drawMagicIcon(x, y, halfSize, color);
        break;

      default:
        console.warn(`Unknown icon type: ${iconType}`);
    }

    this.ctx.restore();
  }

  private drawMouseIcon(x: number, y: number, halfSize: number, color: string) {
    // Draw mouse shape - more elongated and realistic
    this.ctx.fillStyle = color;
    this.ctx.beginPath();
    // Create a more mouse-like shape with rounded top
    this.ctx.ellipse(x, y, halfSize * 0.5, halfSize * 1.1, 0, 0, Math.PI * 2);
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
  }

  private drawMouseRightIcon(
    x: number,
    y: number,
    halfSize: number,
    color: string
  ) {
    // Draw mouse shape (outline) - more elongated and realistic
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = 1.5;
    this.ctx.beginPath();
    // Create a more mouse-like shape with rounded top
    this.ctx.ellipse(x, y, halfSize * 0.5, halfSize * 1.1, 0, 0, Math.PI * 2);
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
  }

  private drawRocketIcon(
    x: number,
    y: number,
    halfSize: number,
    color: string
  ) {
    // Draw rocket shape
    this.ctx.fillStyle = color;

    // Rocket body (main rectangle)
    this.ctx.fillRect(
      x - halfSize * 0.2,
      y - halfSize * 0.7,
      halfSize * 0.4,
      halfSize * 1.4
    );

    // Rocket nose (triangle)
    this.ctx.beginPath();
    this.ctx.moveTo(x, y - halfSize * 0.7);
    this.ctx.lineTo(x - halfSize * 0.2, y - halfSize * 0.3);
    this.ctx.lineTo(x + halfSize * 0.2, y - halfSize * 0.3);
    this.ctx.closePath();
    this.ctx.fill();

    // Rocket fins (triangles at bottom)
    this.ctx.beginPath();
    this.ctx.moveTo(x - halfSize * 0.4, y + halfSize * 0.9);
    this.ctx.lineTo(x - halfSize * 0.2, y + halfSize * 0.7);
    this.ctx.lineTo(x - halfSize * 0.2, y + halfSize * 0.9);
    this.ctx.closePath();
    this.ctx.fill();

    this.ctx.beginPath();
    this.ctx.moveTo(x + halfSize * 0.4, y + halfSize * 0.9);
    this.ctx.lineTo(x + halfSize * 0.2, y + halfSize * 0.7);
    this.ctx.lineTo(x + halfSize * 0.2, y + halfSize * 0.9);
    this.ctx.closePath();
    this.ctx.fill();

    // Rocket exhaust (small rectangle)
    this.ctx.fillStyle = "#ff4444";
    this.ctx.fillRect(
      x - halfSize * 0.1,
      y + halfSize * 0.7,
      halfSize * 0.2,
      halfSize * 0.3
    );
  }

  private drawBoltIcon(x: number, y: number, halfSize: number, color: string) {
    // Draw lightning bolt
    this.ctx.fillStyle = color;
    this.ctx.beginPath();
    this.ctx.moveTo(x - halfSize * 0.3, y - halfSize * 0.8);
    this.ctx.lineTo(x + halfSize * 0.1, y - halfSize * 0.8);
    this.ctx.lineTo(x - halfSize * 0.2, y - halfSize * 0.1);
    this.ctx.lineTo(x + halfSize * 0.3, y - halfSize * 0.1);
    this.ctx.lineTo(x - halfSize * 0.1, y + halfSize * 0.8);
    this.ctx.lineTo(x + halfSize * 0.2, y + halfSize * 0.1);
    this.ctx.lineTo(x - halfSize * 0.3, y + halfSize * 0.1);
    this.ctx.closePath();
    this.ctx.fill();
  }

  private drawMagicIcon(x: number, y: number, halfSize: number, color: string) {
    // Draw magic wand
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = 3;
    this.ctx.beginPath();
    this.ctx.moveTo(x - halfSize * 0.6, y + halfSize * 0.6);
    this.ctx.lineTo(x + halfSize * 0.6, y - halfSize * 0.6);
    this.ctx.stroke();

    // Draw star at tip
    this.ctx.fillStyle = color;
    this.drawStar(x + halfSize * 0.6, y - halfSize * 0.6, halfSize * 0.3, 5);
  }

  private drawStar(x: number, y: number, radius: number, points: number) {
    const angle = Math.PI / points;
    this.ctx.beginPath();
    for (let i = 0; i < 2 * points; i++) {
      const r = i % 2 === 0 ? radius : radius * 0.5;
      const a = i * angle;
      if (i === 0) {
        this.ctx.moveTo(x + r * Math.cos(a), y + r * Math.sin(a));
      } else {
        this.ctx.lineTo(x + r * Math.cos(a), y + r * Math.sin(a));
      }
    }
    this.ctx.closePath();
    this.ctx.fill();
  }

  render(): void {
    // This component doesn't render on its own, it provides icon drawing methods
  }
}
