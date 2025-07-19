import React, { useEffect, useRef } from "react";

interface Star {
  x: number;
  y: number;
  z: number;
  prevX?: number;
  prevY?: number;
}

const BackgroundCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const backgroundImageRef = useRef<HTMLImageElement>();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    // Load background image
    const backgroundImage = new Image();
    backgroundImage.src = "/images/home-background.png";
    backgroundImageRef.current = backgroundImage;

    // Starfield configuration
    const STAR_COUNT = 800;
    const STAR_SPEED = 1.5;
    const MAX_DEPTH = 1000;

    const stars: Star[] = [];

    // Initialize stars
    const initStars = () => {
      stars.length = 0;
      for (let i = 0; i < STAR_COUNT; i++) {
        stars.push({
          x: (Math.random() - 0.5) * 2000,
          y: (Math.random() - 0.5) * 2000,
          z: Math.random() * MAX_DEPTH,
        });
      }
    };

    initStars();

    const animate = () => {
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw background image if loaded
      if (backgroundImageRef.current && backgroundImageRef.current.complete) {
        // Scale the image to cover the entire canvas while maintaining aspect ratio
        const imgAspect =
          backgroundImageRef.current.width / backgroundImageRef.current.height;
        const canvasAspect = canvas.width / canvas.height;

        let drawWidth, drawHeight, offsetX, offsetY;

        if (imgAspect > canvasAspect) {
          // Image is wider than canvas
          drawHeight = canvas.height;
          drawWidth = drawHeight * imgAspect;
          offsetX = (canvas.width - drawWidth) / 2;
          offsetY = 0;
        } else {
          // Image is taller than canvas
          drawWidth = canvas.width;
          drawHeight = drawWidth / imgAspect;
          offsetX = 0;
          offsetY = (canvas.height - drawHeight) / 2;
        }

        ctx.drawImage(
          backgroundImageRef.current,
          offsetX,
          offsetY,
          drawWidth,
          drawHeight
        );
      }

      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;

      // Update and draw stars
      for (let i = 0; i < stars.length; i++) {
        const star = stars[i];

        // Store previous position for trail effect
        star.prevX = (star.x / star.z) * centerX + centerX;
        star.prevY = (star.y / star.z) * centerY + centerY;

        // Move star forward
        star.z -= STAR_SPEED;

        // Reset star if it's too close
        if (star.z <= 0) {
          star.x = (Math.random() - 0.5) * 2000;
          star.y = (Math.random() - 0.5) * 2000;
          star.z = MAX_DEPTH;
          star.prevX = undefined;
          star.prevY = undefined;
        }

        // Calculate star screen position
        const x = (star.x / star.z) * centerX + centerX;
        const y = (star.y / star.z) * centerY + centerY;

        // Skip stars outside screen bounds
        if (x < 0 || x > canvas.width || y < 0 || y > canvas.height) {
          continue;
        }

        // Calculate star properties based on distance
        const size = (1 - star.z / MAX_DEPTH) * 2.5;
        const opacity = (1 - star.z / MAX_DEPTH) * 0.8;

        // Draw star trail
        if (star.prevX !== undefined && star.prevY !== undefined) {
          ctx.strokeStyle = `rgba(255, 255, 255, ${opacity * 0.6})`;
          ctx.lineWidth = size * 0.8;
          ctx.beginPath();
          ctx.moveTo(star.prevX, star.prevY);
          ctx.lineTo(x, y);
          ctx.stroke();
        }

        // Draw star
        ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();

        // Add glow for brighter stars
        if (size > 1.8) {
          ctx.shadowColor = "rgba(255, 255, 255, 0.8)";
          ctx.shadowBlur = size * 3;
          ctx.beginPath();
          ctx.arc(x, y, size * 0.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    // Start animation when background image loads
    backgroundImage.onload = () => {
      animate();
    };

    // Start animation immediately if no background image
    if (!backgroundImage.src) {
      animate();
    }

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        zIndex: -1,
        backgroundColor: "#000000",
      }}
    />
  );
};

export default BackgroundCanvas;
