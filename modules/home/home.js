
import { threeManager } from '../../services/threeManager.js';
import { overlayService } from '../../services/overlayService.js';
import { ROUTES } from '../../constants.js';

let appStateRef;
let galaxyContainer;

// --- Module Lifecycle ---

const handlePlanetClick = (planet) => {
    if (planet && planet.userData.route) {
        // Find the full module configuration from the route hash
        const routeHash = planet.userData.route.substring(1); // remove '#'
        const moduleConfig = ROUTES.find(r => r.hash === routeHash);

        if (moduleConfig) {
            // 1. Animate camera to the planet
            threeManager.focusOnPlanet(planet, () => {
                // 2. When animation is done, show the module overlay, passing the appState
                overlayService.show(moduleConfig, appStateRef);
            });
        }
    }
};

const handleCloseModule = () => {
    overlayService.hide();
    threeManager.resetCamera();
};

export async function init(appState) {
    console.log("Home module (Knowledge Galaxy) initialized.");
    appStateRef = appState;
    
    galaxyContainer = document.getElementById('galaxy-canvas');
    if (galaxyContainer) {
        document.body.classList.add('galaxy-view');
        
        // FIX: Defer Three.js initialization until the next animation frame.
        // This ensures the DOM is fully painted and the canvas has correct dimensions,
        // preventing a common bug where the renderer initializes with a 0x0 canvas.
        requestAnimationFrame(() => {
            if (galaxyContainer.clientWidth > 0 && galaxyContainer.clientHeight > 0) {
                 threeManager.init(galaxyContainer, handlePlanetClick);
            } else {
                console.error("Galaxy canvas has zero dimensions. Three.js initialization aborted.");
            }
        });

        window.addEventListener('close-module-view', handleCloseModule);
    } else {
        console.error("Galaxy canvas container not found!");
    }
}

export function destroy() {
    threeManager.destroy();
    document.body.classList.remove('galaxy-view');
    window.removeEventListener('close-module-view', handleCloseModule);
    appStateRef = null;
    console.log("Home module (Knowledge Galaxy) destroyed.");
}