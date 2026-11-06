/* =========================================================
   Portafolio — interacciones
   JS sin dependencias, cargado con "defer".
   ========================================================= */
(() => {
  'use strict';

  /* =======================================================
     CONFIGURACIÓN EDITABLE
     ======================================================= */

  // Imágenes de cada proyecto (botón "Ver imágenes").
  // La clave coincide con data-gallery="…" en index.html.
  // Ejemplo: { src: 'assets/hongos/placa-1.jpg', desc: 'Crecimiento a las 48 h' }
  const projectGalleries = {
    hongos:  [],
    lipidos: [],
    jabones: [],
  };

  // Envío del formulario de contacto (servicio gratuito FormSubmit).
  // La primera vez que alguien escriba, FormSubmit enviará un correo
  // de activación a esta dirección: hay que confirmarlo una sola vez.
  const FORM_ENDPOINT = 'https://formsubmit.co/ajax/sprellets@gmail.com';

  const SITE_NAME = 'Marjorie Pineda';

  /* =======================================================
     UTILIDADES
     ======================================================= */
  const $  = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasIO = 'IntersectionObserver' in window;

  let toastTimer;
  const toast = (msg, type = 'success') => {
    const el = $('#toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.toggle('toast--error', type === 'error');
    el.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('is-visible'), 3500);
  };

  /* =======================================================
     PESTAÑAS (una sección visible a la vez, con #hash en la URL)
     ======================================================= */
  const pages = $$('.page');
  const navLinks = $$('#main-nav a:not(.btn)');
  let currentPage = null;

  const pageFromHash = (hash) => {
    const id = decodeURIComponent((hash || '').slice(1));
    const target = id && document.getElementById(id);
    if (!target) return { page: pages[0], target: null };
    const page = target.closest('.page');
    return { page, target: page && target !== page ? target : null };
  };

  const showPage = (page, { animate = true, focus = true, target = null } = {}) => {
    if (!page) return;

    if (page !== currentPage) {
      pages.forEach((p) => { p.hidden = p !== page; p.classList.remove('is-entering'); });
      if (animate && !reduceMotion) {
        void page.offsetWidth; // reinicia la animación
        page.classList.add('is-entering');
      }
      currentPage = page;
    }

    navLinks.forEach((a) => {
      if (a.hash === `#${page.id}`) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });

    const heading = $('h1, h2', page);
    document.title = page === pages[0]
      ? `${SITE_NAME} | Portafolio`
      : `${heading ? heading.textContent.trim() : page.id} | ${SITE_NAME}`;

    if (target) {
      target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
    } else {
      window.scrollTo({ top: 0, behavior: 'auto' });
    }

    // Llevar el foco al título de la pestaña (lectores de pantalla / teclado)
    if (focus && heading) heading.focus({ preventScroll: true });

    revealInView(page);
    onScroll();
  };

  if (pages.length) {
    window.addEventListener('hashchange', () => {
      const id = location.hash.slice(1);
      const el = id && document.getElementById(id);
      // Enlaces internos que no son pestañas (p. ej. "Saltar al contenido")
      if (el && !el.closest('.page')) return;
      const { page, target } = pageFromHash(location.hash);
      showPage(page, { target });
    });

    // Clic en la pestaña que ya está abierta: volver arriba
    document.addEventListener('click', (e) => {
      const a = e.target.closest('a[href^="#"]');
      if (a && a.hash && a.hash === location.hash) {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
        closeMenu();
      }
    });
  }

  /* =======================================================
     MENÚ MÓVIL
     ======================================================= */
  const header = $('#site-header');
  const toggle = $('.nav-toggle');
  const nav = $('#main-nav');

  function setMenu(open) {
    if (!toggle || !nav) return;
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
    nav.classList.toggle('is-open', open);
  }
  function closeMenu() { setMenu(false); }

  if (toggle && nav) {
    toggle.addEventListener('click', () => setMenu(toggle.getAttribute('aria-expanded') !== 'true'));
    nav.addEventListener('click', (e) => { if (e.target.closest('a')) closeMenu(); });
    document.addEventListener('click', (e) => {
      if (nav.classList.contains('is-open') && !header.contains(e.target)) closeMenu();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && nav.classList.contains('is-open')) { closeMenu(); toggle.focus(); }
    });
    window.matchMedia('(min-width: 900px)').addEventListener('change', (e) => { if (e.matches) closeMenu(); });
  }

  /* =======================================================
     SCROLL: sombra del header, barra de progreso, volver arriba
     ======================================================= */
  const progress = $('#reading-progress');
  const backToTop = $('#back-to-top');
  let ticking = false;

  function updateScrollUI() {
    const y = window.scrollY;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    if (header) header.classList.toggle('is-scrolled', y > 8);
    if (progress) progress.style.transform = `scaleX(${max > 0 ? Math.min(y / max, 1) : 0})`;
    if (backToTop) backToTop.classList.toggle('is-visible', y > 400);
    ticking = false;
  }
  function onScroll() {
    if (!ticking) { ticking = true; requestAnimationFrame(updateScrollUI); }
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });

  backToTop?.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
  });

  /* =======================================================
     ANIMACIÓN DE APARICIÓN
     (los elementos de pestañas ocultas se animan al abrirlas)
     ======================================================= */
  // Red de seguridad: lo que ya está en pantalla al abrir una pestaña se
  // muestra sin esperar al IntersectionObserver (nunca queda contenido oculto).
  function revealInView(page) {
    const limit = window.innerHeight;
    page.querySelectorAll('.reveal:not(.is-visible)').forEach((el) => {
      if (el.getBoundingClientRect().top < limit) el.classList.add('is-visible');
    });
  }

  const reveals = $$('.reveal');
  if (!hasIO || reduceMotion) {
    reveals.forEach((el) => el.classList.add('is-visible'));
  } else {
    const counters = new WeakMap();
    reveals.forEach((el) => {
      const i = counters.get(el.parentElement) || 0;
      counters.set(el.parentElement, i + 1);
      el.style.setProperty('--reveal-delay', `${Math.min(i * 0.07, 0.42)}s`);
    });
    const io = new IntersectionObserver((entries, obs) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) { entry.target.classList.add('is-visible'); obs.unobserve(entry.target); }
      });
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0.08 });
    reveals.forEach((el) => io.observe(el));
  }

  /* =======================================================
     BLOG: tiempo de lectura automático
     ======================================================= */
  const articleBody = $('#article-body');
  const readTime = $('#read-time');
  if (articleBody && readTime) {
    const words = articleBody.textContent.trim().split(/\s+/).length;
    readTime.textContent = `${Math.max(1, Math.round(words / 200))} min de lectura`;
  }

  /* =======================================================
     GALERÍA DE PROYECTOS
     ======================================================= */
  const dialog = $('#gallery');
  if (dialog && typeof dialog.showModal === 'function') {
    const img = $('#gallery-img');
    const desc = $('#gallery-desc');
    const empty = $('#gallery-empty');
    const thumbs = $('#gallery-thumbs');
    const cur = $('#gallery-current');
    const total = $('#gallery-total');
    const prev = $('#gallery-prev');
    const next = $('#gallery-next');
    let images = [];
    let index = 0;

    const render = () => {
      const has = images.length > 0;
      img.hidden = !has;
      desc.hidden = !has;
      empty.hidden = has;
      cur.textContent = has ? index + 1 : 0;
      total.textContent = images.length;
      prev.disabled = !has || index === 0;
      next.disabled = !has || index === images.length - 1;
      if (!has) { thumbs.replaceChildren(); return; }

      const item = images[index];
      img.src = item.src;
      img.alt = item.desc || `Imagen ${index + 1} del proyecto`;
      desc.textContent = item.desc || '';

      thumbs.replaceChildren(...images.map((it, i) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.setAttribute('aria-label', `Ver imagen ${i + 1}`);
        if (i === index) b.setAttribute('aria-current', 'true');
        const t = document.createElement('img');
        t.src = it.src; t.alt = ''; t.loading = 'lazy';
        b.append(t);
        b.addEventListener('click', () => { index = i; render(); });
        return b;
      }));
    };

    $$('[data-gallery]').forEach((btn) => {
      btn.addEventListener('click', () => {
        images = projectGalleries[btn.dataset.gallery] || [];
        index = 0;
        const title = btn.closest('.paper')?.querySelector('.paper-title')?.textContent.trim();
        $('#gallery-title').textContent = title || 'Galería';
        render();
        dialog.showModal();
      });
    });

    prev.addEventListener('click', () => { if (index > 0) { index--; render(); } });
    next.addEventListener('click', () => { if (index < images.length - 1) { index++; render(); } });
    $('#gallery-close').addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); }); // clic en el fondo
    dialog.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') prev.click();
      if (e.key === 'ArrowRight') next.click();
    });
  }

  /* =======================================================
     FORMULARIO DE CONTACTO
     ======================================================= */
  const form = $('#contact-form');
  if (form) {
    const submitBtn = form.querySelector('button[type="submit"]');
    const submitHTML = submitBtn.innerHTML;
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    form.addEventListener('input', (e) => e.target.removeAttribute('aria-invalid'));

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (submitBtn.disabled) return;

      const data = Object.fromEntries(new FormData(form));
      const fields = { name: data.name?.trim(), email: data.email?.trim(), message: data.message?.trim() };

      const invalid = Object.entries(fields).filter(([k, v]) => !v || (k === 'email' && !emailRe.test(v)));
      if (invalid.length) {
        invalid.forEach(([k]) => form.elements[k].setAttribute('aria-invalid', 'true'));
        form.elements[invalid[0][0]].focus();
        toast(invalid.some(([k]) => k === 'email') && fields.email
          ? 'Revisa tu correo electrónico.'
          : 'Por favor, completa todos los campos.', 'error');
        return;
      }

      // Bot detectado por el campo trampa: fingir éxito sin enviar
      if (data._honey) { form.reset(); toast('¡Mensaje enviado!'); return; }

      submitBtn.disabled = true;
      submitBtn.textContent = 'Enviando…';
      try {
        const res = await fetch(FORM_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({
            ...fields,
            _subject: `Contacto desde el portafolio — ${fields.name}`,
            _replyto: fields.email,
            _template: 'table',
            _captcha: 'false',
          }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || String(json.success) !== 'true') throw new Error(json.message || res.statusText);
        form.reset();
        toast('¡Mensaje enviado! Te responderé pronto.');
      } catch (err) {
        console.error('Error al enviar el formulario:', err);
        toast('No se pudo enviar el mensaje. Intenta de nuevo o escríbeme por correo.', 'error');
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = submitHTML;
      }
    });
  }

  /* =======================================================
     AÑO DEL FOOTER
     ======================================================= */
  const year = $('#year');
  if (year) year.textContent = new Date().getFullYear();

  /* =======================================================
     ARRANQUE: abrir la pestaña inicial (al final, cuando todo
     lo anterior ya está definido). Respeta enlaces como …#blog
     ======================================================= */
  if (pages.length) {
    const initial = pageFromHash(location.hash);
    showPage(initial.page, { animate: false, focus: false, target: initial.target });
  }
})();
