import React, { useRef, useEffect } from 'react';

const FloatingLines = () => {
    const canvasRef = useRef(null);
    const mouse = useRef({ x: -1000, y: -1000 });

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        let animationFrameId;

        const resizeCanvas = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            // Also re-init lines on large resize to keep them centered
            initLines();
        };

        const handleMouseMove = (e) => {
            mouse.current = { x: e.clientX, y: e.clientY };
        };

        window.addEventListener('resize', resizeCanvas);
        window.addEventListener('mousemove', handleMouseMove);
        
        let lines = [];
        const lineCount = 12; // More lines for a 'fitted' look

        class Line {
            constructor(index) {
                this.index = index;
                this.reset();
            }

            reset() {
                const w = canvas.width;
                const h = canvas.height;

                this.x1 = -200;
                this.y1 = h * 0.5;
                this.x2 = w + 200;
                this.y2 = h * 0.5;
                
                // Shared base control points for the group
                this.cp1x = w * 0.3;
                this.cp1y = h * 0.2;
                this.cp2x = w * 0.7;
                this.cp2y = h * 0.8;

                this.width = 2;
                this.speed = 0.0008;
                this.offset = this.index * 0.1; // Consistent staggering
                
                const colors = [
                    'rgba(255, 50, 255, 0.4)',  // Magenta
                    'rgba(180, 80, 255, 0.35)', // Purple
                    'rgba(100, 100, 255, 0.4)'  // Soft Blue
                ];
                this.color = colors[this.index % colors.length];
            }

            update(time) {
                const w = canvas.width;
                const h = canvas.height;

                // Flowing animation (base y movement)
                const baseSway = Math.sin(time * 0.001 + this.offset) * 50;
                this.y1 = h * 0.5 + baseSway + (this.index * 6);
                this.y2 = h * 0.5 + baseSway + (this.index * 6);

                // Control points wave movement
                this.cp1y = h * 0.3 + Math.sin(time * 0.0005 + this.offset) * 100;
                this.cp2y = h * 0.7 + Math.cos(time * 0.0005 + this.offset) * 100;

                // --- FLUID WAVE INTERACTION ---
                // Calculate mouse influence as a ripple
                const dx = mouse.current.x - (w * 0.5); // Simplified relative to center
                const distToMouse = Math.abs(mouse.current.x - (this.x1 + (this.x2-this.x1) * 0.5)); // Dist to center of line
                
                // We'll apply the wave effect to the control points or the drawing logic directly
                // To make it look like water, we use a Gaussian-like influence
                const rippleRange = 400;
                const mouseDist = Math.hypot(mouse.current.x - w/2, mouse.current.y - h/2); // Just for general presence
            }

            draw(time) {
                const w = canvas.width;
                const h = canvas.height;

                ctx.beginPath();
                ctx.moveTo(this.x1, this.y1);

                // We break the Bezier into a custom path to allow localized "wave" bending
                // But for simplicity and performance, we'll just bend the control points
                // based on mouse position relative to them.
                
                let curCp1y = this.cp1y + (this.index * 4);
                let curCp2y = this.cp2y + (this.index * 4);

                // Ripple effect: If mouse is near a control point, it creates a "wave" (sin distortion)
                const d1 = Math.hypot(mouse.current.x - this.cp1x, mouse.current.y - curCp1y);
                const d2 = Math.hypot(mouse.current.x - this.cp2x, mouse.current.y - curCp2y);

                if (d1 < 300) {
                    curCp1y += Math.sin(d1 * 0.02 - time * 0.005) * (300 - d1) * 0.3;
                }
                if (d2 < 300) {
                    curCp2y += Math.sin(d2 * 0.02 - time * 0.005) * (300 - d2) * 0.3;
                }

                ctx.bezierCurveTo(this.cp1x, curCp1y, this.cp2x, curCp2y, this.x2, this.y2);
                
                ctx.shadowBlur = 20;
                ctx.shadowColor = this.color.replace('0.4', '0.8').replace('0.35', '0.8');
                ctx.strokeStyle = this.color;
                ctx.lineWidth = this.width;
                ctx.stroke();

                // Core highlight for the "energy" look
                ctx.shadowBlur = 0;
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
                ctx.lineWidth = 1;
                ctx.stroke();
            }
        }

        const initLines = () => {
            lines = [];
            for (let i = 0; i < lineCount; i++) {
                lines.push(new Line(i));
            }
        };

        const animate = (time) => {
            ctx.fillStyle = 'rgba(5, 5, 5, 0.25)'; // Motion blur
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            lines.forEach(line => {
                line.update(time);
                line.draw(time);
            });

            animationFrameId = requestAnimationFrame(animate);
        };

        resizeCanvas();
        animate(0);

        return () => {
            cancelAnimationFrame(animationFrameId);
            window.removeEventListener('resize', resizeCanvas);
            window.removeEventListener('mousemove', handleMouseMove);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100vw',
                height: '100vh',
                pointerEvents: 'none',
                zIndex: 0,
                backgroundColor: '#050505'
            }}
        />
    );
};

export default FloatingLines;
