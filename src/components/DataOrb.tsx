import React, { useEffect, useRef } from "react";
import { motion } from "framer-motion";

interface DataOrbProps {
  size?: number;
  speakingState: "idle" | "user" | "ai";
  pulseIntensity?: number;
  speed?: number;
}

const DataOrb: React.FC<DataOrbProps> = ({
  size = 280,
  speakingState = "idle",
  pulseIntensity = 1.3,
  speed = 1.2,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Colors for different states
  const colors = {
    idle: { primary: "#8b5cf6", secondary: "#6366f1" },
    user: { primary: "#10b981", secondary: "#34d399" }, // Green for listening
    ai: { primary: "#3b82f6", secondary: "#60a5fa" },   // Blue for speaking
  };
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    let animationFrameId: number;
    let particles: {
      x: number;
      y: number;
      radius: number;
      color: string;
      velocity: { x: number; y: number };
      alpha: number;
      decreasing: boolean;
    }[] = [];
    
    const currentColors = colors[speakingState];
    
    // Set canvas dimensions
    canvas.width = size;
    canvas.height = size;
    
    // Initialize particles
    const initParticles = () => {
      particles = [];
      const particleCount = 100;
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      
      for (let i = 0; i < particleCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.random() * (size / 3);
        
        particles.push({
          x: centerX + Math.cos(angle) * distance,
          y: centerY + Math.sin(angle) * distance,
          radius: Math.random() * 3 + 1,
          color: Math.random() > 0.5 ? currentColors.primary : currentColors.secondary,
          velocity: {
            x: (Math.random() - 0.5) * speed,
            y: (Math.random() - 0.5) * speed,
          },
          alpha: Math.random() * 0.5 + 0.5,
          decreasing: Math.random() > 0.5,
        });
      }
    };
    
    initParticles();
    
    // Animation function
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw center orb glow
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const gradient = ctx.createRadialGradient(
        centerX, centerY, 0,
        centerX, centerY, size / 3
      );
      
      gradient.addColorStop(0, `${currentColors.primary}80`);
      gradient.addColorStop(1, "transparent");
      
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(centerX, centerY, size / 3, 0, Math.PI * 2);
      ctx.fill();
      
      // Update and draw particles
      particles.forEach((particle) => {
        // Update alpha for pulsing effect
        if (particle.decreasing) {
          particle.alpha -= 0.01;
          if (particle.alpha <= 0.2) {
            particle.decreasing = false;
          }
        } else {
          particle.alpha += 0.01;
          if (particle.alpha >= 0.8) {
            particle.decreasing = true;
          }
        }
        
        // Update position
        particle.x += particle.velocity.x;
        particle.y += particle.velocity.y;
        
        // Boundary check - keep particles orbiting around center
        const dx = particle.x - centerX;
        const dy = particle.y - centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > size / 2.5) {
          const angle = Math.atan2(dy, dx);
          particle.x = centerX + Math.cos(angle) * (size / 2.5);
          particle.y = centerY + Math.sin(angle) * (size / 2.5);
          
          // Reverse velocity with some randomization
          particle.velocity.x = -particle.velocity.x * 0.8 + (Math.random() - 0.5) * 0.5;
          particle.velocity.y = -particle.velocity.y * 0.8 + (Math.random() - 0.5) * 0.5;
        }
        
        // Draw particle
        ctx.globalAlpha = particle.alpha;
        ctx.fillStyle = particle.color;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.radius * (speakingState !== "idle" ? pulseIntensity : 1), 0, Math.PI * 2);
        ctx.fill();
      });
      
      // Add pulse effect based on speaking state
      if (speakingState !== "idle") {
        const pulseSize = size / 2 * (0.8 + Math.sin(Date.now() * 0.003) * 0.2);
        const pulseGradient = ctx.createRadialGradient(
          centerX, centerY, pulseSize * 0.7,
          centerX, centerY, pulseSize
        );
        
        pulseGradient.addColorStop(0, "transparent");
        pulseGradient.addColorStop(1, `${currentColors.secondary}30`);
        
        ctx.globalAlpha = 0.6;
        ctx.fillStyle = pulseGradient;
        ctx.beginPath();
        ctx.arc(centerX, centerY, pulseSize, 0, Math.PI * 2);
        ctx.fill();
      }
      
      ctx.globalAlpha = 1;
      animationFrameId = requestAnimationFrame(animate);
    };
    
    animate();
    
    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [size, speakingState, pulseIntensity, speed]);
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="relative"
    >
      <canvas
        ref={canvasRef}
        width={size}
        height={size}
        className="rounded-full"
        style={{ width: size, height: size }}
      />
    </motion.div>
  );
};

export default DataOrb;
