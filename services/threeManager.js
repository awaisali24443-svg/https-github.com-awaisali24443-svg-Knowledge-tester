import * as THREE from 'three';

// Manages all active 3D scenes to prevent memory leaks
const activeRenderers = new Set();

/**
 * Stops all active Three.js animation loops and disposes of the renderers.
 * This is crucial to call before initializing a new set of 3D cards.
 */
function cleanup() {
    activeRenderers.forEach(rendererInfo => {
        cancelAnimationFrame(rendererInfo.animationId);
        if (rendererInfo.renderer.dispose) {
            rendererInfo.renderer.dispose();
        }
        if (rendererInfo.cardElement && rendererInfo.mouseMoveListener) {
             rendererInfo.cardElement.removeEventListener('mousemove', rendererInfo.mouseMoveListener);
        }
    });
    activeRenderers.clear();
}

/**
 * Creates a symbolic 3D model based on the provided topic string.
 * @param {string} topic - The topic to create a model for.
 * @returns {THREE.Group} A Three.js group containing the generated model.
 */
function createModelForTopic(topic) {
    const group = new THREE.Group();
    const material = new THREE.MeshStandardMaterial({
        color: 0x8952ff, // Default color from google-ai-studio theme
        metalness: 0.5,
        roughness: 0.3
    });

    switch (topic.toLowerCase()) {
        case 'python':
            const curve = new THREE.CatmullRomCurve3([
                new THREE.Vector3(-1.5, 1, 0), new THREE.Vector3(-1.5, -1, 0),
                new THREE.Vector3(0, 0, 0),
                new THREE.Vector3(1.5, 1, 0), new THREE.Vector3(1.5, -1, 0)
            ]);
            const geometryPy = new THREE.TubeGeometry(curve, 20, 0.3, 8, false);
            const pythonMaterial = new THREE.MeshStandardMaterial({ color: 0x4B8BBE });
            group.add(new THREE.Mesh(geometryPy, pythonMaterial));
            break;

        case 'javascript':
            const geometryJs = new THREE.BoxGeometry(1.5, 1.5, 1.5);
            const jsMaterial = new THREE.MeshStandardMaterial({ color: 0xF7DF1E });
            group.add(new THREE.Mesh(geometryJs, jsMaterial));
            break;
            
        case 'sql':
            for (let i = 0; i < 3; i++) {
                const geometrySql = new THREE.CylinderGeometry(1, 1, 0.2, 32);
                const sqlMesh = new THREE.Mesh(geometrySql, material);
                sqlMesh.position.y = (i - 1) * 0.35;
                group.add(sqlMesh);
            }
            break;

        case 'ancient egypt':
            const geometryEg = new THREE.ConeGeometry(1.2, 1.5, 4);
            const egyptMaterial = new THREE.MeshStandardMaterial({ color: 0xD4AF37, roughness: 0.6 });
            group.add(new THREE.Mesh(geometryEg, egyptMaterial));
            break;
            
        case 'ancient rome':
            const geometryRo = new THREE.CylinderGeometry(0.3, 0.3, 2, 16);
            const romeMaterial = new THREE.MeshStandardMaterial({ color: 0xE8D5A2, roughness: 0.7 });
            group.add(new THREE.Mesh(geometryRo, romeMaterial));
            break;

        case 'the ottoman empire':
            const shape = new THREE.Shape();
            shape.moveTo(0, -1.2);
            shape.absarc(0, 0, 1.2, Math.PI * 1.5, Math.PI * 0.5, false);
            shape.absarc(0.4, 0, 1, Math.PI * 0.5, Math.PI * 1.5, true);
            const extrudeSettings = { depth: 0.2, bevelEnabled: false };
            const geometryOt = new THREE.ExtrudeGeometry(shape, extrudeSettings);
            const ottomanMaterial = new THREE.MeshStandardMaterial({ color: 0xC8102E, side: THREE.DoubleSide });
            const ottomanMesh = new THREE.Mesh(geometryOt, ottomanMaterial);
            ottomanMesh.rotation.z = Math.PI / 4;
            group.add(ottomanMesh);
            break;

        default:
            const geometryDef = new THREE.IcosahedronGeometry(1.2, 0);
            group.add(new THREE.Mesh(geometryDef, material));
            break;
    }
    return group;
}

/**
 * Initializes a 3D scene inside a canvas element within a topic card.
 * @param {HTMLElement} cardElement - The card element containing the canvas.
 */
function initCard(cardElement) {
    const canvas = cardElement.querySelector('.topic-canvas');
    if (!canvas) return;

    const topic = cardElement.dataset.topic || 'default';

    // Scene setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, canvas.clientWidth / canvas.clientHeight, 0.1, 1000);
    camera.position.z = 3.5;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 2.5);
    scene.add(ambientLight);
    const pointLight = new THREE.PointLight(0xffffff, 5);
    pointLight.position.set(5, 5, 5);
    scene.add(pointLight);

    // Model
    const model = createModelForTopic(topic);
    scene.add(model);

    // Mouse interaction
    let mouseX = 0;
    const rect = renderer.domElement.getBoundingClientRect();
    const mouseMoveListener = (event) => {
        mouseX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    };
    cardElement.addEventListener('mousemove', mouseMoveListener);
    cardElement.addEventListener('mouseleave', () => { mouseX = 0; });

    // Animation loop
    let animationId;
    function animate() {
        animationId = requestAnimationFrame(animate);

        // Gentle auto-rotation
        model.rotation.y += 0.003;
        // Rotation from mouse position
        model.rotation.y += (mouseX * 0.05 - model.rotation.y) * 0.05;

        renderer.render(scene, camera);
    }
    animate();

    // Store for cleanup
    activeRenderers.add({ renderer, animationId, cardElement, mouseMoveListener });
}

export { initCard, cleanup };
