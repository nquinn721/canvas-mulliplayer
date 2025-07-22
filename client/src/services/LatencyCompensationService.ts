import { GameState } from "../../../shared/types/GameState";

interface PredictedPlayerState {
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
  angle: number;
  timestamp: number;
}

interface InputCommand {
  id: number;
  timestamp: number;
  keys: any;
  angle: number;
  processed: boolean;
}

interface GameStateSnapshot {
  gameState: GameState;
  timestamp: number;
  serverTime?: number;
}

export class LatencyCompensationService {
  private inputHistory: InputCommand[] = [];
  private gameStateHistory: GameStateSnapshot[] = [];
  private predictedState: PredictedPlayerState | null = null;
  private lastInputId = 0;
  private estimatedLatency = 0;
  private latencyHistory: number[] = [];
  private maxHistorySize = 60; // Keep 1 second at 60fps

  // Client-side prediction settings
  private predictionEnabled = true;
  private interpolationEnabled = true;
  private reconciliationEnabled = true;

  constructor(private playerId: string) {}

  // Estimate network latency using ping-pong
  updateLatencyEstimate(pingStart: number, pongReceived: number) {
    const latency = (pongReceived - pingStart) / 2;
    this.latencyHistory.push(latency);

    // Keep only recent samples
    if (this.latencyHistory.length > 10) {
      this.latencyHistory.shift();
    }

    // Use average latency with some smoothing
    this.estimatedLatency =
      this.latencyHistory.reduce((a, b) => a + b, 0) /
      this.latencyHistory.length;
  }

  // Record input for prediction and reconciliation
  recordInput(keys: any, angle: number): number {
    const inputId = ++this.lastInputId;
    const timestamp = Date.now();

    const command: InputCommand = {
      id: inputId,
      timestamp,
      keys: { ...keys },
      angle,
      processed: false,
    };

    this.inputHistory.push(command);

    // Clean old inputs
    this.cleanInputHistory();

    // Apply client-side prediction
    if (this.predictionEnabled) {
      this.applyClientPrediction(command);
    }

    return inputId;
  }

  // Apply client-side movement prediction
  private applyClientPrediction(input: InputCommand) {
    if (!this.predictedState) {
      // Initialize predicted state from current player state
      return;
    }

    const deltaTime = 16; // 60fps assumption
    const speed = 200; // Base player speed
    const boostMultiplier = 1.0; // TODO: Add boost detection

    let deltaX = 0;
    let deltaY = 0;

    // Apply movement based on input keys
    if (input.keys.w) {
      deltaX += Math.cos(input.angle) * speed * (deltaTime / 1000);
      deltaY += Math.sin(input.angle) * speed * (deltaTime / 1000);
    }
    if (input.keys.s) {
      deltaX -= Math.cos(input.angle) * speed * (deltaTime / 1000);
      deltaY -= Math.sin(input.angle) * speed * (deltaTime / 1000);
    }
    if (input.keys.a) {
      deltaX -= Math.sin(input.angle) * speed * 0.7 * (deltaTime / 1000);
      deltaY += Math.cos(input.angle) * speed * 0.7 * (deltaTime / 1000);
    }
    if (input.keys.d) {
      deltaX += Math.sin(input.angle) * speed * 0.7 * (deltaTime / 1000);
      deltaY -= Math.cos(input.angle) * speed * 0.7 * (deltaTime / 1000);
    }

    // Apply boost multiplier
    deltaX *= boostMultiplier;
    deltaY *= boostMultiplier;

    // Update predicted position
    this.predictedState.x += deltaX;
    this.predictedState.y += deltaY;
    this.predictedState.angle = input.angle;
    this.predictedState.timestamp = input.timestamp;
  }

  // Store server game state for interpolation
  recordGameState(gameState: GameState, serverTime?: number) {
    const snapshot: GameStateSnapshot = {
      gameState: { ...gameState },
      timestamp: Date.now(),
      serverTime,
    };

    this.gameStateHistory.push(snapshot);

    // Clean old states
    this.cleanGameStateHistory();

    // Perform server reconciliation if enabled
    if (this.reconciliationEnabled) {
      this.performServerReconciliation(gameState);
    }
  }

  // Reconcile client prediction with server state
  private performServerReconciliation(serverGameState: GameState) {
    const serverPlayer = serverGameState.players[this.playerId];
    if (!serverPlayer || !this.predictedState) return;

    const threshold = 50; // pixels - adjust based on tolerance
    const positionError = Math.sqrt(
      Math.pow(this.predictedState.x - serverPlayer.x, 2) +
        Math.pow(this.predictedState.y - serverPlayer.y, 2)
    );

    if (positionError > threshold) {
      console.log(`Server reconciliation: error=${positionError.toFixed(1)}px`);

      // Reset prediction to server state
      this.predictedState.x = serverPlayer.x;
      this.predictedState.y = serverPlayer.y;
      this.predictedState.angle = serverPlayer.angle;

      // Re-apply unprocessed inputs
      this.reapplyUnprocessedInputs();
    }
  }

  // Re-apply inputs that happened after server state
  private reapplyUnprocessedInputs() {
    if (!this.predictedState) return;

    const unprocessedInputs = this.inputHistory.filter(
      (input) => !input.processed
    );

    for (const input of unprocessedInputs) {
      this.applyClientPrediction(input);
    }
  }

  // Get interpolated game state for smooth rendering
  getInterpolatedGameState(currentTime: number): GameState | null {
    if (!this.interpolationEnabled || this.gameStateHistory.length < 2) {
      return (
        this.gameStateHistory[this.gameStateHistory.length - 1]?.gameState ||
        null
      );
    }

    // Use interpolation delay to smooth out network jitter
    const interpolationDelay = Math.max(100, this.estimatedLatency * 1.5);
    const targetTime = currentTime - interpolationDelay;

    // Find two states to interpolate between
    let fromState: GameStateSnapshot | null = null;
    let toState: GameStateSnapshot | null = null;

    for (let i = 0; i < this.gameStateHistory.length - 1; i++) {
      const current = this.gameStateHistory[i];
      const next = this.gameStateHistory[i + 1];

      if (current.timestamp <= targetTime && next.timestamp >= targetTime) {
        fromState = current;
        toState = next;
        break;
      }
    }

    if (!fromState || !toState) {
      // Fallback to latest state
      return (
        this.gameStateHistory[this.gameStateHistory.length - 1]?.gameState ||
        null
      );
    }

    // Calculate interpolation factor
    const timeDiff = toState.timestamp - fromState.timestamp;
    const factor =
      timeDiff > 0 ? (targetTime - fromState.timestamp) / timeDiff : 0;

    // Interpolate player positions (except for current player if prediction is enabled)
    const interpolatedState = { ...toState.gameState };

    Object.keys(interpolatedState.players).forEach((playerId) => {
      if (
        playerId === this.playerId &&
        this.predictionEnabled &&
        this.predictedState
      ) {
        // Use predicted state for local player
        interpolatedState.players[playerId] = {
          ...interpolatedState.players[playerId],
          x: this.predictedState.x,
          y: this.predictedState.y,
          angle: this.predictedState.angle,
        };
      } else {
        // Interpolate other players
        const fromPlayer = fromState!.gameState.players[playerId];
        const toPlayer = toState!.gameState.players[playerId];

        if (fromPlayer && toPlayer) {
          interpolatedState.players[playerId] = {
            ...toPlayer,
            x: this.lerp(fromPlayer.x, toPlayer.x, factor),
            y: this.lerp(fromPlayer.y, toPlayer.y, factor),
            angle: this.lerpAngle(fromPlayer.angle, toPlayer.angle, factor),
          };
        }
      }
    });

    return interpolatedState;
  }

  // Initialize predicted state from server state
  initializePredictedState(playerState: any) {
    this.predictedState = {
      x: playerState.x,
      y: playerState.y,
      velocityX: 0,
      velocityY: 0,
      angle: playerState.angle,
      timestamp: Date.now(),
    };
  }

  // Get predicted player position for immediate visual feedback
  getPredictedPlayerState() {
    return this.predictedState;
  }

  // Mark inputs as processed by server
  markInputsAsProcessed(lastProcessedInputId: number) {
    this.inputHistory.forEach((input) => {
      if (input.id <= lastProcessedInputId) {
        input.processed = true;
      }
    });
  }

  // Utility functions
  private lerp(from: number, to: number, factor: number): number {
    return from + (to - from) * Math.max(0, Math.min(1, factor));
  }

  private lerpAngle(from: number, to: number, factor: number): number {
    const diff = to - from;
    const normalizedDiff = Math.atan2(Math.sin(diff), Math.cos(diff));
    return from + normalizedDiff * factor;
  }

  private cleanInputHistory() {
    const cutoff = Date.now() - 2000; // Keep 2 seconds
    this.inputHistory = this.inputHistory.filter(
      (input) => input.timestamp > cutoff
    );
  }

  private cleanGameStateHistory() {
    const cutoff = Date.now() - 2000; // Keep 2 seconds
    this.gameStateHistory = this.gameStateHistory.filter(
      (state) => state.timestamp > cutoff
    );
  }

  // Configuration
  enablePrediction(enabled: boolean) {
    this.predictionEnabled = enabled;
  }

  enableInterpolation(enabled: boolean) {
    this.interpolationEnabled = enabled;
  }

  enableReconciliation(enabled: boolean) {
    this.reconciliationEnabled = enabled;
  }

  getLatency(): number {
    return this.estimatedLatency;
  }

  getStats() {
    return {
      latency: this.estimatedLatency,
      inputHistorySize: this.inputHistory.length,
      gameStateHistorySize: this.gameStateHistory.length,
      predictionEnabled: this.predictionEnabled,
      interpolationEnabled: this.interpolationEnabled,
      reconciliationEnabled: this.reconciliationEnabled,
    };
  }
}
