import { CanvasComponent } from "./CanvasComponent";

/**
 * Handles rendering of ability/weapon icons in the UI
 */
export class AbilityIconRenderer extends CanvasComponent {
  render(): void {
    // Main render method - draws all ability icons (left to right order)
    const currentPlayer = this.gameStore.currentPlayer;

    this.drawLaserAbility(currentPlayer?.laserUpgradeLevel || 1); // First icon (leftmost)
    this.drawFlashAbility(currentPlayer?.flashUpgradeLevel || 1); // Second icon (middle)
    this.drawMissileAbility(currentPlayer?.missileUpgradeLevel || 1); // Third icon (rightmost)
  }

  /**
   * Draw weapon/ability icon with square design and new styling
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
    descriptionText: string,
    level: number = 1
  ): void {
    this.withCanvasState(() => {
      const halfSize = size / 2;

      // 3D Shadow effect
      this.ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
      this.ctx.shadowBlur = 8;
      this.ctx.shadowOffsetX = 3;
      this.ctx.shadowOffsetY = 3;

      // Square background with blue/blueish-green gradient (matching menu style)
      const gradient = this.ctx.createLinearGradient(
        x - halfSize,
        y - halfSize,
        x + halfSize,
        y + halfSize
      );

      if (isReady) {
        // Active state - use menu-like blue gradient
        gradient.addColorStop(0, "rgba(0, 212, 255, 0.3)");
        gradient.addColorStop(0.5, "rgba(0, 212, 255, 0.2)");
        gradient.addColorStop(1, "rgba(10, 10, 25, 0.8)");
      } else {
        // Disabled state - darker version
        gradient.addColorStop(0, "rgba(100, 100, 100, 0.2)");
        gradient.addColorStop(0.5, "rgba(60, 60, 60, 0.3)");
        gradient.addColorStop(1, "rgba(10, 10, 25, 0.8)");
      }

      this.ctx.fillStyle = gradient;
      this.ctx.fillRect(x - halfSize, y - halfSize, size, size);

      // Border with blue theme
      this.ctx.strokeStyle = isReady
        ? "rgba(0, 212, 255, 0.6)"
        : "rgba(100, 100, 100, 0.4)";
      this.ctx.lineWidth = 2;
      this.ctx.strokeRect(x - halfSize, y - halfSize, size, size);

      // Reset shadow for icon
      this.ctx.shadowColor = "transparent";
      this.ctx.shadowBlur = 0;
      this.ctx.shadowOffsetX = 0;
      this.ctx.shadowOffsetY = 0;

      // Draw the icon (with theme color for active state)
      if (isReady) {
        this.withCanvasState(() => {
          // Use the power-up theme color for the icon when ready
          iconDrawFunction();
        });
      } else {
        this.withCanvasState(() => {
          // Use grey for disabled state
          iconDrawFunction();
        });
      }

      // Draw cooldown overlay for square
      if (!isReady && cooldownPercent > 0) {
        this.drawSquareCooldownOverlay(x, y, halfSize, cooldownPercent);
      }

      // Draw description text above the square
      this.drawSquareDescriptionText(x, y, halfSize, descriptionText, isReady);

      // Draw ability level in top-right corner
      this.drawAbilityLevel(x, y, halfSize, level, isReady);
    });
  }

  /**
   * Draw cooldown overlay with square progress
   */
  private drawSquareCooldownOverlay(
    x: number,
    y: number,
    halfSize: number,
    cooldownPercent: number
  ): void {
    this.withCanvasState(() => {
      // Semi-transparent overlay
      this.ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
      this.ctx.fillRect(x - halfSize, y - halfSize, halfSize * 2, halfSize * 2);

      // Progress indicator (fill from bottom to top)
      const progressHeight = halfSize * 2 * (1 - cooldownPercent);
      this.ctx.fillStyle = "rgba(0, 212, 255, 0.3)";
      this.ctx.fillRect(
        x - halfSize,
        y + halfSize - progressHeight,
        halfSize * 2,
        progressHeight
      );
    });
  }

  /**
   * Draw description text for square design (at the top)
   */
  private drawSquareDescriptionText(
    x: number,
    y: number,
    halfSize: number,
    descriptionText: string,
    isReady: boolean
  ): void {
    this.withCanvasState(() => {
      this.ctx.font = "bold 8px Arial";
      this.ctx.textAlign = "center";
      this.ctx.textBaseline = "middle";
      this.ctx.fillStyle = isReady ? "#ffffff" : "#888888";
      // Position text above the square
      this.ctx.fillText(descriptionText, x, y - halfSize - 8);
    });
  }

  /**
   * Draw ability level in top-right corner of square
   */
  private drawAbilityLevel(
    x: number,
    y: number,
    halfSize: number,
    level: number,
    isReady: boolean
  ): void {
    this.withCanvasState(() => {
      this.ctx.font = "bold 10px Arial";
      this.ctx.textAlign = "right";
      this.ctx.textBaseline = "top";
      this.ctx.fillStyle = isReady ? "#ffffff" : "#888888";
      // Position in top-right corner of the square
      this.ctx.fillText(level.toString(), x + halfSize - 3, y - halfSize + 3);
    });
  }

  /**
   * Draw laser ability icon
   */
  private drawLaserAbility(level: number): void {
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
      "LASER",
      level
    );
  }

  /**
   * Draw missile ability icon
   */
  private drawMissileAbility(level: number): void {
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
      "MISSILES",
      level
    );
  }

  /**
   * Draw flash ability icon
   */
  private drawFlashAbility(level: number): void {
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
      "FLASH",
      level
    );
  }
}
