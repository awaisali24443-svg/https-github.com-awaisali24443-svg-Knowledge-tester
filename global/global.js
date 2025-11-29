
/**
 * Initializes the interactive glow effect on all elements with the .card class.
 * Uses requestAnimationFrame for performance optimization.
 */
function initCardGlowEffect() {
  let ticking = false;

  document.body.addEventListener('pointermove', (e) => {
    if (!ticking) {
      window.requestAnimationFrame(() => {
        const cards = document.querySelectorAll('.card');
        for (const card of cards) {
          const rect = card.getBoundingClientRect();
          // Only update if element is roughly in view/nearby to save calculation
          if (e.clientX >= rect.left - 50 && e.clientX <= rect.right + 50 &&
              e.clientY >= rect.top - 50 && e.clientY <= rect.bottom + 50) {
              const x = e.clientX - rect.left;
              const y = e.clientY - rect.top;
              card.style.setProperty('--glow-x', `${x}px`);
              card.style.setProperty('--glow-y', `${y}px`);
          }
        }
        ticking = false;
      });
      ticking = true;
    }
  });
}

// Run the initialization when the DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initCardGlowEffect);
} else {
  initCardGlowEffect();
}
