/**
 * Pathfinding utilities for AI navigation around obstacles
 * Implements A* pathfinding algorithm for efficient navigation
 */

interface Point {
  x: number;
  y: number;
}

interface Wall {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface PathNode {
  x: number;
  y: number;
  g: number; // Distance from start
  h: number; // Heuristic distance to goal
  f: number; // Total cost (g + h)
  parent: PathNode | null;
}

export class PathfindingUtils {
  private static readonly GRID_SIZE = 50; // Size of each grid cell
  private static readonly MAX_ITERATIONS = 1000; // Prevent infinite loops

  /**
   * Check if there's a clear line of sight between two points
   * Uses Bresenham's line algorithm to check for wall intersections
   */
  static hasLineOfSight(
    start: Point,
    end: Point,
    walls: Wall[],
    entityRadius: number = 20
  ): boolean {
    const dx = Math.abs(end.x - start.x);
    const dy = Math.abs(end.y - start.y);
    const steps = Math.max(dx, dy);

    if (steps === 0) return true;

    const stepX = (end.x - start.x) / steps;
    const stepY = (end.y - start.y) / steps;

    // Check points along the line for wall collisions
    for (let i = 0; i <= steps; i += 5) {
      // Check every 5 pixels for performance
      const checkX = start.x + stepX * i;
      const checkY = start.y + stepY * i;

      if (this.isPositionBlocked(checkX, checkY, walls, entityRadius)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Check if a position is blocked by walls
   */
  static isPositionBlocked(
    x: number,
    y: number,
    walls: Wall[],
    entityRadius: number = 20
  ): boolean {
    return walls.some((wall) => {
      return (
        x - entityRadius < wall.x + wall.width &&
        x + entityRadius > wall.x &&
        y - entityRadius < wall.y + wall.height &&
        y + entityRadius > wall.y
      );
    });
  }

  /**
   * Find a path from start to goal using A* pathfinding
   * Returns an array of waypoints to follow
   */
  static findPath(
    start: Point,
    goal: Point,
    walls: Wall[],
    worldWidth: number,
    worldHeight: number,
    entityRadius: number = 20
  ): Point[] {
    // If there's direct line of sight, return direct path
    if (this.hasLineOfSight(start, goal, walls, entityRadius)) {
      return [start, goal];
    }

    const openSet: PathNode[] = [];
    const closedSet: Set<string> = new Set();

    const startNode: PathNode = {
      x: Math.round(start.x / this.GRID_SIZE) * this.GRID_SIZE,
      y: Math.round(start.y / this.GRID_SIZE) * this.GRID_SIZE,
      g: 0,
      h: this.heuristic(start, goal),
      f: 0,
      parent: null,
    };
    startNode.f = startNode.g + startNode.h;

    openSet.push(startNode);
    let iterations = 0;

    while (openSet.length > 0 && iterations < this.MAX_ITERATIONS) {
      iterations++;

      // Find node with lowest f cost
      openSet.sort((a, b) => a.f - b.f);
      const current = openSet.shift()!;

      const nodeKey = `${current.x},${current.y}`;
      closedSet.add(nodeKey);

      // Check if we reached the goal
      if (this.distance(current, goal) < this.GRID_SIZE * 1.5) {
        return this.reconstructPath(current, start, goal);
      }

      // Check all neighbors
      const neighbors = this.getNeighbors(current, worldWidth, worldHeight);

      for (const neighbor of neighbors) {
        const neighborKey = `${neighbor.x},${neighbor.y}`;

        if (closedSet.has(neighborKey)) continue;

        // Skip if position is blocked
        if (
          this.isPositionBlocked(neighbor.x, neighbor.y, walls, entityRadius)
        ) {
          continue;
        }

        const tentativeG = current.g + this.distance(current, neighbor);
        const existingNode = openSet.find(
          (n) => n.x === neighbor.x && n.y === neighbor.y
        );

        if (!existingNode) {
          // New node
          const newNode: PathNode = {
            x: neighbor.x,
            y: neighbor.y,
            g: tentativeG,
            h: this.heuristic(neighbor, goal),
            f: 0,
            parent: current,
          };
          newNode.f = newNode.g + newNode.h;
          openSet.push(newNode);
        } else if (tentativeG < existingNode.g) {
          // Better path to existing node
          existingNode.g = tentativeG;
          existingNode.f = existingNode.g + existingNode.h;
          existingNode.parent = current;
        }
      }
    }

    // No path found, return direct line as fallback
    return [start, goal];
  }

  /**
   * Get neighboring grid positions
   */
  private static getNeighbors(
    node: PathNode,
    worldWidth: number,
    worldHeight: number
  ): Point[] {
    const neighbors: Point[] = [];
    const directions = [
      { x: -this.GRID_SIZE, y: 0 }, // Left
      { x: this.GRID_SIZE, y: 0 }, // Right
      { x: 0, y: -this.GRID_SIZE }, // Up
      { x: 0, y: this.GRID_SIZE }, // Down
      { x: -this.GRID_SIZE, y: -this.GRID_SIZE }, // Top-left
      { x: this.GRID_SIZE, y: -this.GRID_SIZE }, // Top-right
      { x: -this.GRID_SIZE, y: this.GRID_SIZE }, // Bottom-left
      { x: this.GRID_SIZE, y: this.GRID_SIZE }, // Bottom-right
    ];

    for (const dir of directions) {
      const newX = node.x + dir.x;
      const newY = node.y + dir.y;

      // Check world bounds
      if (newX >= 0 && newX < worldWidth && newY >= 0 && newY < worldHeight) {
        neighbors.push({ x: newX, y: newY });
      }
    }

    return neighbors;
  }

  /**
   * Heuristic function for A* (Manhattan distance)
   */
  private static heuristic(a: Point, b: Point): number {
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
  }

  /**
   * Calculate Euclidean distance between two points
   */
  static distance(a: Point, b: Point): number {
    return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
  }

  /**
   * Reconstruct the path from the goal node back to start
   */
  private static reconstructPath(
    goalNode: PathNode,
    start: Point,
    goal: Point
  ): Point[] {
    const path: Point[] = [];
    let current: PathNode | null = goalNode;

    // Build path from goal to start
    while (current !== null) {
      path.unshift({ x: current.x, y: current.y });
      current = current.parent;
    }

    // Add actual start and goal positions
    if (path.length > 0) {
      path[0] = start; // Replace first node with actual start
      path.push(goal); // Add actual goal
    }

    return path;
  }

  /**
   * Simplify path by removing unnecessary waypoints
   * If there's line of sight between two non-adjacent waypoints, remove the intermediate ones
   */
  static simplifyPath(
    path: Point[],
    walls: Wall[],
    entityRadius: number = 20
  ): Point[] {
    if (path.length <= 2) return path;

    const simplified: Point[] = [path[0]];
    let currentIndex = 0;

    while (currentIndex < path.length - 1) {
      let nextIndex = currentIndex + 1;

      // Find the furthest point we can see from current position
      for (let i = currentIndex + 2; i < path.length; i++) {
        if (
          this.hasLineOfSight(path[currentIndex], path[i], walls, entityRadius)
        ) {
          nextIndex = i;
        } else {
          break;
        }
      }

      simplified.push(path[nextIndex]);
      currentIndex = nextIndex;
    }

    return simplified;
  }

  /**
   * Find a safe position to move towards when avoiding obstacles
   * Returns a position that's not blocked and moves away from obstacles
   */
  static findSafePosition(
    currentPos: Point,
    targetPos: Point,
    walls: Wall[],
    worldWidth: number,
    worldHeight: number,
    entityRadius: number = 20,
    avoidanceDistance: number = 100
  ): Point {
    // If current position is not blocked, try to find a path
    if (
      !this.isPositionBlocked(currentPos.x, currentPos.y, walls, entityRadius)
    ) {
      const path = this.findPath(
        currentPos,
        targetPos,
        walls,
        worldWidth,
        worldHeight,
        entityRadius
      );
      if (path.length > 1) {
        return path[1]; // Return next waypoint
      }
    }

    // Find the nearest wall that's blocking us
    let nearestWall: Wall | null = null;
    let nearestDistance = Infinity;

    for (const wall of walls) {
      const wallCenterX = wall.x + wall.width / 2;
      const wallCenterY = wall.y + wall.height / 2;
      const distance = this.distance(currentPos, {
        x: wallCenterX,
        y: wallCenterY,
      });

      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestWall = wall;
      }
    }

    if (!nearestWall) {
      return targetPos; // No walls nearby, move towards target
    }

    // Calculate avoidance direction (perpendicular to wall)
    const wallCenterX = nearestWall.x + nearestWall.width / 2;
    const wallCenterY = nearestWall.y + nearestWall.height / 2;

    // Direction from wall to current position
    const avoidX = currentPos.x - wallCenterX;
    const avoidY = currentPos.y - wallCenterY;
    const avoidLength = Math.sqrt(avoidX * avoidX + avoidY * avoidY);

    if (avoidLength === 0) {
      // We're exactly on the wall center, pick a random direction
      const angle = Math.random() * Math.PI * 2;
      return {
        x: Math.max(
          entityRadius,
          Math.min(
            worldWidth - entityRadius,
            currentPos.x + Math.cos(angle) * avoidanceDistance
          )
        ),
        y: Math.max(
          entityRadius,
          Math.min(
            worldHeight - entityRadius,
            currentPos.y + Math.sin(angle) * avoidanceDistance
          )
        ),
      };
    }

    // Normalize avoidance direction
    const normalizedAvoidX = avoidX / avoidLength;
    const normalizedAvoidY = avoidY / avoidLength;

    // Calculate safe position
    const safeX = currentPos.x + normalizedAvoidX * avoidanceDistance;
    const safeY = currentPos.y + normalizedAvoidY * avoidanceDistance;

    // Clamp to world bounds
    return {
      x: Math.max(entityRadius, Math.min(worldWidth - entityRadius, safeX)),
      y: Math.max(entityRadius, Math.min(worldHeight - entityRadius, safeY)),
    };
  }
}
