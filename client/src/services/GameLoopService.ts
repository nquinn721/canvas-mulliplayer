import { GameStore } from "../stores/GameStore";

export class GameLoopService {
  private gameStore: GameStore;
  private animationId: number | null = null;
  private lastUpdateTime = 0;
  private fpsCounter = 0;
  private lastFpsUpdate = 0;
  private isRunning = false;

  constructor(gameStore: GameStore) {
    this.gameStore = gameStore;
  }

  start() {
    if (this.isRunning) return;

    this.isRunning = true;
    this.lastUpdateTime = performance.now();
    this.lastFpsUpdate = performance.now();
    this.gameLoop();
  }

  stop() {
    this.isRunning = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  private gameLoop = () => {
    if (!this.isRunning) return;

    const currentTime = performance.now();
    const deltaTime = currentTime - this.lastUpdateTime;
    this.lastUpdateTime = currentTime;

    // Send input to server
    this.gameStore.sendInput();

    // Update continuous shooting
    this.gameStore.updateShooting();

    // Update client-side projectiles
    this.gameStore.updateProjectiles(deltaTime);

    // Update particle effects
    this.gameStore.updateParticles(deltaTime);

    // Calculate FPS
    this.fpsCounter++;
    if (currentTime - this.lastFpsUpdate >= 1000) {
      this.gameStore.updateStats({ fps: this.fpsCounter });
      this.fpsCounter = 0;
      this.lastFpsUpdate = currentTime;
    }

    // Continue the loop
    this.animationId = requestAnimationFrame(this.gameLoop);
  };

  get isActive() {
    return this.isRunning;
  }
}
