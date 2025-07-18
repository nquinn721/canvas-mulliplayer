import { KeyState } from "../../../shared";
import { GameStore } from "../stores/GameStore";

export class InputService {
  private gameStore: GameStore;
  private canvas: HTMLCanvasElement;

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

    // Missile ability (key 1)
    if (e.key === "1") {
      this.gameStore.shootMissile();
    }

    // Prevent default for game keys
    if (
      [
        "w",
        "a",
        "s",
        "d",
        "shift",
        "1",
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
    // Only handle left mouse button
    if (e.button !== 0) return;

    e.preventDefault();
    this.gameStore.setMouseDown(true);
    this.gameStore.shoot(); // Fire immediately on first click
  };

  private handleMouseUp = (e: MouseEvent) => {
    // Only handle left mouse button
    if (e.button !== 0) return;

    e.preventDefault();
    this.gameStore.setMouseDown(false);
  };

  private handleMouseLeave = () => {
    // Stop shooting when mouse leaves canvas
    this.gameStore.setMouseDown(false);
  };

  // Cleanup method to remove event listeners
  cleanup() {
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
