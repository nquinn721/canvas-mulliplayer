import { observer } from "mobx-react-lite";
import { useEffect, useRef } from "react";
import { Game } from "./game/Game";

const App = observer(() => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<Game | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    // Initialize game
    const game = new Game(canvasRef.current);
    gameRef.current = game;

    // Start the game
    game.start().catch(console.error);

    // Cleanup on unmount
    return () => {
      game.cleanup();
      gameRef.current = null;
    };
  }, []);

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
        style={{
          border: "2px solid #333",
          cursor: "crosshair",
          backgroundColor: "#000",
        }}
      />

      <div
        style={{
          marginTop: "20px",
          padding: "15px",
          backgroundColor: "rgba(0, 0, 0, 0.7)",
          borderRadius: "8px",
          fontSize: "14px",
        }}
      >
        <div>
          <strong>Controls:</strong>
        </div>
        <div>W - Forward (toward mouse)</div>
        <div>S - Backward</div>
        <div>Shift - Speed Boost</div>
        <div>Mouse - Aim spaceship</div>
        <div>Left Click - Shoot</div>
        <div>1 - Laser (fast, 25 damage)</div>
        <div>2 - Missile (slow, 75 damage, 2s cooldown)</div>
      </div>

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
        </div>
      )}
    </div>
  );
});

export default App;
