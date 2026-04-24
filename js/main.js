// Funcionalidades globales del sitio: navegación, menú móvil, año y banner de cookies.
document.addEventListener('DOMContentLoaded', () => {
  inicializarAnioFooter();
  inicializarMenuMovil();
  resaltarNavegacionActiva();
  inicializarBannerCookies();
});

function inicializarAnioFooter() {
  const year = new Date().getFullYear();
  document.querySelectorAll('.js-year').forEach((el) => {
    el.textContent = String(year);
  });
}

function inicializarMenuMovil() {
  const menuBtn = document.getElementById('menu-btn');
  const mobileMenu = document.getElementById('mobile-menu');

  if (!menuBtn || !mobileMenu) return;

  menuBtn.addEventListener('click', () => {
    const abierto = menuBtn.getAttribute('aria-expanded') === 'true';
    menuBtn.setAttribute('aria-expanded', String(!abierto));
    mobileMenu.classList.toggle('hidden');
  });

  mobileMenu.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      mobileMenu.classList.add('hidden');
      menuBtn.setAttribute('aria-expanded', 'false');
    });
  });
}

function resaltarNavegacionActiva() {
  const page = document.body?.dataset?.page || '';
  if (!page) return;

  document.querySelectorAll('[data-nav-link]').forEach((link) => {
    const isActive = link.getAttribute('data-nav-link') === page;
    if (isActive) {
      link.classList.add('nav-link-active');
    } else {
      link.classList.remove('nav-link-active');
    }
  });
}

function inicializarBannerCookies() {
  const banner = document.getElementById('cookie-banner');
  const aceptarBtn = document.getElementById('cookie-accept');

  if (!banner || !aceptarBtn) return;

  banner.classList.remove('hidden');
  aceptarBtn.addEventListener('click', () => {
    banner.classList.add('hidden');
  });
}
