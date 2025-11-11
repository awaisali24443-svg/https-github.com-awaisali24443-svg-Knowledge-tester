// services/threeManager.js
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

let camera, scene, renderer, composer, controls;
let clock, raycaster, mouse;
let animationFrameId;
let onNavigate;
const interactableObjects = [];
const planets = [];

const PLANET_CONFIG = [
    { name: 'Explore', route: '#explore', color: 0x4da6ff, size: 0.8, distance: 7, speed: 0.3, rings: true },
    { name: 'Custom Quiz', route: '#custom-quiz', color: 0x33cc33, size: 0.6, distance: 11, speed: 0.2, moons: 2 },
    { name: 'My Library', route: '#library', color: 0xffa500, size: 0.7, distance: 15, speed: 0.15 },
    { name: 'Settings', route: '#settings', color: 0xcccccc, size: 0.5, distance: 19, speed: 0.1 },
    { name: 'Leaderboard', route: '#coming-soon', color: 0xffd700, size: 0.9, distance: 24, speed: 0.08 },
];

function init(canvas, navigateCallback) {
    onNavigate = navigateCallback;

    // --- Basic Setup ---
    clock = new THREE.Clock();
    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();
    scene = new THREE.Scene();

    // --- Camera ---
    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 15, 35);

    // --- Renderer ---
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;

    // --- Controls ---
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.minDistance = 5;
    controls.maxDistance = 100;
    controls.enablePan = false;

    // --- Lighting ---
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.1);
    scene.add(ambientLight);

    const sunLight = new THREE.PointLight(0xffddaa, 3, 300);
    sunLight.castShadow = true;
    scene.add(sunLight);

    // --- Background ---
    const starGeometry = new THREE.BufferGeometry();
    const starMaterial = new THREE.PointsMaterial({ color: 0xffffff, size: 0.05 });
    const starVertices = [];
    for (let i = 0; i < 10000; i++) {
        const x = (Math.random() - 0.5) * 2000;
        const y = (Math.random() - 0.5) * 2000;
        const z = (Math.random() - 0.5) * 2000;
        if (x*x + y*y + z*z < 1000*1000) starVertices.push(x, y, z);
    }
    starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));
    const stars = new THREE.Points(starGeometry, starMaterial);
    scene.add(stars);

    // --- Sun ---
    const sunGeometry = new THREE.SphereGeometry(3, 32, 32);
    const sunMaterial = new THREE.MeshBasicMaterial({ color: 0xffddaa, toneMapped: false });
    const sun = new THREE.Mesh(sunGeometry, sunMaterial);
    scene.add(sun);

    // --- Planets ---
    PLANET_CONFIG.forEach(config => createPlanet(config));

    // --- Post Processing (Bloom) ---
    const renderScene = new RenderPass(scene, camera);
    const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.0, 0.1, 0.1);
    composer = new EffectComposer(renderer);
    composer.addPass(renderScene);
    composer.addPass(bloomPass);

    // --- Event Listeners ---
    window.addEventListener('resize', onWindowResize);
    window.addEventListener('click', onClick);

    // --- Start ---
    introAnimation();
    animate();
}

function createPlanet(config) {
    const planetGroup = new THREE.Object3D();
    scene.add(planetGroup);

    const planetMaterial = new THREE.MeshStandardMaterial({ color: config.color, roughness: 0.8 });
    const planetMesh = new THREE.Mesh(new THREE.SphereGeometry(config.size, 32, 32), planetMaterial);
    planetMesh.position.x = config.distance;
    planetMesh.userData = { route: config.route, name: config.name };
    planetMesh.castShadow = true;
    planetGroup.add(planetMesh);
    interactableObjects.push(planetMesh);

    // Rings
    if (config.rings) {
        const ringGeo = new THREE.RingGeometry(config.size * 1.3, config.size * 1.8, 64);
        const ringMat = new THREE.MeshBasicMaterial({ color: config.color, side: THREE.DoubleSide, transparent: true, opacity: 0.4 });
        const ringMesh = new THREE.Mesh(ringGeo, ringMat);
        ringMesh.rotation.x = Math.PI * 0.5;
        planetMesh.add(ringMesh);
    }
    
    // Moons
    if (config.moons) {
        for(let i=0; i<config.moons; i++) {
            const moonGeo = new THREE.SphereGeometry(config.size * 0.15, 16, 16);
            const moonMat = new THREE.MeshStandardMaterial({ color: 0x888888 });
            const moonMesh = new THREE.Mesh(moonGeo, moonMat);
            const angle = Math.random() * Math.PI * 2;
            const dist = config.size + 0.5 + Math.random() * 0.5;
            moonMesh.position.set(Math.cos(angle) * dist, 0, Math.sin(angle) * dist);
            planetMesh.add(moonMesh);
        }
    }

    planets.push({ mesh: planetMesh, group: planetGroup, speed: config.speed, distance: config.distance });
}

function introAnimation() {
    // Simple tweening function
    const tween = (obj, prop, target, duration, onComplete) => {
        const start = obj[prop];
        const change = target - start;
        const startTime = clock.getElapsedTime();
        function update() {
            const time = clock.getElapsedTime() - startTime;
            const progress = Math.min(time / duration, 1);
            obj[prop] = start + change * progress;
            if (progress < 1) {
                requestAnimationFrame(update);
            } else if (onComplete) {
                onComplete();
            }
        }
        update();
    };

    camera.position.set(0, 5, 150);
    controls.target.set(0, 0, 0);
    
    // Animate camera position using our tween function
    const targetPos = new THREE.Vector3(0, 15, 35);
    const startPos = camera.position.clone();
    const duration = 4.0;
    const startTime = clock.getElapsedTime();

    function updateCameraAnimation() {
        const t = (clock.getElapsedTime() - startTime) / duration;
        const easedT = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; // easeInOutQuad
        if (t < 1.0) {
            camera.position.lerpVectors(startPos, targetPos, easedT);
            requestAnimationFrame(updateCameraAnimation);
        } else {
            camera.position.copy(targetPos);
        }
    }
    updateCameraAnimation();
}


function animate() {
    animationFrameId = requestAnimationFrame(animate);
    const delta = clock.getDelta();

    planets.forEach(p => {
        p.group.rotation.y += p.speed * delta;
        p.mesh.rotation.y += 0.5 * delta;
    });
    
    controls.update();
    composer.render();
}

function onClick(event) {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(interactableObjects);

    if (intersects.length > 0) {
        const targetObject = intersects[0].object;
        if (onNavigate && targetObject.userData.route) {
            onNavigate(targetObject.userData.route);
        }
    }
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
}

function destroy() {
    cancelAnimationFrame(animationFrameId);
    window.removeEventListener('resize', onWindowResize);
    window.removeEventListener('click', onClick);

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

    renderer.dispose();
    controls.dispose();
    interactableObjects.length = 0;
    planets.length = 0;
}

export const threeManager = {
    init,
    destroy,
};
