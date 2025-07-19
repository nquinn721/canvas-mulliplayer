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
    this.drawAIEnemies();
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
    const isMissileUpgrade = powerUp.type === "missile_upgrade";
    const isHealthPickup = powerUp.type === "health_pickup";
    const isShieldPickup = powerUp.type === "shield_pickup";
    let baseColor: string;
    let hexColor: string;

    if (isLaserUpgrade) {
      baseColor = "255, 100, 100"; // Red for laser
      hexColor = "#ff6464";
    } else if (isMissileUpgrade) {
      baseColor = "255, 165, 0"; // Orange for missile
      hexColor = "#ffa500";
    } else if (isHealthPickup) {
      baseColor = "0, 255, 0"; // Green for health
      hexColor = "#00ff00";
    } else if (isShieldPickup) {
      baseColor = "0, 100, 255"; // Blue for shield
      hexColor = "#0064ff";
    } else {
      baseColor = "0, 255, 255"; // Cyan for boost
      hexColor = "#00ffff";
    }

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
    } else if (isMissileUpgrade) {
      // Draw missile icon (rocket shape)
      this.ctx.fillRect(x - 2, y - 10, 4, 14); // Body
      // Nose cone
      this.ctx.beginPath();
      this.ctx.moveTo(x, y - 12);
      this.ctx.lineTo(x - 3, y - 10);
      this.ctx.lineTo(x + 3, y - 10);
      this.ctx.closePath();
      this.ctx.fill();
      // Fins
      this.ctx.fillRect(x - 4, y + 2, 2, 4); // Left fin
      this.ctx.fillRect(x + 2, y + 2, 2, 4); // Right fin
    } else if (isHealthPickup) {
      // Draw health icon (cross/plus sign)
      this.ctx.fillStyle = "#ffffff"; // White cross
      this.ctx.fillRect(x - 8, y - 2, 16, 4); // Horizontal bar
      this.ctx.fillRect(x - 2, y - 8, 4, 16); // Vertical bar
    } else if (isShieldPickup) {
      // Draw shield icon
      this.ctx.fillStyle = "#ffffff"; // White shield
      this.ctx.beginPath();
      this.ctx.moveTo(x, y - 12); // Top point
      this.ctx.lineTo(x - 8, y - 8); // Top left
      this.ctx.lineTo(x - 10, y + 2); // Bottom left
      this.ctx.lineTo(x - 4, y + 10); // Bottom left curve
      this.ctx.lineTo(x, y + 8); // Bottom center
      this.ctx.lineTo(x + 4, y + 10); // Bottom right curve
      this.ctx.lineTo(x + 10, y + 2); // Bottom right
      this.ctx.lineTo(x + 8, y - 8); // Top right
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

    // Health bar background
    this.ctx.fillStyle = "#333";
    this.ctx.fillRect(player.x - 20, player.y - 50, 40, 6);

    // Health bar fill
    this.ctx.fillStyle =
      healthPercent > 0.5
        ? "#4ade80"
        : healthPercent > 0.25
          ? "#fbbf24"
          : "#f87171";
    this.ctx.fillRect(player.x - 20, player.y - 50, 40 * healthPercent, 6);
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
    // Boost energy indicator (bottom center)
    this.drawBoostEnergyBar();

    // XP bar (below boost bar)
    this.drawExperienceBar();

    // Missile cooldown indicator (bottom right)
    this.drawMissileCooldown();

    // Roll cooldown indicator (above missile)
    this.drawRollCooldown();

    // Laser upgrade indicator (to the right of missile)
    this.drawLaserUpgrade();

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

    // Connection status with icon
    const connectionX = margin + 145;
    const connectionY = margin;

    this.ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
    this.ctx.fillRect(connectionX, connectionY, 24, 24);

    const isConnected = this.gameStore.isConnected;

    if (isConnected) {
      // Green checkmark
      this.ctx.strokeStyle = "#4ade80";
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.moveTo(connectionX + 6, connectionY + 12);
      this.ctx.lineTo(connectionX + 10, connectionY + 16);
      this.ctx.lineTo(connectionX + 18, connectionY + 8);
      this.ctx.stroke();
    } else {
      // Red X
      this.ctx.strokeStyle = "#f87171";
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.moveTo(connectionX + 6, connectionY + 6);
      this.ctx.lineTo(connectionX + 18, connectionY + 18);
      this.ctx.moveTo(connectionX + 18, connectionY + 6);
      this.ctx.lineTo(connectionX + 6, connectionY + 18);
      this.ctx.stroke();
    }
  }

  private drawMissileCooldown() {
    const iconSize = 50;
    const margin = 20;
    const x = this.gameStore.CANVAS_WIDTH - iconSize - margin;
    const y = this.gameStore.CANVAS_HEIGHT - iconSize - margin;

    // Missile icon drawing function
    const drawMissileIcon = (centerX: number, centerY: number) => {
      // Draw missile body
      this.ctx.fillRect(centerX - 3, centerY - 8, 6, 16);

      // Draw missile tip
      this.ctx.beginPath();
      this.ctx.moveTo(centerX, centerY - 12);
      this.ctx.lineTo(centerX - 3, centerY - 8);
      this.ctx.lineTo(centerX + 3, centerY - 8);
      this.ctx.fill();

      // Draw missile fins
      this.ctx.fillRect(centerX - 5, centerY + 6, 2, 4);
      this.ctx.fillRect(centerX + 3, centerY + 6, 2, 4);
    };

    this.drawWeaponIcon(
      x,
      y,
      iconSize,
      this.gameStore.isMissileReady,
      "", // Remove key label
      "rgba(255, 68, 68, 0.8)",
      drawMissileIcon,
      this.gameStore.missileCooldownPercent,
      this.gameStore.missileCooldowRemaining
    );

    // Draw missile level indicator in top right corner
    const player = this.gameStore.gameState.players[this.gameStore.playerId];
    if (player) {
      const missileLevel = player.missileUpgradeLevel || 1;
      this.drawLevelIndicator(x, y, iconSize, missileLevel, "#FF9800"); // Orange color for missile
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
    cooldownTimeLeft?: number
  ) {
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

    const centerX = x + iconSize / 2;
    const centerY = y + iconSize / 2;

    // Draw weapon icon background
    this.ctx.fillStyle = isReady ? backgroundColor : "rgba(102, 102, 102, 0.8)";
    this.ctx.fillRect(x + 5, y + 5, iconSize - 10, iconSize - 10);

    // Draw weapon icon border
    this.ctx.strokeStyle = "#fff";
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(x + 5, y + 5, iconSize - 10, iconSize - 10);

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

    // Key indicator
    this.ctx.fillStyle = "#fff";
    this.ctx.font = "10px Arial";
    this.ctx.textAlign = "center";
    this.ctx.fillText(keyLabel, centerX, y - 5);
  }

  private drawLevelIndicator(
    x: number,
    y: number,
    iconSize: number,
    level: number,
    backgroundColor: string = "#4CAF50"
  ) {
    const circleRadius = 10;
    const circleX = x + iconSize - circleRadius;
    const circleY = y + circleRadius;

    // Draw circle background
    this.ctx.fillStyle = backgroundColor;
    this.ctx.beginPath();
    this.ctx.arc(circleX, circleY, circleRadius, 0, Math.PI * 2);
    this.ctx.fill();

    // Draw circle border
    this.ctx.strokeStyle = "#fff";
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.arc(circleX, circleY, circleRadius, 0, Math.PI * 2);
    this.ctx.stroke();

    // Draw level number
    this.ctx.fillStyle = "#fff";
    this.ctx.font = "12px Arial";
    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "middle";
    this.ctx.fillText(`${level}`, circleX, circleY);
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

    // Laser icon drawing function
    const drawLaserIcon = (centerX: number, centerY: number) => {
      // Draw laser lightning bolt icon
      this.ctx.beginPath();
      this.ctx.moveTo(centerX - 8, centerY - 12);
      this.ctx.lineTo(centerX + 4, centerY - 2);
      this.ctx.lineTo(centerX - 2, centerY - 2);
      this.ctx.lineTo(centerX + 8, centerY + 12);
      this.ctx.lineTo(centerX - 4, centerY + 2);
      this.ctx.lineTo(centerX + 2, centerY + 2);
      this.ctx.closePath();
      this.ctx.fill();
    };

    // Use the same weapon icon template as missile
    this.drawWeaponIcon(
      x,
      y,
      iconSize,
      true, // Always ready (no cooldown for laser)
      "", // No key label - we'll draw level in corner
      "rgba(255, 68, 68, 0.8)", // Same color as missile
      drawLaserIcon
    );

    // Draw laser level indicator in top right corner using template
    const laserLevel = player.laserUpgradeLevel || 0;
    this.drawLevelIndicator(x, y, iconSize, laserLevel, "#4CAF50"); // Green color for laser

    // Special indicator for dual shot + backward laser (level 5)
    if (laserLevel >= 5) {
      this.ctx.fillStyle = "#ffff00";
      this.ctx.font = "8px Arial";
      this.ctx.fillText("TRI-SHOT", x + iconSize / 2, y + iconSize + 15);
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

    if (laserStats.hasBackwardLaser) {
      this.ctx.fillStyle = "#ff44ff";
      this.ctx.fillText("REAR LASER!", x + 90, y + 55);
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
        hasBackwardLaser: false,
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
      dualShot: level >= 3,
      hasBackwardLaser: level >= 5,
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

    // Level number to the left of the bar (starting at 1)
    this.ctx.fillStyle = "#fff";
    this.ctx.font = "10px Arial";
    this.ctx.textAlign = "right";
    this.ctx.fillText(
      `${player.boostUpgradeLevel + 1}`,
      x - 8,
      y + barHeight - 1
    );

    // Boost icon to the right of the bar (simple arrow/lightning symbol)
    this.ctx.fillStyle = player.isBoostActive ? "#00ffff" : "#fff";
    this.ctx.font = "12px Arial";
    this.ctx.textAlign = "left";
    this.ctx.fillText("⚡", x + barWidth + 6, y + barHeight - 1);
  }

  private drawExperienceBar() {
    const player = this.gameStore.gameState.players[this.gameStore.playerId];
    if (!player) return;

    // XP bar dimensions - smaller and positioned below boost bar
    const barWidth = 100;
    const barHeight = 4;
    const x = (this.gameStore.CANVAS_WIDTH - barWidth) / 2;
    const y = this.gameStore.CANVAS_HEIGHT - 18; // Below boost bar

    // Background
    this.ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
    this.ctx.fillRect(x - 2, y - 2, barWidth + 4, barHeight + 4);

    // Border
    this.ctx.strokeStyle = "#555";
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(x, y, barWidth, barHeight);

    // XP progress fill
    const progress = player.getLevelProgress ? player.getLevelProgress() : 0;
    const fillWidth = barWidth * progress;

    this.ctx.fillStyle = "#ffd700"; // Gold color for XP
    this.ctx.fillRect(x, y, fillWidth, barHeight);

    // Level number to the left
    this.ctx.fillStyle = "#fff";
    this.ctx.font = "10px Arial";
    this.ctx.textAlign = "right";
    this.ctx.fillText(`LV ${player.level || 1}`, x - 8, y + barHeight - 1);

    // XP to the right
    this.ctx.textAlign = "left";
    this.ctx.fillText(
      `${player.experience || 0} XP`,
      x + barWidth + 6,
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
