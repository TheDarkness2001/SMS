import React, { useEffect, useRef } from 'react';

/**
 * AnimatedGridBackground Component
 * 
 * Creates an interactive colorful grid background with a snake-like hover trail effect.
 * 
 * Features:
 * - Full viewport canvas-based grid for optimal performance
 * - Each cell has a unique HSL color based on its position
 * - Mouse hover creates a glowing trail that follows the cursor
 * - Smooth fade-out animation when cursor moves away
 * - Does NOT interfere with page interactivity (pointer-events: none, z-index: -1)
 * 
 * Props:
 * @param {number} cellSize - Size of each grid cell in pixels (default: 25)
 * @param {number} trailLength - Length of the hover trail effect (default: 15)
 * @param {number} fadeSpeed - Speed of fade-out animation (default: 0.05)
 * 
 * Performance optimizations:
 * - Uses requestAnimationFrame for smooth 60fps animation
 * - Canvas rendering instead of DOM elements
 * - Refs to prevent unnecessary re-renders
 */
const AnimatedGridBackground = ({ 
  cellSize = 25,
  trailLength = 15,
  fadeSpeed = 0.05
}) => {
  const canvasRef = useRef(null);
  const mousePos = useRef({ x: -1000, y: -1000 });
  const cells = useRef([]);
  const animationFrameId = useRef(null);
  const isDrawing = useRef(false);
  const permanentCells = useRef(new Set()); // Store indices of permanently lit cells

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    
    // Set canvas size to full viewport
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initializeCells();
    };

    // Initialize grid cells with unique colors
    const initializeCells = () => {
      cells.current = [];
      const cols = Math.ceil(canvas.width / cellSize);
      const rows = Math.ceil(canvas.height / cellSize);

      // Define 7 great colors
      const colors = [
        'hsl(0, 85%, 65%)',    // Red
        'hsl(30, 90%, 65%)',   // Orange
        'hsl(60, 85%, 60%)',   // Yellow
        'hsl(120, 75%, 55%)',  // Green
        'hsl(200, 85%, 60%)',  // Cyan
        'hsl(240, 85%, 65%)',  // Blue
        'hsl(280, 80%, 65%)'   // Purple
      ];

      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          // Pick color based on position
          const colorIndex = (x + y) % colors.length;
          const lightColor = colors[colorIndex];
          
          cells.current.push({
            x: x * cellSize,
            y: y * cellSize,
            baseColor: 'transparent', // Invisible by default
            lightColor,
            brightness: 0, // 0 = base color, 1 = fully lit
            targetBrightness: 0
          });
        }
      }
    };

    // Handle mouse move
    const handleMouseMove = (e) => {
      mousePos.current = {
        x: e.clientX,
        y: e.clientY
      };

      // If drawing mode is active, mark cells as permanent
      if (isDrawing.current) {
        cells.current.forEach((cell, index) => {
          const cellCenterX = cell.x + cellSize / 2;
          const cellCenterY = cell.y + cellSize / 2;
          const dx = mousePos.current.x - cellCenterX;
          const dy = mousePos.current.y - cellCenterY;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < cellSize * 2) {
            permanentCells.current.add(index);
          }
        });
      }
    };

    // Handle mouse down - start drawing
    const handleMouseDown = (e) => {
      isDrawing.current = true;
      // Mark initial cell
      cells.current.forEach((cell, index) => {
        const cellCenterX = cell.x + cellSize / 2;
        const cellCenterY = cell.y + cellSize / 2;
        const dx = e.clientX - cellCenterX;
        const dy = e.clientY - cellCenterY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < cellSize * 2) {
          permanentCells.current.add(index);
        }
      });
    };

    // Handle mouse up - stop drawing
    const handleMouseUp = () => {
      isDrawing.current = false;
    };

    // Handle double click - clear all drawings
    const handleDoubleClick = () => {
      permanentCells.current.clear();
    };

    // Animation loop
    const animate = () => {
      // Clear canvas to transparent
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      cells.current.forEach((cell, index) => {
        // Calculate distance from mouse to cell center
        const cellCenterX = cell.x + cellSize / 2;
        const cellCenterY = cell.y + cellSize / 2;
        const dx = mousePos.current.x - cellCenterX;
        const dy = mousePos.current.y - cellCenterY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Check if this cell is permanently drawn
        const isPermanent = permanentCells.current.has(index);

        // Light up cells within trail radius
        const trailRadius = cellSize * trailLength;
        if (distance < trailRadius) {
          // Exponential falloff for smooth trail effect
          const intensity = Math.pow(1 - distance / trailRadius, 2);
          cell.targetBrightness = intensity;
        } else if (isPermanent) {
          // Keep permanent cells lit
          cell.targetBrightness = 1;
        } else {
          cell.targetBrightness = 0;
        }

        // Smooth transition to target brightness
        if (cell.brightness < cell.targetBrightness) {
          cell.brightness += (cell.targetBrightness - cell.brightness) * 0.2;
        } else {
          cell.brightness -= fadeSpeed;
        }
        cell.brightness = Math.max(0, Math.min(1, cell.brightness));

        // Interpolate between base (transparent) and light color
        const brightness = cell.brightness;
        let finalColor;
        
        if (brightness > 0) {
          // Parse HSL values and apply brightness as opacity
          const lightMatch = cell.lightColor.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
          
          if (lightMatch) {
            const h = parseFloat(lightMatch[1]);
            const s = parseFloat(lightMatch[2]);
            const l = parseFloat(lightMatch[3]);
            // Use HSLA with brightness as alpha for smooth fade
            finalColor = `hsla(${h}, ${s}%, ${l}%, ${brightness})`;
          } else {
            finalColor = 'transparent';
          }
        } else {
          finalColor = 'transparent';
        }

        // Draw cell
        ctx.fillStyle = finalColor;
        ctx.fillRect(cell.x, cell.y, cellSize - 1, cellSize - 1);
      });

      animationFrameId.current = requestAnimationFrame(animate);
    };

    // Initialize
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('dblclick', handleDoubleClick);
    animate();

    // Cleanup
    return () => {
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('dblclick', handleDoubleClick);
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [cellSize, trailLength, fadeSpeed]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 0,
        pointerEvents: 'none'
      }}
    />
  );
};

export default AnimatedGridBackground;
