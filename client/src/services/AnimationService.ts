import * as TWEEN from "@tweenjs/tween.js";

/**
 * AnimationService - Manages smooth animations using Tween.js
 * Provides a safe wrapper around TWEEN with game loop integration
 */
export class AnimationService {
  private static instance: AnimationService;
  private tweenGroup: TWEEN.Group;
  private isRunning: boolean = false;

  private constructor() {
    this.tweenGroup = new TWEEN.Group();
  }

  static getInstance(): AnimationService {
    if (!AnimationService.instance) {
      AnimationService.instance = new AnimationService();
    }
    return AnimationService.instance;
  }

  /**
   * Start the animation loop
   */
  start(): void {
    this.isRunning = true;
  }

  /**
   * Stop the animation loop
   */
  stop(): void {
    this.isRunning = false;
    this.tweenGroup.removeAll();
  }

  /**
   * Update all active tweens - call this in your main game loop
   */
  update(deltaTime?: number): void {
    if (this.isRunning) {
      this.tweenGroup.update();
    }
  }

  /**
   * Create a simple property animation
   */
  animateProperty(
    target: any,
    property: string,
    toValue: number,
    duration: number,
    options: {
      easing?: (t: number) => number;
      onUpdate?: (value: number) => void;
      onComplete?: () => void;
      delay?: number;
    } = {}
  ): TWEEN.Tween {
    const fromValue = target[property];
    const tempObj = { value: fromValue };

    const tween = new TWEEN.Tween(tempObj, this.tweenGroup)
      .to({ value: toValue }, duration)
      .easing(options.easing || TWEEN.Easing.Quadratic.Out)
      .onUpdate(() => {
        target[property] = tempObj.value;
        if (options.onUpdate) {
          options.onUpdate(tempObj.value);
        }
      });

    if (options.onComplete) {
      tween.onComplete(options.onComplete);
    }

    if (options.delay) {
      tween.delay(options.delay);
    }

    tween.start();
    return tween;
  }

  /**
   * Create a flash effect (fade in/out)
   */
  flash(
    target: any,
    property: string,
    maxValue: number = 1,
    duration: number = 200,
    onUpdate?: (value: number) => void
  ): TWEEN.Tween {
    const originalValue = target[property];
    const tempObj = { value: originalValue };

    const tween = new TWEEN.Tween(tempObj, this.tweenGroup)
      .to({ value: maxValue }, duration)
      .easing(TWEEN.Easing.Quadratic.Out)
      .yoyo(true)
      .repeat(1)
      .onUpdate(() => {
        target[property] = tempObj.value;
        if (onUpdate) {
          onUpdate(tempObj.value);
        }
      })
      .onComplete(() => {
        target[property] = originalValue;
      });

    tween.start();
    return tween;
  }

  /**
   * Create a scale bounce effect
   */
  scaleBounce(
    target: any,
    scaleProperty: string,
    maxScale: number = 1.2,
    duration: number = 300,
    onUpdate?: (scale: number) => void
  ): TWEEN.Tween {
    const originalScale = target[scaleProperty];
    const tempObj = { scale: originalScale };

    const tween = new TWEEN.Tween(tempObj, this.tweenGroup)
      .to({ scale: maxScale }, duration * 0.5)
      .easing(TWEEN.Easing.Back.Out)
      .yoyo(true)
      .repeat(1)
      .onUpdate(() => {
        target[scaleProperty] = tempObj.scale;
        if (onUpdate) {
          onUpdate(tempObj.scale);
        }
      })
      .onComplete(() => {
        target[scaleProperty] = originalScale;
      });

    tween.start();
    return tween;
  }

  /**
   * Screen shake effect
   */
  screenShake(
    camera: any,
    intensity: number = 10,
    duration: number = 500
  ): TWEEN.Tween {
    const originalX = camera.x;
    const originalY = camera.y;
    const shakeObj = { intensity };

    const tween = new TWEEN.Tween(shakeObj, this.tweenGroup)
      .to({ intensity: 0 }, duration)
      .easing(TWEEN.Easing.Quadratic.Out)
      .onUpdate(() => {
        camera.x = originalX + (Math.random() - 0.5) * shakeObj.intensity;
        camera.y = originalY + (Math.random() - 0.5) * shakeObj.intensity;
      })
      .onComplete(() => {
        camera.x = originalX;
        camera.y = originalY;
      });

    tween.start();
    return tween;
  }

  /**
   * Get the number of active tweens
   */
  getActiveTweenCount(): number {
    return this.tweenGroup.getAll().length;
  }

  /**
   * Remove all active tweens
   */
  clearAll(): void {
    this.tweenGroup.removeAll();
  }
}

// Export singleton instance
export const animationService = AnimationService.getInstance();
