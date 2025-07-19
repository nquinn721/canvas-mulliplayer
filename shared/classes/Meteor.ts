// Meteor class for random destructive meteors
export class Meteor {
  public id: string;
  public x: number;
  public y: number;
  public velocityX: number;
  public velocityY: number;
  public angle: number;
  public speed: number;
  public damage: number;
  public radius: number;
  public createdAt: number;
  public maxDistance: number;
  public rotationSpeed: number;
  public rotation: number;

  constructor(
    id: string,
    x: number,
    y: number,
    targetX: number,
    targetY: number,
    speed: number = 350
  ) {
    this.id = id;
    this.x = x;
    this.y = y;
    this.speed = speed;
    this.damage = 40;
    this.radius = 12;
    this.createdAt = Date.now();
    this.maxDistance = 3000; // Max travel distance
    this.rotationSpeed = Math.random() * 10 + 5; // Random rotation speed
    this.rotation = 0;

    // Calculate direction to target
    const dx = targetX - x;
    const dy = targetY - y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    this.angle = Math.atan2(dy, dx);
    this.velocityX = (dx / distance) * speed;
    this.velocityY = (dy / distance) * speed;
  }

  // Update meteor position
  update(deltaTime: number): boolean {
    // Update position
    this.x += this.velocityX * deltaTime;
    this.y += this.velocityY * deltaTime;

    // Update rotation
    this.rotation += this.rotationSpeed * deltaTime;

    // Check if meteor has traveled too far
    const traveledDistance =
      (this.speed * (Date.now() - this.createdAt)) / 1000;
    return traveledDistance < this.maxDistance;
  }

  // Check collision with a point (player or other entity)
  checkCollision(x: number, y: number, radius: number): boolean {
    const dx = this.x - x;
    const dy = this.y - y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance < this.radius + radius;
  }

  // Get distance traveled
  getDistanceTraveled(): number {
    return (this.speed * (Date.now() - this.createdAt)) / 1000;
  }

  // Serialize meteor data for network transmission
  serialize(): {
    id: string;
    x: number;
    y: number;
    velocityX: number;
    velocityY: number;
    angle: number;
    speed: number;
    damage: number;
    radius: number;
    rotation: number;
    createdAt: number;
  } {
    return {
      id: this.id,
      x: this.x,
      y: this.y,
      velocityX: this.velocityX,
      velocityY: this.velocityY,
      angle: this.angle,
      speed: this.speed,
      damage: this.damage,
      radius: this.radius,
      rotation: this.rotation,
      createdAt: this.createdAt,
    };
  }

  // Create meteor from serialized data
  static deserialize(data: {
    id: string;
    x: number;
    y: number;
    velocityX: number;
    velocityY: number;
    angle: number;
    speed: number;
    damage: number;
    radius: number;
    rotation: number;
    createdAt: number;
  }): Meteor {
    const meteor = new Meteor(
      data.id,
      data.x,
      data.y,
      data.x + 100,
      data.y + 100,
      data.speed
    );
    meteor.velocityX = data.velocityX;
    meteor.velocityY = data.velocityY;
    meteor.angle = data.angle;
    meteor.damage = data.damage;
    meteor.radius = data.radius;
    meteor.rotation = data.rotation;
    meteor.createdAt = data.createdAt;
    return meteor;
  }
}
