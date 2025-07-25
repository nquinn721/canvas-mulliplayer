import { getBoostStats } from "@shared/config";
import { GameStore } from "../stores/GameStore";
import { animationService } from "./AnimationService";
import { InputService } from "./InputService";

export class GameLoopService {
  private gameStore: GameStore;
  private inputService: InputService | null = null;
  private animationId: number | null = null;
  private lastUpdateTime = 0;
  private fpsCounter = 0;
  private lastFpsUpdate = 0;
  private isRunning = false;

  constructor(gameStore: GameStore) {
    this.gameStore = gameStore;
  }

  setInputService(inputService: InputService) {
    this.inputService = inputService;
  }

  start() {
    if (this.isRunning) return;

    this.isRunning = true;
    this.lastUpdateTime = performance.now();
    this.lastFpsUpdate = performance.now();

    // Start animation service
    animationService.start();

    // Visual effects are now handled by the 2D particle system

    this.gameLoop();
  }

  stop() {
    this.isRunning = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }

    // Stop animation service
    animationService.stop();
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

    // Update time-based scoring tracking
    this.gameStore.updateTimeBasedTracking();

    // Update animations
    animationService.update(deltaTime);

    // Camera updates are handled by the 2D renderer

    // Generate wind effects for moving players
    this.updateWindEffects();

    // Update input-related sounds
    if (this.inputService) {
      this.inputService.updateMovementSounds();
    }

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

  private updateWindEffects() {
    // Generate wind effects for the current player when moving
    const currentPlayer = this.gameStore.currentPlayer;
    if (!currentPlayer) return;

    // Check if player is moving by looking at input state
    const isMoving = this.gameStore.isInputActive;

    if (isMoving) {
      // Create wind effect at regular intervals (every few frames)
      // Use a simple counter to throttle wind particle generation
      if (Math.random() < 0.3) {
        // 30% chance each frame when moving
        // Estimate velocity based on movement keys and boost state
        let velocityX = 0;
        let velocityY = 0;
        const baseSpeed = 200;

        // Calculate boost multiplier using the same logic as Player class
        let boostMultiplier = 1.0;
        if (currentPlayer.isBoostActive) {
          // Check if boost upgrade has expired
          const currentTime = Date.now();
          let boostLevel = currentPlayer.boostUpgradeLevel || 0;

          if (
            currentPlayer.boostUpgradeExpiration > 0 &&
            currentTime > currentPlayer.boostUpgradeExpiration
          ) {
            boostLevel = 0;
          }

          // Use configuration to calculate multiplier
          const boostStats = getBoostStats(boostLevel);
          boostMultiplier = boostStats.speedMultiplier;
        }

        if (this.gameStore.keys.w || this.gameStore.keys.ArrowUp)
          velocityY -= baseSpeed;
        if (this.gameStore.keys.s || this.gameStore.keys.ArrowDown)
          velocityY += baseSpeed;
        if (this.gameStore.keys.a || this.gameStore.keys.ArrowLeft)
          velocityX -= baseSpeed;
        if (this.gameStore.keys.d || this.gameStore.keys.ArrowRight)
          velocityX += baseSpeed;

        velocityX *= boostMultiplier;
        velocityY *= boostMultiplier;

        // Only create wind if there's actual movement
        if (velocityX !== 0 || velocityY !== 0) {
          this.gameStore.createWindEffect(
            currentPlayer.x,
            currentPlayer.y,
            velocityX,
            velocityY,
            currentPlayer.angle
          );
        }
      }
    }
  }
}
