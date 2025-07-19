import { observer } from "mobx-react-lite";
import { useEffect, useRef, useState } from "react";
import "./App.css";
import { Game } from "./game/Game";
import { soundService } from "./services/SoundService";
import { GameStore } from "./stores/GameStore";
import EscapeMenu from "./components/EscapeMenu";

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
    const PADDING = 40;
    const MIN_WIDTH = 600;
    const MIN_HEIGHT = 400;
    return {
      width: Math.max(MIN_WIDTH, window.innerWidth - PADDING),
      height: Math.max(
        MIN_HEIGHT,
        window.innerHeight - HEADER_HEIGHT - PADDING
      ),
    };
  });

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      const HEADER_HEIGHT = 50;
      const PADDING = 40;
      const MIN_WIDTH = 600;
      const MIN_HEIGHT = 400;
      const newWidth = Math.max(
        MIN_WIDTH,
        window.innerWidth - PADDING
      );
      const newHeight = Math.max(
        MIN_HEIGHT,
        window.innerHeight - HEADER_HEIGHT - PADDING
      );
      setCanvasDimensions({ width: newWidth, height: newHeight });
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Handle escape key for menu
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsEscapeMenuOpen(prev => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

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
          <div style={{ fontSize: "12px", color: "#888" }}>
            {gameStore?.isConnected ? "🟢 Online" : "🔴 Offline"}
          </div>
          <div style={{ fontSize: "12px", color: "#888", marginLeft: "20px" }}>
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
