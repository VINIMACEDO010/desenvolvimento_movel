// Menu hambúrguer acessível
const hamburger = document.querySelector('.hamburger');
const menu = document.querySelector('.menu');

hamburger.addEventListener('click', () => {
  const isActive = menu.classList.toggle('active');
  hamburger.setAttribute('aria-expanded', isActive ? 'true' : 'false');
});

// Registrar Service Worker para PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js')
      .then(() => console.log('✅ Service Worker registrado'))
      .catch(err => console.error('SW erro:', err));
  });
}
