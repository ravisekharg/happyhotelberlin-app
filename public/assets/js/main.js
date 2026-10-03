/* Happy Hotel Berlin – main.js
   Scroll-based routing, hero slideshow, gallery masonry + lightbox,
   tab panels, accordion routes, form validation, counters, language switch.
*/
(function () {
  'use strict';

  /* ------------------------------------------------------------------
     Source protection
  ------------------------------------------------------------------ */
  document.addEventListener('contextmenu', e => e.preventDefault());
  document.addEventListener('keydown', e => {
    if (e.key === 'F12') { e.preventDefault(); return; }
    const mod = e.ctrlKey || e.metaKey;
    if (mod && e.shiftKey && /^[ijcC]$/.test(e.key)) { e.preventDefault(); return; }
    if (mod && /^[uU]$/.test(e.key)) { e.preventDefault(); return; }
  });

  /* ------------------------------------------------------------------
     Utilities
  ------------------------------------------------------------------ */
  const doc   = document.documentElement;
  const $     = (sel, ctx) => (ctx || document).querySelector(sel);
  const $$    = (sel, ctx) => Array.from((ctx || document).querySelectorAll(sel));
  const on    = (el, ev, fn, opts) => el && el.addEventListener(ev, fn, opts || false);
  const off   = (el, ev, fn) => el && el.removeEventListener(ev, fn);
  const store = (k, v) => { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } };

  /* ------------------------------------------------------------------
     Section-scroll routing
  ------------------------------------------------------------------ */
  const sections = $$('[data-route]');
  const navLinks  = $$('[data-go]');

  function topH () { const t = $('#siteTop'); return t ? t.offsetHeight : 0; }
  function measureTop () { doc.style.setProperty('--top-h', topH() + 'px'); }

  function setActive (path) {
    navLinks.forEach(a => {
      const matches = a.dataset.go === path || (path === '/' && a.dataset.go === '/');
      a.classList.toggle('is-active', matches);
    });
  }

  function sectionScrollY (el) {
    return Math.max(0, el.getBoundingClientRect().top + window.scrollY - topH() - 8);
  }

  function scrollToSection (path, instant) {
    if (path === '/') {
      window.scrollTo({ top: 0, behavior: instant ? 'instant' : 'smooth' });
      return;
    }
    const el = sections.find(s => s.dataset.route === path);
    if (!el) return;
    window.scrollTo({ top: sectionScrollY(el), behavior: instant ? 'instant' : 'smooth' });
  }

  function currentSection () {
    const mid = topH() + 80;
    for (let i = sections.length - 1; i >= 0; i--) {
      if (sections[i].getBoundingClientRect().top <= mid) return sections[i].dataset.route;
    }
    return '/';
  }

  let ticking = false;
  function onScroll () {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      if (!_settling) {
        const path = currentSection();
        if (path && path !== location.pathname) {
          history.replaceState({}, '', path);
          setActive(path);
        }
      }
      const y = window.scrollY;
      const header = $('#siteHeader');
      if (header) header.classList.toggle('scrolled', y > 50);
      // progress bar
      const prog = $('#progress');
      if (prog) {
        const total = document.body.scrollHeight - window.innerHeight;
        prog.style.width = total > 0 ? (y / total * 100) + '%' : '0';
      }
      // floating buttons
      const fab = $('#fabBook');
      const top = $('#toTop');
      if (fab) fab.classList.toggle('show', y > 500);
      if (top) top.classList.toggle('show', y > 600);
      // reveal
      revealCheck();
      // hero parallax tiny
      $$('.hero-slide').forEach(s => { s.style.transform = `translateY(${y * 0.18}px)`; });
    });
  }

  navLinks.forEach(a => {
    on(a, 'click', e => {
      const target = a.dataset.go;
      const sec = sections.find(s => s.dataset.route === target);
      if (sec) {
        e.preventDefault();
        closeDrawer();
        scrollToSection(target);
        // pre-fill room if needed
        const room = a.dataset.room;
        if (room) { const sel = $('#fRoom'); if (sel) sel.value = room; }
        const type = a.dataset.type;
        if (type === 'group') {
          const rb = $('[name="type"][value="group"]'); if (rb) rb.checked = true;
          $$('.group-only').forEach(el => el.hidden = false);
        }
      }
    });
  });

  // scrollRestoration = 'manual' is also set in the <head> inline script.
  // Section URLs are purely cosmetic; direct loads or F5 at a section URL are
  // redirected to '/' by the server (302) + head script. Force top in case the
  // browser carries a saved scroll position across the redirect.
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  window.scrollTo(0, 0);
  measureTop();
  setActive('/');
  let _settling = false;

  on(window, 'resize', measureTop);
  on(window, 'scroll', onScroll, { passive: true });

  /* ------------------------------------------------------------------
     Reveal on scroll + stagger triggers (IntersectionObserver)
  ------------------------------------------------------------------ */
  const amenGrid   = $('.amen-grid');
  const placesGrid = $('.places');

  // Use IntersectionObserver — threshold:0 fires as soon as any pixel enters viewport
  const revealIO = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      e.target.classList.add('visible');
      revealIO.unobserve(e.target);
    });
  }, { threshold: 0 });

  $$('.reveal').forEach(el => revealIO.observe(el));

  // Amenities stagger via IO — CSS transitions handle opacity/transform
  if (amenGrid) {
    const amenIO = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      amenGrid.classList.add('anim');
      amenIO.disconnect();
    }, { threshold: 0 });
    amenIO.observe(amenGrid);
  }

  // Neighbourhood stagger via IO — CSS transitions handle opacity/transform
  if (placesGrid) {
    const placesIO = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      placesGrid.classList.add('anim');
      placesIO.disconnect();
    }, { threshold: 0 });
    placesIO.observe(placesGrid);
  }

  // Scroll-triggered fallback — catches reveals that IO missed or that were
  // already in the viewport when the page jumped to a mid-page section
  function revealCheck () {
    const vh = window.innerHeight;
    $$('.reveal:not(.visible)').forEach(el => {
      const r = el.getBoundingClientRect();
      if (r.top < vh && r.bottom > 0) el.classList.add('visible');
    });
    // Also trigger amen/places if their grid entered view
    if (amenGrid && !amenGrid.classList.contains('anim')) {
      const r = amenGrid.getBoundingClientRect();
      if (r.top < window.innerHeight && r.bottom > 0) amenGrid.classList.add('anim');
    }
    if (placesGrid && !placesGrid.classList.contains('anim')) {
      const r = placesGrid.getBoundingClientRect();
      if (r.top < window.innerHeight && r.bottom > 0) placesGrid.classList.add('anim');
    }
  }
  // Run once at startup to catch items in view at initial scroll position
  setTimeout(revealCheck, 50);

  /* ------------------------------------------------------------------
     Hero slideshow
  ------------------------------------------------------------------ */
  const slides = $$('.hero-slide');
  const dotsWrap = $('#heroDots');
  let slideIdx = 0;
  let slideTimer = null;

  if (slides.length > 1 && dotsWrap) {
    slides.forEach((_, i) => {
      const btn = document.createElement('button');
      btn.className = 'hero-dot' + (i === 0 ? ' is-active' : '');
      btn.setAttribute('role', 'tab');
      btn.setAttribute('aria-label', 'Slide ' + (i + 1));
      btn.setAttribute('aria-selected', i === 0 ? 'true' : 'false');
      on(btn, 'click', () => goSlide(i));
      dotsWrap.appendChild(btn);
    });

    function goSlide (n) {
      slides[slideIdx].classList.remove('is-active');
      $$('.hero-dot')[slideIdx].classList.remove('is-active');
      $$('.hero-dot')[slideIdx].setAttribute('aria-selected', 'false');
      slideIdx = (n + slides.length) % slides.length;
      slides[slideIdx].classList.add('is-active');
      $$('.hero-dot')[slideIdx].classList.add('is-active');
      $$('.hero-dot')[slideIdx].setAttribute('aria-selected', 'true');
    }

    function nextSlide () { goSlide(slideIdx + 1); }
    slideTimer = setInterval(nextSlide, 5000);

    // Pause on hover
    const hero = $('.hero');
    on(hero, 'mouseenter', () => clearInterval(slideTimer));
    on(hero, 'mouseleave', () => { slideTimer = setInterval(nextSlide, 5000); });
  }

  /* ------------------------------------------------------------------
     Quick-book date validation
  ------------------------------------------------------------------ */
  const qbForm = $('#quickBook');
  if (qbForm) {
    const today = new Date().toISOString().slice(0, 10);
    const inEl = $('#qbIn'), outEl = $('#qbOut');
    if (inEl) inEl.min = today;
    on(qbForm, 'submit', e => {
      e.preventDefault();
      const in_ = inEl && inEl.value;
      const out = outEl && outEl.value;
      if (in_ && out && in_ < out) {
        scrollToSection('/book');
        const fi = $('#fIn'), fo = $('#fOut');
        if (fi) fi.value = in_;
        if (fo) fo.value = out;
        updateCalc();
      }
    });
  }

  /* ------------------------------------------------------------------
     Mobile drawer
  ------------------------------------------------------------------ */
  const drawer   = $('#drawer');
  const backdrop = $('#drawerBackdrop');
  const menuBtn  = $('#menuBtn');
  const closeBtn = $('#drawerClose');

  function openDrawer () {
    if (!drawer) return;
    drawer.classList.add('is-open');
    backdrop.classList.add('is-open');
    drawer.removeAttribute('aria-hidden');
    if (menuBtn) menuBtn.setAttribute('aria-expanded', 'true');
    document.body.classList.add('no-scroll');
    setTimeout(() => closeBtn && closeBtn.focus(), 50);
  }
  function closeDrawer () {
    if (!drawer) return;
    drawer.classList.remove('is-open');
    backdrop.classList.remove('is-open');
    drawer.setAttribute('aria-hidden', 'true');
    if (menuBtn) menuBtn.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('no-scroll');
  }

  on(menuBtn, 'click', openDrawer);
  on(closeBtn, 'click', closeDrawer);
  on(backdrop, 'click', closeDrawer);
  on(document, 'keydown', e => { if (e.key === 'Escape') closeDrawer(); });

  /* ------------------------------------------------------------------
     Tab panels (who we host)
  ------------------------------------------------------------------ */
  $$('[role="tablist"]').forEach(list => {
    const tabs   = $$('[role="tab"]', list);
    const panels = tabs.map(t => $('#' + t.getAttribute('aria-controls')));

    function activate (idx) {
      tabs.forEach((t, i) => {
        const on_ = i === idx;
        t.setAttribute('aria-selected', on_);
        if (panels[i]) panels[i].hidden = !on_;
      });
    }

    tabs.forEach((tab, i) => {
      on(tab, 'click', () => activate(i));
      on(tab, 'keydown', e => {
        if (e.key === 'ArrowRight') { e.preventDefault(); activate((i + 1) % tabs.length); tabs[(i + 1) % tabs.length].focus(); }
        if (e.key === 'ArrowLeft')  { e.preventDefault(); activate((i + tabs.length - 1) % tabs.length); tabs[(i + tabs.length - 1) % tabs.length].focus(); }
      });
    });
  });

  /* ------------------------------------------------------------------
     Gallery masonry + filter + lightbox
  ------------------------------------------------------------------ */
  const GALLERY_PHOTOS = [
    { src: '/assets/img/_stg0403.jpg',   cat: 'rooms',    cap: 'Reception area' },
    { src: '/assets/img/0a3a8350.jpg',   cat: 'rooms',    cap: 'Single room with wardrobe' },
    { src: '/assets/img/0a3a8349.jpg',   cat: 'rooms',    cap: 'Single room with desk' },
    { src: '/assets/img/0a3a8318.jpg',   cat: 'rooms',    cap: 'Double room with window' },
    { src: '/assets/img/0a3a8312.jpg',   cat: 'rooms',    cap: 'Double room' },
    { src: '/assets/img/0a3a8314.jpg',   cat: 'rooms',    cap: 'Neat twin room' },
    { src: '/assets/img/0a3a8323.jpg',   cat: 'rooms',    cap: 'Bright room with art' },
    { src: '/assets/img/0a3a8311.jpg',   cat: 'rooms',    cap: 'Bunk room' },
    { src: '/assets/img/0a3a8331.jpg',   cat: 'rooms',    cap: 'Spacious multi-bed room' },
    { src: '/assets/img/0a3a8332.jpg',   cat: 'rooms',    cap: 'Multi-bed room' },
    { src: '/assets/img/0a3a8340.jpg',   cat: 'rooms',    cap: 'Dorm room bunks' },
    { src: '/assets/img/_stg0347.jpg',   cat: 'rooms',    cap: 'Hallway and room' },
    { src: '/assets/img/_stg0357.jpg',   cat: 'rooms',    cap: 'Cosy room, table and chairs' },
    { src: '/assets/img/0a3a8343.jpg',   cat: 'common',   cap: 'Lounge' },
    { src: '/assets/img/0a3a8397.jpg',   cat: 'common',   cap: 'Common room with sofas' },
    { src: '/assets/img/0a3a8398.jpg',   cat: 'common',   cap: 'Lounge with plants' },
    { src: '/assets/img/0a3a8401.jpg',   cat: 'common',   cap: 'Lounge corner' },
    { src: '/assets/img/_stg0388.jpg',   cat: 'common',   cap: 'Breakfast room' },
    { src: '/assets/img/_stg0390.jpg',   cat: 'common',   cap: 'Dining area with foosball' },
    { src: '/assets/img/_stg0395.jpg',   cat: 'common',   cap: 'Breakfast and dining room' },
    { src: '/assets/img/_stg0396.jpg',   cat: 'common',   cap: 'Long dining tables' },
    { src: '/assets/img/img_1696.jpg',   cat: 'common',   cap: 'Dining room with flowers' },
    { src: '/assets/img/img_1652.jpg',   cat: 'common',   cap: 'Reception counter' },
    { src: '/assets/img/0a3a8360.jpg',   cat: 'courtyard', cap: 'Sunny courtyard' },
    { src: '/assets/img/0a3a8355.jpg',   cat: 'courtyard', cap: 'Building facade and courtyard' },
    { src: '/assets/img/img_1293.jpg',   cat: 'courtyard', cap: 'Street entrance' },
    { src: '/assets/img/_stg0338.jpg',   cat: 'common',   cap: 'Red staircase' },
    { src: '/assets/img/_stg0340.jpg',   cat: 'common',   cap: 'Staircase with artwork' },
    { src: '/assets/img/_stg0346.jpg',   cat: 'rooms',    cap: 'Room with bunks and art wall' },
    { src: '/assets/img/0a3a8402.jpg',   cat: 'rooms',    cap: 'Double room, corner view' },
    { src: '/assets/img/0a3a8334.jpg',   cat: 'bath',     cap: 'Private bathroom' },
    { src: '/assets/img/img_1684.jpg',   cat: 'bath',     cap: 'Clean bathroom' },
    { src: '/assets/img/_stg0385.jpg',   cat: 'common',   cap: 'Hotel exterior' },
    { src: '/assets/img/0a3a8299.jpg',   cat: 'rooms',    cap: 'Room overview' },
    { src: '/assets/img/0a3a8302.jpg',   cat: 'rooms',    cap: 'Room with artwork' },
    { src: '/assets/img/0a3a8304.jpg',   cat: 'rooms',    cap: 'Room from doorway' },
    { src: '/assets/img/0a3a8321.jpg',   cat: 'rooms',    cap: 'Room lit by window' },
    { src: '/assets/img/0a3a8324.jpg',   cat: 'rooms',    cap: 'Room corner' },
    { src: '/assets/img/0a3a8342.jpg',   cat: 'rooms',    cap: 'Bunk beds' },
    { src: '/assets/img/0a3a8346.jpg',   cat: 'rooms',    cap: 'Room with bunk and sofa' },
    { src: '/assets/img/0a3a8348.jpg',   cat: 'rooms',    cap: 'Room with big windows' },
    { src: '/assets/img/_stg0327.jpg',   cat: 'rooms',    cap: 'Hallway' },
    { src: '/assets/img/_stg0331.jpg',   cat: 'common',   cap: 'Corridor with doors' },
    { src: '/assets/img/_stg0351.jpg',   cat: 'rooms',    cap: 'Single bed room' },
    { src: '/assets/img/_stg0367.jpg',   cat: 'common',   cap: 'Bar / refrigerator' },
    { src: '/assets/img/_stg0400.jpg',   cat: 'common',   cap: 'Reception & lounge' },
  ];

  const BATCH = 100;
  let shown = 0;
  let currentFilter = 'all';
  const masonryEl = $('#masonry');
  const moreBtn = $('#moreBtn');

  function filteredPhotos () {
    return currentFilter === 'all'
      ? GALLERY_PHOTOS
      : GALLERY_PHOTOS.filter(p => p.cat === currentFilter);
  }

  function buildMasonryItem (photo, idx) {
    const div = document.createElement('div');
    // Do NOT use 'reveal' here — masonry items must appear immediately
    div.className = 'masonry-item';
    div.dataset.idx = idx;
    // Stagger fade-in via inline animation delay
    div.style.animation = `masonry-in .4s ease ${(idx % 16) * 0.04}s both`;
    const img = document.createElement('img');
    img.src = photo.src;
    img.alt = photo.cap;
    img.loading = 'lazy';
    on(div, 'click', () => openLightbox(idx));
    div.appendChild(img);
    return div;
  }

  function renderGallery (reset) {
    if (!masonryEl) return;
    if (reset) { masonryEl.innerHTML = ''; shown = 0; }
    const photos = filteredPhotos();
    const end = Math.min(shown + BATCH, photos.length);
    for (let i = shown; i < end; i++) {
      masonryEl.appendChild(buildMasonryItem(photos[i], i));
    }
    shown = end;
    if (moreBtn) moreBtn.hidden = (shown >= photos.length);
    revealCheck();
  }

  $$('.filter').forEach(btn => {
    on(btn, 'click', () => {
      $$('.filter').forEach(b => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      currentFilter = btn.dataset.filter;
      renderGallery(true);
    });
  });

  if (moreBtn) on(moreBtn, 'click', () => renderGallery(false));
  renderGallery(true);

  // Lightbox
  const lb = $('#lightbox');
  let lbPhotos = [], lbIdx = 0;

  function openLightbox (i) {
    if (!lb) return;
    lbPhotos = filteredPhotos();
    lbIdx = i;
    showLbPhoto();
    lb.hidden = false;
    document.body.classList.add('no-scroll');
    lb.focus();
  }
  function closeLightbox () {
    if (!lb) return;
    lb.hidden = true;
    document.body.classList.remove('no-scroll');
  }
  function showLbPhoto () {
    const photo = lbPhotos[lbIdx];
    if (!photo) return;
    const img = $('figure img', lb);
    const cap = $('figcaption', lb);
    if (img) { img.src = photo.src; img.alt = photo.cap; }
    if (cap) cap.textContent = photo.cap + ' (' + (lbIdx + 1) + ' / ' + lbPhotos.length + ')';
    // thumbs
    const thumbWrap = $('.lb-thumbs', lb);
    if (thumbWrap) {
      thumbWrap.innerHTML = '';
      lbPhotos.forEach((p, i) => {
        const t = document.createElement('img');
        t.className = 'lb-thumb' + (i === lbIdx ? ' is-active' : '');
        t.src = p.src; t.alt = ''; t.loading = 'lazy';
        on(t, 'click', () => { lbIdx = i; showLbPhoto(); });
        thumbWrap.appendChild(t);
      });
    }
  }

  on($('.lb-close', lb), 'click', closeLightbox);
  on($('.lb-prev', lb), 'click', () => { lbIdx = (lbIdx - 1 + lbPhotos.length) % lbPhotos.length; showLbPhoto(); });
  on($('.lb-next', lb), 'click', () => { lbIdx = (lbIdx + 1) % lbPhotos.length; showLbPhoto(); });
  on(lb, 'click', e => { if (e.target === lb) closeLightbox(); });
  on(document, 'keydown', e => {
    if (lb && !lb.hidden) {
      if (e.key === 'ArrowLeft')  { lbIdx = (lbIdx - 1 + lbPhotos.length) % lbPhotos.length; showLbPhoto(); }
      if (e.key === 'ArrowRight') { lbIdx = (lbIdx + 1) % lbPhotos.length; showLbPhoto(); }
      if (e.key === 'Escape') closeLightbox();
    }
  });

  // Room card photo buttons open lightbox filtered by room
  $$('[data-gallery]').forEach(card => {
    on($('.room-media', card), 'click', e => {
      e.preventDefault();
      const cat = card.dataset.gallery;
      currentFilter = cat;
      $$('.filter').forEach(b => b.classList.toggle('is-active', b.dataset.filter === cat));
      renderGallery(true);
      scrollToSection('/gallery');
    });
  });

  /* ------------------------------------------------------------------
     Number counters
  ------------------------------------------------------------------ */
  function animateCount (el, target, duration) {
    let start = null;
    function step (ts) {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      const val = Math.round(p * target);
      el.textContent = val;
      if (p < 1) requestAnimationFrame(step);
      else el.textContent = target;
    }
    requestAnimationFrame(step);
  }

  const io = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      animateCount(el, +el.dataset.to, 1200);
      io.unobserve(el);
    });
  }, { threshold: 0.5 });
  $$('.count').forEach(el => io.observe(el));

  /* ------------------------------------------------------------------
     Booking form
  ------------------------------------------------------------------ */
  const bookForm = $('#bookForm');
  if (bookForm) {
    const typeRadios = $$('[name="type"]', bookForm);
    const groupOnlys = $$('.group-only', bookForm);

    typeRadios.forEach(r => on(r, 'change', () => {
      const isGroup = bookForm.querySelector('[name="type"]:checked').value === 'group';
      groupOnlys.forEach(el => el.hidden = !isGroup);
    }));

    function updateCalc () {
      const inV  = bookForm.querySelector('[name="arrival"]').value;
      const outV = bookForm.querySelector('[name="departure"]').value;
      const calc = $('#stayCalc');
      if (!calc || !inV || !outV) return;
      const nights = Math.round((new Date(outV) - new Date(inV)) / 86400000);
      if (nights > 0) {
        calc.textContent = nights + ' night' + (nights !== 1 ? 's' : '') + ' · ' + inV + ' → ' + outV;
        calc.hidden = false;
      } else {
        calc.hidden = true;
      }
    }
    window.updateCalc = updateCalc;

    on(bookForm.querySelector('[name="arrival"]'), 'change', updateCalc);
    on(bookForm.querySelector('[name="departure"]'), 'change', updateCalc);

    // Set minimum dates
    const today = new Date().toISOString().slice(0, 10);
    const fIn = $('#fIn'), fOut = $('#fOut');
    if (fIn) fIn.min = today;
    on(fIn, 'change', () => { if (fOut) fOut.min = fIn.value; });

    function validate () {
      let ok = true;
      $$('[required]', bookForm).forEach(el => {
        const field = el.closest('.field, .consent');
        const empty = el.type === 'checkbox' ? !el.checked : !el.value.trim();
        if (field) {
          if (el.type === 'checkbox') {
            const err = $('.consent-err', bookForm);
            if (err) err.classList.toggle('show', empty);
          } else {
            field.classList.toggle('has-error', empty);
          }
        }
        if (empty) ok = false;
      });
      const inV  = bookForm.querySelector('[name="arrival"]').value;
      const outV = bookForm.querySelector('[name="departure"]').value;
      const inF  = $('#fIn').closest('.field');
      const outF = $('#fOut').closest('.field');
      if (outV && inV && outV <= inV) { if (outF) outF.classList.add('has-error'); ok = false; }
      return ok;
    }

    on(bookForm, 'submit', async e => {
      e.preventDefault();
      if (!validate()) return;
      const btn = $('[type="submit"]', bookForm);
      const orig = btn.innerHTML;
      btn.disabled = true;
      btn.textContent = 'Sending…';
      const data = Object.fromEntries(new FormData(bookForm));
      try {
        const res = await fetch('/api/submit/booking', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        const json = await res.json();
        if (json.ok) {
          bookForm.querySelector('.book-form > *:not(#formOk)') && $$(':scope > *', bookForm).forEach(el => {
            if (el.id !== 'formOk') el.style.display = 'none';
          });
          const ok = $('#formOk');
          if (ok) {
            ok.hidden = false;
            const ref = $('#okRef');
            if (ref) ref.textContent = json.ref;
          }
        } else throw new Error(json.error || 'error');
      } catch {
        // Fall back to mailto
        const sub = 'Booking request from ' + (data.name || 'guest');
        const body = Object.entries(data).map(([k, v]) => k + ': ' + v).join('\n');
        window.location.href = 'mailto:info@happyhotelberlin.de?subject=' + encodeURIComponent(sub) + '&body=' + encodeURIComponent(body);
      } finally {
        btn.disabled = false;
        btn.innerHTML = orig;
      }
    });

    const okAgain = $('#okAgain');
    on(okAgain, 'click', () => {
      bookForm.reset();
      $$(':scope > *', bookForm).forEach(el => el.style.display = '');
      const ok = $('#formOk');
      if (ok) ok.hidden = true;
    });
  }

  /* ------------------------------------------------------------------
     Back to top
  ------------------------------------------------------------------ */
  on($('#toTop'), 'click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

  /* ------------------------------------------------------------------
     Footer year
  ------------------------------------------------------------------ */
  const yearEl = $('#year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ------------------------------------------------------------------
     Language toggle
  ------------------------------------------------------------------ */
  const langBtns = $$('[data-lang]');
  langBtns.forEach(btn => {
    on(btn, 'click', () => {
      const lang = btn.dataset.lang;
      langBtns.forEach(b => b.setAttribute('aria-pressed', b.dataset.lang === lang ? 'true' : 'false'));
      if (window.setLang) window.setLang(lang);
      store('lang', lang);
    });
  });

  /* ------------------------------------------------------------------
     Keyboard: route details toggle
  ------------------------------------------------------------------ */
  $$('.route summary').forEach(s => {
    on(s, 'keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        s.closest('details').open = !s.closest('details').open;
      }
    });
  });

  /* ------------------------------------------------------------------
     Resize
  ------------------------------------------------------------------ */
  on(window, 'resize', () => { measureTop(); revealCheck(); });

})();
