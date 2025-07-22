import { AbilityIconRenderer } from "../components/canvas";
import { GameStore } from "../stores/GameStore";
import { debugLogger } from "./DebugLogger";

export class RendererService {
  private gameStore: GameStore;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  // Component renderers
  private abilityRenderer: AbilityIconRenderer;

  constructor(gameStore: GameStore, canvas: HTMLCanvasElement) {
    this.gameStore = gameStore;
    this.canvas = canvas;

    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Failed to get 2D rendering context");
    }
    this.ctx = context;

    // Initialize component renderers
    this.abilityRenderer = new AbilityIconRenderer(
      this.gameStore,
      this.ctx,
      this.canvas
    );
  }

  render() {
    // Ensure no lingering transparency from background effects
    this.ctx.globalAlpha = 1.0;
    this.clearCanvas();
    this.setupCamera();
    this.drawWorld();
    this.drawWalls();
    this.drawPowerUps();
    this.drawPlayers();
    this.drawAIEnemies();
    this.drawProjectiles();
    this.drawMeteors();
    this.drawParticles();
    this.restoreCamera();
    this.drawUI();
  }

  private clearCanvas() {
    this.ctx.clearRect(
      0,
      0,
      this.gameStore.CANVAS_WIDTH,
      this.gameStore.CANVAS_HEIGHT
    );
  }

  private setupCamera() {
    this.gameStore.camera.applyTransform(this.ctx);
  }

  private restoreCamera() {
    this.gameStore.camera.restoreTransform(this.ctx);
  }

  private drawWorld() {
    // Draw space background with gradient
    const gradient = this.ctx.createRadialGradient(
      this.gameStore.WORLD_WIDTH / 2,
      this.gameStore.WORLD_HEIGHT / 2,
      0,
      this.gameStore.WORLD_WIDTH / 2,
      this.gameStore.WORLD_HEIGHT / 2,
      this.gameStore.WORLD_WIDTH * 0.8
    );
    gradient.addColorStop(0, "#1a1a2e");
    gradient.addColorStop(0.3, "#16213e");
    gradient.addColorStop(0.6, "#0f0f23");
    gradient.addColorStop(1, "#050505");

    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(
      0,
      0,
      this.gameStore.WORLD_WIDTH,
      this.gameStore.WORLD_HEIGHT
    );

    // Draw starfield
    this.drawStarfield();

    // Draw nebula clouds
    this.drawNebula();

    // Draw world bounds
    this.ctx.strokeStyle = "#444";
    this.ctx.lineWidth = 3;
    this.ctx.strokeRect(
      0,
      0,
      this.gameStore.WORLD_WIDTH,
      this.gameStore.WORLD_HEIGHT
    );
  }

  private drawWalls() {
    this.gameStore.gameState.walls.forEach((wall) => {
      if (this.gameStore.isWallInView(wall)) {
        this.drawSpaceRockWall(wall.x, wall.y, wall.width, wall.height);
      }
    });
  }

  private drawSpaceRockWall(
    x: number,
    y: number,
    width: number,
    height: number
  ) {
    this.ctx.save();

    // Create a seeded random function for consistent patterns
    const seed = x * 1000 + y;
    const random = (offset: number = 0) => {
      const value = Math.sin(seed + offset) * 43758.5453;
      return value - Math.floor(value);
    };

    // Fill the wall area with meteor rocks
    const meteorSize = 40; // Average size of each meteor
    const meteorsX = Math.ceil(width / (meteorSize * 0.8));
    const meteorsY = Math.ceil(height / (meteorSize * 0.8));

    for (let mx = 0; mx < meteorsX; mx++) {
      for (let my = 0; my < meteorsY; my++) {
        const meteorX =
          x + mx * meteorSize * 0.8 + random(mx + my * 100) * meteorSize * 0.4;
        const meteorY =
          y + my * meteorSize * 0.8 + random(mx + my * 101) * meteorSize * 0.4;
        const meteorRadius =
          meteorSize * 0.3 + random(mx + my * 102) * meteorSize * 0.2;
        const rotation = random(mx + my * 103) * Math.PI * 2;

        // Only draw if meteor is within wall bounds
        if (
          meteorX >= x - meteorRadius &&
          meteorX <= x + width + meteorRadius &&
          meteorY >= y - meteorRadius &&
          meteorY <= y + height + meteorRadius
        ) {
          this.drawSingleMeteorRock(
            meteorX,
            meteorY,
            meteorRadius,
            rotation,
            mx + my * meteorsX,
            random
          );
        }
      }
    }

    this.ctx.restore();
  }

  private drawSingleMeteorRock(
    centerX: number,
    centerY: number,
    radius: number,
    rotation: number,
    index: number,
    random: (offset?: number) => number
  ) {
    this.ctx.save();
    this.ctx.translate(centerX, centerY);
    this.ctx.rotate(rotation);

    // Draw main rocky body with irregular shape (like meteor code)
    this.ctx.fillStyle = "#2a1f1a"; // Dark brown/black rock
    this.ctx.beginPath();

    // Create irregular meteor shape
    const points = 8;
    for (let i = 0; i < points; i++) {
      const angle = (i / points) * Math.PI * 2;
      const radiusVariation =
        radius * (0.8 + Math.sin(angle * 3 + rotation + index) * 0.2);
      const x = Math.cos(angle) * radiusVariation;
      const y = Math.sin(angle) * radiusVariation;

      if (i === 0) {
        this.ctx.moveTo(x, y);
      } else {
        this.ctx.lineTo(x, y);
      }
    }
    this.ctx.closePath();
    this.ctx.fill();

    // Add rocky texture with craters and bumps (like meteor code)
    this.ctx.fillStyle = "#1a1416"; // Even darker for craters

    // Crater 1
    this.ctx.beginPath();
    this.ctx.arc(
      -radius * 0.3 + random(index + 10) * radius * 0.2,
      -radius * 0.2 + random(index + 11) * radius * 0.2,
      radius * (0.15 + random(index + 12) * 0.1),
      0,
      Math.PI * 2
    );
    this.ctx.fill();

    // Crater 2
    this.ctx.beginPath();
    this.ctx.arc(
      radius * 0.2 + random(index + 13) * radius * 0.2,
      radius * 0.3 + random(index + 14) * radius * 0.2,
      radius * (0.1 + random(index + 15) * 0.08),
      0,
      Math.PI * 2
    );
    this.ctx.fill();

    // Crater 3 (optional, based on size)
    if (radius > 15) {
      this.ctx.beginPath();
      this.ctx.arc(
        radius * 0.1 + random(index + 16) * radius * 0.2,
        -radius * 0.4 + random(index + 17) * radius * 0.2,
        radius * (0.08 + random(index + 18) * 0.06),
        0,
        Math.PI * 2
      );
      this.ctx.fill();
    }

    // Add some lighter rocky highlights (like meteor code)
    this.ctx.fillStyle = "#3d3026";
    this.ctx.beginPath();
    this.ctx.arc(
      -radius * 0.4 + random(index + 20) * radius * 0.3,
      radius * 0.1 + random(index + 21) * radius * 0.3,
      radius * (0.08 + random(index + 22) * 0.06),
      0,
      Math.PI * 2
    );
    this.ctx.fill();

    this.ctx.beginPath();
    this.ctx.arc(
      radius * 0.3 + random(index + 23) * radius * 0.2,
      -radius * 0.1 + random(index + 24) * radius * 0.2,
      radius * (0.06 + random(index + 25) * 0.04),
      0,
      Math.PI * 2
    );
    this.ctx.fill();

    // Add subtle glow edge (reduced from flying meteors since these are static)
    this.ctx.shadowColor = "#4a3b2a";
    this.ctx.shadowBlur = 4;
    this.ctx.strokeStyle = "#3a2f22";
    this.ctx.lineWidth = 1;
    this.ctx.globalAlpha = 0.5;

    // Redraw the outer edge with subtle glow
    this.ctx.beginPath();
    for (let i = 0; i < points; i++) {
      const angle = (i / points) * Math.PI * 2;
      const radiusVariation =
        radius * (0.8 + Math.sin(angle * 3 + rotation + index) * 0.2);
      const x = Math.cos(angle) * radiusVariation;
      const y = Math.sin(angle) * radiusVariation;

      if (i === 0) {
        this.ctx.moveTo(x, y);
      } else {
        this.ctx.lineTo(x, y);
      }
    }
    this.ctx.closePath();
    this.ctx.stroke();

    this.ctx.restore();
  }

  private drawPowerUps() {
    if (!this.gameStore.gameState.powerUps) return;

    Object.values(this.gameStore.gameState.powerUps).forEach((powerUp: any) => {
      if (powerUp.collected) return; // Don't draw collected power-ups

      // Check if power-up is in view using GameStore method
      if (this.gameStore.isPowerUpInView(powerUp)) {
        this.drawPowerUpIcon(powerUp);
      }
    });
  }

  private drawPowerUpIcon(powerUp: any) {
    const x = powerUp.x;
    const y = powerUp.y;
    const radius = 20;
    const time = Date.now() * 0.003;

    // Different colors based on power-up type
    const isLaserUpgrade = powerUp.type === "laser_upgrade";
    const isMissileUpgrade = powerUp.type === "missile_upgrade";
    const isHealthPickup = powerUp.type === "health_pickup";
    const isShieldPickup = powerUp.type === "shield_pickup";
    const isFlashUpgrade = powerUp.type === "flash_upgrade";

    let baseColor: string;
    let hexColor: string;
    let shadowColor: string;

    if (isLaserUpgrade) {
      baseColor = "255, 100, 100"; // Red for laser
      hexColor = "#ff6464";
      shadowColor = "#aa0000";
    } else if (isMissileUpgrade) {
      baseColor = "255, 165, 0"; // Orange for missile
      hexColor = "#ffa500";
      shadowColor = "#cc5500";
    } else if (isHealthPickup) {
      baseColor = "0, 255, 0"; // Green for health
      hexColor = "#00ff00";
      shadowColor = "#00aa00";
    } else if (isShieldPickup) {
      baseColor = "0, 100, 255"; // Blue for shield
      hexColor = "#0064ff";
      shadowColor = "#003399";
    } else if (isFlashUpgrade) {
      baseColor = "255, 255, 0"; // Yellow for flash
      hexColor = "#ffff00";
      shadowColor = "#aaaa00";
    } else {
      baseColor = "0, 255, 255"; // Cyan for boost
      hexColor = "#00ffff";
      shadowColor = "#0099aa";
    }

    // Save context for 3D transformation
    this.ctx.save();

    // Add floating animation with subtle rotation
    const floatOffset = Math.sin(time + powerUp.x * 0.01) * 3;
    const rotationAngle = Math.sin(time * 0.5) * 0.1;
    this.ctx.translate(x, y + floatOffset);
    this.ctx.rotate(rotationAngle);

    // Draw 3D shadow/depth effect (bottom layer)
    const shadowOffset = 6;
    this.ctx.fillStyle = `rgba(0, 0, 0, 0.4)`;
    this.ctx.beginPath();
    this.ctx.ellipse(
      shadowOffset,
      shadowOffset + 8,
      radius * 1.2,
      radius * 0.6,
      0,
      0,
      Math.PI * 2
    );
    this.ctx.fill();

    // Draw outer glow effect
    const glowGradient = this.ctx.createRadialGradient(
      0,
      0,
      0,
      0,
      0,
      radius * 2.5
    );
    glowGradient.addColorStop(0, `rgba(${baseColor}, 0.6)`);
    glowGradient.addColorStop(0.3, `rgba(${baseColor}, 0.3)`);
    glowGradient.addColorStop(0.7, `rgba(${baseColor}, 0.1)`);
    glowGradient.addColorStop(1, `rgba(${baseColor}, 0)`);
    this.ctx.fillStyle = glowGradient;
    this.ctx.fillRect(-radius * 2.5, -radius * 2.5, radius * 5, radius * 5);

    // Draw 3D sphere base (dark bottom part for depth)
    const depthGradient = this.ctx.createRadialGradient(
      -radius * 0.3,
      -radius * 0.3,
      0,
      0,
      0,
      radius
    );
    depthGradient.addColorStop(0, hexColor);
    depthGradient.addColorStop(0.7, shadowColor);
    depthGradient.addColorStop(1, "#000000");

    this.ctx.fillStyle = depthGradient;
    this.ctx.beginPath();
    this.ctx.arc(0, 0, radius, 0, Math.PI * 2);
    this.ctx.fill();

    // Draw icon with 3D depth effect
    this.ctx.save();
    const iconDepthOffset = 1;

    // Draw icon shadow first
    this.ctx.translate(iconDepthOffset, iconDepthOffset);
    this.ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
    this.drawPowerUpIconShape(
      isLaserUpgrade,
      isMissileUpgrade,
      isHealthPickup,
      isShieldPickup,
      isFlashUpgrade
    );

    // Draw main icon
    this.ctx.translate(-iconDepthOffset, -iconDepthOffset);
    this.ctx.fillStyle = "#ffffff";
    this.drawPowerUpIconShape(
      isLaserUpgrade,
      isMissileUpgrade,
      isHealthPickup,
      isShieldPickup,
      isFlashUpgrade
    );

    // Add icon highlight
    this.ctx.translate(-0.5, -0.5);
    this.ctx.fillStyle = `rgba(${baseColor}, 0.8)`;
    this.drawPowerUpIconShape(
      isLaserUpgrade,
      isMissileUpgrade,
      isHealthPickup,
      isShieldPickup,
      isFlashUpgrade
    );

    this.ctx.restore();

    // Add pulsing energy effect
    const pulseIntensity = Math.sin(time * 4) * 0.5 + 0.5;
    const energyGradient = this.ctx.createRadialGradient(
      0,
      0,
      radius * 0.8,
      0,
      0,
      radius * 1.2
    );
    energyGradient.addColorStop(0, `rgba(${baseColor}, 0)`);
    energyGradient.addColorStop(
      0.8,
      `rgba(${baseColor}, ${pulseIntensity * 0.3})`
    );
    energyGradient.addColorStop(1, `rgba(${baseColor}, 0)`);

    this.ctx.fillStyle = energyGradient;
    this.ctx.beginPath();
    this.ctx.arc(0, 0, radius * 1.2, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.restore();
  }

  private drawPowerUpIconShape(
    isLaserUpgrade: boolean,
    isMissileUpgrade: boolean,
    isHealthPickup: boolean,
    isShieldPickup: boolean,
    isFlashUpgrade: boolean
  ) {
    if (isLaserUpgrade) {
      // Draw laser icon (lightning bolt)
      this.ctx.beginPath();
      this.ctx.moveTo(-3, -12);
      this.ctx.lineTo(5, -2);
      this.ctx.lineTo(-2, -2);
      this.ctx.lineTo(3, 12);
      this.ctx.lineTo(-5, 2);
      this.ctx.lineTo(2, 2);
      this.ctx.closePath();
      this.ctx.fill();
    } else if (isMissileUpgrade) {
      // Draw missile icon (rocket shape)
      this.ctx.fillRect(-2, -10, 4, 14); // Body
      // Nose cone
      this.ctx.beginPath();
      this.ctx.moveTo(0, -12);
      this.ctx.lineTo(-3, -10);
      this.ctx.lineTo(3, -10);
      this.ctx.closePath();
      this.ctx.fill();
      // Fins
      this.ctx.fillRect(-4, 2, 2, 4); // Left fin
      this.ctx.fillRect(2, 2, 2, 4); // Right fin
    } else if (isHealthPickup) {
      // Draw health icon (cross/plus sign)
      this.ctx.fillRect(-8, -2, 16, 4); // Horizontal bar
      this.ctx.fillRect(-2, -8, 4, 16); // Vertical bar
    } else if (isShieldPickup) {
      // Draw shield icon
      this.ctx.beginPath();
      this.ctx.moveTo(0, -12); // Top point
      this.ctx.lineTo(-8, -8); // Top left
      this.ctx.lineTo(-10, 2); // Bottom left
      this.ctx.lineTo(-4, 10); // Bottom left curve
      this.ctx.lineTo(0, 8); // Bottom center
      this.ctx.lineTo(4, 10); // Bottom right curve
      this.ctx.lineTo(10, 2); // Bottom right
      this.ctx.lineTo(8, -8); // Top right
      this.ctx.closePath();
      this.ctx.fill();
    } else if (isFlashUpgrade) {
      // Draw flash icon (lightning bolt with teleport effect)
      this.ctx.beginPath();
      this.ctx.moveTo(-3, -12);
      this.ctx.lineTo(5, -2);
      this.ctx.lineTo(-2, -2);
      this.ctx.lineTo(3, 12);
      this.ctx.lineTo(-5, 2);
      this.ctx.lineTo(2, 2);
      this.ctx.closePath();
      this.ctx.fill();

      // Add teleport rings
      this.ctx.strokeStyle = this.ctx.fillStyle;
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.arc(0, 0, 8, 0, Math.PI * 2);
      this.ctx.stroke();
      this.ctx.beginPath();
      this.ctx.arc(0, 0, 12, 0, Math.PI * 2);
      this.ctx.stroke();
    } else {
      // Draw boost icon (speed arrows)
      for (let i = 0; i < 3; i++) {
        const offsetX = (i - 1) * 4;
        this.ctx.beginPath();
        this.ctx.moveTo(-6 + offsetX, -8);
        this.ctx.lineTo(4 + offsetX, 0);
        this.ctx.lineTo(-6 + offsetX, 8);
        this.ctx.lineTo(-2 + offsetX, 0);
        this.ctx.closePath();
        this.ctx.fill();
      }
    }
  }

  private drawPlayers() {
    Object.values(this.gameStore.gameState.players).forEach((player) => {
      // Don't render dead players (health <= 0)
      if (player.health <= 0) return;

      if (this.gameStore.isPlayerInView(player)) {
        this.drawSpaceship(player);

        // Player name (above health bar)
        this.ctx.font = "12px Arial";
        this.ctx.textAlign = "center";

        // Name background/outline for better visibility
        this.ctx.strokeStyle = "#000";
        this.ctx.lineWidth = 3;
        this.ctx.strokeText(player.name, player.x, player.y - 60);

        // Name text
        this.ctx.fillStyle = "#fff";
        this.ctx.fillText(player.name, player.x, player.y - 60);

        // Health bar
        this.drawHealthBar(player);

        // Shield effect (if player has shield)
        this.drawShieldEffect(player);
      }
    });
  }

  private drawAIEnemies() {
    // Check if aiEnemies exists in gameState
    if (!this.gameStore.gameState.aiEnemies) return;

    Object.values(this.gameStore.gameState.aiEnemies).forEach((aiEnemy) => {
      // Don't render dead AI enemies (health <= 0)
      if (aiEnemy.health <= 0) return;

      if (this.gameStore.isPlayerInView(aiEnemy)) {
        this.drawAISpaceship(aiEnemy);

        // AI name (above health bar)
        this.ctx.font = "12px Arial";
        this.ctx.textAlign = "center";

        // Name background/outline for better visibility
        this.ctx.strokeStyle = "#000";
        this.ctx.lineWidth = 3;
        this.ctx.strokeText(aiEnemy.name, aiEnemy.x, aiEnemy.y - 60);

        // Name text with red color for AI
        this.ctx.fillStyle = "#ff6666";
        this.ctx.fillText(aiEnemy.name, aiEnemy.x, aiEnemy.y - 60);

        // Health bar
        this.drawHealthBar(aiEnemy);

        // Shield effect (if AI has shield)
        this.drawShieldEffect(aiEnemy);
      }
    });
  }

  private drawSpaceship(player: any) {
    this.ctx.save();

    // Move to player position and rotate to face mouse direction
    this.ctx.translate(player.x, player.y);
    this.ctx.rotate(player.angle);

    // Roll animation removed - ship just moves without visual rotation

    // More robust current player detection to fix red ship bug
    let isCurrentPlayer = false;
    if (this.gameStore.playerId && player.id) {
      // Primary check: direct ID comparison
      isCurrentPlayer = player.id === this.gameStore.playerId;
      
      // Fallback check: if we have a current player object, compare with that
      if (!isCurrentPlayer && this.gameStore.currentPlayer) {
        isCurrentPlayer = player.id === this.gameStore.currentPlayer.id;
      }
      
      // Additional safety check: if this player object is literally the currentPlayer
      if (!isCurrentPlayer && this.gameStore.currentPlayer) {
        isCurrentPlayer = player === this.gameStore.currentPlayer;
      }
    }
    
    // Enhanced debug logging for the red ship bug using our debug system
    if (!isCurrentPlayer && this.gameStore.playerId && 
        this.gameStore.gameState.players[this.gameStore.playerId] &&
        this.gameStore.gameState.players[this.gameStore.playerId].id === player.id) {
      
      const debugInfo = {
        playerId: player.id,
        storePlayerId: this.gameStore.playerId,
        playerName: player.name,
        isCurrentPlayer,
        hasCurrentPlayer: !!this.gameStore.currentPlayer,
        currentPlayerId: this.gameStore.currentPlayer?.id,
        playerHealth: player.health,
        playerPosition: { x: player.x, y: player.y },
        gameStatePlayerIds: Object.keys(this.gameStore.gameState.players),
        timestamp: Date.now()
      };
      
      debugLogger.logRenderingIssue("Red ship bug detected - Player ID mismatch in renderer", debugInfo, 'HIGH');
      
      console.warn("Player ID mismatch detected:", debugInfo);
      // Force it to be current player if we detect the mismatch
      isCurrentPlayer = true;
      
      debugLogger.logRenderingIssue("Red ship bug - Applied fix by forcing isCurrentPlayer = true", { 
        playerId: player.id, 
        fixed: true 
      }, 'MEDIUM');
    }
    
    // Additional logging for any color rendering anomalies
    if (this.gameStore.playerId === player.id && !isCurrentPlayer) {
      debugLogger.logRenderingIssue("Critical: Current player being rendered as other player", {
        playerId: player.id,
        storePlayerId: this.gameStore.playerId,
        shouldBeCurrentPlayer: true,
        actuallyDetectedAs: isCurrentPlayer
      }, 'CRITICAL');
    }
    
    const shipColor = isCurrentPlayer ? "#4ade80" : "#f87171";
    const accentColor = isCurrentPlayer ? "#22c55e" : "#ef4444";

    // Check if player is moving (for thrusters)
    const isMoving = this.isPlayerMoving();
    const isBoostActive = player.isBoostActive || false;

    // Draw thrusters first (behind ship)
    if (isMoving) {
      this.drawThrusters(isBoostActive, this.gameStore.keys, player);
    }

    // Spaceship body (main triangle)
    this.ctx.fillStyle = shipColor;
    this.ctx.strokeStyle = "#fff";
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.moveTo(18, 0); // Nose (pointing right in local coords)
    this.ctx.lineTo(-12, -8); // Top back
    this.ctx.lineTo(-8, 0); // Back center
    this.ctx.lineTo(-12, 8); // Bottom back
    this.ctx.closePath();
    this.ctx.fill();
    this.ctx.stroke();

    // Wings/stabilizers
    this.ctx.fillStyle = accentColor;
    this.ctx.beginPath();
    this.ctx.moveTo(-2, -8);
    this.ctx.lineTo(8, -12);
    this.ctx.lineTo(12, -8);
    this.ctx.lineTo(2, -6);
    this.ctx.closePath();
    this.ctx.fill();

    this.ctx.beginPath();
    this.ctx.moveTo(-2, 8);
    this.ctx.lineTo(8, 12);
    this.ctx.lineTo(12, 8);
    this.ctx.lineTo(2, 6);
    this.ctx.closePath();
    this.ctx.fill();

    // Cockpit detail
    this.ctx.fillStyle = "#87ceeb";
    this.ctx.beginPath();
    this.ctx.arc(4, 0, 3, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.restore();
  }

  private drawAISpaceship(aiEnemy: any) {
    this.ctx.save();

    // Move to AI position and rotate to face direction
    this.ctx.translate(aiEnemy.x, aiEnemy.y);
    this.ctx.rotate(aiEnemy.angle);

    const shipColor = "#ff4444"; // Red color for AI enemies
    const accentColor = "#cc2222"; // Darker red accent

    // Spaceship body (main triangle) - slightly different shape for AI
    this.ctx.fillStyle = shipColor;
    this.ctx.strokeStyle = "#fff";
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.moveTo(20, 0); // Nose (pointing right in local coords) - slightly longer
    this.ctx.lineTo(-14, -10); // Top back - wider
    this.ctx.lineTo(-10, 0); // Back center
    this.ctx.lineTo(-14, 10); // Bottom back - wider
    this.ctx.closePath();
    this.ctx.fill();
    this.ctx.stroke();

    // Wings/stabilizers - more angular for AI
    this.ctx.fillStyle = accentColor;
    this.ctx.beginPath();
    this.ctx.moveTo(-4, -10);
    this.ctx.lineTo(6, -14);
    this.ctx.lineTo(14, -10);
    this.ctx.lineTo(4, -8);
    this.ctx.closePath();
    this.ctx.fill();

    this.ctx.beginPath();
    this.ctx.moveTo(-4, 10);
    this.ctx.lineTo(6, 14);
    this.ctx.lineTo(14, 10);
    this.ctx.lineTo(4, 8);
    this.ctx.closePath();
    this.ctx.fill();

    // AI indicator - small red dot in center
    this.ctx.fillStyle = "#ffff00"; // Yellow for AI identifier
    this.ctx.beginPath();
    this.ctx.arc(4, 0, 4, 0, Math.PI * 2);
    this.ctx.fill();

    // AI "eye" or sensor
    this.ctx.fillStyle = "#ff0000";
    this.ctx.beginPath();
    this.ctx.arc(4, 0, 2, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.restore();
  }

  private isPlayerMoving(): boolean {
    // Check if movement keys are pressed or player has strafe velocity
    const keys = this.gameStore.keys;
    const currentPlayer =
      this.gameStore.gameState.players[this.gameStore.playerId];
    const hasStrafing =
      currentPlayer &&
      (Math.abs(currentPlayer.strafeVelocityX) > 10 ||
        Math.abs(currentPlayer.strafeVelocityY) > 10);
    return keys.w || keys.s || keys.a || keys.d || hasStrafing;
  }

  private drawThrusters(isBoostActive: boolean, keys: any, player: any) {
    const time = Date.now();
    const flicker = Math.sin(time * 0.02) * 0.3 + 0.7; // Flickering effect

    // Base thruster size
    const baseLength = isBoostActive ? 25 : 15;
    const thrusterLength = baseLength * flicker;
    const thrusterWidth = isBoostActive ? 8 : 5;

    this.ctx.save();
    this.ctx.shadowColor = isBoostActive ? "#00ffff" : "#ff6b35";
    this.ctx.shadowBlur = isBoostActive ? 15 : 8;

    // Main thruster (center) - for forward/backward movement
    if (keys.w || keys.s) {
      // Determine direction (W = forward thrust from back, S = reverse thrust from front)
      const isReverse = keys.s && !keys.w;
      const thrusterX = isReverse ? 15 : -8; // Front for reverse, back for forward
      const direction = isReverse ? 1 : -1; // Reverse flame direction

      // Outer flame
      this.ctx.fillStyle = isBoostActive ? "#00bfff" : "#ff4500";
      this.ctx.beginPath();
      this.ctx.moveTo(thrusterX, -thrusterWidth / 2);
      this.ctx.lineTo(thrusterX + direction * thrusterLength, 0);
      this.ctx.lineTo(thrusterX, thrusterWidth / 2);
      this.ctx.closePath();
      this.ctx.fill();

      // Inner flame (hotter core)
      this.ctx.fillStyle = isBoostActive ? "#87ceeb" : "#ffff00";
      this.ctx.beginPath();
      this.ctx.moveTo(thrusterX, -thrusterWidth / 3);
      this.ctx.lineTo(thrusterX + direction * thrusterLength * 0.7, 0);
      this.ctx.lineTo(thrusterX, thrusterWidth / 3);
      this.ctx.closePath();
      this.ctx.fill();

      // Core (brightest part)
      this.ctx.fillStyle = "#ffffff";
      this.ctx.beginPath();
      this.ctx.moveTo(thrusterX, -thrusterWidth / 5);
      this.ctx.lineTo(thrusterX + direction * thrusterLength * 0.4, 0);
      this.ctx.lineTo(thrusterX, thrusterWidth / 5);
      this.ctx.closePath();
      this.ctx.fill();
    }

    // Side thrusters for strafing (A/D keys)
    if (keys.a || keys.d) {
      const sideLength = thrusterLength * 0.8;
      const sideWidth = thrusterWidth * 0.8;

      if (keys.d) {
        // Right strafe (D key) - left thruster fires
        this.ctx.fillStyle = isBoostActive ? "#00bfff" : "#ff4500";
        this.ctx.beginPath();
        this.ctx.moveTo(2, -12);
        this.ctx.lineTo(2, -12 - sideLength);
        this.ctx.lineTo(2 + sideWidth, -12);
        this.ctx.closePath();
        this.ctx.fill();

        // Inner flame
        this.ctx.fillStyle = isBoostActive ? "#87ceeb" : "#ffff00";
        this.ctx.beginPath();
        this.ctx.moveTo(2, -12);
        this.ctx.lineTo(2, -12 - sideLength * 0.7);
        this.ctx.lineTo(2 + sideWidth * 0.7, -12);
        this.ctx.closePath();
        this.ctx.fill();
      }

      if (keys.a) {
        // Left strafe (A key) - right thruster fires
        this.ctx.fillStyle = isBoostActive ? "#00bfff" : "#ff4500";
        this.ctx.beginPath();
        this.ctx.moveTo(2, 12);
        this.ctx.lineTo(2, 12 + sideLength);
        this.ctx.lineTo(2 + sideWidth, 12);
        this.ctx.closePath();
        this.ctx.fill();

        // Inner flame
        this.ctx.fillStyle = isBoostActive ? "#87ceeb" : "#ffff00";
        this.ctx.beginPath();
        this.ctx.moveTo(2, 12);
        this.ctx.lineTo(2, 12 + sideLength * 0.7);
        this.ctx.lineTo(2 + sideWidth * 0.7, 12);
        this.ctx.closePath();
        this.ctx.fill();
      }
    }

    this.ctx.restore();
  }

  private drawHealthBar(player: any) {
    const healthPercent = player.health / player.maxHealth;
    const barWidth = 40;
    const barHeight = 6;
    const x = player.x - 20;
    const y = player.y - 50;

    this.ctx.save();

    // Draw 3D shadow
    this.ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
    this.ctx.fillRect(x + 1, y + 2, barWidth, barHeight);

    // Draw 3D background with gradient depth
    const bgGradient = this.ctx.createLinearGradient(x, y, x, y + barHeight);
    bgGradient.addColorStop(0, "#666");
    bgGradient.addColorStop(0.5, "#333");
    bgGradient.addColorStop(1, "#111");

    this.ctx.fillStyle = bgGradient;
    this.ctx.fillRect(x, y, barWidth, barHeight);

    // Draw 3D inner shadow
    this.ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
    this.ctx.fillRect(x, y, barWidth, 1); // Top inner shadow
    this.ctx.fillRect(x, y, 1, barHeight); // Left inner shadow

    const fillWidth = barWidth * healthPercent;

    if (fillWidth > 0) {
      // Determine colors based on health level
      let baseColor, lightColor, darkColor;

      if (healthPercent > 0.5) {
        baseColor = "#4ade80"; // Green
        lightColor = "#6ee7a7";
        darkColor = "#22c55e";
      } else if (healthPercent > 0.25) {
        baseColor = "#fbbf24"; // Orange/Yellow
        lightColor = "#fcd34d";
        darkColor = "#f59e0b";
      } else {
        baseColor = "#f87171"; // Red
        lightColor = "#fca5a5";
        darkColor = "#ef4444";
      }

      // Create 3D health fill gradient
      const fillGradient = this.ctx.createLinearGradient(
        x,
        y,
        x,
        y + barHeight
      );
      fillGradient.addColorStop(0, lightColor);
      fillGradient.addColorStop(0.4, baseColor);
      fillGradient.addColorStop(0.6, baseColor);
      fillGradient.addColorStop(1, darkColor);

      this.ctx.fillStyle = fillGradient;
      this.ctx.fillRect(x, y, fillWidth, barHeight);

      // Add health glow effect for low health
      if (healthPercent <= 0.25) {
        this.ctx.shadowColor = baseColor;
        this.ctx.shadowBlur = 8;
        this.ctx.shadowOffsetX = 0;
        this.ctx.shadowOffsetY = 0;
        this.ctx.fillRect(x, y, fillWidth, barHeight);
      }

      // Add 3D highlight on top of health bar
      const highlightGradient = this.ctx.createLinearGradient(
        x,
        y,
        x,
        y + barHeight * 0.5
      );
      highlightGradient.addColorStop(0, "rgba(255, 255, 255, 0.5)");
      highlightGradient.addColorStop(1, "rgba(255, 255, 255, 0)");

      this.ctx.shadowColor = "transparent";
      this.ctx.shadowBlur = 0;
      this.ctx.fillStyle = highlightGradient;
      this.ctx.fillRect(x, y, fillWidth, barHeight * 0.5);
    }

    // Draw 3D border
    this.ctx.strokeStyle = "#999";
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(x, y, barWidth, barHeight);

    this.ctx.restore();
  }

  private drawShieldEffect(player: any) {
    // Check if player has shield (assume shield info is in player object)
    if (player.hasShield && player.shieldHealth > 0) {
      // Provide fallback radius if not present
      const playerRadius = player.radius || 15;

      // Validate player position and radius to prevent non-finite values
      if (
        !isFinite(player.x) ||
        !isFinite(player.y) ||
        !isFinite(playerRadius)
      ) {
        return;
      }

      const shieldPercent =
        player.shieldHealth / (player.maxShieldHealth || 100);
      const time = Date.now() * 0.003;

      // Draw pulsing shield effect around player
      this.ctx.save();

      // Shield circle with pulsing effect
      const shieldRadius = playerRadius + 8 + Math.sin(time) * 2;
      const shieldAlpha = 0.3 + Math.sin(time * 2) * 0.1;

      // Validate calculated values
      if (!isFinite(shieldRadius) || !isFinite(shieldAlpha)) {
        this.ctx.restore();
        return;
      }

      // Outer shield glow
      const gradient = this.ctx.createRadialGradient(
        player.x,
        player.y,
        playerRadius,
        player.x,
        player.y,
        shieldRadius + 5
      );
      gradient.addColorStop(0, `rgba(0, 100, 255, 0)`);
      gradient.addColorStop(0.7, `rgba(0, 150, 255, ${shieldAlpha})`);
      gradient.addColorStop(1, `rgba(0, 200, 255, 0)`);

      this.ctx.fillStyle = gradient;
      this.ctx.beginPath();
      this.ctx.arc(player.x, player.y, shieldRadius + 5, 0, Math.PI * 2);
      this.ctx.fill();

      // Main shield ring
      this.ctx.strokeStyle = `rgba(0, 150, 255, ${0.6 + shieldAlpha})`;
      this.ctx.lineWidth = 3;
      this.ctx.beginPath();
      this.ctx.arc(player.x, player.y, shieldRadius, 0, Math.PI * 2);
      this.ctx.stroke();

      // Shield health bar (below main health bar)
      this.ctx.fillStyle = "#222";
      this.ctx.fillRect(player.x - 20, player.y - 42, 40, 4);

      // Shield bar fill
      this.ctx.fillStyle = "#0096ff";
      this.ctx.fillRect(player.x - 20, player.y - 42, 40 * shieldPercent, 4);

      this.ctx.restore();
    }
  }

  private drawProjectiles() {
    // Draw server projectiles only
    this.gameStore.gameState.projectiles.forEach((proj) => {
      if (this.gameStore.isProjectileInView(proj)) {
        // Create a temporary projectile instance for rendering if needed
        const projectile = this.gameStore.projectileInstances.get(proj.id);
        if (projectile) {
          projectile.draw(this.ctx);
        } else {
          // Fallback rendering with proper projectile appearance
          if (proj.type === "laser") {
            // Draw laser beam
            this.ctx.save();
            this.ctx.strokeStyle = "#44ff44";
            this.ctx.lineWidth = 3;
            this.ctx.shadowColor = "#44ff44";
            this.ctx.shadowBlur = 10;

            const length = 20;
            const angle = proj.angle; // Use the projectile's actual angle

            this.ctx.beginPath();
            this.ctx.moveTo(
              proj.x - (Math.cos(angle) * length) / 2,
              proj.y - (Math.sin(angle) * length) / 2
            );
            this.ctx.lineTo(
              proj.x + (Math.cos(angle) * length) / 2,
              proj.y + (Math.sin(angle) * length) / 2
            );
            this.ctx.stroke();

            // Draw core
            this.ctx.strokeStyle = "#88ff88";
            this.ctx.lineWidth = 1;
            this.ctx.shadowBlur = 5;
            this.ctx.stroke();

            this.ctx.restore();
          } else {
            // Draw missile with detailed fallback rendering
            this.ctx.save();

            const angle = proj.angle;
            this.ctx.translate(proj.x, proj.y);
            this.ctx.rotate(angle);

            // Draw exhaust trail
            this.ctx.fillStyle = "#ff6600";
            this.ctx.shadowColor = "#ff6600";
            this.ctx.shadowBlur = 8;
            this.ctx.beginPath();
            this.ctx.ellipse(-8, 0, 6, 2, 0, 0, Math.PI * 2);
            this.ctx.fill();

            // Reset shadow
            this.ctx.shadowBlur = 0;

            // Draw missile body (made bigger)
            this.ctx.fillStyle = "#666666";
            this.ctx.fillRect(-4, -2.5, 12, 5); // Increased from 8x3 to 12x5

            // Draw nose cone (proportionally bigger)
            this.ctx.fillStyle = "#444444";
            this.ctx.beginPath();
            this.ctx.moveTo(8, 0); // Extended nose forward
            this.ctx.lineTo(3, -2.5);
            this.ctx.lineTo(3, 2.5);
            this.ctx.closePath();
            this.ctx.fill();

            // Draw fins (bigger)
            this.ctx.fillStyle = "#555555";
            this.ctx.beginPath();
            this.ctx.moveTo(-4, -2.5);
            this.ctx.lineTo(-7, -4); // Bigger fins
            this.ctx.lineTo(-5, -2.5);
            this.ctx.closePath();
            this.ctx.fill();

            this.ctx.beginPath();
            this.ctx.moveTo(-4, 2.5);
            this.ctx.lineTo(-7, 4); // Bigger fins
            this.ctx.lineTo(-5, 2.5);
            this.ctx.closePath();
            this.ctx.fill();

            // Draw red stripe (bigger)
            this.ctx.fillStyle = "#ff4444";
            this.ctx.fillRect(-1, -1, 6, 2); // Increased stripe size

            this.ctx.restore();
          }
        }
      }
    });
  }

  private drawMeteors() {
    // Draw meteors from game state
    this.gameStore.gameState.meteors?.forEach((meteor) => {
      // Check if meteor is in view
      const cameraX = this.gameStore.camera.x;
      const cameraY = this.gameStore.camera.y;
      const cameraWidth =
        this.gameStore.CANVAS_WIDTH / this.gameStore.camera.zoom;
      const cameraHeight =
        this.gameStore.CANVAS_HEIGHT / this.gameStore.camera.zoom;

      if (
        meteor.x >= cameraX - meteor.radius &&
        meteor.x <= cameraX + cameraWidth + meteor.radius &&
        meteor.y >= cameraY - meteor.radius &&
        meteor.y <= cameraY + cameraHeight + meteor.radius
      ) {
        this.ctx.save();

        // Calculate trail direction (opposite to velocity direction)
        const velocityAngle = Math.atan2(meteor.velocityY, meteor.velocityX);
        const trailAngle = velocityAngle + Math.PI; // Opposite direction
        const trailLength = 40;

        // Draw fiery tail FIRST (behind the meteor)
        this.ctx.shadowColor = "#ff4400";
        this.ctx.shadowBlur = 15;

        // Draw multiple trail segments for realistic fire effect
        for (let i = 0; i < 8; i++) {
          const distance = (i + 1) * (trailLength / 8);
          const trailX = meteor.x + Math.cos(trailAngle) * distance;
          const trailY = meteor.y + Math.sin(trailAngle) * distance;

          // Vary tail width and opacity for realistic fire effect
          const trailWidth =
            meteor.radius *
            (1 - i * 0.1) *
            (0.8 + Math.sin(Date.now() * 0.01 + i) * 0.2);
          const opacity = 0.9 - i * 0.1;

          // Color gradient from white-hot to red-orange
          let hue = 15 + i * 8; // Orange to red
          let saturation = 100;
          let lightness = 80 - i * 8; // Bright to darker

          this.ctx.fillStyle = `hsla(${hue}, ${saturation}%, ${lightness}%, ${opacity})`;
          this.ctx.beginPath();
          this.ctx.ellipse(
            trailX,
            trailY,
            trailWidth,
            trailWidth * 0.6,
            trailAngle,
            0,
            Math.PI * 2
          );
          this.ctx.fill();
        }

        // Reset shadow for rock
        this.ctx.shadowBlur = 0;

        // Now draw the meteor rock
        this.ctx.translate(meteor.x, meteor.y);
        this.ctx.rotate(meteor.rotation);

        // Draw main rocky body with irregular shape
        this.ctx.fillStyle = "#2a1f1a"; // Dark brown/black rock
        this.ctx.beginPath();

        // Create irregular meteor shape
        const points = 8;
        for (let i = 0; i < points; i++) {
          const angle = (i / points) * Math.PI * 2;
          const radius =
            meteor.radius * (0.8 + Math.sin(angle * 3 + meteor.rotation) * 0.2);
          const x = Math.cos(angle) * radius;
          const y = Math.sin(angle) * radius;

          if (i === 0) {
            this.ctx.moveTo(x, y);
          } else {
            this.ctx.lineTo(x, y);
          }
        }
        this.ctx.closePath();
        this.ctx.fill();

        // Add rocky texture with craters and bumps
        this.ctx.fillStyle = "#1a1416"; // Even darker for craters

        // Crater 1
        this.ctx.beginPath();
        this.ctx.arc(
          -meteor.radius * 0.3,
          -meteor.radius * 0.2,
          meteor.radius * 0.2,
          0,
          Math.PI * 2
        );
        this.ctx.fill();

        // Crater 2
        this.ctx.beginPath();
        this.ctx.arc(
          meteor.radius * 0.2,
          meteor.radius * 0.3,
          meteor.radius * 0.15,
          0,
          Math.PI * 2
        );
        this.ctx.fill();

        // Crater 3
        this.ctx.beginPath();
        this.ctx.arc(
          meteor.radius * 0.1,
          -meteor.radius * 0.4,
          meteor.radius * 0.1,
          0,
          Math.PI * 2
        );
        this.ctx.fill();

        // Add some lighter rocky highlights
        this.ctx.fillStyle = "#3d3026";
        this.ctx.beginPath();
        this.ctx.arc(
          -meteor.radius * 0.4,
          meteor.radius * 0.1,
          meteor.radius * 0.1,
          0,
          Math.PI * 2
        );
        this.ctx.fill();

        this.ctx.beginPath();
        this.ctx.arc(
          meteor.radius * 0.3,
          -meteor.radius * 0.1,
          meteor.radius * 0.08,
          0,
          Math.PI * 2
        );
        this.ctx.fill();

        // Draw glowing fire around the rock edges
        this.ctx.shadowColor = "#ff6600";
        this.ctx.shadowBlur = 12;
        this.ctx.strokeStyle = "#ff4400";
        this.ctx.lineWidth = 2;
        this.ctx.globalAlpha = 0.7;

        // Redraw the outer edge with fire glow
        this.ctx.beginPath();
        for (let i = 0; i < points; i++) {
          const angle = (i / points) * Math.PI * 2;
          const radius =
            meteor.radius * (0.8 + Math.sin(angle * 3 + meteor.rotation) * 0.2);
          const x = Math.cos(angle) * radius;
          const y = Math.sin(angle) * radius;

          if (i === 0) {
            this.ctx.moveTo(x, y);
          } else {
            this.ctx.lineTo(x, y);
          }
        }
        this.ctx.closePath();
        this.ctx.stroke();

        // Add bright hot spots on the rock
        this.ctx.globalAlpha = 0.8;
        this.ctx.fillStyle = "#ff8800";
        this.ctx.shadowBlur = 8;

        this.ctx.beginPath();
        this.ctx.arc(
          meteor.radius * 0.2,
          meteor.radius * 0.1,
          meteor.radius * 0.1,
          0,
          Math.PI * 2
        );
        this.ctx.fill();

        this.ctx.beginPath();
        this.ctx.arc(
          -meteor.radius * 0.1,
          -meteor.radius * 0.3,
          meteor.radius * 0.08,
          0,
          Math.PI * 2
        );
        this.ctx.fill();

        this.ctx.restore();
      }
    });
  }

  private drawStars() {
    const totalStars = this.gameStore.gameState.stars?.length || 0;
    let visibleStars = 0;
    let explodingStars = 0;

    this.gameStore.gameState.stars?.forEach((star: any) => {
      this.ctx.save();

      // Check if star is in view
      const isInView = this.gameStore.camera.isInView(
        {
          x: star.x - star.explosionRadius,
          y: star.y - star.explosionRadius,
          width: star.explosionRadius * 2,
          height: star.explosionRadius * 2,
        },
        20 // padding
      );

      if (!isInView) {
        this.ctx.restore();
        return;
      }

      visibleStars++;
      if (star.isExploding) explodingStars++;

      this.ctx.translate(star.x, star.y);

      if (star.isExploding) {
        // Draw explosion effect
        const progress =
          (Date.now() - star.explosionStartTime) / star.explosionDuration;
        const explosionRadius = star.explosionRadius * progress;

        // Reset any previous canvas state
        this.ctx.shadowColor = "transparent";
        this.ctx.shadowBlur = 0;
        this.ctx.globalCompositeOperation = "source-over";

        // Make explosion MUCH more visible
        const baseRadius = Math.max(explosionRadius, 50); // Minimum 50px radius

        // Massive outer explosion ring (bright yellow)
        this.ctx.globalAlpha = Math.max(0.8 * (1 - progress), 0.3);
        this.ctx.fillStyle = "#ffff00";
        this.ctx.shadowColor = "#ffff00";
        this.ctx.shadowBlur = 40;
        this.ctx.beginPath();
        this.ctx.arc(0, 0, baseRadius * 1.5, 0, Math.PI * 2);
        this.ctx.fill();

        // Bright white core
        this.ctx.globalAlpha = Math.max(0.9 * (1 - progress), 0.4);
        this.ctx.fillStyle = "#ffffff";
        this.ctx.shadowColor = "#ffffff";
        this.ctx.shadowBlur = 50;
        this.ctx.beginPath();
        this.ctx.arc(0, 0, baseRadius, 0, Math.PI * 2);
        this.ctx.fill();

        // Red outer ring for contrast
        this.ctx.globalAlpha = Math.max(0.6 * (1 - progress), 0.2);
        this.ctx.fillStyle = "#ff4400";
        this.ctx.shadowColor = "#ff4400";
        this.ctx.shadowBlur = 30;
        this.ctx.beginPath();
        this.ctx.arc(0, 0, baseRadius * 2, 0, Math.PI * 2);
        this.ctx.fill();
      } else {
        // Draw normal star
        const timeUntilExplosion =
          star.lifespan - (Date.now() - star.createdAt);
        const isAboutToExplode = timeUntilExplosion <= 3000;

        // Warning effect if about to explode
        if (isAboutToExplode) {
          const warningIntensity = 1 - timeUntilExplosion / 3000;
          const pulseSpeed = 5 + warningIntensity * 10;
          const pulse = Math.sin(Date.now() * 0.01 * pulseSpeed) * 0.5 + 0.5;

          // Warning glow
          this.ctx.globalAlpha = 0.3 + pulse * 0.4 * warningIntensity;
          this.ctx.fillStyle = "#ff0000";
          this.ctx.shadowColor = "#ff0000";
          this.ctx.shadowBlur = 20 + pulse * 10;
          this.ctx.beginPath();
          this.ctx.arc(
            0,
            0,
            star.radius * (2 + pulse * warningIntensity),
            0,
            Math.PI * 2
          );
          this.ctx.fill();
        }

        // Main star body with twinkling
        const twinkle = Math.sin(star.twinklePhase) * 0.3 + 0.7;
        this.ctx.globalAlpha = star.brightness * twinkle;
        this.ctx.fillStyle = isAboutToExplode ? "#ffaa00" : "#ffffff";
        this.ctx.shadowColor = isAboutToExplode ? "#ff4400" : "#ffffff";
        this.ctx.shadowBlur = 8 + twinkle * 4;

        // Draw star shape (5-pointed star)
        this.ctx.beginPath();
        for (let i = 0; i < 10; i++) {
          const angle = (i * Math.PI) / 5;
          const radius = i % 2 === 0 ? star.radius : star.radius * 0.4;
          const x = Math.cos(angle - Math.PI / 2) * radius;
          const y = Math.sin(angle - Math.PI / 2) * radius;

          if (i === 0) {
            this.ctx.moveTo(x, y);
          } else {
            this.ctx.lineTo(x, y);
          }
        }
        this.ctx.closePath();
        this.ctx.fill();

        // Inner star glow
        this.ctx.globalAlpha = 0.6 * twinkle;
        this.ctx.fillStyle = "#ffffff";
        this.ctx.shadowBlur = 4;
        this.ctx.beginPath();
        this.ctx.arc(0, 0, star.radius * 0.3, 0, Math.PI * 2);
        this.ctx.fill();

        // Star sparkles
        if (Math.random() < 0.1) {
          for (let i = 0; i < 4; i++) {
            const angle = (i / 4) * Math.PI * 2;
            const distance = star.radius * (1.5 + Math.random() * 0.5);
            const x = Math.cos(angle) * distance;
            const y = Math.sin(angle) * distance;

            this.ctx.globalAlpha = 0.8 * Math.random();
            this.ctx.fillStyle = "#ffffff";
            this.ctx.shadowBlur = 6;
            this.ctx.beginPath();
            this.ctx.arc(x, y, 1, 0, Math.PI * 2);
            this.ctx.fill();
          }
        }
      }

      this.ctx.restore();
    });
  }

  private drawParticles() {
    this.gameStore.particleSystem.render(this.ctx);
  }

  private drawUI() {
    // Delegate UI rendering to the AbilityIconRenderer
    this.abilityRenderer.render();

    // Keep non-ability UI elements here
    this.drawBoostEnergyBar();
    this.drawTopLeftExperience();
    // this.drawCompactStats(); // Removed FPS and player count display
  }

  private drawCompactStats() {
    const margin = 10;
    const iconSize = 16;
    const spacing = 25;

    // FPS display
    this.ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
    this.ctx.fillRect(margin, margin, 80, 24);

    this.ctx.fillStyle = "#fff";
    this.ctx.font = "12px Arial";
    this.ctx.textAlign = "left";
    this.ctx.fillText(
      `FPS: ${this.gameStore.stats.fps}`,
      margin + 5,
      margin + 16
    );

    // Player count with icon
    const playerIconX = margin + 90;
    const playerIconY = margin;

    this.ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
    this.ctx.fillRect(playerIconX, playerIconY, 45, 24);

    // Draw player icon (simple person silhouette)
    this.ctx.fillStyle = "#4ade80";
    this.ctx.beginPath();
    this.ctx.arc(playerIconX + 8, playerIconY + 8, 3, 0, Math.PI * 2); // Head
    this.ctx.fill();

    this.ctx.fillRect(playerIconX + 6, playerIconY + 12, 4, 6); // Body
    this.ctx.fillRect(playerIconX + 4, playerIconY + 18, 2, 4); // Left leg
    this.ctx.fillRect(playerIconX + 10, playerIconY + 18, 2, 4); // Right leg

    // Player count text
    this.ctx.fillStyle = "#fff";
    this.ctx.font = "11px Arial";
    this.ctx.textAlign = "left";
    this.ctx.fillText(
      `${this.gameStore.playerCount}`,
      playerIconX + 18,
      playerIconY + 16
    );

    // Connection status section removed
  }

  private drawLevelIndicator(
    x: number,
    y: number,
    iconSize: number,
    level: number,
    backgroundColor: string = "#4CAF50"
  ) {
    const circleRadius = 8; // Smaller radius
    const offset = 6; // More offset from the icon edge
    const circleX = x + iconSize - circleRadius + offset;
    const circleY = y + circleRadius - offset;

    this.ctx.save();

    // Bluish gradient background
    const gradient = this.ctx.createRadialGradient(
      circleX,
      circleY - 2,
      0,
      circleX,
      circleY,
      circleRadius
    );
    gradient.addColorStop(0, "#6bb6ff"); // Light blue
    gradient.addColorStop(1, "#1e3a8a"); // Dark blue

    this.ctx.fillStyle = gradient;
    this.ctx.beginPath();
    this.ctx.arc(circleX, circleY, circleRadius, 0, Math.PI * 2);
    this.ctx.fill();

    // Simple border
    this.ctx.strokeStyle = "#ffffff";
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.arc(circleX, circleY, circleRadius, 0, Math.PI * 2);
    this.ctx.stroke();

    // Draw level number - simple flat text
    this.ctx.fillStyle = "#ffffff";
    this.ctx.font = "bold 11px Arial";
    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "middle";
    this.ctx.fillText(`${level}`, circleX, circleY);

    this.ctx.restore();
  }

  private drawRollCooldown() {
    const player = this.gameStore.gameState.players[this.gameStore.playerId];
    if (!player) return;

    const iconSize = 40; // Slightly smaller than missile icon
    const margin = 20;
    const x = this.gameStore.CANVAS_WIDTH - iconSize - margin;
    const y = this.gameStore.CANVAS_HEIGHT - iconSize - margin - 70; // Above missile icon

    const currentTime = Date.now();
    const isRollReady = player.canRoll ? player.canRoll(currentTime) : true;

    // Background circle
    this.ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    this.ctx.beginPath();
    this.ctx.arc(
      x + iconSize / 2,
      y + iconSize / 2,
      iconSize / 2,
      0,
      Math.PI * 2
    );
    this.ctx.fill();

    // Roll icon (circular arrow)
    this.ctx.fillStyle = isRollReady ? "#00aaff" : "#666";
    const centerX = x + iconSize / 2;
    const centerY = y + iconSize / 2;

    // Draw circular arrow for roll
    this.ctx.strokeStyle = isRollReady ? "#00aaff" : "#666";
    this.ctx.lineWidth = 3;
    this.ctx.beginPath();
    this.ctx.arc(centerX, centerY, 12, 0, Math.PI * 1.5);
    this.ctx.stroke();

    // Arrow head
    this.ctx.fillStyle = isRollReady ? "#00aaff" : "#666";
    this.ctx.beginPath();
    this.ctx.moveTo(centerX + 8, centerY - 8);
    this.ctx.lineTo(centerX + 12, centerY - 4);
    this.ctx.lineTo(centerX + 8, centerY - 4);
    this.ctx.closePath();
    this.ctx.fill();

    // Cooldown overlay
    if (!isRollReady && player.getRollCooldownPercent) {
      const cooldownPercent = player.getRollCooldownPercent(currentTime);
      const angle = cooldownPercent * 2 * Math.PI - Math.PI / 2; // Start from top

      this.ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
      this.ctx.beginPath();
      this.ctx.moveTo(centerX, centerY);
      this.ctx.arc(centerX, centerY, iconSize / 2, -Math.PI / 2, angle);
      this.ctx.fill();

      // Cooldown text
      const timeLeft = player.getRollCooldownRemaining
        ? Math.ceil(player.getRollCooldownRemaining(currentTime) / 1000)
        : 0;
      if (timeLeft > 0) {
        this.ctx.fillStyle = "#fff";
        this.ctx.font = "12px Arial";
        this.ctx.textAlign = "center";
        this.ctx.fillText(timeLeft.toString(), centerX, centerY + 4);
      }
    }

    // Key indicator
    this.ctx.fillStyle = "#fff";
    this.ctx.font = "10px Arial";
    this.ctx.textAlign = "center";
    this.ctx.fillText("A/D", centerX, y - 5);
  }

  private drawLaserUpgrade() {
    const player = this.gameStore.gameState.players[this.gameStore.playerId];
    if (!player) return;

    const iconSize = 50;
    const margin = 20;
    // Move laser to the far right (no spacing)
    const x = this.gameStore.CANVAS_WIDTH - iconSize - margin;
    const y = this.gameStore.CANVAS_HEIGHT - iconSize - margin;

    // Laser icon drawing function using custom icons
    const drawLaserIcon = (centerX: number, centerY: number) => {
      this.ctx.save();

      // Draw custom lightning bolt icon
      // this.drawCustomIcon(centerX, centerY, "bolt", 24, "#ff6464");

      // Add energy glow effect around the icon
      this.ctx.shadowColor = "#ff6464";
      this.ctx.shadowBlur = 10;
      // this.drawCustomIcon(centerX, centerY, "bolt", 24, "#ffffff");

      this.ctx.restore();
    };

    // Use the same weapon icon template as missile
    /*
    this.drawWeaponIcon(
      x,
      y,
      iconSize,
      true, // Always ready (no cooldown for laser)
      "MOUSE", // Mouse icon to indicate left-click
      "rgba(255, 64, 64, 0.9)", // Red theme for lasers
      drawLaserIcon,
      undefined, // No cooldown percent
      undefined, // No cooldown time
      "LASER" // Description text
    );
    */

    // Draw laser level indicator in top right corner using template
    // const laserLevel = player.laserUpgradeLevel || 0;
    // this.drawLevelIndicator(x, y, iconSize, laserLevel, "#FF4040"); // Consistent red color

    // Special indicator for dual shot + backward laser (level 5)
    /*
    if (laserLevel >= 5) {
      this.ctx.fillStyle = "#ffff00";
      this.ctx.font = "8px Arial";
      this.ctx.fillText("TRI-SHOT", x + iconSize / 2, y + iconSize + 15);
    }
    */
  }

  private drawFlashUpgrade() {
    const player = this.gameStore.gameState.players[this.gameStore.playerId];
    if (!player) return;

    const iconSize = 50;
    const margin = 20;
    const spacing = 70; // Space between icons
    // Move flash to the left position (two spacings from right)
    const x = this.gameStore.CANVAS_WIDTH - iconSize - margin - spacing * 2;
    const y = this.gameStore.CANVAS_HEIGHT - iconSize - margin;

    // Flash icon drawing function using Font Awesome
    const drawFlashIcon = (centerX: number, centerY: number) => {
      this.ctx.save();

      // Draw teleport portal rings as background
      this.ctx.strokeStyle = "#ffff00";
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.arc(centerX, centerY, 10, 0, Math.PI * 2);
      this.ctx.stroke();

      this.ctx.lineWidth = 1;
      this.ctx.beginPath();
      this.ctx.arc(centerX, centerY, 6, 0, Math.PI * 2);
      this.ctx.stroke();

      // Draw custom magic icon in center
      // this.drawCustomIcon(centerX, centerY, "magic", 16, "#ffffff");

      // Add glow effect
      this.ctx.shadowColor = "#ffff00";
      this.ctx.shadowBlur = 6;
      // this.drawCustomIcon(centerX, centerY, "magic", 16, "#ffff00");

      this.ctx.restore();
    };

    // Use the same weapon icon template with cooldown support from GameStore
    /*
    this.drawWeaponIcon(
      x,
      y,
      iconSize,
      this.gameStore.isFlashReady,
      "F", // Key label for flash
      "rgba(255, 215, 0, 0.9)", // Gold theme for flash
      drawFlashIcon,
      this.gameStore.flashCooldownPercent,
      this.gameStore.flashCooldownRemaining,
      "FLASH" // Description text
    );
    */

    // Draw flash level indicator in top right corner
    // const flashLevel = player.flashUpgradeLevel || 1;
    // this.drawLevelIndicator(x, y, iconSize, flashLevel, "#FFD700"); // Consistent gold color
  }

  private drawBoostEnergyBar() {
    const player = this.gameStore.gameState.players[this.gameStore.playerId];
    if (!player) return;

    // Enhanced bar dimensions with menu-style design
    const barWidth = 180; // Wider bar
    const barHeight = 14; // Taller for better visibility
    const margin = 15;
    const x = (this.gameStore.CANVAS_WIDTH - barWidth) / 2;
    const y = this.gameStore.CANVAS_HEIGHT - 35; // Moved down to replace experience bar position

    this.ctx.save();

    // Menu-style background with blur effect
    const bgPadding = 8;
    const bgX = x - bgPadding;
    const bgY = y - bgPadding;
    const bgWidth = barWidth + bgPadding * 2;
    const bgHeight = barHeight + bgPadding * 2;

    // Background with gradient similar to modal styling
    const bgGradient = this.ctx.createLinearGradient(
      bgX,
      bgY,
      bgX,
      bgY + bgHeight
    );
    bgGradient.addColorStop(0, "rgba(10, 10, 25, 0.95)");
    bgGradient.addColorStop(1, "rgba(20, 20, 35, 0.9)");

    this.ctx.fillStyle = bgGradient;
    this.ctx.fillRect(bgX, bgY, bgWidth, bgHeight);

    // Border with cyan accent like menus
    this.ctx.strokeStyle = "rgba(0, 212, 255, 0.3)";
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(bgX, bgY, bgWidth, bgHeight);

    // Inner border for depth
    this.ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(bgX + 1, bgY + 1, bgWidth - 2, bgHeight - 2);

    // Energy fill with enhanced styling
    const energyPercent = (player.boostEnergy || 0) / 100;
    const fillWidth = barWidth * energyPercent;

    // Check if energy is empty and boost is being attempted
    const isEnergyEmpty = energyPercent <= 0;

    if (fillWidth > 0) {
      let baseColor, lightColor, darkColor, shadowColor;

      // Enhanced color scheme with glow effects
      if (energyPercent > 0.6) {
        baseColor = "#00ff88"; // Cyan-green
        lightColor = "#66ffaa";
        darkColor = "#00cc66";
        shadowColor = "#00ff88";
      } else if (energyPercent > 0.3) {
        baseColor = "#ffaa00"; // Orange
        lightColor = "#ffcc44";
        darkColor = "#cc8800";
        shadowColor = "#ffaa00";
      } else {
        baseColor = "#ff4444"; // Red
        lightColor = "#ff6666";
        darkColor = "#cc2222";
        shadowColor = "#ff4444";
      }

      // Enhanced 3D fill gradient
      const fillGradient = this.ctx.createLinearGradient(
        x,
        y,
        x,
        y + barHeight
      );
      fillGradient.addColorStop(0, lightColor);
      fillGradient.addColorStop(0.2, baseColor);
      fillGradient.addColorStop(0.8, baseColor);
      fillGradient.addColorStop(1, darkColor);

      this.ctx.fillStyle = fillGradient;
      this.ctx.fillRect(x, y, fillWidth, barHeight);

      // Enhanced glow effect if boost is active
      if (player.isBoostActive) {
        this.ctx.shadowColor = shadowColor;
        this.ctx.shadowBlur = 20;
        this.ctx.shadowOffsetX = 0;
        this.ctx.shadowOffsetY = 0;
        this.ctx.fillRect(x, y, fillWidth, barHeight);
      }

      // Enhanced highlight with animated shimmer
      const time = Date.now() * 0.003;
      const shimmerOffset = Math.sin(time) * 10;

      const highlightGradient = this.ctx.createLinearGradient(
        x + shimmerOffset,
        y,
        x + shimmerOffset + 40,
        y + barHeight
      );
      highlightGradient.addColorStop(0, "rgba(255, 255, 255, 0)");
      highlightGradient.addColorStop(0.3, "rgba(255, 255, 255, 0.4)");
      highlightGradient.addColorStop(0.7, "rgba(255, 255, 255, 0.4)");
      highlightGradient.addColorStop(1, "rgba(255, 255, 255, 0)");

      this.ctx.shadowColor = "transparent";
      this.ctx.shadowBlur = 0;
      this.ctx.fillStyle = highlightGradient;
      this.ctx.fillRect(x, y, fillWidth, barHeight);
    }

    // Enhanced empty energy animation
    if (isEnergyEmpty) {
      const time = Date.now() * 0.002;
      const breathe = (Math.sin(time) + 1) * 0.5;
      const intensity = 0.2 + breathe * 0.3;

      this.ctx.fillStyle = `rgba(255, 68, 68, ${intensity})`;
      this.ctx.fillRect(x, y, barWidth, barHeight);

      this.ctx.strokeStyle = `rgba(255, 68, 68, ${intensity + 0.3})`;
      this.ctx.lineWidth = 1;
      this.ctx.strokeRect(x, y, barWidth, barHeight);
    }

    this.ctx.restore();

    // Enhanced level indicator with menu styling
    const levelBgX = x - 45;
    const levelBgY = y - 2;
    const levelBgWidth = 35;
    const levelBgHeight = barHeight + 4;

    // Level background with menu styling
    const levelBgGradient = this.ctx.createLinearGradient(
      levelBgX,
      levelBgY,
      levelBgX,
      levelBgY + levelBgHeight
    );
    levelBgGradient.addColorStop(0, "rgba(0, 212, 255, 0.2)");
    levelBgGradient.addColorStop(1, "rgba(0, 212, 255, 0.1)");

    this.ctx.fillStyle = levelBgGradient;
    this.ctx.fillRect(levelBgX, levelBgY, levelBgWidth, levelBgHeight);

    this.ctx.strokeStyle = "rgba(0, 212, 255, 0.4)";
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(levelBgX, levelBgY, levelBgWidth, levelBgHeight);

    // Level text with glow
    this.ctx.fillStyle = "#000";
    this.ctx.font = "bold 12px Arial";
    this.ctx.textAlign = "center";
    this.ctx.fillText(
      `LV${player.boostUpgradeLevel + 1}`,
      levelBgX + levelBgWidth / 2 + 1,
      y + barHeight / 2 + 5
    );

    this.ctx.fillStyle = "#00d4ff";
    this.ctx.fillText(
      `LV${player.boostUpgradeLevel + 1}`,
      levelBgX + levelBgWidth / 2,
      y + barHeight / 2 + 4
    );

    // Enhanced boost icon with menu styling
    const iconBgX = x + barWidth + 10;
    const iconBgY = y - 2;
    const iconBgWidth = 35;
    const iconBgHeight = barHeight + 4;

    this.ctx.fillStyle = levelBgGradient;
    this.ctx.fillRect(iconBgX, iconBgY, iconBgWidth, iconBgHeight);

    this.ctx.strokeStyle = "rgba(0, 212, 255, 0.4)";
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(iconBgX, iconBgY, iconBgWidth, iconBgHeight);

    // Enhanced boost icon
    const iconColor = player.isBoostActive ? "#00ffff" : "#00d4ff";
    this.ctx.fillStyle = "#000";
    this.ctx.font = "16px Arial";
    this.ctx.textAlign = "center";
    this.ctx.fillText(
      "⚡",
      iconBgX + iconBgWidth / 2 + 1,
      y + barHeight / 2 + 6
    );

    this.ctx.fillStyle = iconColor;
    this.ctx.fillText("⚡", iconBgX + iconBgWidth / 2, y + barHeight / 2 + 5);

    // Add text shadow/glow for boost icon
    if (player.isBoostActive) {
      this.ctx.shadowColor = iconColor;
      this.ctx.shadowBlur = 10;
      this.ctx.fillText("⚡", iconBgX + iconBgWidth / 2, y + barHeight / 2 + 5);
      this.ctx.shadowBlur = 0;
    }
  }

  private drawTopLeftExperience() {
    const player = this.gameStore.gameState.players[this.gameStore.playerId];
    if (!player) return;

    const margin = 20;
    const containerWidth = 220;
    const containerHeight = 60;
    const x = margin;
    const y = margin;

    this.ctx.save();

    // Menu-style background with modal styling
    const bgGradient = this.ctx.createLinearGradient(
      x,
      y,
      x,
      y + containerHeight
    );
    bgGradient.addColorStop(0, "rgba(10, 10, 25, 0.95)");
    bgGradient.addColorStop(1, "rgba(20, 20, 35, 0.9)");

    this.ctx.fillStyle = bgGradient;
    this.ctx.fillRect(x, y, containerWidth, containerHeight);

    // Border with cyan accent like menus
    this.ctx.strokeStyle = "rgba(0, 212, 255, 0.3)";
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(x, y, containerWidth, containerHeight);

    // Inner border for depth
    this.ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(x + 1, y + 1, containerWidth - 2, containerHeight - 2);

    // User icon (rounded avatar)
    const iconSize = 40;
    const iconX = x + 15;
    const iconY = y + 10;

    // Icon background circle with gradient
    const iconGradient = this.ctx.createRadialGradient(
      iconX + iconSize / 2,
      iconY + iconSize / 2,
      0,
      iconX + iconSize / 2,
      iconY + iconSize / 2,
      iconSize / 2
    );
    iconGradient.addColorStop(0, "#4a90e2");
    iconGradient.addColorStop(0.7, "#357abd");
    iconGradient.addColorStop(1, "#1e3a8a");

    this.ctx.fillStyle = iconGradient;
    this.ctx.beginPath();
    this.ctx.arc(
      iconX + iconSize / 2,
      iconY + iconSize / 2,
      iconSize / 2,
      0,
      Math.PI * 2
    );
    this.ctx.fill();

    // Icon border
    this.ctx.strokeStyle = "rgba(0, 212, 255, 0.6)";
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.arc(
      iconX + iconSize / 2,
      iconY + iconSize / 2,
      iconSize / 2,
      0,
      Math.PI * 2
    );
    this.ctx.stroke();

    // User icon symbol (simplified person silhouette)
    this.ctx.fillStyle = "#ffffff";
    const centerX = iconX + iconSize / 2;
    const centerY = iconY + iconSize / 2;

    // Head
    this.ctx.beginPath();
    this.ctx.arc(centerX, centerY - 8, 6, 0, Math.PI * 2);
    this.ctx.fill();

    // Body
    this.ctx.fillRect(centerX - 4, centerY - 2, 8, 12);

    // Arms
    this.ctx.fillRect(centerX - 8, centerY + 2, 4, 8);
    this.ctx.fillRect(centerX + 4, centerY + 2, 4, 8);

    // Experience info section
    const textX = iconX + iconSize + 15;
    const textY = iconY + 12;

    // Level display
    this.ctx.fillStyle = "#000";
    this.ctx.font = "bold 16px Arial";
    this.ctx.textAlign = "left";
    this.ctx.fillText(`Level ${player.level || 1}`, textX + 1, textY + 1);

    this.ctx.fillStyle = "#00d4ff";
    this.ctx.fillText(`Level ${player.level || 1}`, textX, textY);

    // Experience points
    this.ctx.fillStyle = "#000";
    this.ctx.font = "12px Arial";
    this.ctx.fillText(`${player.experience || 0} XP`, textX + 1, textY + 18);

    this.ctx.fillStyle = "#ffd700";
    this.ctx.fillText(`${player.experience || 0} XP`, textX, textY + 17);

    // Experience progress bar
    const barWidth = 120;
    const barHeight = 6;
    const barX = textX;
    const barY = textY + 25;

    // Calculate XP progress using new exponential system
    const currentLevel = player.level || 1;

    // Calculate current and next level XP requirements using exponential progression
    let currentLevelXP = 0;
    let nextLevelXP = 0;
    const baseXP = 100;
    const multiplier = 1.5;

    // Calculate total XP needed for current level
    for (let level = 1; level < currentLevel; level++) {
      currentLevelXP += Math.floor(baseXP * Math.pow(multiplier, level - 1));
    }

    // Calculate XP needed for next level
    nextLevelXP =
      currentLevelXP +
      Math.floor(baseXP * Math.pow(multiplier, currentLevel - 1));

    const progressXP = (player.experience || 0) - currentLevelXP;
    const xpNeededForLevel = nextLevelXP - currentLevelXP;
    const progress = Math.max(0, Math.min(1, progressXP / xpNeededForLevel));

    // Progress bar background
    this.ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
    this.ctx.fillRect(barX, barY, barWidth, barHeight);

    // Progress bar border
    this.ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(barX, barY, barWidth, barHeight);

    // Progress fill
    const fillWidth = barWidth * progress;
    if (fillWidth > 0) {
      const progressGradient = this.ctx.createLinearGradient(
        barX,
        barY,
        barX,
        barY + barHeight
      );
      progressGradient.addColorStop(0, "#ffef94");
      progressGradient.addColorStop(0.5, "#ffd700");
      progressGradient.addColorStop(1, "#b8860b");

      this.ctx.fillStyle = progressGradient;
      this.ctx.fillRect(barX, barY, fillWidth, barHeight);

      // Progress bar glow
      this.ctx.shadowColor = "#ffd700";
      this.ctx.shadowBlur = 8;
      this.ctx.fillRect(barX, barY, fillWidth, barHeight);
      this.ctx.shadowBlur = 0;
    }

    // Progress text (current/next XP)
    this.ctx.fillStyle = "#000";
    this.ctx.font = "10px Arial";
    this.ctx.textAlign = "right";
    this.ctx.fillText(
      `${progressXP}/${nextLevelXP - currentLevelXP}`,
      barX + barWidth + 1,
      barY + barHeight + 1
    );

    this.ctx.fillStyle = "#cccccc";
    this.ctx.fillText(
      `${progressXP}/${nextLevelXP - currentLevelXP}`,
      barX + barWidth,
      barY + barHeight
    );

    this.ctx.restore();
  }

  private drawExperienceBar() {
    const player = this.gameStore.gameState.players[this.gameStore.playerId];
    if (!player) return;

    // XP bar dimensions - consistent sizing with boost bar
    const barWidth = 120; // Same width as boost bar
    const barHeight = 6; // Slightly smaller but proportional
    const margin = 12; // Same margin as boost bar
    const x = (this.gameStore.CANVAS_WIDTH - barWidth) / 2;
    const y = this.gameStore.CANVAS_HEIGHT - 35; // Consistent spacing below boost bar

    this.ctx.save();

    // Draw 3D background shadow
    this.ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
    this.ctx.fillRect(x - 1, y + 1, barWidth + 6, barHeight + 6);

    // Draw 3D background with gradient depth
    const bgGradient = this.ctx.createLinearGradient(x, y, x, y + barHeight);
    bgGradient.addColorStop(0, "rgba(20, 20, 20, 0.9)");
    bgGradient.addColorStop(0.5, "rgba(40, 40, 40, 0.9)");
    bgGradient.addColorStop(1, "rgba(60, 60, 60, 0.9)");

    this.ctx.fillStyle = bgGradient;
    this.ctx.fillRect(x - 3, y - 3, barWidth + 6, barHeight + 6);

    // Draw 3D inner shadow
    this.ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
    this.ctx.fillRect(x - 1, y - 1, barWidth + 2, 2); // Top inner shadow
    this.ctx.fillRect(x - 1, y - 1, 2, barHeight + 2); // Left inner shadow

    // Calculate XP progress using new exponential system
    const currentLevel = player.level || 1;

    // Calculate current and next level XP requirements using exponential progression
    let currentLevelXP = 0;
    let nextLevelXP = 0;
    const baseXP = 100;
    const multiplier = 1.5;

    // Calculate total XP needed for current level
    for (let level = 1; level < currentLevel; level++) {
      currentLevelXP += Math.floor(baseXP * Math.pow(multiplier, level - 1));
    }

    // Calculate XP needed for next level
    nextLevelXP =
      currentLevelXP +
      Math.floor(baseXP * Math.pow(multiplier, currentLevel - 1));

    const progressXP = (player.experience || 0) - currentLevelXP;
    const xpNeededForLevel = nextLevelXP - currentLevelXP;
    const progress = Math.max(0, Math.min(1, progressXP / xpNeededForLevel));

    const fillWidth = barWidth * progress;

    if (fillWidth > 0) {
      // Create 3D XP fill gradient (gold theme)
      const fillGradient = this.ctx.createLinearGradient(
        x,
        y,
        x,
        y + barHeight
      );
      fillGradient.addColorStop(0, "#ffef94"); // Light gold
      fillGradient.addColorStop(0.3, "#ffd700"); // Gold
      fillGradient.addColorStop(0.7, "#ffd700"); // Gold
      fillGradient.addColorStop(1, "#b8860b"); // Dark gold

      this.ctx.fillStyle = fillGradient;
      this.ctx.fillRect(x, y, fillWidth, barHeight);

      // Add XP glow effect
      this.ctx.shadowColor = "#ffd700";
      this.ctx.shadowBlur = 8;
      this.ctx.shadowOffsetX = 0;
      this.ctx.shadowOffsetY = 0;
      this.ctx.fillRect(x, y, fillWidth, barHeight);

      // Add 3D highlight on top of XP bar
      const highlightGradient = this.ctx.createLinearGradient(
        x,
        y,
        x,
        y + barHeight * 0.4
      );
      highlightGradient.addColorStop(0, "rgba(255, 255, 255, 0.7)");
      highlightGradient.addColorStop(1, "rgba(255, 255, 255, 0)");

      this.ctx.shadowColor = "transparent";
      this.ctx.shadowBlur = 0;
      this.ctx.fillStyle = highlightGradient;
      this.ctx.fillRect(x, y, fillWidth, barHeight * 0.4);
    }

    // Draw 3D border with depth
    this.ctx.strokeStyle = "#999";
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(x - 1, y - 1, barWidth + 2, barHeight + 2);

    // Outer border highlight
    this.ctx.strokeStyle = "#ccc";
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(x - 2, y - 2, barWidth + 4, barHeight + 4);

    this.ctx.restore();

    // Level number to the left with 3D text effect
    this.ctx.fillStyle = "#000";
    this.ctx.font = "11px Arial";
    this.ctx.textAlign = "right";
    // Text shadow
    this.ctx.fillText(`LV ${currentLevel}`, x - margin + 1, y + barHeight);

    // Main text
    this.ctx.fillStyle = "#fff";
    this.ctx.fillText(`LV ${currentLevel}`, x - margin, y + barHeight - 1);

    // XP to the right with 3D text effect
    this.ctx.fillStyle = "#000";
    this.ctx.textAlign = "left";
    // XP shadow
    this.ctx.fillText(
      `${player.experience || 0} XP`,
      x + barWidth + margin + 1,
      y + barHeight
    );

    // Main XP text
    this.ctx.fillStyle = "#fff";
    this.ctx.fillText(
      `${player.experience || 0} XP`,
      x + barWidth + margin,
      y + barHeight - 1
    );
  }

  private drawStarfield() {
    // Generate deterministic stars based on camera position for performance
    const camera = this.gameStore.camera;
    const starDensity = 0.0008; // stars per pixel
    const viewLeft = camera.x - 100;
    const viewTop = camera.y - 100;
    const viewWidth = this.gameStore.CANVAS_WIDTH + 200;
    const viewHeight = this.gameStore.CANVAS_HEIGHT + 200;

    // Use a simple pseudo-random function based on position
    const random = (x: number, y: number) => {
      const seed = Math.abs((x * 73856093) ^ (y * 19349663));
      return Math.abs((seed * seed * seed) % 2147483647) / 2147483647;
    };

    this.ctx.save();

    // Draw small stars
    for (
      let x = Math.floor(viewLeft / 50) * 50;
      x < viewLeft + viewWidth;
      x += 50
    ) {
      for (
        let y = Math.floor(viewTop / 50) * 50;
        y < viewTop + viewHeight;
        y += 50
      ) {
        if (random(x, y) < starDensity * 2500) {
          const starX = x + random(x + 1, y) * 50;
          const starY = y + random(x, y + 1) * 50;
          const brightness = 0.3 + random(x + 2, y) * 0.7;
          const size = 0.5 + random(x, y + 2) * 1.5;

          this.ctx.fillStyle = `rgba(255, 255, 255, ${brightness})`;
          this.ctx.beginPath();
          this.ctx.arc(starX, starY, size, 0, Math.PI * 2);
          this.ctx.fill();
        }
      }
    }

    // Draw medium stars
    for (
      let x = Math.floor(viewLeft / 100) * 100;
      x < viewLeft + viewWidth;
      x += 100
    ) {
      for (
        let y = Math.floor(viewTop / 100) * 100;
        y < viewTop + viewHeight;
        y += 100
      ) {
        if (random(x + 10, y + 10) < starDensity * 5000) {
          const starX = x + random(x + 11, y + 10) * 100;
          const starY = y + random(x + 10, y + 11) * 100;
          const brightness = 0.5 + random(x + 12, y + 10) * 0.5;
          const size = 1 + random(x + 10, y + 12) * 2;

          this.ctx.fillStyle = `rgba(200, 220, 255, ${brightness})`;
          this.ctx.beginPath();
          this.ctx.arc(starX, starY, size, 0, Math.PI * 2);
          this.ctx.fill();
        }
      }
    }

    // Draw bright stars with twinkle effect
    for (
      let x = Math.floor(viewLeft / 200) * 200;
      x < viewLeft + viewWidth;
      x += 200
    ) {
      for (
        let y = Math.floor(viewTop / 200) * 200;
        y < viewTop + viewHeight;
        y += 200
      ) {
        if (random(x + 20, y + 20) < starDensity * 10000) {
          const starX = x + random(x + 21, y + 20) * 200;
          const starY = y + random(x + 20, y + 21) * 200;
          const twinkle =
            0.7 + Math.sin(Date.now() * 0.003 + starX * 0.01) * 0.3;
          const size = 2 + random(x + 20, y + 22) * 2;

          this.ctx.shadowColor = "#ffffff";
          this.ctx.shadowBlur = 8;
          this.ctx.fillStyle = `rgba(255, 255, 255, ${twinkle})`;
          this.ctx.beginPath();
          this.ctx.arc(starX, starY, size, 0, Math.PI * 2);
          this.ctx.fill();

          this.ctx.shadowBlur = 0;
        }
      }
    }

    this.ctx.restore();
  }

  private drawNebula() {
    const camera = this.gameStore.camera;
    const time = Date.now() * 0.0005;

    this.ctx.save();
    this.ctx.globalAlpha = 0.15;

    // Generate nebula clouds based on camera position
    const random = (x: number, y: number) => {
      const seed = Math.abs((x * 73856093) ^ (y * 19349663));
      return Math.abs((seed * seed * seed) % 2147483647) / 2147483647;
    };

    const viewLeft = camera.x - 200;
    const viewTop = camera.y - 200;
    const viewWidth = this.gameStore.CANVAS_WIDTH + 400;
    const viewHeight = this.gameStore.CANVAS_HEIGHT + 400;

    // Draw nebula patches
    for (
      let x = Math.floor(viewLeft / 300) * 300;
      x < viewLeft + viewWidth;
      x += 300
    ) {
      for (
        let y = Math.floor(viewTop / 300) * 300;
        y < viewTop + viewHeight;
        y += 300
      ) {
        if (random(x + 100, y + 100) < 0.3) {
          const nebulaX = x + random(x + 101, y + 100) * 300;
          const nebulaY = y + random(x + 100, y + 101) * 300;
          const size = 80 + random(x + 102, y + 100) * 120;
          const hue = random(x + 100, y + 102) * 360;
          const animationOffset = random(x + 103, y + 100) * Math.PI * 2;

          const gradient = this.ctx.createRadialGradient(
            nebulaX,
            nebulaY,
            0,
            nebulaX,
            nebulaY,
            size
          );

          const alpha = 0.3 + Math.sin(time + animationOffset) * 0.1;
          gradient.addColorStop(0, `hsla(${hue}, 70%, 60%, ${alpha})`);
          gradient.addColorStop(
            0.5,
            `hsla(${hue + 30}, 80%, 50%, ${alpha * 0.5})`
          );
          gradient.addColorStop(1, "transparent");

          this.ctx.fillStyle = gradient;
          this.ctx.beginPath();
          this.ctx.arc(nebulaX, nebulaY, size, 0, Math.PI * 2);
          this.ctx.fill();
        }
      }
    }

    this.ctx.restore();
  }

  // Update canvas size if needed
  updateCanvasSize(width: number, height: number) {
    this.canvas.width = width;
    this.canvas.height = height;
  }
}
