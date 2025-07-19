import { GameStore } from "../stores/GameStore";

export class RendererService {
  private gameStore: GameStore;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  constructor(gameStore: GameStore, canvas: HTMLCanvasElement) {
    this.gameStore = gameStore;
    this.canvas = canvas;

    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Failed to get 2D rendering context");
    }
    this.ctx = context;
  }

  // Helper method to draw custom icons in canvas (Font Awesome style)
  private drawCustomIcon(
    x: number,
    y: number,
    iconType: string,
    size: number,
    color: string = "#ffffff"
  ) {
    this.ctx.save();
    this.ctx.fillStyle = color;
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = 2;

    const halfSize = size / 2;

    switch (iconType) {
      case "mouse":
        // Draw mouse shape - more elongated and realistic
        this.ctx.fillStyle = color;
        this.ctx.beginPath();
        // Create a more mouse-like shape with rounded top
        this.ctx.ellipse(
          x,
          y,
          halfSize * 0.5,
          halfSize * 1.1,
          0,
          0,
          Math.PI * 2
        );
        this.ctx.fill();

        // Draw mouse outline with thinner lines
        this.ctx.strokeStyle = "#000000";
        this.ctx.lineWidth = 1;
        this.ctx.stroke();

        // Draw middle line separating buttons (thinner)
        this.ctx.beginPath();
        this.ctx.moveTo(x, y - halfSize * 0.7);
        this.ctx.lineTo(x, y + halfSize * 0.1);
        this.ctx.stroke();
        break;

      case "mouseRight":
        // Draw mouse shape (outline) - more elongated and realistic
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = 1.5;
        this.ctx.beginPath();
        // Create a more mouse-like shape with rounded top
        this.ctx.ellipse(
          x,
          y,
          halfSize * 0.5,
          halfSize * 1.1,
          0,
          0,
          Math.PI * 2
        );
        this.ctx.stroke();

        // Draw middle line separating buttons (thinner)
        this.ctx.beginPath();
        this.ctx.moveTo(x, y - halfSize * 0.7);
        this.ctx.lineTo(x, y + halfSize * 0.1);
        this.ctx.stroke();

        // Fill the right button area (more realistic positioning)
        this.ctx.fillStyle = color;
        this.ctx.beginPath();
        // Create right button as a rounded rectangle area
        this.ctx.ellipse(
          x + halfSize * 0.25,
          y - halfSize * 0.3,
          halfSize * 0.2,
          halfSize * 0.35,
          0,
          0,
          Math.PI * 2
        );
        this.ctx.fill();
        break;

      case "rocket":
        // Draw rocket shape
        this.ctx.fillStyle = color;

        // Rocket body
        this.ctx.fillRect(
          x - halfSize * 0.3,
          y - halfSize * 0.7,
          halfSize * 0.6,
          halfSize * 1.2
        );

        // Rocket tip
        this.ctx.beginPath();
        this.ctx.moveTo(x, y - halfSize * 0.9);
        this.ctx.lineTo(x - halfSize * 0.3, y - halfSize * 0.7);
        this.ctx.lineTo(x + halfSize * 0.3, y - halfSize * 0.7);
        this.ctx.closePath();
        this.ctx.fill();

        // Rocket fins
        this.ctx.fillStyle = "#ff4444";
        this.ctx.fillRect(
          x - halfSize * 0.5,
          y + halfSize * 0.3,
          halfSize * 0.3,
          halfSize * 0.3
        );
        this.ctx.fillRect(
          x + halfSize * 0.2,
          y + halfSize * 0.3,
          halfSize * 0.3,
          halfSize * 0.3
        );
        break;

      case "bolt":
        // Draw lightning bolt
        this.ctx.fillStyle = color;
        this.ctx.beginPath();
        this.ctx.moveTo(x - halfSize * 0.3, y - halfSize * 0.8);
        this.ctx.lineTo(x + halfSize * 0.1, y - halfSize * 0.1);
        this.ctx.lineTo(x - halfSize * 0.1, y - halfSize * 0.1);
        this.ctx.lineTo(x + halfSize * 0.3, y + halfSize * 0.8);
        this.ctx.lineTo(x - halfSize * 0.1, y + halfSize * 0.1);
        this.ctx.lineTo(x + halfSize * 0.1, y + halfSize * 0.1);
        this.ctx.closePath();
        this.ctx.fill();
        break;

      case "magic":
        // Draw magic wand
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = 3;

        // Wand stick
        this.ctx.beginPath();
        this.ctx.moveTo(x - halfSize * 0.5, y + halfSize * 0.5);
        this.ctx.lineTo(x + halfSize * 0.3, y - halfSize * 0.3);
        this.ctx.stroke();

        // Magic star at tip
        this.ctx.fillStyle = color;
        const starSize = halfSize * 0.4;
        this.ctx.beginPath();
        for (let i = 0; i < 5; i++) {
          const angle = (i * 4 * Math.PI) / 5;
          const starX = x + halfSize * 0.3 + Math.cos(angle) * starSize;
          const starY = y - halfSize * 0.3 + Math.sin(angle) * starSize;
          if (i === 0) this.ctx.moveTo(starX, starY);
          else this.ctx.lineTo(starX, starY);
        }
        this.ctx.closePath();
        this.ctx.fill();
        break;
    }

    this.ctx.restore();
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
    this.drawStars();
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
    this.ctx.fillStyle = "#666666";
    this.gameStore.gameState.walls.forEach((wall) => {
      if (this.gameStore.isWallInView(wall)) {
        this.ctx.fillRect(wall.x, wall.y, wall.width, wall.height);
      }
    });
  }

  private drawPowerUps() {
    if (!this.gameStore.gameState.powerUps) return;

    Object.values(this.gameStore.gameState.powerUps).forEach((powerUp) => {
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

    this.ctx.beginPath();
    this.ctx.arc(0, 0, radius, 0, Math.PI * 2);
    this.ctx.fillStyle = depthGradient;
    this.ctx.fill();

    // Add 3D highlight/shine effect
    const shineGradient = this.ctx.createRadialGradient(
      -radius * 0.4,
      -radius * 0.4,
      0,
      -radius * 0.4,
      -radius * 0.4,
      radius * 0.8
    );
    shineGradient.addColorStop(0, `rgba(255, 255, 255, 0.8)`);
    shineGradient.addColorStop(0.3, `rgba(255, 255, 255, 0.4)`);
    shineGradient.addColorStop(0.6, `rgba(255, 255, 255, 0.1)`);
    shineGradient.addColorStop(1, `rgba(255, 255, 255, 0)`);

    this.ctx.beginPath();
    this.ctx.arc(-radius * 0.3, -radius * 0.3, radius * 0.6, 0, Math.PI * 2);
    this.ctx.fillStyle = shineGradient;
    this.ctx.fill();

    // Draw 3D rim/edge highlight
    this.ctx.strokeStyle = `rgba(255, 255, 255, 0.6)`;
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.arc(0, 0, radius - 1, 0, Math.PI * 2);
    this.ctx.stroke();

    // Add inner rim shadow for depth
    this.ctx.strokeStyle = `rgba(0, 0, 0, 0.4)`;
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    this.ctx.arc(0, 0, radius - 3, 0, Math.PI * 2);
    this.ctx.stroke();

    // Draw 3D icon with depth and shadow
    this.ctx.save();

    // Add slight offset for 3D icon effect
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
      this.ctx.moveTo(-6, -10);
      this.ctx.lineTo(2, -2);
      this.ctx.lineTo(-2, -2);
      this.ctx.lineTo(6, 10);
      this.ctx.lineTo(-2, 2);
      this.ctx.lineTo(2, 2);
      this.ctx.closePath();
      this.ctx.fill();

      // Add small circles around to indicate teleportation
      this.ctx.beginPath();
      this.ctx.arc(-8, -6, 1.5, 0, Math.PI * 2);
      this.ctx.arc(8, 6, 1.5, 0, Math.PI * 2);
      this.ctx.arc(-6, 8, 1, 0, Math.PI * 2);
      this.ctx.arc(6, -8, 1, 0, Math.PI * 2);
      this.ctx.fill();
    } else {
      // Draw boost icon (arrow pointing up)
      this.ctx.beginPath();
      this.ctx.moveTo(0, -10);
      this.ctx.lineTo(-8, 5);
      this.ctx.lineTo(-4, 2);
      this.ctx.lineTo(0, 8);
      this.ctx.lineTo(4, 2);
      this.ctx.lineTo(8, 5);
      this.ctx.closePath();
      this.ctx.fill();
    }
  }

  private drawPlayers() {
    Object.values(this.gameStore.gameState.players).forEach((player) => {
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

    const isCurrentPlayer = player.id === this.gameStore.playerId;
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
        console.warn("Invalid player position or radius for shield effect:", {
          x: player.x,
          y: player.y,
          radius: playerRadius,
        });
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
        console.warn("Invalid calculated shield values:", {
          shieldRadius,
          shieldAlpha,
        });
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
    // Boost energy indicator (bottom center)
    this.drawBoostEnergyBar();

    // XP bar (below boost bar)
    this.drawExperienceBar();

    // Missile cooldown indicator (bottom right)
    this.drawMissileCooldown();

    // Laser upgrade indicator (to the right of missile)
    this.drawLaserUpgrade();

    // Flash upgrade indicator (to the right of laser)
    this.drawFlashUpgrade();

    // Compact stats in top corner
    this.drawCompactStats();
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

  private drawMissileCooldown() {
    const iconSize = 50;
    const margin = 20;
    const spacing = 70; // Space between icons
    // Move missile to middle position (one spacing from right)
    const x = this.gameStore.CANVAS_WIDTH - iconSize - margin - spacing;
    const y = this.gameStore.CANVAS_HEIGHT - iconSize - margin;

    // Missile icon drawing function using mouse right-click indicator
    const drawMissileIcon = (centerX: number, centerY: number) => {
      this.ctx.save();

      // Draw mouse with right button highlighted
      this.drawCustomIcon(centerX, centerY, "mouseRight", 24, "#ffffff");

      this.ctx.restore();
    };

    this.drawWeaponIcon(
      x,
      y,
      iconSize,
      this.gameStore.isMissileReady,
      "RIGHT CLICK", // Right click label for missiles
      "rgba(255, 140, 0, 0.9)", // Orange theme for missiles
      drawMissileIcon,
      this.gameStore.missileCooldownPercent,
      this.gameStore.missileCooldowRemaining,
      "MISSILES" // Description text
    );

    // Draw missile level indicator in top right corner
    const player = this.gameStore.gameState.players[this.gameStore.playerId];
    if (player) {
      const missileLevel = player.missileUpgradeLevel || 1;
      this.drawLevelIndicator(x, y, iconSize, missileLevel, "#FF8C00"); // Consistent orange color
    }
  }

  private drawWeaponIcon(
    x: number,
    y: number,
    iconSize: number,
    isReady: boolean,
    keyLabel: string,
    backgroundColor: string,
    iconDrawFunction: (centerX: number, centerY: number) => void,
    cooldownPercent?: number,
    cooldownTimeLeft?: number,
    descriptionText?: string
  ) {
    // 3D Shadow effect - draw shadow first
    this.ctx.save();
    this.ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
    this.ctx.beginPath();
    this.ctx.arc(
      x + iconSize / 2 + 3,
      y + iconSize / 2 + 3,
      iconSize / 2,
      0,
      Math.PI * 2
    );
    this.ctx.fill();
    this.ctx.restore();

    // Background circle with gradient for 3D effect
    const gradient = this.ctx.createRadialGradient(
      x + iconSize / 2 - iconSize / 4,
      y + iconSize / 2 - iconSize / 4,
      0,
      x + iconSize / 2,
      y + iconSize / 2,
      iconSize / 2
    );
    gradient.addColorStop(0, "rgba(40, 40, 40, 0.9)");
    gradient.addColorStop(1, "rgba(0, 0, 0, 0.7)");
    this.ctx.fillStyle = gradient;
    this.ctx.beginPath();
    this.ctx.arc(
      x + iconSize / 2,
      y + iconSize / 2,
      iconSize / 2,
      0,
      Math.PI * 2
    );
    this.ctx.fill();

    const centerX = x + iconSize / 2;
    const centerY = y + iconSize / 2;

    // Draw weapon icon background with 3D gradient
    const iconGradient = this.ctx.createLinearGradient(
      x + 5,
      y + 5,
      x + iconSize - 5,
      y + iconSize - 5
    );
    if (isReady) {
      // Parse the background color and create gradient
      const baseColor = backgroundColor.replace("rgba(", "").replace(")", "");
      const [r, g, b, a] = baseColor
        .split(",")
        .map((v, i) => (i < 3 ? parseInt(v.trim()) : parseFloat(v.trim())));
      iconGradient.addColorStop(
        0,
        `rgba(${Math.min(255, r + 30)}, ${Math.min(255, g + 30)}, ${Math.min(255, b + 30)}, ${a})`
      );
      iconGradient.addColorStop(0.5, backgroundColor);
      iconGradient.addColorStop(
        1,
        `rgba(${Math.max(0, r - 30)}, ${Math.max(0, g - 30)}, ${Math.max(0, b - 30)}, ${a})`
      );
    } else {
      iconGradient.addColorStop(0, "rgba(130, 130, 130, 0.8)");
      iconGradient.addColorStop(0.5, "rgba(102, 102, 102, 0.8)");
      iconGradient.addColorStop(1, "rgba(70, 70, 70, 0.8)");
    }
    this.ctx.fillStyle = iconGradient;
    this.ctx.fillRect(x + 5, y + 5, iconSize - 10, iconSize - 10);

    // Draw weapon icon border with highlight
    this.ctx.strokeStyle = "#fff";
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(x + 5, y + 5, iconSize - 10, iconSize - 10);

    // Add inner highlight for 3D effect
    this.ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(x + 6, y + 6, iconSize - 12, iconSize - 12);

    // Draw weapon-specific icon
    this.ctx.fillStyle = "#fff";
    iconDrawFunction(centerX, centerY);

    // Cooldown overlay
    if (!isReady && cooldownPercent !== undefined) {
      const angle = cooldownPercent * 2 * Math.PI - Math.PI / 2; // Start from top

      this.ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
      this.ctx.beginPath();
      this.ctx.moveTo(centerX, centerY);
      this.ctx.arc(centerX, centerY, iconSize / 2, -Math.PI / 2, angle);
      this.ctx.fill();

      // Cooldown text
      if (cooldownTimeLeft !== undefined) {
        const timeLeft = Math.ceil(cooldownTimeLeft / 1000);
        this.ctx.fillStyle = "#fff";
        this.ctx.font = "14px Arial";
        this.ctx.textAlign = "center";
        this.ctx.fillText(timeLeft.toString(), centerX, centerY + 5);
      }
    }

    // Key indicator - handle special case for mouse icon
    if (keyLabel === "MOUSE") {
      this.drawMouseIcon(centerX, y - 18);
    } else if (keyLabel) {
      this.ctx.fillStyle = "#fff";
      this.ctx.font = "10px Arial";
      this.ctx.textAlign = "center";
      this.ctx.fillText(keyLabel, centerX, y - 5);
    }

    // Optional description text below icon
    if (descriptionText) {
      this.ctx.fillStyle = "#cccccc";
      this.ctx.font = "8px Arial";
      this.ctx.textAlign = "center";
      this.ctx.fillText(descriptionText, centerX, y + iconSize + 12);
    }
  }

  private drawMouseIcon(centerX: number, centerY: number) {
    this.ctx.save();

    // Mouse body outline only
    this.ctx.fillStyle = "transparent";
    this.ctx.strokeStyle = "#fff";
    this.ctx.lineWidth = 1.5;
    this.ctx.strokeRect(centerX - 8, centerY - 6, 16, 12);

    // Left button (white filled to indicate it's the active button)
    this.ctx.fillStyle = "#fff";
    this.ctx.fillRect(centerX - 7, centerY - 5, 7, 4);

    // Right button (outline only)
    this.ctx.fillStyle = "transparent";
    this.ctx.strokeRect(centerX + 1, centerY - 5, 6, 4);

    // Center divider
    this.ctx.strokeStyle = "#fff";
    this.ctx.beginPath();
    this.ctx.moveTo(centerX, centerY - 5);
    this.ctx.lineTo(centerX, centerY - 1);
    this.ctx.stroke();

    this.ctx.restore();
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
      this.drawCustomIcon(centerX, centerY, "bolt", 24, "#ff6464");

      // Add energy glow effect around the icon
      this.ctx.shadowColor = "#ff6464";
      this.ctx.shadowBlur = 10;
      this.drawCustomIcon(centerX, centerY, "bolt", 24, "#ffffff");

      this.ctx.restore();
    };

    // Use the same weapon icon template as missile
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

    // Draw laser level indicator in top right corner using template
    const laserLevel = player.laserUpgradeLevel || 0;
    this.drawLevelIndicator(x, y, iconSize, laserLevel, "#FF4040"); // Consistent red color

    // Special indicator for dual shot + backward laser (level 5)
    if (laserLevel >= 5) {
      this.ctx.fillStyle = "#ffff00";
      this.ctx.font = "8px Arial";
      this.ctx.fillText("TRI-SHOT", x + iconSize / 2, y + iconSize + 15);
    }
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
      this.drawCustomIcon(centerX, centerY, "magic", 16, "#ffffff");

      // Add glow effect
      this.ctx.shadowColor = "#ffff00";
      this.ctx.shadowBlur = 6;
      this.drawCustomIcon(centerX, centerY, "magic", 16, "#ffff00");

      this.ctx.restore();
    };

    // Use the same weapon icon template with cooldown support from GameStore
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

    // Draw flash level indicator in top right corner
    const flashLevel = player.flashUpgradeLevel || 1;
    this.drawLevelIndicator(x, y, iconSize, flashLevel, "#FFD700"); // Consistent gold color
  }

  private drawBoostEnergyBar() {
    const player = this.gameStore.gameState.players[this.gameStore.playerId];
    if (!player) return;

    // Consistent bar dimensions and spacing
    const barWidth = 120;
    const barHeight = 10;
    const margin = 12; // Consistent margin for spacing
    const x = (this.gameStore.CANVAS_WIDTH - barWidth) / 2;
    const y = this.gameStore.CANVAS_HEIGHT - 60; // More space from bottom

    this.ctx.save();

    // Draw 3D background shadow
    this.ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
    this.ctx.fillRect(x - 1, y + 2, barWidth + 6, barHeight + 6);

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

    // Energy fill with 3D gradient
    const energyPercent = (player.boostEnergy || 100) / 100;
    const fillWidth = barWidth * energyPercent;

    if (fillWidth > 0) {
      let baseColor, lightColor, darkColor;

      // Color based on energy level with 3D gradients
      if (energyPercent > 0.6) {
        baseColor = "#00ff88"; // Cyan-green
        lightColor = "#66ffaa";
        darkColor = "#00cc66";
      } else if (energyPercent > 0.3) {
        baseColor = "#ffaa00"; // Orange
        lightColor = "#ffcc44";
        darkColor = "#cc8800";
      } else {
        baseColor = "#ff4444"; // Red
        lightColor = "#ff6666";
        darkColor = "#cc2222";
      }

      // Create 3D fill gradient
      const fillGradient = this.ctx.createLinearGradient(
        x,
        y,
        x,
        y + barHeight
      );
      fillGradient.addColorStop(0, lightColor);
      fillGradient.addColorStop(0.3, baseColor);
      fillGradient.addColorStop(0.7, baseColor);
      fillGradient.addColorStop(1, darkColor);

      this.ctx.fillStyle = fillGradient;
      this.ctx.fillRect(x, y, fillWidth, barHeight);

      // Add energy glow effect if boost is active
      if (player.isBoostActive) {
        this.ctx.shadowColor = baseColor;
        this.ctx.shadowBlur = 15;
        this.ctx.shadowOffsetX = 0;
        this.ctx.shadowOffsetY = 0;
        this.ctx.fillRect(x, y, fillWidth, barHeight);
      }

      // Add 3D highlight on top of energy bar
      const highlightGradient = this.ctx.createLinearGradient(
        x,
        y,
        x,
        y + barHeight * 0.4
      );
      highlightGradient.addColorStop(0, "rgba(255, 255, 255, 0.6)");
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

    // Level number to the left of the bar with 3D text effect
    this.ctx.fillStyle = "#000";
    this.ctx.font = "12px Arial";
    this.ctx.textAlign = "right";
    // Text shadow
    this.ctx.fillText(
      `${player.boostUpgradeLevel + 1}`,
      x - margin + 1,
      y + barHeight
    );

    // Main text
    this.ctx.fillStyle = "#fff";
    this.ctx.fillText(
      `${player.boostUpgradeLevel + 1}`,
      x - margin,
      y + barHeight - 1
    );

    // Boost icon to the right of the bar with 3D effect
    const iconColor = player.isBoostActive ? "#00ffff" : "#fff";
    this.ctx.fillStyle = "#000";
    this.ctx.font = "14px Arial";
    this.ctx.textAlign = "left";
    // Icon shadow
    this.ctx.fillText("⚡", x + barWidth + margin + 1, y + barHeight);

    // Main icon
    this.ctx.fillStyle = iconColor;
    this.ctx.fillText("⚡", x + barWidth + margin, y + barHeight - 1);
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

    // Calculate XP progress manually (since player object may not have methods)
    const currentLevel = player.level || 1;
    const currentLevelXP = (currentLevel - 1) * 100;
    const nextLevelXP = currentLevel * 100;
    const progressXP = (player.experience || 0) - currentLevelXP;
    const progress = Math.max(
      0,
      Math.min(1, progressXP / (nextLevelXP - currentLevelXP))
    );

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
