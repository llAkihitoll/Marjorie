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
  const FORM_ENDPOINT = 'https://formsubmit.co/ajax/d040a28cf01cd1672bf3d3f24b565018';

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
    const pageChanged = page !== currentPage;

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

    // Entradas del blog: se cambia de hoja en lugar de desplazarse
    const entry = target && target.closest('.notebook-stack > .notebook');
    if (entry) {
      showEntry(entry, { animate: animate && !pageChanged, focus });
      revealInView(page);
      onScroll();
      return;
    }
    if (page.id === 'blog' && !currentEntry) showEntry(entries[0], { animate: false, focus: false });

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

  /* =======================================================
     BLOG: una hoja a la vez, con animación de pasar hoja
     ======================================================= */
  const entries = $$('.notebook-stack > .notebook');
  const indexLinks = $$('.blog-index a');
  let currentEntry = null;
  let finishFlip = null;

  entries.forEach((e) => $('.notebook-title', e)?.setAttribute('tabindex', '-1'));

  /* ---- Animación de pasar hoja (tiras que se curvan) ---- */
  const CURL_MS = 1250;
  const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const smooth = (x) => { x = Math.min(Math.max(x, 0), 1); return x * x * (3 - 2 * x); };

  function buildCurl(source, stack) {
    const W = source.offsetWidth;
    // Solo se anima la parte de la hoja que se ve en pantalla (mucho más ligero)
    const srcTop = source.getBoundingClientRect().top;
    const H = Math.max(1, Math.min(source.offsetHeight, window.innerHeight - srcTop + 40));
    const n = Math.min(Math.max(Math.round(W / 42), 8), 16);
    const sw = W / n;

    const el = document.createElement('div');
    el.className = 'page-curl';
    el.setAttribute('aria-hidden', 'true');
    el.inert = true;
    Object.assign(el.style, {
      left: `${source.offsetLeft}px`, top: `${source.offsetTop}px`,
      width: `${W}px`, height: `${H}px`,
    });
    // Perspectiva centrada en la parte visible de la hoja
    const visibleMid = window.innerHeight / 2 - srcTop;
    const py = Math.min(Math.max(visibleMid, 0), H);
    el.style.perspective = `${Math.max(1600, W * 2.2)}px`;
    el.style.perspectiveOrigin = `${W * 0.45}px ${py}px`;

    const shadow = document.createElement('div');
    shadow.className = 'page-curl-shadow';
    el.append(shadow);

    const strips = [];
    let parent = el;
    for (let k = 0; k < n; k++) {
      const strip = document.createElement('div');
      strip.className = 'curl-strip';
      Object.assign(strip.style, { left: `${k === 0 ? 0 : sw}px`, width: `${sw}px`, height: `${H}px` });

      const face = document.createElement('div');
      face.className = 'curl-face';
      const clone = source.cloneNode(true);
      clone.removeAttribute('id');
      clone.removeAttribute('hidden');
      clone.querySelectorAll('[id]').forEach((x) => x.removeAttribute('id'));
      clone.style.width = `${W}px`;
      clone.style.left = `${-k * sw}px`;
      const shade = document.createElement('div');
      shade.className = 'curl-shade';
      const shine = document.createElement('div');
      shine.className = 'curl-shine';
      face.append(clone, shade, shine);

      const back = document.createElement('div');
      back.className = 'curl-back';
      const backShade = document.createElement('div');
      backShade.className = 'curl-shade';
      back.append(backShade);

      strip.append(face, back);
      parent.append(strip);
      parent = strip;
      strips.push({ strip, shade, shine, backShade });
    }
    stack.append(el);

    const LAG = 0.65; // cuánto se adelanta el borde derecho respecto al lomo
    const render = (p) => {
      let prevA = 0;
      strips.forEach((s, k) => {
        const x = n > 1 ? k / (n - 1) : 1;
        // Ángulo acumulado de cada tira: el borde derecho gira antes que el lomo
        const A = 180 * smooth(p * (1 + LAG) - LAG * (1 - x));
        const local = A - prevA;
        prevA = A;
        s.strip.style.transform = `rotateY(${-local}deg)`;
        const rad = (A * Math.PI) / 180;
        // Sombra según hacia dónde mira la tira; brillo donde el papel se dobla
        s.shade.style.opacity = (0.32 * (1 - Math.cos(rad)) / 2).toFixed(3);
        s.backShade.style.opacity = (0.28 * (1 + Math.cos(rad)) / 2).toFixed(3);
        s.shine.style.opacity = Math.min(local / 14, 0.4).toFixed(3);
      });
      shadow.style.opacity = (1 - p).toFixed(3);
      // Al final la hoja ya pasó: se desvanece suavemente
      el.style.opacity = p > 0.82 ? ((1 - p) / 0.18).toFixed(3) : '1';
    };

    return { el, render };
  }

  function showEntry(entry, { animate = true, focus = true } = {}) {
    if (!entry) return;
    if (finishFlip) finishFlip(); // si hay una hoja girando, terminarla ya
    const prev = currentEntry;
    currentEntry = entry;

    indexLinks.forEach((a) => {
      if (a.hash === `#${entry.id}`) a.setAttribute('aria-current', 'true');
      else a.removeAttribute('aria-current');
    });
    entry.classList.add('is-visible');

    // Llevar la parte superior de la libreta a la vista (sin animación)
    const stack = entry.parentElement;
    const offset = (header ? header.offsetHeight : 0) + 16;
    const top = stack.getBoundingClientRect().top;
    if (top < offset || top > window.innerHeight * 0.6) {
      window.scrollTo({ top: window.scrollY + top - offset, behavior: 'auto' });
    }

    if (!prev || prev === entry || !animate || reduceMotion) {
      entries.forEach((e) => { e.hidden = e !== entry; });
    } else {
      // Hacia adelante: la hoja actual se curva y pasa a la izquierda.
      // Hacia atrás: la hoja anterior regresa curvándose y cubre la actual.
      const forward = entries.indexOf(entry) > entries.indexOf(prev);
      const source = forward ? prev : entry; // hoja que gira
      const under = forward ? entry : prev;  // hoja que queda debajo

      source.hidden = false;
      const curl = buildCurl(source, stack);
      source.hidden = true;
      under.hidden = false;
      document.documentElement.classList.add('is-page-turning');

      let start = null;
      let raf = 0;
      const finish = () => {
        cancelAnimationFrame(raf);
        curl.el.remove();
        document.documentElement.classList.remove('is-page-turning');
        entries.forEach((e) => { e.hidden = e !== currentEntry; });
        finishFlip = null;
        onScroll();
      };
      const frame = (now) => {
        if (start === null) start = now; // el reloj empieza en el primer cuadro dibujado
        const t = Math.min((now - start) / CURL_MS, 1);
        const p = easeInOut(t);
        curl.render(forward ? p : 1 - p);
        if (t < 1) raf = requestAnimationFrame(frame);
        else finish();
      };
      curl.render(forward ? 0 : 1);
      raf = requestAnimationFrame(frame);
      finishFlip = finish;
    }

    if (focus) $('.notebook-title', entry)?.focus({ preventScroll: true });
  }

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
  $$('.notebook').forEach((article) => {
    const body = $('.notebook-body', article);
    const readTime = $('[data-read-time]', article);
    if (!body || !readTime) return;
    const words = body.textContent.trim().split(/\s+/).length;
    readTime.textContent = `${Math.max(1, Math.round(words / 200))} min de lectura`;
  });

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
