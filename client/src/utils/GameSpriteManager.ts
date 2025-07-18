import { TreeSpriteManager } from "../utils/TreeSpriteManager";

export class GameSpriteManager {
  private treeManager: TreeSpriteManager;
  private isInitialized: boolean = false;

  constructor() {
    this.treeManager = new TreeSpriteManager();
  }

  async initialize(): Promise<void> {
    try {
      // Load trees (no parameters needed now)
      await this.treeManager.loadTrees();
      this.isInitialized = true;
      console.log("Game sprites initialized successfully");
    } catch (error) {
      console.error("Failed to initialize game sprites:", error);
    }
  }

  /**
   * Draw environmental elements like trees
   */
  drawEnvironment(
    ctx: CanvasRenderingContext2D,
    cameraX: number,
    cameraY: number,
    canvasWidth: number,
    canvasHeight: number
  ): void {
    if (!this.isInitialized) return;

    // Example: Draw some trees scattered around the world
    const treePositions = this.getTreePositions();

    treePositions.forEach(({ x, y, treeType }) => {
      // Only draw trees that are visible on screen
      if (
        x >= cameraX - 50 &&
        x <= cameraX + canvasWidth + 50 &&
        y >= cameraY - 50 &&
        y <= cameraY + canvasHeight + 50
      ) {
        this.treeManager.drawTree(ctx, `tree-${treeType}`, x, y, 64, 64); // Scale to 64x64
      }
    });
  }

  /**
   * Get predetermined tree positions (you could also generate these dynamically)
   */
  private getTreePositions(): Array<{
    x: number;
    y: number;
    treeType: number;
  }> {
    // Example static tree positions - you could load this from a file or generate procedurally
    return [
      { x: 500, y: 300, treeType: 0 },
      { x: 800, y: 450, treeType: 1 },
      { x: 1200, y: 200, treeType: 2 },
      { x: 1500, y: 600, treeType: 0 },
      { x: 2000, y: 400, treeType: 1 },
      { x: 2500, y: 700, treeType: 2 },
      { x: 3000, y: 300, treeType: 0 },
      { x: 3500, y: 500, treeType: 1 },
      { x: 4000, y: 250, treeType: 2 },
      { x: 4500, y: 650, treeType: 0 },
    ];
  }

  /**
   * Check if sprites are ready to use
   */
  isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * Get available tree count for random selection
   */
  getAvailableTreeTypes(): number {
    return this.treeManager.getTreeCount();
  }
}
