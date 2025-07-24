import { faBars } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { observer } from "mobx-react-lite";
import { useEffect, useRef, useState } from "react";
import "../App.css";
import { Game } from "../game/Game";
import { useSocket } from "../hooks/useSocket";
import { debugLogger } from "../services/DebugLogger";
import { soundService } from "../services/SoundService";
import {
  gameSessionService,
  gameStore,
  scoreService,
  socketService,
} from "../stores";
import DeathMenu from "./DeathMenu";
import EscapeMenu from "./EscapeMenu";

interface GameComponentProps {
  playerName: string;
  aiDifficulty: "EASY" | "MEDIUM" | "HARD" | "EXPERT" | "NIGHTMARE";
  onReturnToHome: () => void;
}

const GameComponent = observer(
  ({ playerName, aiDifficulty, onReturnToHome }: GameComponentProps) => {
    // Use socket hook to ensure connection
    const { isConnected, joinGame } = useSocket();

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
    const [selectedMusicTrack, setSelectedMusicTrack] = useState(() =>
      soundService.getMusicTrack()
    );
    const [currentAIDifficulty, setCurrentAIDifficulty] = useState<
      "EASY" | "MEDIUM" | "HARD" | "EXPERT" | "NIGHTMARE"
    >(aiDifficulty);
    const [isEscapeMenuOpen, setIsEscapeMenuOpen] = useState(false);
    const [isPlayerDead, setIsPlayerDead] = useState(false);
    const [canvasDimensions, setCanvasDimensions] = useState(() => {
      const HEADER_HEIGHT = 43;
      return {
        width: window.innerWidth,
        height: window.innerHeight - HEADER_HEIGHT,
      };
    });

    // Handle window resize
    useEffect(() => {
      const handleResize = () => {
        const HEADER_HEIGHT = 43;
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

      // Start new game session for tracking
      gameSessionService.startSession();

      // Initialize game with global store and socket service
      const game = new Game(canvasRef.current, gameStore, socketService);
      gameRef.current = game;

      // Start the game
      game.start().catch(console.error);

      // Set AI difficulty and join with player name when game starts
      setTimeout(() => {
        if (gameStore?.socket) {
          // Initialize debug logger with socket connection
          debugLogger.setSocket(gameStore.socket);
          debugLogger.log(
            "CONNECTION",
            "LOW",
            "Debug logger initialized with socket connection",
            {
              playerId: gameStore.playerId,
              playerName: playerName,
              socketId: gameStore.socket.id,
            }
          );

          // Join the game with the player's chosen name
          if (isConnected) {
            joinGame(playerName);
            // Initialize game stats for this session
            gameStore?.initializeGameSession();
            // After joining, try to set the AI difficulty from home menu selection
            // This will only succeed if the player has permission to change it
            setTimeout(() => {
              if (gameStore?.socket) {
                gameStore.socket.emit("changeAIDifficulty", {
                  difficulty: aiDifficulty,
                });
              }
            }, 500); // Reduced delay to match server cooldown
          } else {
            // Wait for connection and then join
            const checkConnection = setInterval(() => {
              if (gameStore.isConnected) {
                joinGame(playerName);
                // Initialize game stats for this session
                gameStore?.initializeGameSession();
                // After joining, try to set the AI difficulty from home menu selection
                setTimeout(() => {
                  if (gameStore?.socket) {
                    gameStore.socket.emit("changeAIDifficulty", {
                      difficulty: aiDifficulty,
                    });
                  }
                }, 500); // Reduced delay to match server cooldown
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
        // End session if component unmounts
        gameSessionService.endSession();
      };
    }, [aiDifficulty]);

    // Track game stats changes in real-time for session service
    useEffect(() => {
      // Update session score whenever game score changes
      gameSessionService.updateScore(gameStore.gameStats.score);
    }, [gameStore.gameStats.score]);

    // Track kills and deaths with session state
    useEffect(() => {
      // Update session service with current total values
      // The session service tracks totals from the game session start
      const sessionData = gameSessionService.getSessionStats();
      const currentKills = gameStore.gameStats.kills;
      const currentDeaths = gameStore.gameStats.deaths;

      // Only update if the values actually changed to avoid infinite loops
      if (
        sessionData.kills !== currentKills ||
        sessionData.deaths !== currentDeaths
      ) {
        // Calculate the delta and update session
        const killDelta = currentKills - sessionData.kills;
        const deathDelta = currentDeaths - sessionData.deaths;

        for (let i = 0; i < killDelta; i++) {
          gameSessionService.addKill();
        }
        for (let i = 0; i < deathDelta; i++) {
          gameSessionService.addDeath();
        }
      }
    }, [gameStore.gameStats.kills, gameStore.gameStats.deaths]);

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

    const handleMusicTrackChange = (trackNumber: number) => {
      setSelectedMusicTrack(trackNumber);
      soundService.setMusicTrack(trackNumber);
    };

    const changeAIDifficulty = (
      difficulty: "EASY" | "MEDIUM" | "HARD" | "EXPERT" | "NIGHTMARE"
    ) => {
      if (gameStore?.socket) {
        gameStore.socket.emit("changeAIDifficulty", { difficulty });
        // Don't update local state immediately - wait for server confirmation
      }
    };

    // Handle AI difficulty change responses
    useEffect(() => {
      if (!gameStore?.socket) return;

      const handleAIDifficultyChanged = (data: {
        difficulty: string;
        affectedEnemies: number;
      }) => {
        setCurrentAIDifficulty(
          data.difficulty as "EASY" | "MEDIUM" | "HARD" | "EXPERT" | "NIGHTMARE"
        );
      };

      const handleAIDifficultyRejected = (data: {
        reason: string;
        message: string;
        currentDifficulty: string;
      }) => {
        // Keep the current difficulty highlighted (don't change the UI state)
        console.warn("AI difficulty change rejected:", data.message);
      };

      const handleAIDifficultyStatus = (data: {
        currentDifficulty: string;
        lastChangedBy: string | null;
        changeTimestamp: number;
        aiEnemyCount: number;
      }) => {
        setCurrentAIDifficulty(
          data.currentDifficulty as
            | "EASY"
            | "MEDIUM"
            | "HARD"
            | "EXPERT"
            | "NIGHTMARE"
        );
      };

      gameStore.socket.on("aiDifficultyChanged", handleAIDifficultyChanged);
      gameStore.socket.on(
        "aiDifficultyChangeRejected",
        handleAIDifficultyRejected
      );
      gameStore.socket.on("aiDifficultyStatus", handleAIDifficultyStatus);

      return () => {
        gameStore.socket?.off("aiDifficultyChanged", handleAIDifficultyChanged);
        gameStore.socket?.off(
          "aiDifficultyChangeRejected",
          handleAIDifficultyRejected
        );
        gameStore.socket?.off("aiDifficultyStatus", handleAIDifficultyStatus);
      };
    }, [gameStore?.socket]);

    // Death detection effect
    useEffect(() => {
      if (gameStore?.currentPlayer) {
        const isDead = gameStore.currentPlayer.health <= 0;
        const wasAliveBefore = !isPlayerDead;

        setIsPlayerDead(isDead);

        // Play death sound when player dies (transition from alive to dead)
        if (isDead && wasAliveBefore) {
          soundService.playDeathSound();
        }
      }
    }, [gameStore?.currentPlayer?.health, isPlayerDead]);

    // Handle respawn
    const handleRespawn = () => {
      if (gameStore?.socket && gameStore.isConnected) {
        // Clear all key states to prevent stuck movement from death menu
        gameStore.clearAllKeys();

        // Request respawn from server
        gameStore.socket.emit("respawn", { playerName });

        // Restart background music
        soundService.handleRevive();

        // Don't set isPlayerDead to false here - wait for server confirmation
        // The isPlayerDead state will be updated when the player's health changes
      }
    };

    const handleReturnToHome = async () => {
      console.log("GameComponent: handleReturnToHome called");
      console.log(
        "GameComponent: Socket connected before cleanup:",
        gameStore.isConnected
      );

      // End the game session and save data
      await gameSessionService.endSession();

      // Save game score before leaving (legacy support)
      if (gameStore.gameStats.score > 0 || gameStore.gameStats.kills > 0) {
        const gameResult = {
          score: gameStore.gameStats.score,
          kills: gameStore.gameStats.kills,
          deaths: gameStore.gameStats.deaths,
          timeElapsed: gameStore.gameStats.gameStartTime
            ? Date.now() - gameStore.gameStats.gameStartTime
            : 0,
          difficulty: currentAIDifficulty,
        };

        try {
          const result = await scoreService.saveGameResult(gameResult);
          console.log("Score saved:", result.message);
        } catch (error) {
          console.error("Failed to save score:", error);
        }
      }

      // Reset ability levels before leaving the game
      if (gameStore.isConnected && gameStore.socket) {
        console.log("GameComponent: Sending resetAbilities command");
        gameStore.socket.emit("resetAbilities");
      }

      // Clean up game before returning to home
      if (gameRef.current) {
        console.log("GameComponent: Cleaning up game");
        soundService.stopBackgroundMusic();
        gameRef.current.cleanup();
        gameRef.current = null;
      }

      // Reset the game store
      console.log("GameComponent: Calling gameStore.reset()");
      gameStore.reset();

      console.log(
        "GameComponent: Socket connected after cleanup:",
        gameStore.isConnected
      );

      // Restart background music for home menu if not muted
      soundService.handleRevive();

      console.log("GameComponent: Calling onReturnToHome()");
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
              <span className="status-label">Swarm Bases:</span>
              <span className="status-value">
                {Object.keys(gameStore?.gameState?.swarmBases || {}).filter(
                  (baseId) =>
                    !gameStore?.gameState?.swarmBases?.[baseId]?.isDestroyed
                ).length || 0}
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
            <button
              className="menu-button"
              onClick={() => setIsEscapeMenuOpen(true)}
              title="Open Menu (ESC)"
            >
              <FontAwesomeIcon icon={faBars} />
              <span>Menu</span>
            </button>
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
              pointerEvents: isPlayerDead ? "none" : "auto",
              filter: isPlayerDead ? "grayscale(50%) brightness(70%)" : "none",
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
            playerCount={
              Object.keys(gameStore?.gameState?.players || {}).length
            }
            enemyCount={
              Object.keys(gameStore?.gameState?.aiEnemies || {}).length
            }
            isConnected={gameStore?.isConnected || false}
            isMuted={isMuted}
            onMuteToggle={toggleMute}
            masterVolume={masterVolume}
            sfxVolume={sfxVolume}
            musicVolume={musicVolume}
            onMasterVolumeChange={handleMasterVolumeChange}
            onSfxVolumeChange={handleSfxVolumeChange}
            onMusicVolumeChange={handleMusicVolumeChange}
            selectedMusicTrack={selectedMusicTrack}
            onMusicTrackChange={handleMusicTrackChange}
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
