import {
  DestructibleWall,
  DestructibleWallData,
  WallType,
} from "./DestructibleWall";
import {
  EnvironmentalObstacle,
  EnvironmentalObstacleData,
  ObstacleType,
} from "./EnvironmentalObstacle";

// Wall interface for world obstacles
export interface Wall {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
}

// Extended wall interface that includes destructible walls
export interface ExtendedWall extends Wall {
  destructible?: boolean;
  health?: number;
  maxHealth?: number;
  type?: WallType;
}

// World class that manages game world, walls, and environmental obstacles
export class World {
  public width: number;
  public height: number;
  public walls: Wall[];
  public destructibleWalls: DestructibleWall[] = [];
  public environmentalObstacles: EnvironmentalObstacle[] = [];

  constructor(width: number = 5000, height: number = 5000) {
    this.width = width;
    this.height = height;
    this.walls = [];
    this.destructibleWalls = [];
    this.environmentalObstacles = [];
  }

  // Generate random walls and destructible obstacles for the world
  generateWalls(
    regularWallCount: number = 40,
    destructibleWallCount: number = 15,
    obstacleCount: number = 10
  ): void {
    this.walls = [];
    this.destructibleWalls = [];
    this.environmentalObstacles = [];

    // Generate regular walls (indestructible)
    for (let i = 0; i < regularWallCount; i++) {
      let wall: Wall;
      let attempts = 0;
      let validPosition = false;

      do {
        // Create thinner walls - either long horizontal or vertical walls
        const isHorizontal = Math.random() > 0.5;

        if (isHorizontal) {
          wall = {
            id: `wall_${i}`,
            x: Math.random() * (this.width - 300) + 150,
            y: Math.random() * (this.height - 100) + 50,
            width: 100 + Math.random() * 200, // 100-300px long
            height: 15 + Math.random() * 20, // 15-35px thick
            color: "#666666",
          };
        } else {
          wall = {
            id: `wall_${i}`,
            x: Math.random() * (this.width - 100) + 50,
            y: Math.random() * (this.height - 300) + 150,
            width: 15 + Math.random() * 20, // 15-35px thick
            height: 100 + Math.random() * 200, // 100-300px long
            color: "#666666",
          };
        }

        // Check if this wall overlaps with existing walls (with some spacing)
        validPosition = !this.getAllCollisionObjects().some((existingWall) => {
          const spacing = 50; // Minimum spacing between walls
          return !(
            wall.x + wall.width + spacing < existingWall.x ||
            wall.x > existingWall.x + existingWall.width + spacing ||
            wall.y + wall.height + spacing < existingWall.y ||
            wall.y > existingWall.y + existingWall.height + spacing
          );
        });

        attempts++;
      } while (!validPosition && attempts < 50);

      if (validPosition) {
        this.walls.push(wall);
      }
    }

    // Generate destructible walls
    for (let i = 0; i < destructibleWallCount; i++) {
      let attempts = 0;
      let validPosition = false;
      let destructibleWall: DestructibleWall;

      do {
        // Random wall type with weighted distribution
        const wallTypes = Object.values(WallType);
        const weights = [0.3, 0.2, 0.15, 0.15, 0.1, 0.1]; // Concrete most common
        const randomValue = Math.random();
        let cumulative = 0;
        let selectedType = WallType.CONCRETE;

        for (let j = 0; j < wallTypes.length; j++) {
          cumulative += weights[j];
          if (randomValue <= cumulative) {
            selectedType = wallTypes[j];
            break;
          }
        }

        destructibleWall = DestructibleWall.generateRandom(
          `destructible_wall_${i}`,
          this.width,
          this.height,
          selectedType
        );

        // Check if this wall overlaps with existing objects
        validPosition = !this.getAllCollisionObjects().some(
          (existingObject) => {
            const spacing = 60; // Slightly more spacing for destructible walls
            return !(
              destructibleWall.x + destructibleWall.width + spacing <
                existingObject.x ||
              destructibleWall.x >
                existingObject.x + existingObject.width + spacing ||
              destructibleWall.y + destructibleWall.height + spacing <
                existingObject.y ||
              destructibleWall.y >
                existingObject.y + existingObject.height + spacing
            );
          }
        );

        attempts++;
      } while (!validPosition && attempts < 50);

      if (validPosition) {
        this.destructibleWalls.push(destructibleWall);
      }
    }

    // Generate environmental obstacles
    for (let i = 0; i < obstacleCount; i++) {
      let attempts = 0;
      let validPosition = false;
      let obstacle: EnvironmentalObstacle;

      do {
        // Random obstacle type with weighted distribution
        const obstacleTypes = Object.values(ObstacleType);
        const weights = [0.25, 0.2, 0.1, 0.1, 0.1, 0.1, 0.1, 0.05]; // Asteroids and debris most common
        const randomValue = Math.random();
        let cumulative = 0;
        let selectedType = ObstacleType.ASTEROID;

        for (let j = 0; j < obstacleTypes.length; j++) {
          cumulative += weights[j];
          if (randomValue <= cumulative) {
            selectedType = obstacleTypes[j];
            break;
          }
        }

        obstacle = EnvironmentalObstacle.generateRandom(
          `obstacle_${i}`,
          this.width,
          this.height,
          selectedType
        );

        // Check if this obstacle overlaps with existing objects
        validPosition = !this.getAllCollisionObjects().some(
          (existingObject) => {
            const spacing = 70; // More spacing for obstacles
            const obstacleWidth = obstacle.getWidth();
            const obstacleHeight = obstacle.getHeight();

            return !(
              obstacle.x - obstacleWidth / 2 + obstacleWidth + spacing <
                existingObject.x ||
              obstacle.x - obstacleWidth / 2 >
                existingObject.x + existingObject.width + spacing ||
              obstacle.y - obstacleHeight / 2 + obstacleHeight + spacing <
                existingObject.y ||
              obstacle.y - obstacleHeight / 2 >
                existingObject.y + existingObject.height + spacing
            );
          }
        );

        attempts++;
      } while (!validPosition && attempts < 50);

      if (validPosition) {
        this.environmentalObstacles.push(obstacle);
      }
    }
  }

  // Get all collision objects (walls, destructible walls, and obstacles) for overlap checking
  getAllCollisionObjects(): Array<{
    x: number;
    y: number;
    width: number;
    height: number;
  }> {
    const objects: Array<{
      x: number;
      y: number;
      width: number;
      height: number;
    }> = [];

    // Add regular walls
    objects.push(...this.walls);

    // Add destructible walls
    objects.push(
      ...this.destructibleWalls.map((wall) => ({
        x: wall.x,
        y: wall.y,
        width: wall.width,
        height: wall.height,
      }))
    );

    // Add environmental obstacles (convert to rectangular bounds)
    objects.push(
      ...this.environmentalObstacles.map((obstacle) => {
        const width = obstacle.getWidth();
        const height = obstacle.getHeight();
        return {
          x: obstacle.x - width / 2,
          y: obstacle.y - height / 2,
          width: width,
          height: height,
        };
      })
    );

    return objects;
  }

  // Check if position collides with any wall or destructible object
  checkWallCollision(x: number, y: number, radius: number): boolean {
    const wallBuffer = 10; // Add buffer around walls for smoother collision

    // Check regular walls
    const wallCollision = this.walls.some((wall) => {
      return (
        x - radius < wall.x + wall.width + wallBuffer &&
        x + radius > wall.x - wallBuffer &&
        y - radius < wall.y + wall.height + wallBuffer &&
        y + radius > wall.y - wallBuffer
      );
    });

    if (wallCollision) return true;

    // Check destructible walls
    const destructibleCollision = this.destructibleWalls.some((wall) => {
      return (
        x - radius < wall.x + wall.width + wallBuffer &&
        x + radius > wall.x - wallBuffer &&
        y - radius < wall.y + wall.height + wallBuffer &&
        y + radius > wall.y - wallBuffer
      );
    });

    if (destructibleCollision) return true;

    // Check environmental obstacles
    const obstacleCollision = this.environmentalObstacles.some((obstacle) => {
      return obstacle.containsPoint(x, y, radius);
    });

    return obstacleCollision;
  }

  // Check projectile collision with destructible objects
  checkProjectileCollision(
    x: number,
    y: number
  ): {
    collision: boolean;
    destructibleWall?: DestructibleWall;
    obstacle?: EnvironmentalObstacle;
    regularWall?: boolean;
  } {
    const wallBuffer = 5; // Smaller buffer for projectiles

    // Check regular walls first
    const regularWallHit = this.walls.some((wall) => {
      return (
        x >= wall.x - wallBuffer &&
        x <= wall.x + wall.width + wallBuffer &&
        y >= wall.y - wallBuffer &&
        y <= wall.y + wall.height + wallBuffer
      );
    });

    if (regularWallHit) {
      return { collision: true, regularWall: true };
    }

    // Check destructible walls
    for (const wall of this.destructibleWalls) {
      if (
        x >= wall.x - wallBuffer &&
        x <= wall.x + wall.width + wallBuffer &&
        y >= wall.y - wallBuffer &&
        y <= wall.y + wall.height + wallBuffer
      ) {
        return { collision: true, destructibleWall: wall };
      }
    }

    // Check environmental obstacles
    for (const obstacle of this.environmentalObstacles) {
      if (obstacle.containsPoint(x, y, wallBuffer)) {
        return { collision: true, obstacle: obstacle };
      }
    }

    return { collision: false };
  }

  // Get a safe spawn position that doesn't collide with any objects
  getRandomSpawnPosition(): { x: number; y: number } {
    const playerRadius = 15;
    const safeDistance = 25; // Extra safe distance from walls
    let x, y;
    let attempts = 0;

    do {
      // Generate random position with safe margins from world edges
      x = Math.random() * (this.width - 2 * safeDistance) + safeDistance;
      y = Math.random() * (this.height - 2 * safeDistance) + safeDistance;
      attempts++;

      // If we can't find a safe spot after many attempts, use a guaranteed safe zone
      if (attempts > 200) {
        // Use a safe zone in the center of the map
        x = this.width / 2 + (Math.random() - 0.5) * 200;
        y = this.height / 2 + (Math.random() - 0.5) * 200;
        break;
      }
    } while (
      this.checkWallCollision(x, y, playerRadius + safeDistance) &&
      attempts < 200
    );

    return { x, y };
  }

  // Check if a point is within world boundaries
  isInBounds(x: number, y: number, radius: number = 0): boolean {
    return (
      x - radius >= 0 &&
      x + radius <= this.width &&
      y - radius >= 0 &&
      y + radius <= this.height
    );
  }

  // Clamp position to world boundaries
  clampToWorld(
    x: number,
    y: number,
    radius: number = 0
  ): { x: number; y: number } {
    return {
      x: Math.max(radius, Math.min(this.width - radius, x)),
      y: Math.max(radius, Math.min(this.height - radius, y)),
    };
  }

  // Get walls that are visible in camera view (for performance)
  getVisibleWalls(camera: {
    x: number;
    y: number;
    viewportWidth: number;
    viewportHeight: number;
  }): Wall[] {
    return this.walls.filter((wall) => {
      return (
        wall.x + wall.width >= camera.x &&
        wall.x <= camera.x + camera.viewportWidth &&
        wall.y + wall.height >= camera.y &&
        wall.y <= camera.y + camera.viewportHeight
      );
    });
  }

  // Get visible destructible walls
  getVisibleDestructibleWalls(camera: {
    x: number;
    y: number;
    viewportWidth: number;
    viewportHeight: number;
  }): DestructibleWall[] {
    return this.destructibleWalls.filter((wall) => {
      return (
        wall.x + wall.width >= camera.x &&
        wall.x <= camera.x + camera.viewportWidth &&
        wall.y + wall.height >= camera.y &&
        wall.y <= camera.y + camera.viewportHeight
      );
    });
  }

  // Get visible environmental obstacles
  getVisibleObstacles(camera: {
    x: number;
    y: number;
    viewportWidth: number;
    viewportHeight: number;
  }): EnvironmentalObstacle[] {
    return this.environmentalObstacles.filter((obstacle) => {
      const width = obstacle.getWidth();
      const height = obstacle.getHeight();
      return (
        obstacle.x + width / 2 >= camera.x &&
        obstacle.x - width / 2 <= camera.x + camera.viewportWidth &&
        obstacle.y + height / 2 >= camera.y &&
        obstacle.y - height / 2 <= camera.y + camera.viewportHeight
      );
    });
  }

  // Render all walls and destructible objects (client-side)
  drawWalls(
    ctx: CanvasRenderingContext2D,
    camera?: {
      x: number;
      y: number;
      viewportWidth: number;
      viewportHeight: number;
    }
  ): void {
    // Draw regular walls
    const wallsToDraw = camera ? this.getVisibleWalls(camera) : this.walls;
    ctx.fillStyle = "#666666";
    wallsToDraw.forEach((wall) => {
      ctx.fillRect(wall.x, wall.y, wall.width, wall.height);
    });

    // Draw destructible walls with health-based colors
    const destructibleWallsToDraw = camera
      ? this.getVisibleDestructibleWalls(camera)
      : this.destructibleWalls;
    destructibleWallsToDraw.forEach((wall) => {
      ctx.fillStyle = wall.getCurrentColor();
      ctx.fillRect(wall.x, wall.y, wall.width, wall.height);

      // Draw health bar for damaged walls
      const healthPercentage = wall.getHealthPercentage();
      if (healthPercentage < 1.0) {
        const barWidth = wall.width;
        const barHeight = 4;
        const barX = wall.x;
        const barY = wall.y - 8;

        // Health bar background
        ctx.fillStyle = "#333333";
        ctx.fillRect(barX, barY, barWidth, barHeight);

        // Health bar fill
        ctx.fillStyle =
          healthPercentage > 0.5
            ? "#00FF00"
            : healthPercentage > 0.25
              ? "#FFFF00"
              : "#FF0000";
        ctx.fillRect(barX, barY, barWidth * healthPercentage, barHeight);
      }
    });
  }

  // Draw environmental obstacles
  drawObstacles(
    ctx: CanvasRenderingContext2D,
    camera?: {
      x: number;
      y: number;
      viewportWidth: number;
      viewportHeight: number;
    }
  ): void {
    const obstaclesToDraw = camera
      ? this.getVisibleObstacles(camera)
      : this.environmentalObstacles;

    obstaclesToDraw.forEach((obstacle) => {
      ctx.save();

      // Apply rotation if obstacle rotates
      if (obstacle.rotationAngle !== 0) {
        ctx.translate(obstacle.x, obstacle.y);
        ctx.rotate(obstacle.rotationAngle);
        ctx.translate(-obstacle.x, -obstacle.y);
      }

      ctx.fillStyle = obstacle.getCurrentColor();

      // Draw based on shape
      const config = require("./EnvironmentalObstacle").OBSTACLE_TYPE_CONFIGS[
        obstacle.type
      ];
      if (config.shape === "circle") {
        ctx.beginPath();
        ctx.arc(obstacle.x, obstacle.y, obstacle.radius || 30, 0, Math.PI * 2);
        ctx.fill();
      } else {
        const halfWidth = (obstacle.width || 50) / 2;
        const halfHeight = (obstacle.height || 30) / 2;
        ctx.fillRect(
          obstacle.x - halfWidth,
          obstacle.y - halfHeight,
          obstacle.width || 50,
          obstacle.height || 30
        );
      }

      // Draw health bar for damaged obstacles
      const healthPercentage = obstacle.getHealthPercentage();
      if (healthPercentage < 1.0) {
        const barWidth = obstacle.getWidth() * 0.8;
        const barHeight = 3;
        const barX = obstacle.x - barWidth / 2;
        const barY = obstacle.y - obstacle.getHeight() / 2 - 8;

        // Health bar background
        ctx.fillStyle = "#333333";
        ctx.fillRect(barX, barY, barWidth, barHeight);

        // Health bar fill
        ctx.fillStyle =
          healthPercentage > 0.5
            ? "#00FF00"
            : healthPercentage > 0.25
              ? "#FFFF00"
              : "#FF0000";
        ctx.fillRect(barX, barY, barWidth * healthPercentage, barHeight);
      }

      ctx.restore();
    });
  }

  // Draw all particles from destructible objects
  drawParticles(ctx: CanvasRenderingContext2D): void {
    // Draw destructible wall particles
    this.destructibleWalls.forEach((wall) => {
      wall.particles.forEach((particle) => {
        const alpha = particle.life / particle.maxLife;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = particle.color;
        ctx.fillRect(
          particle.x - particle.size / 2,
          particle.y - particle.size / 2,
          particle.size,
          particle.size
        );
        ctx.restore();
      });
    });

    // Draw obstacle particles
    this.environmentalObstacles.forEach((obstacle) => {
      obstacle.particles.forEach((particle) => {
        const alpha = particle.life / particle.maxLife;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = particle.color;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });
    });
  }

  // Update all destructible objects and their particles
  updateDestructibleObjects(deltaTime: number): void {
    this.destructibleWalls.forEach((wall) => {
      wall.updateParticles(deltaTime);
    });

    this.environmentalObstacles.forEach((obstacle) => {
      obstacle.update(deltaTime);
    });
  }

  // Remove a destructible wall by ID
  removeDestructibleWall(id: string): DestructibleWall | null {
    const index = this.destructibleWalls.findIndex((wall) => wall.id === id);
    if (index !== -1) {
      return this.destructibleWalls.splice(index, 1)[0];
    }
    return null;
  }

  // Remove an environmental obstacle by ID
  removeObstacle(id: string): EnvironmentalObstacle | null {
    const index = this.environmentalObstacles.findIndex(
      (obstacle) => obstacle.id === id
    );
    if (index !== -1) {
      return this.environmentalObstacles.splice(index, 1)[0];
    }
    return null;
  }

  // Serialize world data for network transmission
  serialize(): {
    width: number;
    height: number;
    walls: Wall[];
    destructibleWalls: DestructibleWallData[];
    environmentalObstacles: EnvironmentalObstacleData[];
  } {
    return {
      width: this.width,
      height: this.height,
      walls: this.walls,
      destructibleWalls: this.destructibleWalls.map((wall) => wall.serialize()),
      environmentalObstacles: this.environmentalObstacles.map((obstacle) =>
        obstacle.serialize()
      ),
    };
  }

  // Create world from serialized data
  static deserialize(data: {
    width: number;
    height: number;
    walls: Wall[];
    destructibleWalls?: DestructibleWallData[];
    environmentalObstacles?: EnvironmentalObstacleData[];
  }): World {
    const world = new World(data.width, data.height);
    world.walls = data.walls;

    // Deserialize destructible walls if present
    if (data.destructibleWalls) {
      world.destructibleWalls = data.destructibleWalls.map((wallData) =>
        DestructibleWall.deserialize(wallData)
      );
    }

    // Deserialize environmental obstacles if present
    if (data.environmentalObstacles) {
      world.environmentalObstacles = data.environmentalObstacles.map(
        (obstacleData) => EnvironmentalObstacle.deserialize(obstacleData)
      );
    }

    return world;
  }
}
