// services/threeManager.js
import * as THREE from 'three';

let camera, scene, renderer, particles;
let animationFrameId;
let resizeListener;
let mouse = new THREE.Vector2(0, 0);

const PARTICLE_COUNT = 8000;
const Z_SPEED = 3;

const init = () => {
    // Scene setup
    scene = new THREE.Scene();
    
    // Camera setup
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);
    camera.position.z = 500;

    // Renderer setup
    const canvas = document.getElementById('bg-canvas');
    if (!canvas) {
        console.error("Background canvas not found!");
        return;
    }
    renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        antialias: true,
        alpha: true
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Particle Geometry
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const colors = new Float32Array(PARTICLE_COUNT * 3);

    const color1 = new THREE.Color('#a855f7'); // Aurora primary
    const color2 = new THREE.Color('#2dd4bf'); // Aurora secondary

    for (let i = 0; i < PARTICLE_COUNT; i++) {
        const i3 = i * 3;
        positions[i3] = (Math.random() - 0.5) * 2000; // x
        positions[i3 + 1] = (Math.random() - 0.5) * 2000; // y
        positions[i3 + 2] = (Math.random() - 1) * 1500; // z

        const color = Math.random() > 0.5 ? color1 : color2;
        colors[i3] = color.r;
        colors[i3 + 1] = color.g;
        colors[i3 + 2] = color.b;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
        size: 1.2,
        vertexColors: true,
        transparent: true,
        opacity: 0.8,
        depthWrite: false, // For better blending
    });

    particles = new THREE.Points(geometry, material);
    scene.add(particles);

    // Resize listener
    resizeListener = () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    };
    window.addEventListener('resize', resizeListener);

    animate();
};

const animate = () => {
    // Parallax effect based on mouse position
    const targetX = mouse.x * -100;
    const targetY = mouse.y * 100;
    if (particles) {
        particles.rotation.y += 0.02 * (targetX - particles.rotation.y);
        particles.rotation.x += 0.02 * (targetY - particles.rotation.x);
    
        // Animate particles
        const positions = particles.geometry.attributes.position.array;
        for (let i = 0; i < PARTICLE_COUNT; i++) {
            const i3 = i * 3;
            positions[i3 + 2] += Z_SPEED; // move along z-axis

            if (positions[i3 + 2] > camera.position.z) {
                positions[i3 + 2] = -1500; // Reset to the back
            }
        }
        particles.geometry.attributes.position.needsUpdate = true;
    }

    renderer.render(scene, camera);
    animationFrameId = requestAnimationFrame(animate);
};

const updateMousePosition = (x, y) => {
    mouse.x = x;
    mouse.y = y;
};

const destroy = () => {
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
    }
    
    if (resizeListener) {
        window.removeEventListener('resize', resizeListener);
        resizeListener = null;
    }
    
    if (scene) {
        scene.traverse(object => {
            if (object.geometry) object.geometry.dispose();
            if (object.material) {
                if (Array.isArray(object.material)) {
                    object.material.forEach(material => material.dispose());
                } else {
                    object.material.dispose();
                }
            }
        });
        scene = null;
    }
    
    if (renderer) {
        renderer.dispose();
        renderer.domElement = null;
        renderer = null;
    }
    
    particles = null;
    camera = null;
};

export const threeManager = {
    init,
    destroy,
    updateMousePosition,
};