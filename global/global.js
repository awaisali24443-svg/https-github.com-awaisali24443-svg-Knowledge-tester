/**
 * Initializes the interactive glow effect on all elements with the .card class.
 * The effect follows the user's mouse pointer, updating CSS custom properties
 * that are used by the card's pseudo-element in global.css.
 */
function initCardGlowEffect() {
  // Use a single listener on the body for performance.
  document.body.addEventListener('pointermove', (e) => {
    // This could be expensive on complex pages, but is acceptable for this app's structure.
    const cards = document.querySelectorAll('.card');
    for (const card of cards) {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      // Set the CSS custom properties on the individual card element
      card.style.setProperty('--glow-x', `${x}px`);
      card.style.setProperty('--glow-y', `${y}px`);
    }
  });
}

// Run the initialization when the DOM is ready to ensure the body element exists.
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initCardGlowEffect);
} else {
  initCardGlowEffect();
}
