
// services/threeManager.js
import * as THREE from 'three';

let camera, scene, renderer, planeMesh;
let animationFrameId;
let resizeListener;
let mouse = new THREE.Vector2(0, 0);
const clock = new THREE.Clock();

// --- Shaders ---

const vertexShader = `
    varying vec2 vUv;
    void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`;

const fragmentShader = `
    uniform float uTime;
    uniform vec2 uResolution;
    uniform vec2 uMouse;
    uniform vec3 uColor1;
    uniform vec3 uColor2;
    uniform vec3 uColor3;
    varying vec2 vUv;

    // 2D Random function
    float random(vec2 st) {
        return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
    }

    // 2D Noise function
    float noise(vec2 st) {
        vec2 i = floor(st);
        vec2 f = fract(st);

        float a = random(i);
        float b = random(i + vec2(1.0, 0.0));
        float c = random(i + vec2(0.0, 1.0));
        float d = random(i + vec2(1.0, 1.0));

        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.y * u.x;
    }

    // Fractional Brownian Motion
    float fbm(vec2 st) {
        float value = 0.0;
        float amplitude = 0.5;
        float frequency = 0.0;
        for (int i = 0; i < 6; i++) {
            value += amplitude * noise(st);
            st *= 2.0;
            amplitude *= 0.5;
        }
        return value;
    }

    void main() {
        vec2 st = gl_FragCoord.xy / uResolution.xy;
        st.x *= uResolution.x / uResolution.y;

        // Animate and warp coordinates
        vec2 q = vec2(0.);
        q.x = fbm(st + 0.00 * uTime);
        q.y = fbm(st + vec2(1.0));

        vec2 r = vec2(0.);
        r.x = fbm(st + 1.0 * q + vec2(1.7, 9.2) + 0.15 * uTime);
        r.y = fbm(st + 1.0 * q + vec2(8.3, 2.8) + 0.126 * uTime);
        
        // Add mouse interaction
        vec2 mouseOffset = (uMouse - 0.5) * 0.2;
        r += mouseOffset;

        float f = fbm(st + r);

        // Mix colors
        vec3 color = mix(uColor1, uColor2, clamp((f*f)*4.0, 0.0, 1.0));
        color = mix(color, uColor3, clamp(length(q), 0.0, 1.0));
        color = mix(color, mix(uColor1, uColor2, st.y), clamp(length(r.x), 0.0, 1.0));

        gl_FragColor = vec4((f*f*f + .6*f*f + .5*f) * color, 1.0);
    }
`;


const init = () => {
    // Scene setup
    scene = new THREE.Scene();
    
    // Camera setup
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.z = 1;

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

    // --- Get colors from CSS theme ---
    const computedStyle = getComputedStyle(document.body);
    const color1 = new THREE.Color(computedStyle.getPropertyValue('--color-primary').trim());
    const color2 = new THREE.Color(computedStyle.getPropertyValue('--color-secondary').trim());
    const color3 = new THREE.Color(computedStyle.getPropertyValue('--color-accent') || computedStyle.getPropertyValue('--color-primary').trim());

    // --- Fullscreen Plane with Shader Material ---
    const geometry = new THREE.PlaneGeometry(2, 2);
    const material = new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms: {
            uTime: { value: 0 },
            uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
            uMouse: { value: new THREE.Vector2(0.5, 0.5) }, // Center mouse initially
            uColor1: { value: color1 },
            uColor2: { value: color2 },
            uColor3: { value: color3 },
        }
    });

    planeMesh = new THREE.Mesh(geometry, material);
    scene.add(planeMesh);

    // Resize listener
    resizeListener = () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        
        // Update shader resolution uniform
        if (planeMesh) {
            planeMesh.material.uniforms.uResolution.value.set(window.innerWidth, window.innerHeight);
        }
    };
    window.addEventListener('resize', resizeListener);

    animate();
};

const animate = () => {
    const elapsedTime = clock.getElapsedTime();
    
    if (planeMesh) {
        planeMesh.material.uniforms.uTime.value = elapsedTime;
        
        // Smoother mouse follow
        let uniformMouse = planeMesh.material.uniforms.uMouse.value;
        uniformMouse.x += (mouse.x - uniformMouse.x) * 0.05;
        uniformMouse.y += (mouse.y - uniformMouse.y) * 0.05;
    }

    renderer.render(scene, camera);
    animationFrameId = requestAnimationFrame(animate);
};

const updateMousePosition = (x, y) => {
    // Convert from [-1, 1] range to [0, 1] range for the shader
    mouse.x = (x + 1) / 2;
    mouse.y = (y + 1) / 2;
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
    
    planeMesh = null;
    camera = null;
};

export const threeManager = {
    init,
    destroy,
    updateMousePosition,
};
