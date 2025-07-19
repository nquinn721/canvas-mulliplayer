import { observer } from "mobx-react-lite";
import { useEffect, useRef, useState } from "react";
import { Game } from "./game/Game";
import { soundService } from "./services/SoundService";

const App = observer(() => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<Game | null>(null);
  const [isMuted, setIsMuted] = useState(() => soundService.isSoundMuted()); // Initialize with localStorage value

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

  const CANVAS_WIDTH = 1200;
  const CANVAS_HEIGHT = 800;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        backgroundColor: "#111",
        color: "white",
      }}
    >
      <h1 style={{ margin: "20px 0", color: "#4ade80" }}>
        Multiplayer Canvas Game
      </h1>

      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        onClick={handleUserInteraction}
        style={{
          border: "2px solid #333",
          cursor: "crosshair",
          backgroundColor: "#000",
        }}
      />

      {/* Sound Control Button */}
      <button
        onClick={toggleMute}
        style={{
          position: "absolute",
          top: "20px",
          right: "20px",
          padding: "10px 15px",
          backgroundColor: isMuted ? "#f87171" : "#4ade80",
          color: "white",
          border: "none",
          borderRadius: "5px",
          cursor: "pointer",
          fontSize: "14px",
          fontWeight: "bold",
        }}
      >
        {isMuted ? "🔇 Unmute" : "🔊 Mute"}
      </button>

      {gameRef.current && (
        <div
          style={{
            marginTop: "10px",
            padding: "10px",
            backgroundColor: "rgba(0, 0, 0, 0.7)",
            borderRadius: "8px",
            fontSize: "12px",
          }}
        >
          <div>
            Status: {gameRef.current.isConnected ? "Connected" : "Disconnected"}
          </div>
          <div>Game Running: {gameRef.current.isRunning ? "Yes" : "No"}</div>
          <div style={{ marginTop: "5px", fontSize: "10px", color: "#888" }}>
            🎵 Click canvas to start ambient music
          </div>
        </div>
      )}
    </div>
  );
});

export default App;
