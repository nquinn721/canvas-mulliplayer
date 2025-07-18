export interface Particle {
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  alpha: number;
}

export class ParticleSystem {
  private particles: Particle[] = [];

  update(deltaTime: number) {
    // Update existing particles
    this.particles = this.particles.filter((particle) => {
      particle.x += particle.velocityX * (deltaTime / 1000);
      particle.y += particle.velocityY * (deltaTime / 1000);
      particle.life -= deltaTime;

      // Fade out over time
      particle.alpha = particle.life / particle.maxLife;

      // Apply gravity/deceleration
      particle.velocityY += 150 * (deltaTime / 1000); // gravity
      particle.velocityX *= 0.98; // air resistance
      particle.velocityY *= 0.98;

      return particle.life > 0;
    });
  }

  render(ctx: CanvasRenderingContext2D) {
    this.particles.forEach((particle) => {
      ctx.save();
      ctx.globalAlpha = particle.alpha;
      ctx.fillStyle = particle.color;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }

  createExplosion(x: number, y: number, type: "laser" | "missile" = "laser") {
    const particleCount = type === "laser" ? 8 : 20; // Increased from 12 to 20 for missiles
    const colors =
      type === "laser"
        ? ["#44ff44", "#88ff88", "#aaffaa", "#66dd66"]
        : ["#ff4444", "#ff8844", "#ffaa44", "#dd6666", "#ff6666", "#ffcc44"];

    for (let i = 0; i < particleCount; i++) {
      const angle =
        (Math.PI * 2 * i) / particleCount + (Math.random() - 0.5) * 0.5;
      const speed =
        type === "laser" ? 50 + Math.random() * 100 : 80 + Math.random() * 150; // Faster for missiles
      const size =
        type === "laser" ? 2 + Math.random() * 3 : 3 + Math.random() * 5; // Bigger for missiles
      const life =
        type === "laser"
          ? 300 + Math.random() * 200
          : 400 + Math.random() * 300; // Longer for missiles

      this.particles.push({
        x,
        y,
        velocityX: Math.cos(angle) * speed,
        velocityY: Math.sin(angle) * speed,
        life,
        maxLife: life,
        size,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 1,
      });
    }

    // Add some random extra particles for more effect
    const extraParticles = type === "laser" ? 4 : 12; // More extra particles for missiles
    for (let i = 0; i < extraParticles; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed =
        type === "laser" ? 20 + Math.random() * 60 : 40 + Math.random() * 100; // Faster for missiles
      const size =
        type === "laser" ? 1 + Math.random() * 2 : 2 + Math.random() * 4; // Bigger for missiles
      const life =
        type === "laser"
          ? 200 + Math.random() * 150
          : 300 + Math.random() * 200; // Longer for missiles

      this.particles.push({
        x: x + (Math.random() - 0.5) * 10,
        y: y + (Math.random() - 0.5) * 10,
        velocityX: Math.cos(angle) * speed,
        velocityY: Math.sin(angle) * speed,
        life,
        maxLife: life,
        size,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 0.7,
      });
    }
  }

  getParticleCount(): number {
    return this.particles.length;
  }

  clear() {
    this.particles = [];
  }
}
