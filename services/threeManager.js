// services/threeManager.js
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { Lensflare, LensflareElement } from 'three/addons/objects/Lensflare.js';
import { soundService } from './soundService.js';
import { getCategories } from './topicService.js';

let camera, scene, renderer, composer, controls, sunLight, corona;
let clock, raycaster, mouse;
let animationFrameId;
let onPlanetClick, onReadyCallback;
let isFirstFrame = true;
const interactableObjects = [];
const planets = [];
const orbitLines = [];
let asteroidBelt, particleSystem, starSystem;
let hoveredPlanet = null;
const textureLoader = new THREE.TextureLoader();

const initialCameraPos = new THREE.Vector3(0, 25, 60);

// --- Static Planet Config for non-category modules ---
const STATIC_PLANET_CONFIG = [
    { name: 'Custom Quiz', route: '#custom-quiz', size: 1.0, orbitRadiusX: 28, orbitRadiusZ: 26, speed: 0.15, rotationSpeed: 0.004, axialTilt: 0.1, type: 'rocky' },
    { name: 'Aural AI', route: '#aural', size: 1.8, orbitRadiusX: 65, orbitRadiusZ: 65, speed: 0.06, rotationSpeed: 0.002, axialTilt: 0.05, type: 'gas_giant', rings: true },
    { name: 'Learning Paths', route: '#paths', size: 1.2, orbitRadiusX: 80, orbitRadiusZ: 78, speed: 0.05, rotationSpeed: 0.007, axialTilt: 0.2, type: 'ice' },
    { name: 'My Library', route: '#library', size: 0.9, orbitRadiusX: 95, orbitRadiusZ: 95, speed: 0.04, rotationSpeed: 0.008, axialTilt: -0.15, type: 'lava' },
    { name: 'Settings', route: '#settings', size: 0.7, orbitRadiusX: 110, orbitRadiusZ: 112, speed: 0.03, rotationSpeed: 0.009, axialTilt: 0.3, type: 'mars' },
];

const PLANET_VISUAL_TYPES = ['earth', 'mars', 'rocky', 'gas_giant', 'ice', 'lava'];

// --- Shaders for Atmosphere & Sun ---
const atmosphereVertexShader = `
    varying vec3 vNormal;
    varying vec3 vPosition;
    void main() {
        vNormal = normalize( normalMatrix * normal );
        vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
    }
`;
const atmosphereFragmentShader = `
    uniform vec3 uGlowColor;
    uniform float uPower;
    varying vec3 vNormal;
    varying vec3 vPosition;
    void main() {
        vec3 viewDirection = normalize(-vPosition);
        float fresnel = clamp(1.0 - dot(viewDirection, vNormal), 0.0, 1.0);
        float intensity = pow(fresnel, uPower);
        gl_FragColor = vec4(uGlowColor, 1.0) * intensity;
    }
`;
const sunFragmentShader = `
    uniform float uTime;
    varying vec2 vUv;
    vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }
    float snoise(vec2 v) {
        const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
        vec2 i  = floor(v + dot(v, C.yy) );
        vec2 x0 = v -   i + dot(i, C.xx);
        vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
        vec4 x12 = x0.xyxy + C.xxzz;
        x12.xy -= i1;
        i = mod289(i);
        vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 )) + i.x + vec3(0.0, i1.x, 1.0 ));
        vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
        m = m*m; m = m*m;
        vec3 x = 2.0 * fract(p * C.www) - 1.0;
        vec3 h = abs(x) - 0.5;
        vec3 ox = floor(x + 0.5);
        vec3 a0 = x - ox;
        m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
        vec3 g;
        g.x  = a0.x  * x0.x  + h.x  * x0.y;
        g.yz = a0.yz * x12.xz + h.yz * x12.yw;
        return 130.0 * dot(m, g);
    }
    void main() {
        float noise1 = (snoise(vUv * 5.0 + uTime * 0.1) + 1.0) * 0.5;
        float noise2 = (snoise(vUv * 10.0 - uTime * 0.2) + 1.0) * 0.5;
        float finalNoise = mix(noise1, noise2, 0.5);
        vec3 color1 = vec3(1.0, 0.6, 0.2);
        vec3 color2 = vec3(1.0, 0.9, 0.6);
        vec3 finalColor = mix(color1, color2, finalNoise);
        gl_FragColor = vec4(finalColor, 1.0);
    }
`;

// --- NEW SHADERS FOR PERFECT PLANETS ---
const gasGiantFragmentShader = `
    uniform float uTime;
    uniform sampler2D uTexture;
    varying vec2 vUv;
    void main() {
        // Create distorted, scrolling bands
        float latitudeFactor = (vUv.y - 0.5) * 2.0; // -1 to 1
        float band1 = texture2D(uTexture, vec2(vUv.x + uTime * 0.02, vUv.y)).r;
        float band2 = texture2D(uTexture, vec2(vUv.x - uTime * 0.015, vUv.y)).g;
        float scrollOffset = mix(band1, band2, abs(latitudeFactor));

        vec2 scrolledUv = vec2(vUv.x + scrollOffset * 0.1, vUv.y);
        vec4 color = texture2D(uTexture, scrolledUv);

        // Add subtle noise for atmospheric turbulence
        float noise = (fract(sin(dot(vUv, vec2(12.9898, 78.233))) * 43758.5453) - 0.5) * 0.05;
        
        gl_FragColor = color + noise;
    }
`;

const lavaPlanetFragmentShader = `
    uniform float uTime;
    uniform sampler2D uRockTexture;
    uniform sampler2D uNoiseTexture;
    varying vec2 vUv;
    
    void main() {
        vec2 scroll = vec2(uTime * 0.01, uTime * 0.005);
        float noise = texture2D(uNoiseTexture, vUv * 2.0 + scroll).r;
        
        // Create sharp cracks
        float crackThreshold = 0.6;
        float crackWidth = 0.03;
        float cracks = smoothstep(crackThreshold - crackWidth, crackThreshold, noise) - smoothstep(crackThreshold, crackThreshold + crackWidth, noise);
        
        // Make lava glow and pulse
        float pulse = (sin(uTime * 2.0 + vUv.y * 10.0) + 1.0) * 0.5;
        vec3 lavaColor = vec3(1.0, 0.3, 0.0) * (pulse * 0.5 + 0.5);
        
        vec3 rockColor = texture2D(uRockTexture, vUv).rgb * 0.5; // Darken rock
        
        // Mix rock and glowing lava
        vec3 finalColor = mix(rockColor, lavaColor, cracks);
        
        gl_FragColor = vec4(finalColor, 1.0);
    }
`;


// --- Main Initialization ---
async function init(canvas, clickCallback, onReady) {
    onPlanetClick = clickCallback;
    onReadyCallback = onReady;
    isFirstFrame = true; 

    clock = new THREE.Clock();
    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2(-10, -10);
    scene = new THREE.Scene();

    const skyboxLoader = new THREE.CubeTextureLoader();
    const skyboxTexture = skyboxLoader.setPath('/assets/textures/realistic_skybox/').load(['px.jpg', 'nx.jpg', 'py.jpg', 'ny.jpg', 'pz.jpg', 'nz.jpg']);
    scene.background = skyboxTexture;

    camera = new THREE.PerspectiveCamera(45, canvas.clientWidth / canvas.clientHeight, 0.1, 2000);
    camera.position.copy(initialCameraPos);

    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.minDistance = 5;
    controls.maxDistance = 200;
    controls.enablePan = false;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.08); // Slightly brighter ambient
    scene.add(ambientLight);

    sunLight = new THREE.PointLight(0xffffee, 4.0, 2000);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 1024;
    sunLight.shadow.mapSize.height = 1024;
    sunLight.shadow.bias = -0.001;
    sunLight.shadow.radius = 4;
    sunLight.shadow.blurSamples = 8;
    scene.add(sunLight);
    
    // --- Dynamic Sun ---
    const sunGroup = new THREE.Group();
    const sunMaterial = new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 } },
        vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        fragmentShader: sunFragmentShader,
    });
    const sunMesh = new THREE.Mesh(new THREE.SphereGeometry(5, 64, 64), sunMaterial);
    sunGroup.add(sunMesh);

    const coronaMaterial = new THREE.SpriteMaterial({
        map: new THREE.TextureLoader().load('/assets/textures/lensflare0.png'),
        color: 0xffffee,
        transparent: true,
        blending: THREE.AdditiveBlending,
        opacity: 0.7,
    });
    corona = new THREE.Sprite(coronaMaterial);
    corona.scale.set(30, 30, 1);
    sunGroup.add(corona);
    scene.add(sunGroup);

    const textureFlare3 = textureLoader.load('/assets/textures/lensflare3.png');
    const lensflare = new Lensflare();
    lensflare.addElement(new LensflareElement(textureLoader.load('/assets/textures/lensflare0.png'), 600, 0, sunLight.color));
    lensflare.addElement(new LensflareElement(textureFlare3, 60, 0.6));
    lensflare.addElement(new LensflareElement(textureFlare3, 120, 0.9));
    sunLight.add(lensflare);

    // --- Dynamic Planet Generation ---
    const allPlanetConfigs = [...STATIC_PLANET_CONFIG];
    try {
        const categories = await getCategories();
        const baseOrbit = 18;
        const orbitStep = 12;
        categories.forEach((cat, index) => {
            allPlanetConfigs.push({
                name: cat.name,
                route: `#topics/${cat.id}`,
                size: 1.0 + Math.random() * 0.4 - 0.2,
                orbitRadiusX: baseOrbit + (index * orbitStep),
                orbitRadiusZ: baseOrbit + (index * orbitStep) + (Math.random() * 4 - 2),
                speed: 0.2 - (index * 0.03),
                rotationSpeed: 0.003 + Math.random() * 0.004,
                axialTilt: (Math.random() - 0.5) * 0.4,
                type: PLANET_VISUAL_TYPES[index % PLANET_VISUAL_TYPES.length]
            });
        });
    } catch (error) {
        console.error("Could not fetch categories to generate planets:", error);
    }
    
    allPlanetConfigs.sort((a, b) => a.orbitRadiusX - b.orbitRadiusX);
    allPlanetConfigs.forEach(config => {
        createPlanet(config);
        createOrbitLine(config);
    });
    
    createAsteroidBelt();
    createParticleNebula();
    createTwinklingStars();

    // --- Post-Processing ---
    composer = new EffectComposer(renderer);
    composer.setSize(canvas.clientWidth, canvas.clientHeight);
    composer.addPass(new RenderPass(scene, camera));
    const bloomPass = new UnrealBloomPass(new THREE.Vector2(canvas.clientWidth, canvas.clientHeight), 0.7, 0.4, 0.1);
    bloomPass.threshold = 0.8;
    composer.addPass(bloomPass);

    window.addEventListener('resize', onWindowResize);
    canvas.addEventListener('click', onClick);
    canvas.addEventListener('mousemove', onMouseMove);

    introAnimation();
    animate();
    soundService.startAmbient();
}

function createPlanet(config) {
    const planetGroup = new THREE.Object3D();
    scene.add(planetGroup);
    
    let planetMesh;
    const materialConfig = { roughness: 0.8, metalness: 0.1 };
    const tiltGroup = new THREE.Object3D();
    tiltGroup.rotation.z = config.axialTilt || 0;
    planetGroup.add(tiltGroup);
    
    switch (config.type) {
        case 'earth':
            planetMesh = new THREE.Mesh(
                new THREE.SphereGeometry(config.size, 64, 64),
                new THREE.MeshStandardMaterial({
                    ...materialConfig,
                    map: textureLoader.load('/assets/textures/planets/earth_day.jpg'),
                    bumpMap: textureLoader.load('/assets/textures/planets/earth_bump.jpg'),
                    bumpScale: 0.02,
                    specularMap: textureLoader.load('/assets/textures/planets/earth_specular.png'),
                    emissiveMap: textureLoader.load('/assets/textures/planets/earth_night.jpg'),
                    emissive: new THREE.Color(0xffddaa),
                    emissiveIntensity: 1.0,
                    normalMap: textureLoader.load('/assets/textures/planets/earth_normal.jpg'),
                    normalScale: new THREE.Vector2(0.5, 0.5),
                })
            );
             const cloudsMesh = new THREE.Mesh(
                new THREE.SphereGeometry(config.size * 1.01, 64, 64),
                new THREE.MeshStandardMaterial({
                    map: textureLoader.load('/assets/textures/planets/earth_clouds.png'),
                    transparent: true,
                    opacity: 0.6,
                    blending: THREE.AdditiveBlending,
                })
            );
            cloudsMesh.castShadow = true;
            planetMesh.add(cloudsMesh);
            const atmosphereMesh = new THREE.Mesh(
                new THREE.SphereGeometry(config.size * 1.04, 64, 64),
                new THREE.ShaderMaterial({
                    vertexShader: atmosphereVertexShader,
                    fragmentShader: atmosphereFragmentShader,
                    blending: THREE.AdditiveBlending,
                    side: THREE.BackSide,
                    uniforms: { uGlowColor: { value: new THREE.Color(0x87ceeb) }, uPower: { value: 2.5 } }
                })
            );
            planetMesh.add(atmosphereMesh);
            break;
        case 'gas_giant':
            const gasGiantMaterial = new THREE.ShaderMaterial({
                uniforms: {
                    uTime: { value: 0 },
                    uTexture: { value: textureLoader.load('/assets/textures/planets/gas_giant_clouds.jpg') }
                },
                vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
                fragmentShader: gasGiantFragmentShader
            });
            planetMesh = new THREE.Mesh(new THREE.SphereGeometry(config.size, 64, 64), gasGiantMaterial);
            break;
        case 'lava':
            const lavaMaterial = new THREE.ShaderMaterial({
                uniforms: {
                    uTime: { value: 0 },
                    uRockTexture: { value: textureLoader.load('/assets/textures/planets/lava_rock.jpg') },
                    uNoiseTexture: { value: textureLoader.load('/assets/textures/planets/lava_noise.png') }
                },
                vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
                fragmentShader: lavaPlanetFragmentShader
            });
            planetMesh = new THREE.Mesh(new THREE.SphereGeometry(config.size, 64, 64), lavaMaterial);
            break;
        case 'ice':
            planetMesh = new THREE.Mesh(
                new THREE.SphereGeometry(config.size, 64, 64),
                new THREE.MeshStandardMaterial({
                    map: textureLoader.load('/assets/textures/planets/ice.jpg'),
                    roughness: 0.1, metalness: 0.0,
                    normalMap: textureLoader.load('/assets/textures/planets/rocky_bump.jpg'),
                    normalScale: new THREE.Vector2(0.2, 0.2),
                })
            );
            break;
        case 'rocky':
            planetMesh = new THREE.Mesh(
                new THREE.SphereGeometry(config.size, 64, 64),
                new THREE.MeshStandardMaterial({
                    ...materialConfig,
                    map: textureLoader.load('/assets/textures/planets/rocky.jpg'),
                    bumpMap: textureLoader.load('/assets/textures/planets/rocky_bump.jpg'),
                    bumpScale: 0.05
                })
            );
            break;
        case 'mars':
             planetMesh = new THREE.Mesh(
                new THREE.SphereGeometry(config.size, 64, 64),
                new THREE.MeshStandardMaterial({
                    ...materialConfig,
                    map: textureLoader.load('/assets/textures/planets/mars.jpg'),
                    bumpMap: textureLoader.load('/assets/textures/planets/mars_bump.jpg'),
                    bumpScale: 0.05,
                    normalMap: textureLoader.load('/assets/textures/planets/mars_normal.jpg'),
                    normalScale: new THREE.Vector2(0.3, 0.3),
                })
            );
            break;
        default:
             planetMesh = new THREE.Mesh(
                new THREE.SphereGeometry(config.size, 64, 64),
                new THREE.MeshStandardMaterial({ ...materialConfig, map: textureLoader.load(`/assets/textures/planets/neptune.jpg`) })
            );
            break;
    }

    planetMesh.castShadow = true;
    planetMesh.receiveShadow = true;
    planetMesh.userData = { route: config.route, name: config.name, isPlanet: true, atmosphere: planetMesh.children.find(c => c.material.type === 'ShaderMaterial') };
    
    tiltGroup.add(planetMesh);
    interactableObjects.push(planetMesh);

    if (config.rings) {
        const ringTexture = textureLoader.load('/assets/textures/rings/realistic_rings.png');
        const ringGeo = new THREE.RingGeometry(config.size * 1.6, config.size * 2.8, 64);
        const ringMat = new THREE.MeshStandardMaterial({ map: ringTexture, side: THREE.DoubleSide, transparent: true, opacity: 0.9, shadowSide: THREE.BackSide });
        const ringMesh = new THREE.Mesh(ringGeo, ringMat);
        ringMesh.receiveShadow = true;
        ringMesh.castShadow = true;
        ringMesh.rotation.x = Math.PI * 0.5;
        tiltGroup.add(ringMesh);
    }
    
    planets.push({ mesh: planetMesh, group: planetGroup, config });
}

function createOrbitLine(config) {
    const curve = new THREE.EllipseCurve(0, 0, config.orbitRadiusX, config.orbitRadiusZ, 0, 2 * Math.PI, false, 0);
    const points = curve.getPoints(128);
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineDashedMaterial({ color: 0x00f6ff, dashSize: 0.5, gapSize: 0.25, transparent: true, opacity: 0.15 });
    const line = new THREE.Line(geometry, material);
    line.computeLineDistances();
    line.rotation.x = Math.PI / 2;
    scene.add(line);
    orbitLines.push(line);
}

function createAsteroidBelt() {
    const asteroidCount = 1000;
    const geometry = new THREE.DodecahedronGeometry(0.1, 0);
    const material = new THREE.MeshStandardMaterial({ map: textureLoader.load('/assets/textures/planets/asteroid.jpg'), color: 0xaaaaaa, roughness: 0.8 });
    asteroidBelt = new THREE.InstancedMesh(geometry, material, asteroidCount);
    asteroidBelt.receiveShadow = true;
    asteroidBelt.castShadow = true;

    const dummy = new THREE.Object3D();
    const innerRadius = 42;
    const outerRadius = 50;
    for (let i = 0; i < asteroidCount; i++) {
        const radius = Math.random() * (outerRadius - innerRadius) + innerRadius;
        const angle = Math.random() * Math.PI * 2;
        const y = (Math.random() - 0.5) * 2.5;
        dummy.position.set(Math.cos(angle) * radius, y, Math.sin(angle) * radius);
        dummy.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
        dummy.scale.setScalar(Math.random() * 2 + 0.5);
        dummy.updateMatrix();
        asteroidBelt.setMatrixAt(i, dummy.matrix);
    }
    scene.add(asteroidBelt);
}

function createParticleNebula() {
    const particleCount = 20000;
    const positions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 400;
        positions[i * 3 + 1] = (Math.random() - 0.5) * 100;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 400;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({ size: 0.1, map: textureLoader.load('/assets/textures/particle_noise.png'), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, color: 0x00f6ff, opacity: 0.2 });
    particleSystem = new THREE.Points(geometry, material);
    scene.add(particleSystem);
}

function createTwinklingStars() {
    const starCount = 5000;
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 1000;
        positions[i * 3 + 1] = (Math.random() - 0.5) * 1000;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 1000;
        const color = new THREE.Color();
        color.setHSL(0.6, 1.0, 0.5 + Math.random() * 0.5);
        colors[i * 3] = color.r;
        colors[i * 3 + 1] = color.g;
        colors[i * 3 + 2] = color.b;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({ size: 0.5 + Math.random(), vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
    starSystem = new THREE.Points(geometry, material);
    scene.add(starSystem);
}

function introAnimation() {
    camera.position.set(0, 10, 150);
    controls.target.set(0, 0, 0);
    const startPos = camera.position.clone();
    const duration = 4.0;
    let startTime = null;
    function update(timestamp) {
        if (!clock) return;
        if (startTime === null) startTime = timestamp;
        const t = Math.min((timestamp - startTime) / (duration * 1000), 1.0);
        const easedT = 1 - Math.pow(1 - t, 3);
        camera.position.lerpVectors(startPos, initialCameraPos, easedT);
        if (t < 1.0) requestAnimationFrame(update);
    }
    requestAnimationFrame(update);
}

function animate() {
    animationFrameId = requestAnimationFrame(animate);
    const delta = clock.getDelta();
    const elapsedTime = clock.getElapsedTime();
    
    // Update shader uniforms
    scene.traverse(obj => {
        if (obj.isMesh && obj.material.type === 'ShaderMaterial' && obj.material.uniforms.uTime) {
            obj.material.uniforms.uTime.value = elapsedTime;
        }
    });

    if (corona) {
        const coronaScale = 1.0 + Math.sin(elapsedTime * 0.8) * 0.04;
        corona.scale.set(30 * coronaScale, 30 * coronaScale, 1);
    }

    planets.forEach(p => {
        const { speed, orbitRadiusX, orbitRadiusZ, rotationSpeed } = p.config;
        const angle = elapsedTime * speed;
        p.group.position.x = Math.cos(angle) * orbitRadiusX;
        p.group.position.z = Math.sin(angle) * orbitRadiusZ;
        p.mesh.rotation.y += rotationSpeed * delta * 20;
        const cloudLayer = p.mesh.children.find(c => c.material?.map?.source?.data?.src?.includes('clouds'));
        if (cloudLayer) {
            cloudLayer.rotation.y += rotationSpeed * delta * 15;
        }
    });
    
    if (asteroidBelt) asteroidBelt.rotation.y += 0.0001;
    if (particleSystem) particleSystem.rotation.y += 0.00005;
    if (starSystem) starSystem.rotation.y += 0.0001;
    
    controls.update();
    composer.render(delta);

    if (isFirstFrame && onReadyCallback) {
        onReadyCallback();
        isFirstFrame = false;
    }
}

function onClick(event) {
    const canvas = renderer.domElement;
    const rect = canvas.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(interactableObjects, true);
    if (intersects.length > 0) {
        let currentObject = intersects[0].object;
        while(currentObject) {
            if (currentObject.userData.isPlanet) {
                soundService.playSound('click');
                if (onPlanetClick) onPlanetClick(currentObject);
                return;
            }
            currentObject = currentObject.parent;
        }
    }
}

function onMouseMove(event) {
    const canvas = renderer.domElement;
    const rect = canvas.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(interactableObjects, true);
    let intersectedPlanet = null;
    if (intersects.length > 0) {
        let currentObject = intersects[0].object;
        while(currentObject) {
             if (currentObject.userData.isPlanet) {
                intersectedPlanet = currentObject;
                break;
            }
            currentObject = currentObject.parent;
        }
    }
    
    if (intersectedPlanet) {
        canvas.style.cursor = 'pointer';
        if (hoveredPlanet !== intersectedPlanet) {
            if (hoveredPlanet && hoveredPlanet.userData.atmosphere) hoveredPlanet.userData.atmosphere.visible = false;
            hoveredPlanet = intersectedPlanet;
            if (hoveredPlanet.userData.atmosphere) hoveredPlanet.userData.atmosphere.visible = true;
            soundService.playSound('hover');
        }
    } else {
        canvas.style.cursor = 'grab';
        if (hoveredPlanet && hoveredPlanet.userData.atmosphere) {
             hoveredPlanet.userData.atmosphere.visible = false;
             hoveredPlanet = null;
        }
    }
    planets.forEach(p => {
        if (p.mesh !== hoveredPlanet && p.mesh.userData.atmosphere) p.mesh.userData.atmosphere.visible = false;
    });
}

function onWindowResize() {
    const canvas = renderer.domElement;
    if(!canvas || !canvas.parentElement) return;
    const parent = canvas.parentElement;
    camera.aspect = parent.clientWidth / parent.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(parent.clientWidth, parent.clientHeight);
    composer.setSize(parent.clientWidth, parent.clientHeight);
}

function destroy() {
    console.log("Destroying Three.js manager");
    cancelAnimationFrame(animationFrameId);
    
    const canvas = renderer?.domElement;
    if (canvas) {
        canvas.removeEventListener('click', onClick);
        canvas.removeEventListener('mousemove', onMouseMove);
    }
    window.removeEventListener('resize', onWindowResize);
    
    soundService.stopAmbient();

    scene.traverse(object => {
        if (object.geometry) object.geometry.dispose();
        if (object.material) {
            if (Array.isArray(object.material)) {
                object.material.forEach(material => material.dispose());
            } else {
                if (typeof material.dispose === 'function') {
                    material.dispose();
                }
            }
        }
    });

    if (renderer) renderer.dispose();
    if (controls) controls.dispose();
    
    interactableObjects.length = 0;
    planets.length = 0;
    orbitLines.length = 0;
    camera = scene = renderer = composer = controls = sunLight = clock = raycaster = mouse = corona = null;
    asteroidBelt = particleSystem = starSystem = hoveredPlanet = onReadyCallback = null;
    animationFrameId = undefined;
}

export const threeManager = {
    init,
    destroy,
};