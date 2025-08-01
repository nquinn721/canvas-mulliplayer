import { KeyState } from "@shared";
import { GameStore } from "../stores/GameStore";
import { soundService } from "./SoundService";

export class InputService {
  private gameStore: GameStore;
  private canvas: HTMLCanvasElement;
  private previousBoostState: boolean = false;

  constructor(gameStore: GameStore, canvas: HTMLCanvasElement) {
    this.gameStore = gameStore;
    this.canvas = canvas;
    this.setupEventListeners();
  }

  private setupEventListeners() {
    // Keyboard events
    window.addEventListener("keydown", this.handleKeyDown);
    window.addEventListener("keyup", this.handleKeyUp);

    // Mouse events
    this.canvas.addEventListener("mousemove", this.handleMouseMove);
    this.canvas.addEventListener("mousedown", this.handleMouseDown);
    this.canvas.addEventListener("mouseup", this.handleMouseUp);
    this.canvas.addEventListener("mouseleave", this.handleMouseLeave);

    // Prevent context menu on right click
    this.canvas.addEventListener("contextmenu", (e) => e.preventDefault());
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    const key = e.key.toLowerCase();

    // Movement keys
    if (key in this.gameStore.keys) {
      this.gameStore.setKeyState(key as keyof KeyState, true);
    }

    // Handle Shift key specifically
    if (e.key === "Shift") {
      this.gameStore.setKeyState("shift", true);
    }

    // Flash ability (key F)
    if (e.key === "f" || e.key === "F") {
      const flashUsed = this.gameStore.useFlash();
      if (flashUsed) {
        // Could add flash sound effect here
      }
    }

    // Prevent default for game keys
    if (
      [
        "w",
        "a",
        "s",
        "d",
        "q",
        "e",
        "shift",
        "f",
        "arrowup",
        "arrowdown",
        "arrowleft",
        "arrowright",
      ].includes(key) ||
      e.key === "Shift"
    ) {
      e.preventDefault();
    }
  };

  private handleKeyUp = (e: KeyboardEvent) => {
    const key = e.key.toLowerCase();

    if (key in this.gameStore.keys) {
      this.gameStore.setKeyState(key as keyof KeyState, false);
    }

    // Handle Shift key specifically
    if (e.key === "Shift") {
      this.gameStore.setKeyState("shift", false);
    }
  };

  private handleMouseMove = (e: MouseEvent) => {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    this.gameStore.setMousePosition(x, y);
  };

  private handleMouseDown = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent event bubbling that could trigger focus changes

    if (e.button === 0) {
      // Left mouse button - laser
      this.gameStore.setMouseDown(true);
      this.gameStore.shoot(); // Fire immediately on first click
    } else if (e.button === 2) {
      // Right mouse button - missile
      const missileFired = this.gameStore.shootMissile();
      if (missileFired) {
        const player = this.gameStore.currentPlayer;
        if (player) {
          soundService.playSound("missile", 0.8);
        }
      }
    }
  };

  private handleMouseUp = (e: MouseEvent) => {
    // Only handle left mouse button
    if (e.button !== 0) return;

    e.preventDefault();
    e.stopPropagation(); // Prevent event bubbling that could trigger focus changes
    this.gameStore.setMouseDown(false);
  };

  private handleMouseLeave = () => {
    // Stop shooting when mouse leaves canvas
    this.gameStore.setMouseDown(false);
  };

  // Check for boost and movement state changes and play sounds
  updateMovementSounds() {
    const currentPlayer = this.gameStore.currentPlayer;
    if (currentPlayer) {
      const currentBoostState = currentPlayer.isBoostActive;
      const isMoving = this.isPlayerMoving();

      if (
        currentBoostState &&
        !soundService.isContinuousSoundPlaying("boost")
      ) {
        // Boost just activated - start continuous boost sound at full volume
        soundService.startContinuousSound("boost", 0.4);
      } else if (
        !currentBoostState &&
        isMoving &&
        !soundService.isContinuousSoundPlaying("movement")
      ) {
        // Moving but not boosting - start continuous movement sound at lower volume
        soundService.startContinuousSound("movement", 0.15); // Reduced from 0.2 for subtler movement sound
      } else if (
        !currentBoostState &&
        !isMoving &&
        soundService.isContinuousSoundPlaying("movement")
      ) {
        // Not moving and not boosting - stop movement sound
        soundService.stopContinuousSound("movement");
      }

      // Stop boost sound when boost deactivates
      if (
        !currentBoostState &&
        soundService.isContinuousSoundPlaying("boost")
      ) {
        soundService.stopContinuousSound("boost");
      }

      this.previousBoostState = currentBoostState;
    }
  }

  // Helper method to check if player is moving
  private isPlayerMoving(): boolean {
    const keys = this.gameStore.keys;
    const currentPlayer = this.gameStore.currentPlayer;
    const hasStrafing =
      currentPlayer &&
      (Math.abs(currentPlayer.strafeVelocityX) > 10 ||
        Math.abs(currentPlayer.strafeVelocityY) > 10);
    return keys.w || keys.s || keys.a || keys.d || hasStrafing;
  }

  // Cleanup method to remove event listeners
  cleanup() {
    // Stop any continuous sounds
    soundService.stopContinuousSound("boost");

    window.removeEventListener("keydown", this.handleKeyDown);
    window.removeEventListener("keyup", this.handleKeyUp);
    this.canvas.removeEventListener("mousemove", this.handleMouseMove);
    this.canvas.removeEventListener("mousedown", this.handleMouseDown);
    this.canvas.removeEventListener("mouseup", this.handleMouseUp);
    this.canvas.removeEventListener("mouseleave", this.handleMouseLeave);
  }

  // Utility methods for checking input state
  get isMoving() {
    return this.gameStore.isInputActive;
  }

  get currentKeys() {
    return { ...this.gameStore.keys };
  }

  get mousePosition() {
    return { ...this.gameStore.mousePosition };
  }
}
