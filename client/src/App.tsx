import { observer } from "mobx-react-lite";
import { useEffect, useRef, useState } from "react";
import "./App.css";
import { Game } from "./game/Game";
import { soundService } from "./services/SoundService";

const App = observer(() => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<Game | null>(null);
  const [isMuted, setIsMuted] = useState(() => soundService.isSoundMuted()); // Initialize with localStorage value
  const [canvasDimensions, setCanvasDimensions] = useState(() => {
    const CONTROLS_WIDTH = 320;
    const HEADER_HEIGHT = 50;
    const PADDING = 40;
    const MIN_WIDTH = 600;
    const MIN_HEIGHT = 400;
    return {
      width: Math.max(MIN_WIDTH, window.innerWidth - CONTROLS_WIDTH - PADDING),
      height: Math.max(MIN_HEIGHT, window.innerHeight - HEADER_HEIGHT - PADDING),
    };
  });

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      const CONTROLS_WIDTH = 320;
      const HEADER_HEIGHT = 50;
      const PADDING = 40;
      const MIN_WIDTH = 600;
      const MIN_HEIGHT = 400;
      const newWidth = Math.max(MIN_WIDTH, window.innerWidth - CONTROLS_WIDTH - PADDING);
      const newHeight = Math.max(MIN_HEIGHT, window.innerHeight - HEADER_HEIGHT - PADDING);

      setCanvasDimensions({ width: newWidth, height: newHeight });
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (!canvasRef.current) return;

    // Initialize game
    const game = new Game(canvasRef.current);
    gameRef.current = game;

    // Start the game
    game.start().catch(console.error);

    // Start background music after a short delay to allow user interaction
    const startMusicTimer = setTimeout(() => {
      if (!soundService.isSoundMuted()) {
        soundService.startBackgroundMusic();
      }
    }, 1000);

    // Cleanup on unmount
    return () => {
      clearTimeout(startMusicTimer);
      soundService.stopBackgroundMusic();
      game.cleanup();
      gameRef.current = null;
    };
  }, []);

  const toggleMute = () => {
    const newMuteState = soundService.toggleMute();
    setIsMuted(newMuteState);
  };

  // Start music on first user interaction
  const handleUserInteraction = () => {
    if (!soundService.isSoundMuted() && !isMuted) {
      soundService.startBackgroundMusic();
    }
  };

  return (
    <div className="game-container">
      {/* Header */}
      <header className="game-header">
        <h1 className="game-title">🎮 Canvas Multiplayer</h1>
        <div style={{ fontSize: "12px", color: "#888" }}>
          {gameRef.current?.isConnected ? "🟢 Online" : "🔴 Offline"}
        </div>
      </header>

      {/* Main game area */}
      <div className="game-main">
        {/* Controls panel */}
        <div className="controls-panel">
          {/* Audio Controls */}
          <div className="control-section">
            <h3>🎵 Audio</h3>
            <button
              onClick={toggleMute}
              className={`control-button ${isMuted ? "muted" : ""}`}
            >
              {isMuted ? "🔇 Sound Off" : "🔊 Sound On"}
            </button>
            <div className="game-tip">
              <span className="tip-icon">💡</span>
              Click canvas to start ambient music
            </div>
          </div>

          {/* Game Status */}
          <div className="control-section">
            <h3>📊 Status</h3>
            {gameRef.current && (
              <>
                <div className="status-item">
                  <span className="status-label">Connection</span>
                  <span
                    className={`status-value ${!gameRef.current.isConnected ? "disconnected" : ""}`}
                  >
                    {gameRef.current.isConnected ? "Connected" : "Disconnected"}
                  </span>
                </div>
                <div className="status-item">
                  <span className="status-label">Game State</span>
                  <span className="status-value">
                    {gameRef.current.isRunning ? "Running" : "Stopped"}
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Controls Guide */}
          <div className="control-section">
            <h3>🎮 Controls</h3>
            <div className="controls-grid">
              <div className="control-key">
                <strong>W</strong>
                Forward
              </div>
              <div className="control-key">
                <strong>S</strong>
                Backward
              </div>
              <div className="control-key">
                <strong>A</strong>
                Strafe Left
              </div>
              <div className="control-key">
                <strong>D</strong>
                Strafe Right
              </div>
              <div className="control-key">
                <strong>Mouse</strong>
                Aim & Shoot
              </div>
              <div className="control-key">
                <strong>Shift</strong>
                Boost
              </div>
            </div>
          </div>

          {/* Weapons */}
          <div className="control-section">
            <h3>⚔️ Weapons</h3>
            <div className="status-item">
              <span className="status-label">Primary</span>
              <span className="status-value">Laser Cannon</span>
            </div>
            <div className="status-item">
              <span className="status-label">Secondary</span>
              <span className="status-value">Missiles</span>
            </div>
          </div>

          {/* Game Tips */}
          <div className="control-section">
            <h3>💡 Tips</h3>
            <div className="game-tip">
              • Collect power-ups to upgrade your weapons
              <br />
              • Use boost to escape dangerous situations
              <br />
              • Strafe to dodge incoming projectiles
              <br />• Watch out for AI enemies!
            </div>
          </div>
        </div>

        {/* Canvas area */}
        <div className="canvas-container">
          <canvas
            ref={canvasRef}
            width={canvasDimensions.width}
            height={canvasDimensions.height}
            onClick={handleUserInteraction}
            className="game-canvas"
          />
        </div>
      </div>
    </div>
  );
});

export default App;
