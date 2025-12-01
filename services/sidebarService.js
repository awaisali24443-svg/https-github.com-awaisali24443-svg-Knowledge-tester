
import { ROUTES, FEATURES } from '../constants.js';
import * as firebaseService from './firebaseService.js';

/**
 * Creates the HTML for a single navigation link.
 */
function createNavLink(route) {
    return `
        <a href="#${route.path}" class="sidebar-link" data-path="${route.path}" aria-label="${route.name}">
            <div class="link-icon-wrapper">
                <svg class="icon"><use href="assets/icons/feather-sprite.svg#${route.icon}"/></svg>
            </div>
            <span class="text">${route.name}</span>
        </a>
    `;
}

/**
 * Renders the Tactical Navigation Rail.
 */
export function renderSidebar(container) {
    container.setAttribute('aria-label', 'Main Navigation');

    const mainLinks = ROUTES.filter(r => r.nav && !r.footer);
    const settingsLink = ROUTES.find(r => r.module === 'settings');
    
    // Filter links (e.g., Aural mode check)
    const filteredMainLinks = mainLinks.filter(r => {
        if (r.module === 'aural' && !FEATURES.AURAL_MODE) return false;
        return true;
    });

    const userEmail = firebaseService.getUserEmail() || 'Guest';
    const userName = firebaseService.getUserName() || 'Agent';
    const userPhoto = firebaseService.getUserPhoto() || 'assets/images/avatar-placeholder.png';

    const html = `
        <!-- Top: Brand Identity -->
        <div class="sidebar-brand" onclick="window.location.hash = '/'">
            <img src="assets/icons/favicon.svg" alt="Skill Apex" class="brand-logo">
            <span class="brand-text">Skill Apex</span>
        </div>

        <!-- Menu -->
        <div class="sidebar-menu-label">Main Console</div>
        <ul class="sidebar-links">
            ${filteredMainLinks.map(link => createNavLink(link)).join('')}
        </ul>

        <div class="sidebar-spacer"></div>

        <div class="sidebar-menu-label">System</div>
        <ul class="sidebar-links">
            ${settingsLink ? createNavLink(settingsLink) : ''}
        </ul>

        <!-- Bottom: Profile Badge -->
        <div class="sidebar-profile" onclick="window.location.hash = '/profile'">
            <div class="profile-avatar-container">
                <img src="${userPhoto}" alt="Profile" class="profile-avatar-img">
            </div>
            <div class="profile-info-text">
                <span class="profile-name">${userName}</span>
                <span class="profile-role">Operative</span>
            </div>
        </div>
    `;
    
    container.innerHTML = html;
}
