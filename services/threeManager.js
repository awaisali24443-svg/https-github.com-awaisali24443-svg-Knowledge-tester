// services/threeManager.js
import * as THREE from 'three';

let camera, scene, renderer, stars;
let animationFrameId;
let resizeListener; // To hold a reference to the event listener

const init = (container) => {
    // Scene setup
    scene = new THREE.Scene();
    
    // Camera setup
    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 1000);
    camera.position.z = 1;
    camera.rotation.x = Math.PI / 2;

    // Renderer setup
    renderer = new THREE.WebGLRenderer({
        canvas: document.getElementById('bg-canvas'),
        antialias: true,
        alpha: true
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    
    // Starfield
    const starGeo = new THREE.BufferGeometry();
    const starVertices = [];
    for (let i = 0; i < 6000; i++) {
        const x = (Math.random() - 0.5) * 2000;
        const y = (Math.random() - 0.5) * 2000;
        const z = (Math.random() - 0.5) * 2000;
        starVertices.push(x, y, z);
    }
    starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));

    let starMaterial = new THREE.PointsMaterial({
        color: 0xaaaaaa,
        size: 0.7
    });

    stars = new THREE.Points(starGeo, starMaterial);
    scene.add(stars);

    // Resize listener
    resizeListener = () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', resizeListener);

    animate();
};

const animate = () => {
    stars.rotation.y += 0.0002;

    renderer.render(scene, camera);
    animationFrameId = requestAnimationFrame(animate);
};

const destroy = () => {
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
    }
    
    // FIX #8: Properly remove the event listener to prevent memory leaks
    if (resizeListener) {
        window.removeEventListener('resize', resizeListener);
        resizeListener = null;
    }
    
    if (scene) {
        // Dispose of geometries and materials
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
        renderer = null;
    }
    
    stars = null;
    camera = null;
};

export const threeManager = {
    init,
    destroy,
};
