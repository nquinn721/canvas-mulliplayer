import { WallParticle } from "./DestructibleWall";

export interface EnvironmentalObstacleData {
  id: string;
  x: number;
  y: number;
  radius?: number;
  width?: number;
  height?: number;
  type: ObstacleType;
  maxHealth: number;
  currentHealth: number;
  destructible: boolean;
  particles?: WallParticle[];
  rotationAngle?: number;
  animationPhase?: number;
}

export enum ObstacleType {
  ASTEROID = "asteroid", // Large circular destructible rocks
  SPACE_DEBRIS = "space_debris", // Smaller irregular destructible pieces
  ENERGY_CORE = "energy_core", // Explosive energy cores
  SHIELD_GENERATOR = "shield_gen", // Destructible generators that provide temporary shields
  FUEL_TANK = "fuel_tank", // Explosive fuel containers
  SATELLITE = "satellite", // Tech debris with special effects
  ICE_CRYSTAL = "ice_crystal", // Cold environment obstacles
  PLASMA_CONDUIT = "plasma_conduit", // Energy transmission pipes
}

export interface ObstacleTypeConfig {
  health: number;
  baseRadius?: number;
  baseWidth?: number;
  baseHeight?: number;
  color: string;
  damageColor: string;
  particleColor: string;
  particleCount: number;
  explosive: boolean;
  explosionRadius?: number;
  explosionDamage?: number;
  description: string;
  shape: "circle" | "rectangle";
  rotates: boolean;
  animated: boolean;
}

export const OBSTACLE_TYPE_CONFIGS: Record<ObstacleType, ObstacleTypeConfig> = {
  [ObstacleType.ASTEROID]: {
    health: 150,
    baseRadius: 40,
    color: "#8B7355",
    damageColor: "#5D4037",
    particleColor: "#A0896B",
    particleCount: 20,
    explosive: false,
    description: "Large space rock",
    shape: "circle",
    rotates: false,
    animated: false,
  },
  [ObstacleType.SPACE_DEBRIS]: {
    health: 80,
    baseRadius: 25,
    color: "#696969",
    damageColor: "#404040",
    particleColor: "#808080",
    particleCount: 12,
    explosive: false,
    description: "Metal debris fragment",
    shape: "circle",
    rotates: true,
    animated: false,
  },
  [ObstacleType.ENERGY_CORE]: {
    health: 60,
    baseRadius: 30,
    color: "#00FF00",
    damageColor: "#008000",
    particleColor: "#80FF80",
    particleCount: 25,
    explosive: true,
    explosionRadius: 100,
    explosionDamage: 40,
    description: "Volatile energy core",
    shape: "circle",
    rotates: false,
    animated: true,
  },
  [ObstacleType.SHIELD_GENERATOR]: {
    health: 100,
    baseWidth: 50,
    baseHeight: 30,
    color: "#0080FF",
    damageColor: "#0040A0",
    particleColor: "#80C0FF",
    particleCount: 15,
    explosive: false,
    description: "Shield generation device",
    shape: "rectangle",
    rotates: false,
    animated: true,
  },
  [ObstacleType.FUEL_TANK]: {
    health: 70,
    baseRadius: 35,
    color: "#FF4500",
    damageColor: "#CC2000",
    particleColor: "#FF8040",
    particleCount: 30,
    explosive: true,
    explosionRadius: 120,
    explosionDamage: 50,
    description: "Pressurized fuel container",
    shape: "circle",
    rotates: false,
    animated: false,
  },
  [ObstacleType.SATELLITE]: {
    health: 90,
    baseWidth: 60,
    baseHeight: 40,
    color: "#C0C0C0",
    damageColor: "#808080",
    particleColor: "#E0E0E0",
    particleCount: 18,
    explosive: false,
    description: "Communication satellite",
    shape: "rectangle",
    rotates: true,
    animated: true,
  },
  [ObstacleType.ICE_CRYSTAL]: {
    health: 50,
    baseRadius: 35,
    color: "#B0E0E6",
    damageColor: "#87CEEB",
    particleColor: "#E0F6FF",
    particleCount: 16,
    explosive: false,
    description: "Frozen crystalline structure",
    shape: "circle",
    rotates: false,
    animated: true,
  },
  [ObstacleType.PLASMA_CONDUIT]: {
    health: 110,
    baseWidth: 80,
    baseHeight: 20,
    color: "#FF00FF",
    damageColor: "#CC00CC",
    particleColor: "#FF80FF",
    particleCount: 22,
    explosive: true,
    explosionRadius: 80,
    explosionDamage: 35,
    description: "High-energy plasma transmission line",
    shape: "rectangle",
    rotates: false,
    animated: true,
  },
};

/**
 * EnvironmentalObstacle - Diverse destructible obstacles that add strategic depth
 * Features:
 * - Various shapes and sizes (circles and rectangles)
 * - Explosive obstacles that damage nearby players/enemies
 * - Animated and rotating obstacles for visual appeal
 * - Different destruction patterns and particle effects
 * - Strategic gameplay elements (shield generators, fuel for explosions)
 */
export class EnvironmentalObstacle {
  public id: string;
  public x: number;
  public y: number;
  public radius?: number;
  public width?: number;
  public height?: number;
  public type: ObstacleType;
  public maxHealth: number;
  public currentHealth: number;
  public particles: WallParticle[] = [];
  public destructible: boolean = true;
  public lastDamageTime: number = 0;
  public rotationAngle: number = 0;
  public animationPhase: number = 0;

  constructor(
    id: string,
    x: number,
    y: number,
    type: ObstacleType = ObstacleType.ASTEROID,
    sizeMultiplier: number = 1.0
  ) {
    this.id = id;
    this.x = x;
    this.y = y;
    this.type = type;

    const config = OBSTACLE_TYPE_CONFIGS[type];
    this.maxHealth = config.health;
    this.currentHealth = config.health;

    // Set dimensions based on type and size multiplier
    if (config.shape === "circle") {
      this.radius = (config.baseRadius || 30) * sizeMultiplier;
    } else {
      this.width = (config.baseWidth || 50) * sizeMultiplier;
      this.height = (config.baseHeight || 30) * sizeMultiplier;
    }

    // Random starting rotation for rotating obstacles
    if (config.rotates) {
      this.rotationAngle = Math.random() * Math.PI * 2;
    }

    // Random animation phase for animated obstacles
    if (config.animated) {
      this.animationPhase = Math.random() * Math.PI * 2;
    }
  }

  /**
   * Update obstacle animations and particles
   */
  update(deltaTime: number): void {
    const config = OBSTACLE_TYPE_CONFIGS[this.type];

    // Update rotation
    if (config.rotates) {
      this.rotationAngle += (deltaTime / 1000) * 0.5; // Slow rotation
    }

    // Update animation phase
    if (config.animated) {
      this.animationPhase += (deltaTime / 1000) * 2; // 2 rad/sec
    }

    // Update particles
    this.updateParticles(deltaTime);
  }

  /**
   * Apply damage to the obstacle
   * @param damage Amount of damage to apply
   * @returns Object with destruction info
   */
  takeDamage(damage: number): {
    destroyed: boolean;
    explosion?: {
      x: number;
      y: number;
      radius: number;
      damage: number;
    };
  } {
    this.currentHealth = Math.max(0, this.currentHealth - damage);
    this.lastDamageTime = Date.now();

    // Create impact particles
    this.createImpactParticles();

    const destroyed = this.currentHealth <= 0;

    if (destroyed) {
      const config = OBSTACLE_TYPE_CONFIGS[this.type];

      if (config.explosive) {
        return {
          destroyed: true,
          explosion: {
            x: this.x,
            y: this.y,
            radius: config.explosionRadius || 100,
            damage: config.explosionDamage || 30,
          },
        };
      }
    }

    return { destroyed };
  }

  /**
   * Get current obstacle color based on damage state
   */
  getCurrentColor(): string {
    const config = OBSTACLE_TYPE_CONFIGS[this.type];
    const healthPercentage = this.currentHealth / this.maxHealth;

    if (config.animated) {
      // Add pulsing effect for animated obstacles
      const pulseIntensity = 0.2 * Math.sin(this.animationPhase);
      const baseColor =
        healthPercentage > 0.5 ? config.color : config.damageColor;
      return this.adjustColorBrightness(baseColor, pulseIntensity);
    }

    if (healthPercentage > 0.6) {
      return config.color;
    } else if (healthPercentage > 0.3) {
      return this.blendColors(
        config.color,
        config.damageColor,
        (0.6 - healthPercentage) / 0.3
      );
    } else {
      return config.damageColor;
    }
  }

  /**
   * Create particles when obstacle is hit
   */
  private createImpactParticles(): void {
    const config = OBSTACLE_TYPE_CONFIGS[this.type];
    const particleCount = Math.floor(config.particleCount * 0.3);

    for (let i = 0; i < particleCount; i++) {
      const particle: WallParticle = {
        x: this.x + (Math.random() - 0.5) * this.getWidth(),
        y: this.y + (Math.random() - 0.5) * this.getHeight(),
        velocityX: (Math.random() - 0.5) * 150,
        velocityY: (Math.random() - 0.5) * 150,
        life: 800 + Math.random() * 400,
        maxLife: 800 + Math.random() * 400,
        size: 2 + Math.random() * 3,
        color: config.particleColor,
      };
      this.particles.push(particle);
    }
  }

  /**
   * Create destruction particles when obstacle is destroyed
   */
  createDestructionParticles(): WallParticle[] {
    const config = OBSTACLE_TYPE_CONFIGS[this.type];
    const particles: WallParticle[] = [];

    for (let i = 0; i < config.particleCount; i++) {
      const particle: WallParticle = {
        x: this.x + (Math.random() - 0.5) * this.getWidth(),
        y: this.y + (Math.random() - 0.5) * this.getHeight(),
        velocityX: (Math.random() - 0.5) * 300,
        velocityY: (Math.random() - 0.5) * 300,
        life: 1500 + Math.random() * 1000,
        maxLife: 1500 + Math.random() * 1000,
        size: 3 + Math.random() * 6,
        color: config.particleColor,
      };
      particles.push(particle);
    }

    return particles;
  }

  /**
   * Update obstacle particles
   */
  updateParticles(deltaTime: number): void {
    this.particles = this.particles.filter((particle) => {
      particle.x += particle.velocityX * (deltaTime / 1000);
      particle.y += particle.velocityY * (deltaTime / 1000);
      particle.life -= deltaTime;

      // Apply physics based on obstacle type
      const config = OBSTACLE_TYPE_CONFIGS[this.type];
      if (config.explosive && particle.life > particle.maxLife * 0.7) {
        // Explosive particles have initial burst
        particle.velocityX *= 0.95;
        particle.velocityY *= 0.95;
      } else {
        // Normal physics
        particle.velocityY += 30 * (deltaTime / 1000); // Light gravity
        particle.velocityX *= 0.98;
        particle.velocityY *= 0.98;
      }

      return particle.life > 0;
    });
  }

  /**
   * Check if a point collides with this obstacle
   */
  containsPoint(x: number, y: number, radius: number = 0): boolean {
    const config = OBSTACLE_TYPE_CONFIGS[this.type];

    if (config.shape === "circle") {
      const distance = Math.sqrt((x - this.x) ** 2 + (y - this.y) ** 2);
      return distance <= (this.radius || 30) + radius;
    } else {
      // Rectangle collision
      const halfWidth = (this.width || 50) / 2;
      const halfHeight = (this.height || 30) / 2;

      return (
        x - radius < this.x + halfWidth &&
        x + radius > this.x - halfWidth &&
        y - radius < this.y + halfHeight &&
        y + radius > this.y - halfHeight
      );
    }
  }

  /**
   * Get effective width for collision detection
   */
  getWidth(): number {
    const config = OBSTACLE_TYPE_CONFIGS[this.type];
    if (config.shape === "circle") {
      return (this.radius || 30) * 2;
    }
    return this.width || 50;
  }

  /**
   * Get effective height for collision detection
   */
  getHeight(): number {
    const config = OBSTACLE_TYPE_CONFIGS[this.type];
    if (config.shape === "circle") {
      return (this.radius || 30) * 2;
    }
    return this.height || 30;
  }

  /**
   * Serialize for network transmission
   */
  serialize(): EnvironmentalObstacleData {
    return {
      id: this.id,
      x: this.x,
      y: this.y,
      radius: this.radius,
      width: this.width,
      height: this.height,
      type: this.type,
      maxHealth: this.maxHealth,
      currentHealth: this.currentHealth,
      destructible: this.destructible,
      particles: this.particles,
      rotationAngle: this.rotationAngle,
      animationPhase: this.animationPhase,
    };
  }

  /**
   * Create EnvironmentalObstacle from serialized data
   */
  static deserialize(data: EnvironmentalObstacleData): EnvironmentalObstacle {
    const obstacle = new EnvironmentalObstacle(
      data.id,
      data.x,
      data.y,
      data.type
    );

    obstacle.radius = data.radius;
    obstacle.width = data.width;
    obstacle.height = data.height;
    obstacle.currentHealth = data.currentHealth;
    obstacle.particles = data.particles || [];
    obstacle.rotationAngle = data.rotationAngle || 0;
    obstacle.animationPhase = data.animationPhase || 0;

    return obstacle;
  }

  /**
   * Utility functions for color manipulation
   */
  private blendColors(color1: string, color2: string, ratio: number): string {
    const hex1 = color1.replace("#", "");
    const hex2 = color2.replace("#", "");

    const r1 = parseInt(hex1.substr(0, 2), 16);
    const g1 = parseInt(hex1.substr(2, 2), 16);
    const b1 = parseInt(hex1.substr(4, 2), 16);

    const r2 = parseInt(hex2.substr(0, 2), 16);
    const g2 = parseInt(hex2.substr(2, 2), 16);
    const b2 = parseInt(hex2.substr(4, 2), 16);

    const r = Math.round(r1 + (r2 - r1) * ratio);
    const g = Math.round(g1 + (g2 - g1) * ratio);
    const b = Math.round(b1 + (b2 - b1) * ratio);

    return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
  }

  private adjustColorBrightness(color: string, adjustment: number): string {
    const hex = color.replace("#", "");
    const r = Math.max(
      0,
      Math.min(255, parseInt(hex.substr(0, 2), 16) + adjustment * 255)
    );
    const g = Math.max(
      0,
      Math.min(255, parseInt(hex.substr(2, 2), 16) + adjustment * 255)
    );
    const b = Math.max(
      0,
      Math.min(255, parseInt(hex.substr(4, 2), 16) + adjustment * 255)
    );

    return `#${Math.round(r).toString(16).padStart(2, "0")}${Math.round(g).toString(16).padStart(2, "0")}${Math.round(b).toString(16).padStart(2, "0")}`;
  }

  /**
   * Get health percentage for UI display
   */
  getHealthPercentage(): number {
    return this.currentHealth / this.maxHealth;
  }

  /**
   * Check if obstacle is critically damaged
   */
  isCriticallyDamaged(): boolean {
    return this.getHealthPercentage() < 0.3;
  }

  /**
   * Generate a random environmental obstacle
   */
  static generateRandom(
    id: string,
    worldWidth: number,
    worldHeight: number,
    type?: ObstacleType
  ): EnvironmentalObstacle {
    const obstacleType =
      type ||
      Object.values(ObstacleType)[
        Math.floor(Math.random() * Object.values(ObstacleType).length)
      ];

    // Generate position with some margin from edges
    const margin = 100;
    const x = margin + Math.random() * (worldWidth - 2 * margin);
    const y = margin + Math.random() * (worldHeight - 2 * margin);

    // Random size variation (0.8x to 1.3x base size)
    const sizeMultiplier = 0.8 + Math.random() * 0.5;

    return new EnvironmentalObstacle(id, x, y, obstacleType, sizeMultiplier);
  }
}
