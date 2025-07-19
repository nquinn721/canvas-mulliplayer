import { GameStore } from "../stores/GameStore";

export abstract class BaseCanvasComponent {
  protected gameStore: GameStore;
  protected ctx: CanvasRenderingContext2D;

  constructor(gameStore: GameStore, ctx: CanvasRenderingContext2D) {
    this.gameStore = gameStore;
    this.ctx = ctx;
  }

  abstract render(): void;

  protected save() {
    this.ctx.save();
  }

  protected restore() {
    this.ctx.restore();
  }
}
