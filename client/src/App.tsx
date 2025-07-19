import { observer } from "mobx-react-lite";
import { useEffect, useRef, useState } from "react";
import "./App.css";
import EscapeMenu from "./components/EscapeMenu";
import { Game } from "./game/Game";
import { soundService } from "./services/SoundService";
import { GameStore } from "./stores/GameStore";

const App = observer(() => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<Game | null>(null);
  const [isMuted, setIsMuted] = useState(() => soundService.isSoundMuted()); // Initialize with localStorage value
  const [masterVolume, setMasterVolume] = useState(() =>
    soundService.getMasterVolume()
  );
  const [sfxVolume, setSfxVolume] = useState(() => soundService.getSFXVolume());
  const [musicVolume, setMusicVolume] = useState(() =>
    soundService.getMusicVolume()
  );
  const [currentAIDifficulty, setCurrentAIDifficulty] = useState<
    "EASY" | "MEDIUM" | "HARD"
  >("MEDIUM"); // Track current AI difficulty
  const [gameStore, setGameStore] = useState<GameStore | null>(null); // Add game store to component state
  const [isEscapeMenuOpen, setIsEscapeMenuOpen] = useState(false); // Escape menu state
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

  // Handle escape key for menu
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsEscapeMenuOpen((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

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
    setGameStore(game.store); // Set the game store in component state

    // Start the game
    game.start().catch(console.error);

    // Start background music after a short delay to allow user interaction
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
      setGameStore(null); // Clear the game store reference
    };
  }, []);

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
      setCurrentAIDifficulty(difficulty); // Update local state
      console.log(`Changed AI difficulty to ${difficulty}`);
    }
  };

  return (
    <div className="game-container">
      {/* Header */}
      <header className="game-header">
        <h1 className="game-title">🎮 Canvas Multiplayer</h1>
        <div className="header-status">
          <div className="status-group">
            <span className="status-label">Players:</span>
            <span className="status-value">
              {Object.keys(gameStore?.gameState?.players || {}).length}
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
        />
      </div>

      {/* Escape Menu */}
      <EscapeMenu
        isOpen={isEscapeMenuOpen}
        onClose={() => setIsEscapeMenuOpen(false)}
        connectionStatus={gameStore?.isConnected ? "Connected" : "Disconnected"}
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
      />
    </div>
  );
});

export default App;
