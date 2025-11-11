import { threeManager } from '../../services/threeManager.js';
import { overlayService } from '../../services/overlayService.js';
import { ROUTES } from '../../constants.js';

let appStateRef;

function handlePlanetClick(target) {
    const route = target.userData.route;
    if (!route) return;
    
    const routeConfig = ROUTES.find(r => `/#${r.hash}` === route || `/${route}` === `/#${r.hash}`);
    if (!routeConfig) {
        console.warn(`No route config found for: ${route}`);
        return;
    }
    
    // Use the focus animation, and once complete, show the overlay.
    threeManager.focusOnPlanet(target, () => {
        overlayService.show(routeConfig, appStateRef);
    });
}

function handleCloseModuleView() {
    threeManager.resetCamera();
}

export async function init(appState) {
    console.log("Home module (Galaxy) initialized.");
    appStateRef = appState;
    const canvas = document.getElementById('galaxy-canvas');
    if (!canvas) {
        console.error("Galaxy canvas not found!");
        return;
    }
    await threeManager.init(canvas, handlePlanetClick);
    
    window.addEventListener('close-module-view', handleCloseModuleView);
}

export function destroy() {
    console.log("Home module (Galaxy) destroyed.");
    threeManager.destroy();
    window.removeEventListener('close-module-view', handleCloseModuleView);
    appStateRef = null;
}
