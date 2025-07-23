import { GameLoopService } from "../services/GameLoopService";
import { InputService } from "../services/InputService";
import { RendererService } from "../services/RendererService";
import { SocketService } from "../services/SocketService";
import { GameStore } from "../stores/GameStore";

export class Game {
  private gameStore: GameStore;
  private socketService: SocketService;
  private gameLoopService: GameLoopService;
  private rendererService: RendererService;
  private inputService: InputService;
  private renderAnimationId: number | null = null;

  constructor(
    canvas: HTMLCanvasElement,
    gameStore?: GameStore,
    socketService?: SocketService
  ) {
    // Use provided store or create new one
    this.gameStore = gameStore || new GameStore();

    // Use provided socket service or create new one
    this.socketService = socketService || new SocketService(this.gameStore);

    // Initialize other services
    this.gameLoopService = new GameLoopService(this.gameStore);
    this.rendererService = new RendererService(this.gameStore, canvas);
    this.inputService = new InputService(this.gameStore, canvas);

    // Connect input service to game loop for sound updates
    this.gameLoopService.setInputService(this.inputService);
  }

  // Start the game
  async start(serverUrl?: string) {
    try {
      // Connect to server
      this.socketService.connect(serverUrl);

      // Start game loop
      this.gameLoopService.start();

      // Start render loop
      this.startRenderLoop();
    } catch (error) {
      console.error("Failed to start game:", error);
      throw error;
    }
  }

  // Stop the game
  stop() {
    console.log("Game.stop() called - this should NOT disconnect the socket");
    this.gameLoopService.stop();
    this.stopRenderLoop();
    // Note: We don't disconnect the socket here - that's managed by the App component
    // The socket should persist across game sessions
    console.log("Game.stop() calling gameStore.reset()");
    this.gameStore.reset();
    console.log("Game.stop() completed");
  }

  // Start the render loop (separate from game loop for better performance)
  private startRenderLoop = () => {
    this.rendererService.render();
    this.renderAnimationId = requestAnimationFrame(this.startRenderLoop);
  };

  // Stop the render loop
  private stopRenderLoop() {
    if (this.renderAnimationId) {
      cancelAnimationFrame(this.renderAnimationId);
      this.renderAnimationId = null;
    }
  }

  // Cleanup when component unmounts
  cleanup() {
    this.stop();
    this.inputService.cleanup();
  }

  // Getters for accessing services and store
  get store() {
    return this.gameStore;
  }

  get socket() {
    return this.socketService;
  }

  get isRunning() {
    return this.gameLoopService.isActive;
  }

  get isConnected() {
    return this.socketService.isConnected;
  }

  // Restart the game
  restart() {
    this.stop();
    this.start();
  }
}
