import { Wall } from "./World";

export interface DestructibleWallData {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  maxHealth: number;
  currentHealth: number;
  type: WallType;
  destructible: true;
  particles?: WallParticle[];
}

export interface WallParticle {
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

export enum WallType {
  CONCRETE = "concrete", // Standard destructible wall - medium health
  METAL = "metal", // High health, sparks when hit
  GLASS = "glass", // Low health, shatters dramatically
  ENERGY_BARRIER = "energy", // Medium health, energy effects
  CRYSTAL = "crystal", // Low-medium health, crystal fragments
  WOOD = "wood", // Low health, wood chips
}

export interface WallTypeConfig {
  health: number;
  color: string;
  damageColor: string;
  particleColor: string;
  particleCount: number;
  description: string;
}

export const WALL_TYPE_CONFIGS: Record<WallType, WallTypeConfig> = {
  [WallType.CONCRETE]: {
    health: 120,
    color: "#8B8B8B",
    damageColor: "#666666",
    particleColor: "#A0A0A0",
    particleCount: 8,
    description: "Standard concrete wall",
  },
  [WallType.METAL]: {
    health: 200,
    color: "#C0C0C0",
    damageColor: "#808080",
    particleColor: "#FFD700",
    particleCount: 12,
    description: "Reinforced metal wall",
  },
  [WallType.GLASS]: {
    health: 40,
    color: "#E6F3FF",
    damageColor: "#B3D9FF",
    particleColor: "#FFFFFF",
    particleCount: 15,
    description: "Fragile glass barrier",
  },
  [WallType.ENERGY_BARRIER]: {
    health: 80,
    color: "#00FFFF",
    damageColor: "#0080FF",
    particleColor: "#80FFFF",
    particleCount: 10,
    description: "Energy force field",
  },
  [WallType.CRYSTAL]: {
    health: 60,
    color: "#FF69B4",
    damageColor: "#FF1493",
    particleColor: "#FFB6C1",
    particleCount: 12,
    description: "Crystalline structure",
  },
  [WallType.WOOD]: {
    health: 50,
    color: "#8B4513",
    damageColor: "#654321",
    particleColor: "#D2691E",
    particleCount: 6,
    description: "Wooden barrier",
  },
};

/**
 * DestructibleWall - Environmental obstacle that can be destroyed by weapons
 * Features:
 * - Different wall types with varying health and visual effects
 * - Damage visualization with color changes
 * - Particle effects when destroyed
 * - Strategic gameplay - create new paths or remove cover
 */
export class DestructibleWall {
  public id: string;
  public x: number;
  public y: number;
  public width: number;
  public height: number;
  public type: WallType;
  public maxHealth: number;
  public currentHealth: number;
  public particles: WallParticle[] = [];
  public destructible: true = true;
  public lastDamageTime: number = 0;

  constructor(
    id: string,
    x: number,
    y: number,
    width: number,
    height: number,
    type: WallType = WallType.CONCRETE
  ) {
    this.id = id;
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.type = type;

    const config = WALL_TYPE_CONFIGS[type];
    this.maxHealth = config.health;
    this.currentHealth = config.health;
  }

  /**
   * Apply damage to the wall
   * @param damage Amount of damage to apply
   * @returns true if wall is destroyed, false otherwise
   */
  takeDamage(damage: number): boolean {
    this.currentHealth = Math.max(0, this.currentHealth - damage);
    this.lastDamageTime = Date.now();

    // Create impact particles
    this.createImpactParticles();

    return this.currentHealth <= 0;
  }

  /**
   * Get current wall color based on damage state
   */
  getCurrentColor(): string {
    const config = WALL_TYPE_CONFIGS[this.type];
    const healthPercentage = this.currentHealth / this.maxHealth;

    if (healthPercentage > 0.7) {
      return config.color;
    } else if (healthPercentage > 0.3) {
      // Blend to damage color
      return this.blendColors(
        config.color,
        config.damageColor,
        (0.7 - healthPercentage) / 0.4
      );
    } else {
      // Heavy damage - darker color
      return config.damageColor;
    }
  }

  /**
   * Create particles when wall is hit
   */
  private createImpactParticles(): void {
    const config = WALL_TYPE_CONFIGS[this.type];
    const particleCount = Math.floor(config.particleCount * 0.3); // Fewer particles for impact

    for (let i = 0; i < particleCount; i++) {
      const particle: WallParticle = {
        x: this.x + Math.random() * this.width,
        y: this.y + Math.random() * this.height,
        velocityX: (Math.random() - 0.5) * 100,
        velocityY: (Math.random() - 0.5) * 100,
        life: 1000 + Math.random() * 500,
        maxLife: 1000 + Math.random() * 500,
        size: 2 + Math.random() * 3,
        color: config.particleColor,
      };
      this.particles.push(particle);
    }
  }

  /**
   * Create destruction particles when wall is destroyed
   */
  createDestructionParticles(): WallParticle[] {
    const config = WALL_TYPE_CONFIGS[this.type];
    const particles: WallParticle[] = [];

    for (let i = 0; i < config.particleCount; i++) {
      const particle: WallParticle = {
        x: this.x + Math.random() * this.width,
        y: this.y + Math.random() * this.height,
        velocityX: (Math.random() - 0.5) * 200,
        velocityY: (Math.random() - 0.5) * 200,
        life: 2000 + Math.random() * 1000,
        maxLife: 2000 + Math.random() * 1000,
        size: 3 + Math.random() * 5,
        color: config.particleColor,
      };
      particles.push(particle);
    }

    return particles;
  }

  /**
   * Update wall particles
   */
  updateParticles(deltaTime: number): void {
    this.particles = this.particles.filter((particle) => {
      particle.x += particle.velocityX * (deltaTime / 1000);
      particle.y += particle.velocityY * (deltaTime / 1000);
      particle.life -= deltaTime;

      // Apply gravity and air resistance
      particle.velocityY += 50 * (deltaTime / 1000); // Gravity
      particle.velocityX *= 0.99; // Air resistance
      particle.velocityY *= 0.99;

      return particle.life > 0;
    });
  }

  /**
   * Check if a point collides with this wall
   */
  containsPoint(x: number, y: number, radius: number = 0): boolean {
    return (
      x - radius < this.x + this.width &&
      x + radius > this.x &&
      y - radius < this.y + this.height &&
      y + radius > this.y
    );
  }

  /**
   * Convert to basic Wall interface for collision detection
   */
  toWall(): Wall {
    return {
      id: this.id,
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
      color: this.getCurrentColor(),
    };
  }

  /**
   * Serialize for network transmission
   */
  serialize(): DestructibleWallData {
    return {
      id: this.id,
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
      color: this.getCurrentColor(),
      maxHealth: this.maxHealth,
      currentHealth: this.currentHealth,
      type: this.type,
      destructible: true,
      particles: this.particles,
    };
  }

  /**
   * Create DestructibleWall from serialized data
   */
  static deserialize(data: DestructibleWallData): DestructibleWall {
    const wall = new DestructibleWall(
      data.id,
      data.x,
      data.y,
      data.width,
      data.height,
      data.type
    );
    wall.currentHealth = data.currentHealth;
    wall.particles = data.particles || [];
    return wall;
  }

  /**
   * Utility function to blend two hex colors
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

  /**
   * Get health percentage for UI display
   */
  getHealthPercentage(): number {
    return this.currentHealth / this.maxHealth;
  }

  /**
   * Check if wall is critically damaged (for visual/audio cues)
   */
  isCriticallyDamaged(): boolean {
    return this.getHealthPercentage() < 0.3;
  }

  /**
   * Generate a random destructible wall of a specific type
   */
  static generateRandom(
    id: string,
    worldWidth: number,
    worldHeight: number,
    type?: WallType
  ): DestructibleWall {
    const wallType =
      type ||
      Object.values(WallType)[
        Math.floor(Math.random() * Object.values(WallType).length)
      ];

    // Create thinner walls - either long horizontal or vertical walls
    const isHorizontal = Math.random() > 0.5;

    let x, y, width, height;

    if (isHorizontal) {
      x = Math.random() * (worldWidth - 300) + 150;
      y = Math.random() * (worldHeight - 100) + 50;
      width = 100 + Math.random() * 200; // 100-300px long
      height = 15 + Math.random() * 20; // 15-35px thick
    } else {
      x = Math.random() * (worldWidth - 100) + 50;
      y = Math.random() * (worldHeight - 300) + 150;
      width = 15 + Math.random() * 20; // 15-35px thick
      height = 100 + Math.random() * 200; // 100-300px long
    }

    return new DestructibleWall(id, x, y, width, height, wallType);
  }
}
