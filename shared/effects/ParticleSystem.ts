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
  gravity: number;
  fadeOut: boolean;
}

export interface ParticleSystem {
  id: string;
  x: number;
  y: number;
  particles: Particle[];
  createdAt: number;
  duration: number;
  type: 'explosion' | 'impact';
}

export class ParticleSystemManager {
  private static particleIdCounter = 0;

  /**
   * Create a missile explosion particle system
   */
  static createExplosionParticles(
    systemId: string,
    x: number,
    y: number,
    color: string = "#ff4500",
    particleCount: number = 25
  ): ParticleSystem {
    const particles: Particle[] = [];
    
    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 * i) / particleCount + (Math.random() - 0.5) * 0.5;
      const speed = 100 + Math.random() * 150; // Random speed between 100-250
      const life = 1500 + Math.random() * 1000; // 1.5-2.5 seconds
      
      particles.push({
        id: `particle_${this.particleIdCounter++}`,
        x: x,
        y: y,
        velocityX: Math.cos(angle) * speed,
        velocityY: Math.sin(angle) * speed,
        life: life,
        maxLife: life,
        size: 3 + Math.random() * 4, // Size 3-7
        color: this.getExplosionColor(color, Math.random()),
        gravity: 50, // Gravity effect
        fadeOut: true
      });
    }

    return {
      id: systemId,
      x: x,
      y: y,
      particles: particles,
      createdAt: Date.now(),
      duration: 3000, // 3 seconds total
      type: 'explosion'
    };
  }

  /**
   * Create a laser impact particle system
   */
  static createImpactParticles(
    systemId: string,
    x: number,
    y: number,
    color: string = "#ff0066",
    particleCount: number = 8
  ): ParticleSystem {
    const particles: Particle[] = [];
    
    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 * i) / particleCount + (Math.random() - 0.5) * 0.8;
      const speed = 50 + Math.random() * 80; // Random speed between 50-130
      const life = 300 + Math.random() * 400; // 0.3-0.7 seconds
      
      particles.push({
        id: `particle_${this.particleIdCounter++}`,
        x: x,
        y: y,
        velocityX: Math.cos(angle) * speed,
        velocityY: Math.sin(angle) * speed,
        life: life,
        maxLife: life,
        size: 2 + Math.random() * 3, // Size 2-5
        color: this.getImpactColor(color, Math.random()),
        gravity: 20, // Light gravity effect
        fadeOut: true
      });
    }

    return {
      id: systemId,
      x: x,
      y: y,
      particles: particles,
      createdAt: Date.now(),
      duration: 1000, // 1 second total
      type: 'impact'
    };
  }

  /**
   * Update particle system
   */
  static updateParticleSystem(system: ParticleSystem, deltaTime: number): boolean {
    const currentTime = Date.now();
    const systemAge = currentTime - system.createdAt;
    
    // Remove expired system
    if (systemAge > system.duration) {
      return false;
    }

    // Update each particle
    system.particles = system.particles.filter(particle => {
      // Update position
      particle.x += particle.velocityX * (deltaTime / 1000);
      particle.y += particle.velocityY * (deltaTime / 1000);
      
      // Apply gravity
      particle.velocityY += particle.gravity * (deltaTime / 1000);
      
      // Apply air resistance
      particle.velocityX *= 0.98;
      particle.velocityY *= 0.98;
      
      // Decrease life
      particle.life -= deltaTime;
      
      // Remove dead particles
      return particle.life > 0;
    });

    return system.particles.length > 0;
  }

  /**
   * Get explosion color variation
   */
  private static getExplosionColor(baseColor: string, randomness: number): string {
    // Create variations of orange/red explosion colors
    if (baseColor === "#ff4500") {
      const colors = ["#ff4500", "#ff6600", "#ff8800", "#ffaa00", "#ff2200", "#cc3300"];
      return colors[Math.floor(randomness * colors.length)];
    }
    return baseColor;
  }

  /**
   * Get impact color variation
   */
  private static getImpactColor(baseColor: string, randomness: number): string {
    // Create variations of pink/magenta impact colors
    if (baseColor === "#ff0066") {
      const colors = ["#ff0066", "#ff3388", "#ff66aa", "#cc0044", "#ff0099", "#dd0055"];
      return colors[Math.floor(randomness * colors.length)];
    }
    return baseColor;
  }

  /**
   * Draw particle system
   */
  static drawParticleSystem(
    ctx: CanvasRenderingContext2D,
    system: ParticleSystem
  ): void {
    system.particles.forEach(particle => {
      ctx.save();
      
      // Calculate alpha based on remaining life
      let alpha = 1;
      if (particle.fadeOut) {
        alpha = particle.life / particle.maxLife;
      }
      
      // Parse color and apply alpha
      const color = particle.color;
      if (color.startsWith('#')) {
        const r = parseInt(color.slice(1, 3), 16);
        const g = parseInt(color.slice(3, 5), 16);
        const b = parseInt(color.slice(5, 7), 16);
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
      } else {
        ctx.fillStyle = color;
        ctx.globalAlpha = alpha;
      }
      
      // Draw particle
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      ctx.fill();
      
      // Add glow effect for explosion particles
      if (system.type === 'explosion' && alpha > 0.5) {
        ctx.shadowColor = particle.color;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size * 0.5, 0, Math.PI * 2);
        ctx.fill();
      }
      
      ctx.restore();
    });
  }
}
