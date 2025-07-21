import { CanvasComponent } from "./CanvasComponent";

/**
 * Handles rendering of ability/weapon icons in the UI
 */
export class AbilityIconRenderer extends CanvasComponent {
  render(): void {
    // Main render method - draws all ability icons (left to right order)
    this.drawLaserAbility();    // First icon (leftmost)
    this.drawFlashAbility();    // Second icon (middle) 
    this.drawMissileAbility();  // Third icon (rightmost)
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
    descriptionText: string
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

      // Draw key label with new positioning for square
      this.drawSquareKeyLabel(x, y, halfSize, keyLabel, isReady);

      // Draw description text below the square
      this.drawSquareDescriptionText(x, y, halfSize, descriptionText, isReady);
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
      const progressHeight = (halfSize * 2) * (1 - cooldownPercent);
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
   * Draw key label for square design
   */
  private drawSquareKeyLabel(
    x: number,
    y: number,
    halfSize: number,
    keyLabel: string,
    isReady: boolean
  ): void {
    // Don't render anything if keyLabel is empty
    if (!keyLabel || keyLabel.trim() === "") {
      return;
    }

    this.withCanvasState(() => {
      this.ctx.font = "bold 10px Arial";
      this.ctx.textAlign = "center";
      this.ctx.textBaseline = "middle";

      // Background for key label
      this.ctx.fillStyle = isReady 
        ? "rgba(0, 212, 255, 0.8)" 
        : "rgba(100, 100, 100, 0.6)";
      const labelY = y + halfSize + 8;
      const textWidth = this.ctx.measureText(keyLabel).width;
      this.ctx.fillRect(x - textWidth/2 - 3, labelY - 6, textWidth + 6, 12);

      // Key label text
      this.ctx.fillStyle = "#ffffff";
      this.ctx.fillText(keyLabel, x, labelY);
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
    const iconSize = 60; // Bigger square size (was 50)
    const spacing = 8; // Spacing between slots
    const marginFromEdge = 30; // More inward from edge (was about 16)
    const startX = this.gameStore.CANVAS_WIDTH - (iconSize * 3 + spacing * 2 + marginFromEdge);
    const y = this.gameStore.CANVAS_HEIGHT - 80; // Position from bottom
    const x = startX + iconSize / 2; // First icon position

    const drawLaserIcon = () => {
      // Use same lightning bolt shape as power-up laser icon
      this.withCanvasState(() => {
        this.ctx.translate(x, y);
        this.ctx.fillStyle = "#ff6464"; // Red theme matching laser power-up
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
      "", // No key label text
      "rgba(255, 100, 100, 0.9)", // Red theme matching laser power-up
      drawLaserIcon,
      0, // No cooldown
      0, // No cooldown remaining
      "LASER"
    );
  }

  /**
   * Draw flash ability icon
   */
  private drawFlashAbility(): void {
    const iconSize = 60; // Bigger square size (was 50)
    const spacing = 8; // Spacing between slots
    const marginFromEdge = 30; // More inward from edge
    const startX = this.gameStore.CANVAS_WIDTH - (iconSize * 3 + spacing * 2 + marginFromEdge);
    const y = this.gameStore.CANVAS_HEIGHT - 80; // Position from bottom
    const x = startX + iconSize + spacing + iconSize / 2; // Second icon position (with spacing)

    const drawFlashIcon = () => {
      this.withCanvasState(() => {
        this.ctx.translate(x, y);
        this.ctx.fillStyle = "#ffff64"; // Yellow theme matching flash power-up
        
        // Draw a distinctive flash/spark icon (star-like burst)
        const spikes = 8;
        const outerRadius = 12;
        const innerRadius = 6;
        
        this.ctx.beginPath();
        for (let i = 0; i < spikes * 2; i++) {
          const radius = i % 2 === 0 ? outerRadius : innerRadius;
          const angle = (i * Math.PI) / spikes;
          const px = Math.cos(angle) * radius;
          const py = Math.sin(angle) * radius;
          
          if (i === 0) {
            this.ctx.moveTo(px, py);
          } else {
            this.ctx.lineTo(px, py);
          }
        }
        this.ctx.closePath();
        this.ctx.fill();
        
        // Add inner glow effect
        this.ctx.beginPath();
        this.ctx.arc(0, 0, 4, 0, Math.PI * 2);
        this.ctx.fillStyle = "#ffffff";
        this.ctx.fill();
      });
    };

    this.drawWeaponIcon(
      x,
      y,
      iconSize,
      this.gameStore.isFlashReady,
      "", // No key label text
      "rgba(255, 255, 0, 0.9)", // Yellow theme matching flash power-up
      drawFlashIcon,
      this.gameStore.flashCooldownPercent,
      this.gameStore.flashCooldownRemaining,
      "FLASH"
    );
  }

  /**
   * Draw missile ability icon
   */
  private drawMissileAbility(): void {
    const iconSize = 60; // Bigger square size (was 50)
    const spacing = 8; // Spacing between slots
    const marginFromEdge = 30; // More inward from edge
    const startX = this.gameStore.CANVAS_WIDTH - (iconSize * 3 + spacing * 2 + marginFromEdge);
    const y = this.gameStore.CANVAS_HEIGHT - 80; // Position from bottom
    const x = startX + iconSize * 2 + spacing * 2 + iconSize / 2; // Third icon position (with spacing)

    const drawMissileIcon = () => {
      // Use same rocket shape as power-up missile icon
      this.withCanvasState(() => {
        this.ctx.translate(x, y);
        this.ctx.fillStyle = "#ffa564"; // Orange theme matching missile power-up
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
      "", // No key label text
      "rgba(255, 165, 0, 0.9)", // Orange theme matching missile power-up
      drawMissileIcon,
      this.gameStore.missileCooldownPercent,
      this.gameStore.missileCooldowRemaining,
      "MISSILES"
    );
  }
}
