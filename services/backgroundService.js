let canvas, ctx, particles, animationFrameId, configSvc;
let particleColor = 'rgba(0, 184, 212, 0.5)';
let lineColor = 'rgba(0, 184, 212, 0.3)';

const PARTICLE_CONFIG = {
    count: 80,
    speed: 0.3,
    minRadius: 1,
    maxRadius: 3,
    lineDistance: 150,
};

class Particle {
    constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.vx = (Math.random() - 0.5) * PARTICLE_CONFIG.speed;
        this.vy = (Math.random() - 0.5) * PARTICLE_CONFIG.speed;
        this.radius = PARTICLE_CONFIG.minRadius + Math.random() * (PARTICLE_CONFIG.maxRadius - PARTICLE_CONFIG.minRadius);
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;

        if (this.x < 0 || this.x > canvas.width) this.vx *= -1;
        if (this.y < 0 || this.y > canvas.height) this.vy *= -1;
    }

    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = particleColor;
        ctx.fill();
    }
}

function createParticles() {
    particles = [];
    for (let i = 0; i < PARTICLE_CONFIG.count; i++) {
        particles.push(new Particle());
    }
}

function connectParticles() {
    for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
            const dx = particles[i].x - particles[j].x;
            const dy = particles[i].y - particles[j].y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < PARTICLE_CONFIG.lineDistance) {
                const opacity = 1 - (distance / PARTICLE_CONFIG.lineDistance);
                try {
                    const baseColorMatch = lineColor.match(/rgba\((\d+,\s*\d+,\s*\d+),/);
                    if (baseColorMatch && baseColorMatch[1]) {
                        const baseColor = baseColorMatch[1];
                        ctx.beginPath();
                        ctx.moveTo(particles[i].x, particles[i].y);
                        ctx.lineTo(particles[j].x, particles[j].y);
                        ctx.strokeStyle = `rgba(${baseColor}, ${opacity * 0.3})`;
                        ctx.stroke();
                    }
                } catch (e) {
                    // fallback if regex fails
                    ctx.strokeStyle = `rgba(0, 184, 212, ${opacity * 0.1})`;
                    ctx.stroke();
                }
            }
        }
    }
}


function animate() {
    if (!ctx || !canvas) return; // Guard against missing canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => {
        p.update();
        p.draw();
    });
    connectParticles();
    animationFrameId = requestAnimationFrame(animate);
}

function handleResize() {
    if (!canvas || !configSvc) return; // Guard
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Recalculate particle count based on intensity and screen size
    const baseCount = (canvas.width * canvas.height) / 20000;
    const intensity = configSvc.getConfig().animationIntensity;
    let countMultiplier = 1.0;
    if (intensity === 'subtle') {
        countMultiplier = 0.5;
    }
    
    PARTICLE_CONFIG.count = Math.min(100, Math.floor(baseCount * countMultiplier));

    createParticles();
}

function updateColors() {
    const computedStyle = getComputedStyle(document.documentElement);
    let primaryColor = computedStyle.getPropertyValue('--color-primary').trim();
    
    let r, g, b;

    try {
        if (primaryColor.startsWith('#')) {
            const hex = primaryColor.substring(1);
            r = parseInt(hex.substring(0, 2), 16);
            g = parseInt(hex.substring(2, 4), 16);
            b = parseInt(hex.substring(4, 6), 16);
        } else if (primaryColor.startsWith('rgb')) {
            [r, g, b] = primaryColor.match(/\d+/g).map(Number);
        } else {
            // Fallback for named colors, etc.
            throw new Error('Unsupported color format');
        }

        particleColor = `rgba(${r}, ${g}, ${b}, 0.5)`;
        lineColor = `rgba(${r}, ${g}, ${b}, 0.3)`;
    } catch (e) {
        console.warn("Could not parse color from CSS variable:", primaryColor, e);
        particleColor = 'rgba(0, 184, 212, 0.5)';
        lineColor = 'rgba(0, 184, 212, 0.3)';
    }
}


function updateAnimationState() {
    if (!configSvc || !canvas) return;
    const config = configSvc.getConfig();

    switch (config.animationIntensity) {
        case 'off':
            if (animationFrameId) {
                cancelAnimationFrame(animationFrameId);
                animationFrameId = null;
            }
            canvas.style.display = 'none';
            break;
        case 'subtle':
            canvas.style.display = 'block';
            PARTICLE_CONFIG.speed = 0.15;
            PARTICLE_CONFIG.lineDistance = 120;
            PARTICLE_CONFIG.maxRadius = 2;
            handleResize(); // Recreate with new settings
            if (!animationFrameId && document.body.classList.contains('animations-off') === false) {
                 animate();
            }
            break;
        case 'full':
        default:
            canvas.style.display = 'block';
            PARTICLE_CONFIG.speed = 0.3;
            PARTICLE_CONFIG.lineDistance = 150;
            PARTICLE_CONFIG.maxRadius = 3;
            handleResize(); // Recreate with new settings
            if (!animationFrameId && document.body.classList.contains('animations-off') === false) {
                animate();
            }
            break;
    }
}

function onSettingsChanged() {
    // The theme CSS might take a moment to apply.
    setTimeout(() => {
        updateColors();
        updateAnimationState();
    }, 100);
}

export function init(configService) {
    configSvc = configService;
    canvas = document.getElementById('particle-canvas');
    if (!canvas) {
        console.error('Particle canvas not found!');
        return;
    }
    ctx = canvas.getContext('2d');
    
    updateColors();
    updateAnimationState();

    window.addEventListener('resize', handleResize);
    window.addEventListener('settings-changed', onSettingsChanged);
}

export function destroy() {
    if (animationFrameId) {
       cancelAnimationFrame(animationFrameId);
       animationFrameId = null;
    }
    window.removeEventListener('resize', handleResize);
    window.removeEventListener('settings-changed', onSettingsChanged);
}