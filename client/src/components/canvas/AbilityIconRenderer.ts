import { CanvasComponent } from "./CanvasComponent";

/**
 * Handles rendering of ability/weapon icons in the UI
 */
export class AbilityIconRenderer extends CanvasComponent {
  render(): void {
    // Main render method - draws all ability icons
    this.drawLaserAbility();
    this.drawMissileAbility();
    this.drawFlashAbility();
  }

  /**
   * Draw weapon/ability icon with 3D effects and cooldown
   */
  drawWeaponIcon(
    x: number,
    y: number,
    size: number,
    isReady: boolean,
    keyLabel: string,
    themeColor: string,
    iconDrawFunction: () => void,
    cooldownPercent: number,
    cooldownRemaining: number,
    descriptionText: string
  ): void {
    this.withCanvasState(() => {
      const radius = size / 2;

      // 3D Shadow effect
      this.ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
      this.ctx.shadowBlur = 8;
      this.ctx.shadowOffsetX = 3;
      this.ctx.shadowOffsetY = 3;

      // Background circle with 3D gradient
      const gradient = this.ctx.createRadialGradient(
        x - radius * 0.3,
        y - radius * 0.3,
        0,
        x,
        y,
        radius
      );

      if (isReady) {
        gradient.addColorStop(0, "rgba(255, 255, 255, 0.3)");
        gradient.addColorStop(0.7, themeColor);
        gradient.addColorStop(1, "rgba(0, 0, 0, 0.3)");
      } else {
        gradient.addColorStop(0, "rgba(100, 100, 100, 0.2)");
        gradient.addColorStop(0.7, "rgba(60, 60, 60, 0.8)");
        gradient.addColorStop(1, "rgba(0, 0, 0, 0.5)");
      }

      this.ctx.fillStyle = gradient;
      this.ctx.beginPath();
      this.ctx.arc(x, y, radius, 0, Math.PI * 2);
      this.ctx.fill();

      // Reset shadow for icon
      this.ctx.shadowColor = "transparent";
      this.ctx.shadowBlur = 0;
      this.ctx.shadowOffsetX = 0;
      this.ctx.shadowOffsetY = 0;

      // Draw the icon
      iconDrawFunction();

      // Draw cooldown overlay
      if (!isReady && cooldownPercent > 0) {
        this.drawCooldownOverlay(x, y, radius, cooldownPercent);
      }

      // Draw key label with 3D text effect
      this.drawKeyLabel(x, y, radius, keyLabel, isReady);

      // Draw description text
      this.drawDescriptionText(x, y, radius, descriptionText, isReady);

      // Draw level indicator if applicable
      this.drawLevelIndicator(x, y, radius, descriptionText);
    });
  }

  /**
   * Draw cooldown overlay with circular progress
   */
  private drawCooldownOverlay(
    x: number,
    y: number,
    radius: number,
    cooldownPercent: number
  ): void {
    this.withCanvasState(() => {
      // Semi-transparent overlay
      this.ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
      this.ctx.beginPath();
      this.ctx.arc(x, y, radius, 0, Math.PI * 2);
      this.ctx.fill();

      // Circular progress indicator
      this.ctx.strokeStyle = "#ff4444";
      this.ctx.lineWidth = 4;
      this.ctx.lineCap = "round";
      this.ctx.beginPath();
      this.ctx.arc(
        x,
        y,
        radius - 3,
        -Math.PI / 2,
        -Math.PI / 2 + 2 * Math.PI * cooldownPercent
      );
      this.ctx.stroke();
    });
  }

  /**
   * Draw key label with 3D text effect
   */
  private drawKeyLabel(
    x: number,
    y: number,
    radius: number,
    keyLabel: string,
    isReady: boolean
  ): void {
    this.withCanvasState(() => {
      // Key label background
      this.ctx.fillStyle = isReady
        ? "rgba(0, 0, 0, 0.8)"
        : "rgba(0, 0, 0, 0.9)";
      this.ctx.fillRect(x - 25, y + radius + 5, 50, 16);

      // 3D text effect - shadow
      this.ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
      this.ctx.font = "10px Arial";
      this.ctx.textAlign = "center";
      this.ctx.fillText(keyLabel, x + 1, y + radius + 16);

      // Main text
      this.ctx.fillStyle = isReady ? "#ffffff" : "#888888";
      this.ctx.fillText(keyLabel, x, y + radius + 15);
    });
  }

  /**
   * Draw description text below the icon
   */
  private drawDescriptionText(
    x: number,
    y: number,
    radius: number,
    descriptionText: string,
    isReady: boolean
  ): void {
    this.withCanvasState(() => {
      this.ctx.font = "8px Arial";
      this.ctx.textAlign = "center";
      this.ctx.fillStyle = isReady ? "#cccccc" : "#666666";
      this.ctx.fillText(descriptionText, x, y + radius + 30);
    });
  }

  /**
   * Draw level indicator in top right corner
   */
  private drawLevelIndicator(
    x: number,
    y: number,
    radius: number,
    abilityType: string
  ): void {
    const player = this.gameStore.gameState.players[this.gameStore.playerId];
    if (!player) return;

    let level = 1;
    let displayText = "1";

    if (abilityType === "LASER") {
      level = player.laserUpgradeLevel || 1;
      displayText = level.toString(); // Always show actual level number
    } else if (abilityType === "MISSILES") {
      level = player.missileUpgradeLevel || 1;
      displayText = level.toString(); // Show actual level number
    } else if (abilityType === "FLASH") {
      level = player.flashUpgradeLevel || 1;
      displayText = level.toString(); // Show actual level number
    }

    // Always show level indicator
    this.withCanvasState(() => {
      const levelX = x + radius * 0.6;
      const levelY = y - radius * 0.6;

      // Level badge background with glow
      const gradient = this.ctx.createRadialGradient(
        levelX,
        levelY,
        0,
        levelX,
        levelY,
        12
      );
      gradient.addColorStop(0, "#3b82f6"); // Blue center
      gradient.addColorStop(0.7, "#1d4ed8"); // Darker blue
      gradient.addColorStop(1, "#1e3a8a"); // Dark blue edge

      this.ctx.fillStyle = gradient;
      this.ctx.beginPath();
      this.ctx.arc(levelX, levelY, 10, 0, Math.PI * 2);
      this.ctx.fill();

      // Add subtle border
      this.ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
      this.ctx.lineWidth = 1;
      this.ctx.stroke();

      // Level text with better styling
      this.ctx.fillStyle = "#ffffff";
      this.ctx.font = "bold 11px Arial";
      this.ctx.textAlign = "center";
      this.ctx.textBaseline = "middle";

      // Add text shadow for better readability
      this.ctx.shadowColor = "rgba(0, 0, 0, 0.8)";
      this.ctx.shadowBlur = 2;
      this.ctx.shadowOffsetX = 1;
      this.ctx.shadowOffsetY = 1;

      this.ctx.fillText(displayText, levelX, levelY);

      // Reset shadow
      this.ctx.shadowColor = "transparent";
      this.ctx.shadowBlur = 0;
      this.ctx.shadowOffsetX = 0;
      this.ctx.shadowOffsetY = 0;
    });
  }

  /**
   * Draw laser ability icon
   */
  private drawLaserAbility(): void {
    const spacing = 70;
    const iconSize = 48;
    const x = this.gameStore.CANVAS_WIDTH - spacing * 3;
    const y = this.gameStore.CANVAS_HEIGHT - 60;

    const drawLaserIcon = () => {
      // Use same lightning bolt shape as power-up laser icon
      this.withCanvasState(() => {
        this.ctx.translate(x, y);
        this.ctx.fillStyle = "#ffffff";
        this.ctx.beginPath();
        this.ctx.moveTo(-3, -12);
        this.ctx.lineTo(5, -2);
        this.ctx.lineTo(-2, -2);
        this.ctx.lineTo(3, 12);
        this.ctx.lineTo(-5, 2);
        this.ctx.lineTo(2, 2);
        this.ctx.closePath();
        this.ctx.fill();
      });
    };

    this.drawWeaponIcon(
      x,
      y,
      iconSize,
      true, // Laser is always ready (unlimited ammo)
      "LEFT CLICK",
      "rgba(255, 100, 100, 0.9)", // Red theme matching laser power-up
      drawLaserIcon,
      0, // No cooldown
      0, // No cooldown remaining
      "LASER"
    );
  }

  /**
   * Draw missile ability icon
   */
  private drawMissileAbility(): void {
    const spacing = 70;
    const iconSize = 48;
    const x = this.gameStore.CANVAS_WIDTH - spacing;
    const y = this.gameStore.CANVAS_HEIGHT - 60;

    const drawMissileIcon = () => {
      // Use same rocket shape as power-up missile icon
      this.withCanvasState(() => {
        this.ctx.translate(x, y);
        this.ctx.fillStyle = "#ffffff";
        // Missile body
        this.ctx.fillRect(-2, -10, 4, 14);
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
      });
    };

    this.drawWeaponIcon(
      x,
      y,
      iconSize,
      this.gameStore.isMissileReady,
      "RIGHT CLICK",
      "rgba(255, 165, 0, 0.9)", // Orange theme matching missile power-up
      drawMissileIcon,
      this.gameStore.missileCooldownPercent,
      this.gameStore.missileCooldowRemaining,
      "MISSILES"
    );
  }

  /**
   * Draw flash ability icon
   */
  private drawFlashAbility(): void {
    const spacing = 70;
    const iconSize = 48;
    const x = this.gameStore.CANVAS_WIDTH - spacing * 2;
    const y = this.gameStore.CANVAS_HEIGHT - 60;

    const drawFlashIcon = () => {
      const centerX = x;
      const centerY = y;
      this.drawCustomIcon(centerX, centerY, "bolt", 24, "#ffffff");
    };

    this.drawWeaponIcon(
      x,
      y,
      iconSize,
      this.gameStore.isFlashReady,
      "F",
      "rgba(255, 255, 0, 0.9)", // Yellow theme matching flash power-up
      drawFlashIcon,
      this.gameStore.flashCooldownPercent,
      this.gameStore.flashCooldownRemaining,
      "FLASH"
    );
  }
}
