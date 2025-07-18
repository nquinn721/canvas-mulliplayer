export interface Particle {
  id: string;
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  alpha: number;
  gravity?: number;
  friction?: number;
}

export interface ParticleSystem {
  particles: Particle[];
  emissionRate: number;
  maxParticles: number;
  active: boolean;
  x: number;
  y: number;
  type: 'explosion' | 'impact' | 'smoke';
}

export class ParticleManager {
  private particles: Particle[] = [];
  private particleSystems: Map<string, ParticleSystem> = new Map();
  private particleIdCounter = 0;

  createExplosionParticles(
    x: number,
    y: number,
    count: number = 20,
    color: string = '#ff4500',
    radius: number = 80
  ): void {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
      const speed = 100 + Math.random() * 150;
      const size = 2 + Math.random() * 4;
      const life = 0.5 + Math.random() * 1.0;

      const particle: Particle = {
        id: `particle_${this.particleIdCounter++}`,
        x: x + (Math.random() - 0.5) * 20,
        y: y + (Math.random() - 0.5) * 20,
        velocityX: Math.cos(angle) * speed,
        velocityY: Math.sin(angle) * speed,
        life: life,
        maxLife: life,
        size: size,
        color: color,
        alpha: 1.0,
        gravity: 50,
        friction: 0.95
      };

      this.particles.push(particle);
    }

    // Add some smoke particles
    for (let i = 0; i < 10; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 20 + Math.random() * 40;
      const size = 4 + Math.random() * 8;
      const life = 1.0 + Math.random() * 2.0;

      const particle: Particle = {
        id: `smoke_${this.particleIdCounter++}`,
        x: x + (Math.random() - 0.5) * 40,
        y: y + (Math.random() - 0.5) * 40,
        velocityX: Math.cos(angle) * speed,
        velocityY: Math.sin(angle) * speed - 30, // Rise up
        life: life,
        maxLife: life,
        size: size,
        color: '#666666',
        alpha: 0.8,
        gravity: -10, // Negative gravity to rise
        friction: 0.98
      };

      this.particles.push(particle);
    }
  }

  createImpactParticles(
    x: number,
    y: number,
    count: number = 8,
    color: string = '#00ff00'
  ): void {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.3;
      const speed = 50 + Math.random() * 100;
      const size = 1 + Math.random() * 2;
      const life = 0.2 + Math.random() * 0.3;

      const particle: Particle = {
        id: `impact_${this.particleIdCounter++}`,
        x: x + (Math.random() - 0.5) * 10,
        y: y + (Math.random() - 0.5) * 10,
        velocityX: Math.cos(angle) * speed,
        velocityY: Math.sin(angle) * speed,
        life: life,
        maxLife: life,
        size: size,
        color: color,
        alpha: 1.0,
        gravity: 30,
        friction: 0.9
      };

      this.particles.push(particle);
    }
  }

  update(deltaTime: number): void {
    this.particles = this.particles.filter(particle => {
      // Update particle position
      particle.x += particle.velocityX * deltaTime;
      particle.y += particle.velocityY * deltaTime;

      // Apply gravity
      if (particle.gravity) {
        particle.velocityY += particle.gravity * deltaTime;
      }

      // Apply friction
      if (particle.friction) {
        particle.velocityX *= particle.friction;
        particle.velocityY *= particle.friction;
      }

      // Update life
      particle.life -= deltaTime;
      particle.alpha = Math.max(0, particle.life / particle.maxLife);

      // Remove dead particles
      return particle.life > 0;
    });
  }

  draw(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    
    this.particles.forEach(particle => {
      ctx.globalAlpha = particle.alpha;
      ctx.fillStyle = particle.color;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      ctx.fill();
    });
    
    ctx.restore();
  }

  getParticleCount(): number {
    return this.particles.length;
  }

  clear(): void {
    this.particles = [];
  }
}
