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

  render() {
    // Ensure no lingering transparency from background effects
    this.ctx.globalAlpha = 1.0;
    this.clearCanvas();
    this.setupCamera();
    this.drawWorld();
    this.drawWalls();
    this.drawPowerUps();
    this.drawPlayers();
    this.drawProjectiles();
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

    // Different colors based on power-up type
    const isLaserUpgrade = powerUp.type === "laser_upgrade";
    const baseColor = isLaserUpgrade ? "255, 100, 100" : "0, 255, 255"; // Red for laser, cyan for boost
    const hexColor = isLaserUpgrade ? "#ff6464" : "#00ffff";

    // Draw glow effect
    const glowGradient = this.ctx.createRadialGradient(
      x,
      y,
      0,
      x,
      y,
      radius * 2
    );
    glowGradient.addColorStop(0, `rgba(${baseColor}, 0.8)`);
    glowGradient.addColorStop(0.5, `rgba(${baseColor}, 0.4)`);
    glowGradient.addColorStop(1, `rgba(${baseColor}, 0)`);

    this.ctx.fillStyle = glowGradient;
    this.ctx.fillRect(x - radius * 2, y - radius * 2, radius * 4, radius * 4);

    // Draw main power-up circle
    this.ctx.beginPath();
    this.ctx.arc(x, y, radius, 0, Math.PI * 2);
    this.ctx.fillStyle = hexColor;
    this.ctx.fill();
    this.ctx.strokeStyle = "#ffffff";
    this.ctx.lineWidth = 3;
    this.ctx.stroke();

    // Draw icon based on type
    this.ctx.fillStyle = "#000000";
    if (isLaserUpgrade) {
      // Draw laser icon (lightning bolt)
      this.ctx.beginPath();
      this.ctx.moveTo(x - 3, y - 12);
      this.ctx.lineTo(x + 5, y - 2);
      this.ctx.lineTo(x - 2, y - 2);
      this.ctx.lineTo(x + 3, y + 12);
      this.ctx.lineTo(x - 5, y + 2);
      this.ctx.lineTo(x + 2, y + 2);
      this.ctx.closePath();
      this.ctx.fill();
    } else {
      // Draw boost icon (arrow pointing up)
      this.ctx.beginPath();
      this.ctx.moveTo(x, y - 10);
      this.ctx.lineTo(x - 8, y + 5);
      this.ctx.lineTo(x - 4, y + 2);
      this.ctx.lineTo(x, y + 8);
      this.ctx.lineTo(x + 4, y + 2);
      this.ctx.lineTo(x + 8, y + 5);
      this.ctx.closePath();
      this.ctx.fill();
    }

    // Add pulsing animation
    const pulseScale = 1 + Math.sin(Date.now() * 0.005) * 0.1;
    this.ctx.save();
    this.ctx.translate(x, y);
    this.ctx.scale(pulseScale, pulseScale);
    this.ctx.translate(-x, -y);
    this.ctx.restore();
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
        this.ctx.strokeText(player.name, player.x, player.y - 45);

        // Name text
        this.ctx.fillStyle = "#fff";
        this.ctx.fillText(player.name, player.x, player.y - 45);

        // Health bar
        this.drawHealthBar(player);
      }
    });
  }

  private drawSpaceship(player: any) {
    this.ctx.save();

    // Move to player position and rotate to face mouse direction
    this.ctx.translate(player.x, player.y);
    this.ctx.rotate(player.angle);

    // Apply roll rotation if rolling
    if (player.isRolling && player.rollAngle) {
      // Roll is a rotation around the Z-axis (perpendicular to screen)
      // We simulate this by scaling the Y-axis and skewing
      const rollScale = Math.cos(player.rollAngle);
      const rollSkew = Math.sin(player.rollAngle) * 0.3; // Subtle skew effect
      this.ctx.scale(1, rollScale);
      this.ctx.transform(1, 0, rollSkew, 1, 0, 0);
    }

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

  private isPlayerMoving(): boolean {
    // Check if movement keys are pressed or player is rolling
    const keys = this.gameStore.keys;
    const currentPlayer =
      this.gameStore.gameState.players[this.gameStore.playerId];
    const isRolling = currentPlayer?.isRolling || false;
    return keys.w || keys.s || isRolling;
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

    // Side thrusters for rolling/strafing - only show during roll animation
    if (player.isRolling) {
      const sideLength = thrusterLength * 0.8;
      const sideWidth = thrusterWidth * 0.8;

      // Determine which thruster to fire based on roll direction
      if (player.rollDirection === 1) {
        // Right roll (D key)
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

      if (player.rollDirection === -1) {
        // Left roll (A key)
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

    // Health bar background
    this.ctx.fillStyle = "#333";
    this.ctx.fillRect(player.x - 20, player.y - 35, 40, 6);

    // Health bar fill
    this.ctx.fillStyle =
      healthPercent > 0.5
        ? "#4ade80"
        : healthPercent > 0.25
          ? "#fbbf24"
          : "#f87171";
    this.ctx.fillRect(player.x - 20, player.y - 35, 40 * healthPercent, 6);
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

            // Draw missile body
            this.ctx.fillStyle = "#666666";
            this.ctx.fillRect(-3, -1.5, 8, 3);

            // Draw nose cone
            this.ctx.fillStyle = "#444444";
            this.ctx.beginPath();
            this.ctx.moveTo(5, 0);
            this.ctx.lineTo(2, -1.5);
            this.ctx.lineTo(2, 1.5);
            this.ctx.closePath();
            this.ctx.fill();

            // Draw fins
            this.ctx.fillStyle = "#555555";
            this.ctx.beginPath();
            this.ctx.moveTo(-3, -1.5);
            this.ctx.lineTo(-5, -2.5);
            this.ctx.lineTo(-4, -1.5);
            this.ctx.closePath();
            this.ctx.fill();

            this.ctx.beginPath();
            this.ctx.moveTo(-3, 1.5);
            this.ctx.lineTo(-5, 2.5);
            this.ctx.lineTo(-4, 1.5);
            this.ctx.closePath();
            this.ctx.fill();

            // Draw red stripe
            this.ctx.fillStyle = "#ff4444";
            this.ctx.fillRect(-1, -0.5, 4, 1);

            this.ctx.restore();
          }
        }
      }
    });
  }

  private drawParticles() {
    this.gameStore.particleSystem.render(this.ctx);
  }

  private drawUI() {
    // Controls indicator
    this.ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    this.ctx.fillRect(10, 10, 200, 120);

    this.ctx.fillStyle = "#fff";
    this.ctx.font = "16px Arial";
    this.ctx.textAlign = "left";
    this.ctx.fillText("Controls:", 20, 30);
    this.ctx.font = "12px Arial";
    this.ctx.fillText("WASD - Move & Roll", 20, 50);
    this.ctx.fillText("Left Click - Laser", 20, 65);
    this.ctx.fillText("1 - Missile Ability", 20, 80);
    this.ctx.fillText("Shift - Speed Boost", 20, 95);
    this.ctx.fillText("A/D - Strafe & Roll", 20, 110);

    // Boost energy indicator (bottom center)
    this.drawBoostEnergyBar();

    // Missile cooldown indicator (bottom right)
    this.drawMissileCooldown();

    // Roll cooldown indicator (above missile)
    this.drawRollCooldown();

    // Laser upgrade indicator (to the right of missile)
    this.drawLaserUpgrade();

    // Stats
    this.ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    this.ctx.fillRect(this.gameStore.CANVAS_WIDTH - 120, 10, 110, 80);

    this.ctx.fillStyle = "#fff";
    this.ctx.font = "12px Arial";
    this.ctx.textAlign = "left";
    this.ctx.fillText(
      `FPS: ${this.gameStore.stats.fps}`,
      this.gameStore.CANVAS_WIDTH - 110,
      30
    );
    this.ctx.fillText(
      `Players: ${this.gameStore.playerCount}`,
      this.gameStore.CANVAS_WIDTH - 110,
      50
    );
    this.ctx.fillText(
      `Connected: ${this.gameStore.isConnected ? "Yes" : "No"}`,
      this.gameStore.CANVAS_WIDTH - 110,
      70
    );
  }

  private drawMissileCooldown() {
    const iconSize = 50;
    const margin = 20;
    const x = this.gameStore.CANVAS_WIDTH - iconSize - margin;
    const y = this.gameStore.CANVAS_HEIGHT - iconSize - margin;

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

    // Missile icon (simple rocket shape)
    this.ctx.fillStyle = this.gameStore.isMissileReady ? "#ff4444" : "#666";
    const centerX = x + iconSize / 2;
    const centerY = y + iconSize / 2;

    // Draw missile body
    this.ctx.fillRect(centerX - 3, centerY - 10, 6, 20);

    // Draw missile tip
    this.ctx.beginPath();
    this.ctx.moveTo(centerX, centerY - 15);
    this.ctx.lineTo(centerX - 4, centerY - 10);
    this.ctx.lineTo(centerX + 4, centerY - 10);
    this.ctx.fill();

    // Draw missile fins
    this.ctx.fillRect(centerX - 6, centerY + 8, 3, 6);
    this.ctx.fillRect(centerX + 3, centerY + 8, 3, 6);

    // Cooldown overlay
    if (!this.gameStore.isMissileReady) {
      const cooldownPercent = this.gameStore.missileCooldownPercent;
      const angle = cooldownPercent * 2 * Math.PI - Math.PI / 2; // Start from top

      this.ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
      this.ctx.beginPath();
      this.ctx.moveTo(centerX, centerY);
      this.ctx.arc(centerX, centerY, iconSize / 2, -Math.PI / 2, angle);
      this.ctx.fill();

      // Cooldown text
      const timeLeft = Math.ceil(this.gameStore.missileCooldowRemaining / 1000);
      this.ctx.fillStyle = "#fff";
      this.ctx.font = "14px Arial";
      this.ctx.textAlign = "center";
      this.ctx.fillText(timeLeft.toString(), centerX, centerY + 5);
    }

    // Key indicator
    this.ctx.fillStyle = "#fff";
    this.ctx.font = "10px Arial";
    this.ctx.textAlign = "center";
    this.ctx.fillText("1", centerX, y - 5);
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
    const spacing = 70; // Space between icons
    const x = this.gameStore.CANVAS_WIDTH - iconSize - margin - spacing;
    const y = this.gameStore.CANVAS_HEIGHT - iconSize - margin;

    // Draw laser icon background
    this.ctx.fillStyle = "rgba(255, 100, 100, 0.8)";
    this.ctx.fillRect(x, y, iconSize, iconSize);

    // Draw laser icon border
    this.ctx.strokeStyle = "#fff";
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(x, y, iconSize, iconSize);

    // Draw laser lightning bolt icon
    const centerX = x + iconSize / 2;
    const centerY = y + iconSize / 2;

    this.ctx.fillStyle = "#fff";
    this.ctx.beginPath();
    this.ctx.moveTo(centerX - 8, centerY - 15);
    this.ctx.lineTo(centerX + 4, centerY - 3);
    this.ctx.lineTo(centerX - 2, centerY - 3);
    this.ctx.lineTo(centerX + 8, centerY + 15);
    this.ctx.lineTo(centerX - 4, centerY + 3);
    this.ctx.lineTo(centerX + 2, centerY + 3);
    this.ctx.closePath();
    this.ctx.fill();

    // Draw level indicator
    const laserLevel = player.laserUpgradeLevel || 0;
    this.ctx.fillStyle = "#fff";
    this.ctx.font = "12px Arial";
    this.ctx.textAlign = "center";
    this.ctx.fillText(`${laserLevel}`, centerX, y - 8);

    // Special indicator for dual shot (level 5)
    if (laserLevel >= 5) {
      this.ctx.fillStyle = "#ffff00";
      this.ctx.font = "8px Arial";
      this.ctx.fillText("DUAL", centerX, centerY + 20);
    }

    // Show tooltip on hover
    if (this.gameStore.showLaserTooltip) {
      this.drawLaserTooltip(x - 200, y - 120);
    }
  }

  private drawLaserTooltip(x: number, y: number) {
    const player = this.gameStore.gameState.players[this.gameStore.playerId];
    if (!player) return;

    const laserStats = this.getLaserStatsFromPlayer(player);
    const width = 180;
    const height = 100;

    // Tooltip background
    this.ctx.fillStyle = "rgba(0, 0, 0, 0.9)";
    this.ctx.fillRect(x, y, width, height);

    // Border
    this.ctx.strokeStyle = "#ff6464";
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(x, y, width, height);

    // Title
    this.ctx.fillStyle = "#ff6464";
    this.ctx.font = "14px Arial";
    this.ctx.textAlign = "left";
    this.ctx.fillText("Laser Stats", x + 10, y + 20);

    // Stats
    this.ctx.fillStyle = "#fff";
    this.ctx.font = "12px Arial";
    this.ctx.fillText(`Level: ${laserStats.level}`, x + 10, y + 40);
    this.ctx.fillText(`Speed: ${laserStats.speed}`, x + 10, y + 55);
    this.ctx.fillText(`Damage: ${laserStats.damage}`, x + 10, y + 70);
    this.ctx.fillText(`Range: ${laserStats.distance}`, x + 10, y + 85);

    if (laserStats.dualShot) {
      this.ctx.fillStyle = "#ffff00";
      this.ctx.fillText("DUAL SHOT!", x + 90, y + 40);
    }
  }

  private getLaserStatsFromPlayer(player: any) {
    const baseSpeed = 400;
    const baseDamage = 12;
    const baseDistance = 500;
    const level = player.laserUpgradeLevel || 1; // Default to level 1

    // Level 1 is the base level with no multipliers
    if (level <= 1) {
      return {
        level: level,
        speed: baseSpeed,
        damage: baseDamage,
        distance: baseDistance,
        dualShot: false,
      };
    }

    // For levels 2+, each level above 1 increases stats by 15%/20%/20%
    const levelAboveBase = level - 1;
    const speedMultiplier = 1 + levelAboveBase * 0.15;
    const damageMultiplier = 1 + levelAboveBase * 0.2;
    const distanceMultiplier = 1 + levelAboveBase * 0.2;

    return {
      level: level,
      speed: Math.floor(baseSpeed * speedMultiplier),
      damage: Math.floor(baseDamage * damageMultiplier),
      distance: Math.floor(baseDistance * distanceMultiplier),
      dualShot: level >= 5,
    };
  }

  private drawBoostEnergyBar() {
    const player = this.gameStore.gameState.players[this.gameStore.playerId];
    if (!player) return;

    // Much smaller dimensions
    const barWidth = 80;
    const barHeight = 6;
    const x = (this.gameStore.CANVAS_WIDTH - barWidth) / 2;
    const y = this.gameStore.CANVAS_HEIGHT - 30; // Bottom middle

    // Background (subtle)
    this.ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    this.ctx.fillRect(x - 2, y - 2, barWidth + 4, barHeight + 4);

    // Border (thin)
    this.ctx.strokeStyle = "#fff";
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(x, y, barWidth, barHeight);

    // Energy fill
    const energyPercent = (player.boostEnergy || 100) / 100;
    const fillWidth = barWidth * energyPercent;

    // Color based on energy level
    if (energyPercent > 0.6) {
      this.ctx.fillStyle = "#00ff88"; // Cyan-green
    } else if (energyPercent > 0.3) {
      this.ctx.fillStyle = "#ffaa00"; // Orange
    } else {
      this.ctx.fillStyle = "#ff4444"; // Red
    }

    // Add glow effect if boost is active
    if (player.isBoostActive) {
      this.ctx.shadowColor = "#00ffff";
      this.ctx.shadowBlur = 5;
    }

    this.ctx.fillRect(x, y, fillWidth, barHeight);
    this.ctx.shadowBlur = 0;

    // Small label above the bar
    this.ctx.fillStyle = "#fff";
    this.ctx.font = "9px Arial";
    this.ctx.textAlign = "center";
    this.ctx.fillText("BOOST", x + barWidth / 2, y - 3);
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
