export class Camera {
  public x: number;
  public y: number;
  public viewportWidth: number;
  public viewportHeight: number;
  public worldWidth: number;
  public worldHeight: number;
  public followTarget: { x: number; y: number } | null;
  public smoothing: number;

  constructor(
    x: number = 0,
    y: number = 0,
    viewportWidth: number = 1200,
    viewportHeight: number = 800,
    worldWidth: number = 5000,
    worldHeight: number = 5000,
    smoothing: number = 0.1
  ) {
    this.x = x;
    this.y = y;
    this.viewportWidth = viewportWidth;
    this.viewportHeight = viewportHeight;
    this.worldWidth = worldWidth;
    this.worldHeight = worldHeight;
    this.followTarget = null;
    this.smoothing = smoothing;
  }

  // Set the target to follow (usually a player)
  setFollowTarget(target: { x: number; y: number } | null): void {
    this.followTarget = target;
  }

  // Update camera position with optional smooth following
  update(useSmoothing: boolean = false): void {
    if (!this.followTarget) return;

    const targetX = this.followTarget.x - this.viewportWidth / 2;
    const targetY = this.followTarget.y - this.viewportHeight / 2;

    if (useSmoothing) {
      // Smooth camera movement
      this.x += (targetX - this.x) * this.smoothing;
      this.y += (targetY - this.y) * this.smoothing;
    } else {
      // Instant camera movement
      this.x = targetX;
      this.y = targetY;
    }

    // Clamp camera to world bounds
    this.clampToWorld();
  }

  // Manually set camera position
  setPosition(x: number, y: number, centerOnPoint: boolean = false): void {
    if (centerOnPoint) {
      this.x = x - this.viewportWidth / 2;
      this.y = y - this.viewportHeight / 2;
    } else {
      this.x = x;
      this.y = y;
    }
    this.clampToWorld();
  }

  // Clamp camera to world boundaries
  private clampToWorld(): void {
    this.x = Math.max(
      0,
      Math.min(this.worldWidth - this.viewportWidth, this.x)
    );
    this.y = Math.max(
      0,
      Math.min(this.worldHeight - this.viewportHeight, this.y)
    );
  }

  // Convert screen coordinates to world coordinates
  screenToWorld(screenX: number, screenY: number): { x: number; y: number } {
    return {
      x: screenX + this.x,
      y: screenY + this.y,
    };
  }

  // Convert world coordinates to screen coordinates
  worldToScreen(worldX: number, worldY: number): { x: number; y: number } {
    return {
      x: worldX - this.x,
      y: worldY - this.y,
    };
  }

  // Check if an object is visible in the camera view
  isInView(
    obj: { x: number; y: number; width?: number; height?: number },
    padding: number = 0
  ): boolean {
    const objWidth = obj.width || 30;
    const objHeight = obj.height || 30;

    return (
      obj.x + objWidth >= this.x - padding &&
      obj.x <= this.x + this.viewportWidth + padding &&
      obj.y + objHeight >= this.y - padding &&
      obj.y <= this.y + this.viewportHeight + padding
    );
  }

  // Get camera bounds
  getBounds(): {
    left: number;
    right: number;
    top: number;
    bottom: number;
  } {
    return {
      left: this.x,
      right: this.x + this.viewportWidth,
      top: this.y,
      bottom: this.y + this.viewportHeight,
    };
  }

  // Get camera center point
  getCenter(): { x: number; y: number } {
    return {
      x: this.x + this.viewportWidth / 2,
      y: this.y + this.viewportHeight / 2,
    };
  }

  // Zoom functionality (for future use)
  private zoom: number = 1;

  setZoom(zoom: number): void {
    this.zoom = Math.max(0.1, Math.min(5, zoom)); // Clamp zoom between 0.1x and 5x
  }

  getZoom(): number {
    return this.zoom;
  }

  // Apply camera transform to canvas context
  applyTransform(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.scale(this.zoom, this.zoom);
    ctx.translate(-this.x, -this.y);
  }

  // Restore context after applying camera transform
  restoreTransform(ctx: CanvasRenderingContext2D): void {
    ctx.restore();
  }

  // Shake effect for game feedback (e.g., explosions)
  private shakeIntensity: number = 0;
  private shakeDuration: number = 0;
  private shakeTimer: number = 0;

  addShake(intensity: number, duration: number): void {
    this.shakeIntensity = intensity;
    this.shakeDuration = duration;
    this.shakeTimer = 0;
  }

  updateShake(deltaTime: number): void {
    if (this.shakeTimer < this.shakeDuration) {
      this.shakeTimer += deltaTime;
      const shakeProgress = this.shakeTimer / this.shakeDuration;
      const currentShake = this.shakeIntensity * (1 - shakeProgress);

      // Apply random shake offset
      const shakeX = (Math.random() - 0.5) * currentShake * 2;
      const shakeY = (Math.random() - 0.5) * currentShake * 2;

      this.x += shakeX;
      this.y += shakeY;
    }
  }

  // Serialize camera data
  serialize(): {
    x: number;
    y: number;
    viewportWidth: number;
    viewportHeight: number;
    zoom: number;
  } {
    return {
      x: this.x,
      y: this.y,
      viewportWidth: this.viewportWidth,
      viewportHeight: this.viewportHeight,
      zoom: this.zoom,
    };
  }

  // Create camera from serialized data
  static deserialize(data: {
    x: number;
    y: number;
    viewportWidth: number;
    viewportHeight: number;
    zoom?: number;
  }): Camera {
    const camera = new Camera(
      data.x,
      data.y,
      data.viewportWidth,
      data.viewportHeight
    );
    if (data.zoom) {
      camera.setZoom(data.zoom);
    }
    return camera;
  }
}
