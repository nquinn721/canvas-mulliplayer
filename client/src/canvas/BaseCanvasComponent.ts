/**
 * Base class for all canvas drawing components
 */
export abstract class BaseCanvasComponent {
  protected ctx: CanvasRenderingContext2D;
  protected canvas: HTMLCanvasElement;

  constructor(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) {
    this.ctx = ctx;
    this.canvas = canvas;
  }

  /**
   * Abstract render method that must be implemented by child classes
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
   * Helper method to draw text with outline
   */
  protected drawTextWithOutline(
    text: string,
    x: number,
    y: number,
    fillColor: string = "#ffffff",
    strokeColor: string = "#000000",
    strokeWidth: number = 2
  ): void {
    this.withCanvasState(() => {
      // Draw outline
      this.ctx.strokeStyle = strokeColor;
      this.ctx.lineWidth = strokeWidth;
      this.ctx.strokeText(text, x, y);

      // Draw fill
      this.ctx.fillStyle = fillColor;
      this.ctx.fillText(text, x, y);
    });
  }
}
