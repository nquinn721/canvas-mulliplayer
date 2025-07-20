import { observer } from "mobx-react-lite";
import { useEffect, useRef, useState } from "react";
import "../App.css";
import { Game } from "../game/Game";
import { soundService } from "../services/SoundService";
import { GameStore } from "../stores/GameStore";
import DeathMenu from "./DeathMenu";
import EscapeMenu from "./EscapeMenu";

interface GameComponentProps {
  playerName: string;
  aiDifficulty: "EASY" | "MEDIUM" | "HARD";
  onReturnToHome: () => void;
}

const GameComponent = observer(
  ({ playerName, aiDifficulty, onReturnToHome }: GameComponentProps) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const gameRef = useRef<Game | null>(null);
    const [isMuted, setIsMuted] = useState(() => soundService.isSoundMuted());
    const [masterVolume, setMasterVolume] = useState(() =>
      soundService.getMasterVolume()
    );
    const [sfxVolume, setSfxVolume] = useState(() =>
      soundService.getSFXVolume()
    );
    const [musicVolume, setMusicVolume] = useState(() =>
      soundService.getMusicVolume()
    );
    const [currentAIDifficulty, setCurrentAIDifficulty] = useState<
      "EASY" | "MEDIUM" | "HARD"
    >(aiDifficulty);
    const [gameStore, setGameStore] = useState<GameStore | null>(null);
    const [isEscapeMenuOpen, setIsEscapeMenuOpen] = useState(false);
    const [isPlayerDead, setIsPlayerDead] = useState(false);
    const [canvasDimensions, setCanvasDimensions] = useState(() => {
      const HEADER_HEIGHT = 50;
      return {
        width: window.innerWidth,
        height: window.innerHeight - HEADER_HEIGHT,
      };
    });

    // Handle window resize
    useEffect(() => {
      const handleResize = () => {
        const HEADER_HEIGHT = 50;
        const newWidth = window.innerWidth;
        const newHeight = window.innerHeight - HEADER_HEIGHT;
        setCanvasDimensions({ width: newWidth, height: newHeight });
      };

      window.addEventListener("resize", handleResize);
      return () => window.removeEventListener("resize", handleResize);
    }, []);

    // Handle escape key for menu or respawn when dead
    useEffect(() => {
      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === "Escape") {
          if (isPlayerDead) {
            // Respawn when dead
            handleRespawn();
          } else {
            // Toggle escape menu when alive
            setIsEscapeMenuOpen((prev) => !prev);
          }
        }
      };

      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isPlayerDead]);

    // Update GameStore canvas dimensions when they change
    useEffect(() => {
      if (gameStore) {
        gameStore.updateCanvasDimensions(
          canvasDimensions.width,
          canvasDimensions.height
        );
      }
    }, [canvasDimensions, gameStore]);

    useEffect(() => {
      if (!canvasRef.current) return;

      // Initialize game
      const game = new Game(canvasRef.current);
      gameRef.current = game;
      setGameStore(game.store);

      // Start the game
      game.start().catch(console.error);

      // Set AI difficulty and join with player name when game starts
      setTimeout(() => {
        if (game.store?.socket) {
          game.store.socket.emit("changeAIDifficulty", {
            difficulty: aiDifficulty,
          });
          // Join the game with the player's chosen name
          if (game.socket.isConnected) {
            game.socket.joinGame(playerName);
          } else {
            // Wait for connection and then join
            const checkConnection = setInterval(() => {
              if (game.socket.isConnected) {
                game.socket.joinGame(playerName);
                clearInterval(checkConnection);
              }
            }, 100);

            // Clear interval after 5 seconds to prevent infinite loop
            setTimeout(() => clearInterval(checkConnection), 5000);
          }
        }
      }, 1000);

      // Start background music after a short delay
      const startMusicTimer = setTimeout(() => {
        if (!soundService.isSoundMuted()) {
          soundService.forceStartBackgroundMusic();
        }
      }, 1000);

      // Cleanup on unmount
      return () => {
        clearTimeout(startMusicTimer);
        soundService.stopBackgroundMusic();
        game.cleanup();
        gameRef.current = null;
        setGameStore(null);
      };
    }, [aiDifficulty]);

    const toggleMute = () => {
      const newMuteState = soundService.toggleMute();
      setIsMuted(newMuteState);
    };

    const handleMasterVolumeChange = (value: number) => {
      soundService.setMasterVolume(value);
      setMasterVolume(value);
    };

    const handleSfxVolumeChange = (value: number) => {
      soundService.setSFXVolume(value);
      setSfxVolume(value);
    };

    const handleMusicVolumeChange = (value: number) => {
      soundService.setMusicVolume(value);
      setMusicVolume(value);
    };

    const changeAIDifficulty = (difficulty: "EASY" | "MEDIUM" | "HARD") => {
      if (gameStore?.socket) {
        gameStore.socket.emit("changeAIDifficulty", { difficulty });
        setCurrentAIDifficulty(difficulty);
        console.log(`Changed AI difficulty to ${difficulty}`);
      }
    };

    // Death detection effect
    useEffect(() => {
      if (gameStore?.currentPlayer) {
        const isDead = gameStore.currentPlayer.health <= 0;
        setIsPlayerDead(isDead);
      }
    }, [gameStore?.currentPlayer?.health]);

    // Handle respawn
    const handleRespawn = () => {
      if (gameStore?.socket && gameStore.isConnected) {
        // Request respawn from server
        gameStore.socket.emit("respawn", { playerName });
        // Don't set isPlayerDead to false here - wait for server confirmation
        // The isPlayerDead state will be updated when the player's health changes
      }
    };

    const handleReturnToHome = () => {
      // Clean up game before returning to home
      if (gameRef.current) {
        soundService.stopBackgroundMusic();
        gameRef.current.cleanup();
        gameRef.current = null;
        setGameStore(null);
      }
      onReturnToHome();
    };

    return (
      <div className="game-container">
        {/* Header */}
        <header className="game-header">
          <h1 className="game-title">🎮 Canvas Multiplayer</h1>
          <div className="header-status">
            <div className="status-group">
              <span className="status-label">Player:</span>
              <span className="status-value">{playerName}</span>
            </div>
            <div className="status-group">
              <span className="status-label">Players:</span>
              <span className="status-value">
                {Object.keys(gameStore?.gameState?.players || {}).length +
                  Object.keys(gameStore?.gameState?.aiEnemies || {}).length}
              </span>
            </div>
            <div className="status-group">
              <span className="status-label">FPS:</span>
              <span className="status-value">{gameStore?.stats?.fps || 0}</span>
            </div>
            <div className="status-group">
              <span className="status-indicator">
                {gameStore?.isConnected ? "🟢 Online" : "🔴 Offline"}
              </span>
            </div>
            <div className="esc-hint">
              Press <strong>ESC</strong> for menu
            </div>
          </div>
        </header>

        {/* Main game area - full screen canvas */}
        <div className="game-main-fullscreen">
          <canvas
            ref={canvasRef}
            width={canvasDimensions.width}
            height={canvasDimensions.height}
            className="game-canvas"
            style={{ 
              pointerEvents: isPlayerDead ? 'none' : 'auto',
              filter: isPlayerDead ? 'grayscale(50%) brightness(70%)' : 'none'
            }}
          />
        </div>

        {/* Death Menu */}
        {isPlayerDead && (
          <DeathMenu 
            onRespawn={handleRespawn}
            onReturnToHome={handleReturnToHome}
          />
        )}

        {/* Escape Menu - only show when alive */}
        {!isPlayerDead && (
          <EscapeMenu
            isOpen={isEscapeMenuOpen}
            onClose={() => setIsEscapeMenuOpen(false)}
            connectionStatus={
              gameStore?.isConnected ? "Connected" : "Disconnected"
            }
            playerCount={Object.keys(gameStore?.gameState?.players || {}).length}
            enemyCount={Object.keys(gameStore?.gameState?.aiEnemies || {}).length}
            isConnected={gameStore?.isConnected || false}
            isMuted={isMuted}
            onMuteToggle={toggleMute}
            masterVolume={masterVolume}
            sfxVolume={sfxVolume}
            musicVolume={musicVolume}
            onMasterVolumeChange={handleMasterVolumeChange}
            onSfxVolumeChange={handleSfxVolumeChange}
            onMusicVolumeChange={handleMusicVolumeChange}
            currentAIDifficulty={currentAIDifficulty}
            onAIDifficultyChange={changeAIDifficulty}
            onReturnToHome={handleReturnToHome}
          />
        )}
      </div>
    );
  }
);

export default GameComponent;
