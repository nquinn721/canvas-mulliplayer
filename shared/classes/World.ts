// Wall interface for world obstacles
export interface Wall {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
}

// World class that manages game world, walls, and boundaries
export class World {
  public width: number;
  public height: number;
  public walls: Wall[];

  constructor(width: number = 5000, height: number = 5000) {
    this.width = width;
    this.height = height;
    this.walls = [];
  }

  // Generate random walls for the world
  generateWalls(wallCount: number = 60): void {
    this.walls = [];

    for (let i = 0; i < wallCount; i++) {
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
        validPosition = !this.walls.some((existingWall) => {
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
  }

  // Check if position collides with any wall
  checkWallCollision(x: number, y: number, radius: number): boolean {
    const wallBuffer = 10; // Add buffer around walls for smoother collision
    return this.walls.some((wall) => {
      return (
        x - radius < wall.x + wall.width + wallBuffer &&
        x + radius > wall.x - wallBuffer &&
        y - radius < wall.y + wall.height + wallBuffer &&
        y + radius > wall.y - wallBuffer
      );
    });
  }

  // Get a safe spawn position that doesn't collide with walls
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

  // Render all walls (client-side)
  drawWalls(
    ctx: CanvasRenderingContext2D,
    camera?: {
      x: number;
      y: number;
      viewportWidth: number;
      viewportHeight: number;
    }
  ): void {
    const wallsToDraw = camera ? this.getVisibleWalls(camera) : this.walls;

    ctx.fillStyle = "#666666";
    wallsToDraw.forEach((wall) => {
      ctx.fillRect(wall.x, wall.y, wall.width, wall.height);
    });
  }

  // Serialize world data for network transmission
  serialize(): {
    width: number;
    height: number;
    walls: Wall[];
  } {
    return {
      width: this.width,
      height: this.height,
      walls: this.walls,
    };
  }

  // Create world from serialized data
  static deserialize(data: {
    width: number;
    height: number;
    walls: Wall[];
  }): World {
    const world = new World(data.width, data.height);
    world.walls = data.walls;
    return world;
  }
}
