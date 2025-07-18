export interface PowerUpData {
  id: string;
  x: number;
  y: number;
  type: PowerUpType;
  collected: boolean;
  respawnTime?: number;
}

export enum PowerUpType {
  BOOST_UPGRADE = "boost_upgrade",
  LASER_UPGRADE = "laser_upgrade",
  MISSILE_UPGRADE = "missile_upgrade",
}

export class PowerUp {
  public id: string;
  public x: number;
  public y: number;
  public type: PowerUpType;
  public collected: boolean;
  public respawnTime: number;
  public radius: number = 20;

  constructor(id: string, x: number, y: number, type: PowerUpType) {
    this.id = id;
    this.x = x;
    this.y = y;
    this.type = type;
    this.collected = false;
    this.respawnTime = 0;
  }

  // Check if a point is within this power-up
  containsPoint(x: number, y: number): boolean {
    const distance = Math.sqrt((this.x - x) ** 2 + (this.y - y) ** 2);
    return distance <= this.radius;
  }

  // Collect the power-up
  collect(): void {
    this.collected = true;
    this.respawnTime = Date.now() + 30000; // Respawn after 30 seconds
  }

  // Check if power-up should respawn
  canRespawn(): boolean {
    return this.collected && Date.now() >= this.respawnTime;
  }

  // Respawn the power-up
  respawn(): void {
    this.collected = false;
    this.respawnTime = 0;
  }

  // Serialize for network transmission
  serialize(): PowerUpData {
    return {
      id: this.id,
      x: this.x,
      y: this.y,
      type: this.type,
      collected: this.collected,
      respawnTime: this.respawnTime,
    };
  }

  // Create from serialized data
  static deserialize(data: PowerUpData): PowerUp {
    const powerUp = new PowerUp(data.id, data.x, data.y, data.type);
    powerUp.collected = data.collected;
    powerUp.respawnTime = data.respawnTime || 0;
    return powerUp;
  }
}
