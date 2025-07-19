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
  type?: "explosion" | "wind" | "flash"; // Add particle type
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

      // Apply different physics based on particle type
      if (particle.type === "wind") {
        // Wind particles: no gravity, gradual deceleration
        particle.velocityX *= 0.95;
        particle.velocityY *= 0.95;
      } else {
        // Explosion particles: apply gravity and air resistance
        particle.velocityY += 150 * (deltaTime / 1000); // gravity
        particle.velocityX *= 0.98; // air resistance
        particle.velocityY *= 0.98;
      }

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
        type: "explosion",
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
        type: "explosion",
      });
    }
  }

  createWindEffect(
    x: number,
    y: number,
    playerVelocityX: number,
    playerVelocityY: number,
    playerAngle: number
  ) {
    // Only create wind if player is moving fast enough
    const playerSpeed = Math.sqrt(
      playerVelocityX * playerVelocityX + playerVelocityY * playerVelocityY
    );
    if (playerSpeed < 50) return; // Minimum speed threshold

    // Wind particles flow from front to back of ship - reduced particle count for subtlety
    const windCount = Math.min(8, Math.floor(playerSpeed / 20)); // Fewer particles for subtle effect (reduced from 20 to 8)
    const windColors = [
      "#88ccff",
      "#aaddff",
      "#cceeFF",
      "#ffffff",
      "#ddddff",
      "#bbddff",
    ];

    for (let i = 0; i < windCount; i++) {
      // Start particles slightly in front of the ship
      const offsetDistance = 15 + Math.random() * 25; // Increased spread
      const offsetAngle = playerAngle + (Math.random() - 0.5) * 1.2; // Wider spread around ship direction

      const startX = x + Math.cos(offsetAngle) * offsetDistance;
      const startY = y + Math.sin(offsetAngle) * offsetDistance;

      // Wind flows opposite to movement direction with some spread
      const windAngle = playerAngle + Math.PI + (Math.random() - 0.5) * 0.8; // Increased spread
      const windSpeed = playerSpeed * 0.8 + Math.random() * 60; // Increased variation

      this.particles.push({
        x: startX,
        y: startY,
        velocityX: Math.cos(windAngle) * windSpeed,
        velocityY: Math.sin(windAngle) * windSpeed,
        life: 300 + Math.random() * 200, // Shorter lasting particles
        maxLife: 300 + Math.random() * 200,
        size: 0.5 + Math.random() * 1.5, // Smaller particles (reduced from 0.8-3.3 to 0.5-2.0)
        color: windColors[Math.floor(Math.random() * windColors.length)],
        alpha: 0.1 + Math.random() * 0.2, // Much lower opacity (reduced from 0.3-0.7 to 0.1-0.3)
        type: "wind",
      });
    }

    // Add fewer side wind particles for subtle lateral movement effect
    if (playerSpeed > 100) {
      // Higher threshold for side particles
      for (let i = 0; i < 3; i++) {
        // Reduced from 8 to 3
        const sideAngle =
          playerAngle + Math.PI * 0.5 * (Math.random() > 0.5 ? 1 : -1);
        const sideDistance = 8 + Math.random() * 20; // Increased spread

        const startX = x + Math.cos(sideAngle) * sideDistance;
        const startY = y + Math.sin(sideAngle) * sideDistance;

        this.particles.push({
          x: startX,
          y: startY,
          velocityX: Math.cos(playerAngle + Math.PI) * (playerSpeed * 0.7),
          velocityY: Math.sin(playerAngle + Math.PI) * (playerSpeed * 0.7),
          life: 200 + Math.random() * 150,
          maxLife: 200 + Math.random() * 150,
          size: 0.3 + Math.random() * 1.2, // Smaller side particles
          color: windColors[Math.floor(Math.random() * windColors.length)],
          alpha: 0.08 + Math.random() * 0.15, // Even lower opacity for side particles
          type: "wind",
        });
      }
    }

    // Add subtle trailing particles behind the ship
    if (playerSpeed > 140) {
      // Higher threshold for trailing particles
      for (let i = 0; i < 2; i++) {
        // Reduced from 6 to 2
        const trailDistance = 25 + Math.random() * 15;
        const trailAngle = playerAngle + Math.PI + (Math.random() - 0.5) * 0.4;

        const startX = x + Math.cos(trailAngle) * trailDistance;
        const startY = y + Math.sin(trailAngle) * trailDistance;

        this.particles.push({
          x: startX,
          y: startY,
          velocityX: Math.cos(trailAngle) * (playerSpeed * 0.5),
          velocityY: Math.sin(trailAngle) * (playerSpeed * 0.5),
          life: 250 + Math.random() * 150, // Shorter life
          maxLife: 250 + Math.random() * 150,
          size: 0.6 + Math.random() * 1.8, // Smaller trailing particles
          color: windColors[Math.floor(Math.random() * windColors.length)],
          alpha: 0.1 + Math.random() * 0.2, // Much lower opacity
          type: "wind",
        });
      }
    }
  }

  createFlashEffect(fromX: number, fromY: number, toX: number, toY: number) {
    // Flash teleport effect - particles disappearing at origin and appearing at destination
    const flashColors = ["#ffff00", "#ffff88", "#ffffaa", "#ffcc00", "#fff700"];

    // Disappearing effect at origin
    for (let i = 0; i < 15; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 80 + Math.random() * 120;
      const size = 2 + Math.random() * 4;
      const life = 400 + Math.random() * 300;

      this.particles.push({
        x: fromX + (Math.random() - 0.5) * 20,
        y: fromY + (Math.random() - 0.5) * 20,
        velocityX: Math.cos(angle) * speed,
        velocityY: Math.sin(angle) * speed,
        life,
        maxLife: life,
        size,
        color: flashColors[Math.floor(Math.random() * flashColors.length)],
        alpha: 0.8,
        type: "flash",
      });
    }

    // Appearing effect at destination
    for (let i = 0; i < 20; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 60 + Math.random() * 80;
      const size = 1.5 + Math.random() * 3;
      const life = 500 + Math.random() * 400;

      this.particles.push({
        x: toX + (Math.random() - 0.5) * 30,
        y: toY + (Math.random() - 0.5) * 30,
        velocityX: Math.cos(angle) * speed * 0.3, // Slower expansion
        velocityY: Math.sin(angle) * speed * 0.3,
        life,
        maxLife: life,
        size,
        color: flashColors[Math.floor(Math.random() * flashColors.length)],
        alpha: 0.9,
        type: "flash",
      });
    }

    // Lightning trail between origin and destination
    const distance = Math.sqrt((toX - fromX) ** 2 + (toY - fromY) ** 2);
    const trailParticles = Math.min(12, Math.floor(distance / 50));

    for (let i = 0; i < trailParticles; i++) {
      const t = i / trailParticles;
      const x = fromX + (toX - fromX) * t + (Math.random() - 0.5) * 40;
      const y = fromY + (toY - fromY) * t + (Math.random() - 0.5) * 40;

      this.particles.push({
        x,
        y,
        velocityX: (Math.random() - 0.5) * 30,
        velocityY: (Math.random() - 0.5) * 30,
        life: 300 + Math.random() * 200,
        maxLife: 300 + Math.random() * 200,
        size: 1 + Math.random() * 2,
        color: flashColors[Math.floor(Math.random() * flashColors.length)],
        alpha: 0.7,
        type: "flash",
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
