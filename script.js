/* =========================================================
   Agustín Segura Prado — Portfolio
   Renderizado data-driven desde content.json + i18n (ES/GL/EN)
   ========================================================= */
(function () {
  "use strict";
  if ("scrollRestoration" in history) history.scrollRestoration = "manual";

  const $ = (s, c) => (c || document).querySelector(s);
  const $$ = (s, c) => Array.from((c || document).querySelectorAll(s));
  const el = (tag, cls) => { const e = document.createElement(tag); if (cls) e.className = cls; return e; };

  const LANGS = ["es", "gl", "en"];
  let lang = "es";
  try { const s = localStorage.getItem("asp_lang"); if (s && LANGS.includes(s)) lang = s; } catch (e) {}

  let C = null;                  // content
  const lightboxSets = {};       // por sección
  const tr = (f) => (f && (f[lang] != null ? f[lang] : f.es)) || "";
  const ui = (k) => { const u = C.ui || {}; const L = u[lang] || u.es || {}; const E = u.es || {}; return (L[k] != null ? L[k] : E[k]) || ""; };
  function safeUrl(u) { u = String(u == null ? "" : u).trim(); return /^\s*(javascript|data|vbscript):/i.test(u) ? "#" : u; }
  function validYt(id) { return typeof id === "string" && /^[A-Za-z0-9_-]{6,15}$/.test(id); }
  function normalizeContent(c) {
    c = c || {}; c.site = c.site || {}; c.hero = c.hero || {}; c.about = c.about || {}; c.contact = c.contact || {};
    c.ui = c.ui || {}; if (!c.ui.es) c.ui.es = {}; c.about.chips = c.about.chips || {};
    c.sections = Array.isArray(c.sections) ? c.sections : [];
    return c;
  }

  /* ---------- helpers de rutas de imagen (soporta fotos subidas por el CMS) ---------- */
  function isPath(f) { return /[\/]/.test(f); }
  function thumbCandidates(f) { return isPath(f) ? [f] : ["assets/thumbs/" + f, "assets/full/" + f, "assets/uploads/" + f]; }
  function fullCandidates(f) { return isPath(f) ? [f] : ["assets/full/" + f, "assets/uploads/" + f, "assets/thumbs/" + f]; }
  /* precarga de la imagen a tamaño COMPLETO (misma resolución, solo adelanta la descarga al caché) */
  const _pf = Object.create(null);
  function prefetchFull(cands, priority) {
    const key = cands && cands[0]; if (!key || _pf[key]) return;
    const im = new Image(); _pf[key] = im;
    try { im.fetchPriority = priority || "low"; } catch (e) {}
    im.decoding = "async";
    im.src = key;
  }
  function chainSrc(img, cands, onload) {
    let i = 0;
    img.onerror = () => { i++; if (i < cands.length) img.src = cands[i]; else { img.onerror = null; } };
    if (onload) img.addEventListener("load", onload);
    img.src = cands[0];
  }

  /* ---------- scroll lock (iOS-safe) + focus trap ---------- */
  let savedScroll = 0;
  function lockScroll() { if (document.body.classList.contains("lock")) return; savedScroll = window.scrollY || 0; document.body.style.top = "-" + savedScroll + "px"; document.body.classList.add("lock"); }
  function unlockScroll() {
    if (!document.body.classList.contains("lock")) return;
    document.body.classList.remove("lock"); document.body.style.top = "";
    const prev = document.documentElement.style.scrollBehavior;
    document.documentElement.style.scrollBehavior = "auto"; // restaura sin animación (evita quedarse arriba)
    window.scrollTo(0, savedScroll);
    document.documentElement.style.scrollBehavior = prev;
  }
  function setInert(els, v) { els.forEach((e) => { if (e) { try { e.inert = v; } catch (x) {} } }); }
  function trapTab(e, c) {
    if (e.key !== "Tab") return;
    const f = $$('a[href],button:not([disabled]),[tabindex]:not([tabindex="-1"])', c).filter((x) => x.offsetParent !== null);
    if (!f.length) return;
    const a = f[0], b = f[f.length - 1];
    if (e.shiftKey && document.activeElement === a) { e.preventDefault(); b.focus(); }
    else if (!e.shiftKey && document.activeElement === b) { e.preventDefault(); a.focus(); }
  }

  /* ---------- reveal + scrollspy (se recrean en cada render) ---------- */
  let revealObs, spyObs;
  function freshObservers() {
    if (revealObs) revealObs.disconnect();
    if (spyObs) spyObs.disconnect();
    revealObs = new IntersectionObserver((en) => en.forEach((x) => { if (x.isIntersecting) { x.target.classList.add("in"); revealObs.unobserve(x.target); } }), { threshold: 0.1, rootMargin: "0px 0px -6% 0px" });
    spyObs = new IntersectionObserver((en) => en.forEach((x) => { if (x.isIntersecting) { const id = x.target.id; $$("#navLinks a[data-spy]").forEach((a) => a.classList.toggle("active", a.getAttribute("href") === "#" + id)); } }), { rootMargin: "-45% 0px -50% 0px" });
  }

  /* ---------- masonry (usa dimensiones reales de la imagen) ---------- */
  function spanTile(tile) {
    const grid = tile.parentElement; if (!grid) return;
    const cs = getComputedStyle(grid);
    const rowUnit = parseFloat(cs.gridAutoRows) || 1;
    let gap = parseFloat(cs.rowGap); if (!isFinite(gap)) gap = 12;
    const ar = parseFloat(tile.dataset.ar); if (!ar) return;
    const cw = tile.clientWidth; if (!cw) return;
    const ch = cw / ar;
    tile.style.gridRowEnd = "span " + Math.max(1, Math.round((ch + gap) / (rowUnit + gap)));
  }
  function layoutMasonry() { $$(".tile").forEach(spanTile); }

  /* ---------- tarjeta de vídeo (fachada YouTube nocookie) ---------- */
  function videoCard(v, isReel) {
    const wrap = el("div", "video-wrap");
    const card = el("div", "video-card" + (isReel ? " reel" : ""));
    card.setAttribute("role", "button"); card.tabIndex = 0; card.setAttribute("aria-label", "Reproducir: " + (v.title || "vídeo"));
    const img = el("img"); img.src = v.thumb || ("https://i.ytimg.com/vi/" + v.yt + "/hqdefault.jpg"); img.alt = (v.title || "Vídeo") + " — Agustín Segura Prado"; img.loading = "lazy"; img.decoding = "async";
    img.onerror = () => { if (!img.dataset.fb) { img.dataset.fb = "1"; img.src = "https://i.ytimg.com/vi/" + v.yt + "/hqdefault.jpg"; } };
    const play = el("div", "video-card__play"); play.innerHTML = "<i></i>";
    card.append(img, play);
    if (v.title) { const tag = el("span", "video-card__tag"); tag.textContent = v.title; card.appendChild(tag); }
    const load = () => {
      if (card.dataset.loaded) return; card.dataset.loaded = "1"; card.classList.add("loading");
      const ifr = el("iframe");
      const vo = /^https?:/.test(location.origin) ? "&origin=" + encodeURIComponent(location.origin) : "";
      ifr.src = "https://www.youtube-nocookie.com/embed/" + v.yt + "?autoplay=1&playsinline=1&rel=0&modestbranding=1" + vo;
      ifr.allow = "autoplay; encrypted-media; picture-in-picture; fullscreen"; ifr.allowFullscreen = true; ifr.loading = "lazy"; ifr.referrerPolicy = "strict-origin-when-cross-origin"; ifr.title = v.title || "Vídeo";
      ifr.addEventListener("load", () => card.classList.remove("loading"));
      card.innerHTML = ""; card.appendChild(ifr);
    };
    card.addEventListener("click", load);
    card.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); load(); } });
    const fb = el("a", "video-fallback"); fb.href = "https://www.youtube.com/watch?v=" + v.yt; fb.target = "_blank"; fb.rel = "noopener noreferrer"; fb.textContent = ui("video_fallback");
    const note = el("span", "video-notice"); note.textContent = ui("video_notice");
    wrap.append(card, fb, note);
    return wrap;
  }
  function videoGroup(g) {
    const grp = el("div", "av-group reveal");
    if (g.title || g.meta) {
      const head = el("div", "av-group__head");
      const h = el("h3"); h.textContent = tr(g.title); head.appendChild(h);
      if (g.meta) { const m = el("span", "av-group__meta"); m.textContent = tr(g.meta); head.appendChild(m); }
      grp.appendChild(head);
    }
    const wrapCls = g.feature ? "feature-video" : "reels";
    const box = el("div", wrapCls);
    (g.videos || []).filter((v) => v && validYt(v.yt)).forEach((v) => box.appendChild(videoCard(v, !g.feature)));
    grp.appendChild(box);
    return grp;
  }

  /* ---------- galería ---------- */
  function buildGallery(sec) {
    const grid = el("div", "gallery"); grid.id = "gallery-" + sec.id;
    const set = [];
    (sec.photos || []).forEach((file, i) => {
      const fig = el("figure", "tile"); fig.tabIndex = 0; fig.setAttribute("role", "button"); fig.setAttribute("aria-label", "Ampliar imagen " + (i + 1));
      fig.dataset.ar = "1.5"; // proporción provisional hasta que cargue la imagen
      const img = el("img"); img.alt = tr(sec.nav) + " — Agustín Segura Prado (" + (i + 1) + ")"; img.loading = "lazy"; img.decoding = "async";
      chainSrc(img, thumbCandidates(file), () => { if (img.naturalWidth) { fig.dataset.ar = img.naturalWidth / img.naturalHeight; spanTile(fig); } });
      const plus = el("span", "tile__plus");
      fig.append(img, plus);
      grid.appendChild(fig);
      set.push({ thumb: thumbCandidates(file), full: fullCandidates(file), cat: tr(sec.nav) });
      const open = () => openLightbox(sec.id, i);
      fig.addEventListener("click", open);
      fig.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); } });
      // al apuntar/tocar/enfocar una miniatura, adelanta la descarga de su versión completa
      let _pfo = false;
      const pf = () => { if (_pfo) return; _pfo = true; prefetchFull(fullCandidates(file), "low"); };
      fig.addEventListener("pointerenter", pf);
      fig.addEventListener("touchstart", pf, { passive: true });
      fig.addEventListener("focus", pf);
      revealObs.observe(fig);
    });
    lightboxSets[sec.id] = set;
    return grid;
  }

  function renderSection(sec, idx) {
    const s = el("section", "section"); s.id = sec.id;
    const head = el("div", "section__head reveal");
    const eb = el("p", "eyebrow");
    eb.innerHTML = '<span class="eyebrow__num">' + String(idx + 1).padStart(2, "0") + "</span> ";
    const navspan = el("span"); navspan.textContent = tr(sec.nav); eb.appendChild(navspan);
    const h = el("h2", "section__title"); h.innerHTML = tr(sec.title);
    const d = el("p", "section__desc"); d.textContent = tr(sec.desc);
    head.append(eb, h, d); s.appendChild(head);
    revealObs.observe(head);

    if (sec.type === "video") {
      (sec.groups || []).forEach((g) => { const grp = videoGroup(g); s.appendChild(grp); revealObs.observe(grp); });
    } else {
      if (sec.videos && sec.videos.length) {
        const grp = videoGroup({ title: sec.videosTitle, videos: sec.videos });
        s.appendChild(grp); revealObs.observe(grp);
      }
      s.appendChild(buildGallery(sec));
    }
    return s;
  }

  /* ---------- navegación ---------- */
  function buildNav() {
    const nv = $("#navLinks"); nv.innerHTML = "";
    C.sections.forEach((sec) => { const a = el("a"); a.href = "#" + sec.id; a.dataset.spy = "1"; a.textContent = tr(sec.nav); nv.appendChild(a); });
    const aAbout = el("a"); aAbout.href = "#sobre-mi"; aAbout.dataset.spy = "1"; aAbout.textContent = ui("sobremi"); nv.appendChild(aAbout);
    const aC = el("a"); aC.href = "#contacto"; aC.dataset.spy = "1"; aC.textContent = ui("contacto"); nv.appendChild(aC);
    const langBox = el("div", "nav__lang"); langBox.setAttribute("role", "group"); langBox.setAttribute("aria-label", "Idioma / Language");
    LANGS.forEach((l) => { const b = el("button"); b.type = "button"; b.dataset.lang = l; b.textContent = l.toUpperCase(); b.setAttribute("aria-current", l === lang ? "true" : "false"); if (l === lang) b.classList.add("active"); b.addEventListener("click", () => setLang(l)); langBox.appendChild(b); });
    nv.appendChild(langBox);
    $$("#navLinks a").forEach((a) => a.addEventListener("click", closeMenu));
  }

  /* ---------- render principal ---------- */
  function renderAll() {
    document.documentElement.lang = lang;
    freshObservers();
    Object.keys(lightboxSets).forEach((k) => delete lightboxSets[k]);

    $("#skipLink").textContent = ui("skip");
    buildNav();

    // hero
    $("#heroEyebrow").textContent = tr(C.hero.eyebrow);
    $("#heroLede").textContent = tr(C.hero.lede);
    $("#heroCta1").textContent = ui("hero_cta1");
    $("#heroCta2").textContent = ui("hero_cta2");
    $("#heroCaption").textContent = tr(C.hero.caption);
    const heroImg = $("#heroImg");
    if (heroImg.getAttribute("src") !== C.hero.image) {
      heroImg.onerror = () => { heroImg.onerror = null; heroImg.src = "assets/full/retrato-15.jpg"; };
      heroImg.src = C.hero.image;
    }

    // secciones
    const cont = $("#sections"); cont.innerHTML = "";
    C.sections.forEach((sec, i) => cont.appendChild(renderSection(sec, i)));

    // about
    const nSecs = C.sections.length;
    $("#aboutNum").textContent = String(nSecs + 1).padStart(2, "0");
    $("#aboutNav").textContent = ui("sobremi");
    $("#aboutTitle").innerHTML = tr(C.about.title);
    $("#aboutP1").innerHTML = tr(C.about.p1);
    $("#aboutP2").innerHTML = tr(C.about.p2);
    const chips = $("#aboutChips"); chips.innerHTML = "";
    (((C.about.chips || {})[lang]) || (C.about.chips || {}).es || []).forEach((c) => { const li = el("li"); li.textContent = c; chips.appendChild(li); });
    const aImg = $("#aboutImg");
    if (aImg.getAttribute("src") !== C.about.image) {
      aImg.onerror = () => { aImg.onerror = null; aImg.src = "assets/thumbs/foto-fija-01.jpg"; };
      aImg.src = C.about.image;
    }

    // contacto
    $("#contactNum").textContent = String(nSecs + 2).padStart(2, "0");
    $("#contactNav").textContent = ui("contacto");
    $("#contactTitle").innerHTML = tr(C.contact.title);
    const mail = $("#contactMail"); mail.href = "mailto:" + C.site.email; mail.textContent = C.site.email;
    const soc = $("#contactSocials"); soc.innerHTML = "";
    const ig = el("a"); ig.href = safeUrl(C.site.instagram); ig.target = "_blank"; ig.rel = "noopener noreferrer"; ig.innerHTML = "Instagram <span></span>"; ig.querySelector("span").textContent = C.site.instagramHandle || ""; soc.appendChild(ig);
    const lk = el("a"); lk.href = safeUrl(C.site.linkedin); lk.target = "_blank"; lk.rel = "noopener noreferrer"; lk.innerHTML = "LinkedIn <span></span>"; lk.querySelector("span").textContent = C.site.linkedinLabel || ""; soc.appendChild(lk);

    // footer
    $("#footerTag").textContent = ui("footer_tag");
    $("#footerTop").textContent = ui("footer_top");
    $("#footerRights").textContent = ui("footer_rights");
    $("#legal1").textContent = ui("legal1");
    $("#legal2").textContent = ui("legal2");

    // observar reveal/spy + masonry
    $$(".reveal").forEach((e) => revealObs.observe(e));
    $$("main section[id]").forEach((s) => spyObs.observe(s));
    requestAnimationFrame ? requestAnimationFrame(layoutMasonry) : layoutMasonry();
    layoutMasonry();
    setTimeout(layoutMasonry, 300); setTimeout(layoutMasonry, 900);
  }

  function setLang(l) { if (!LANGS.includes(l)) return; lang = l; try { localStorage.setItem("asp_lang", l); } catch (e) {} renderAll(); }

  /* ---------- Lightbox ---------- */
  const lb = $("#lightbox"), lbImg = $("#lbImg"), lbCat = $("#lbCat"), lbCount = $("#lbCount"), lbSpinner = $("#lbSpinner");
  let curCat = null, curIndex = 0, lastFocus = null, curFull = null;
  function lbRender() {
    const set = lightboxSets[curCat]; if (!set || !set[curIndex]) return;
    const item = set[curIndex];
    if (curFull) { curFull.onload = curFull.onerror = null; curFull.src = ""; curFull = null; }
    lbImg.classList.add("blur"); lbSpinner.classList.add("show");
    chainSrc(lbImg, item.thumb);
    lbImg.alt = item.cat + " " + (curIndex + 1) + " / " + set.length + " — Agustín Segura Prado";
    lbCat.textContent = item.cat; lbCount.textContent = (curIndex + 1) + " / " + set.length;
    const full = new Image(); curFull = full;
    let fi = 0;
    const done = (ok) => { if (curFull === full && lightboxSets[curCat] && lightboxSets[curCat][curIndex] === item) { if (ok) chainSrc(lbImg, item.full); lbImg.classList.remove("blur"); lbSpinner.classList.remove("show"); } };
    full.onload = () => done(true);
    full.onerror = () => { fi++; if (fi < item.full.length) { full.src = item.full[fi]; } else done(false); };
    try { full.fetchPriority = "high"; } catch (e) {}
    full.decoding = "async";
    full.src = item.full[0];
    // adelanta a tamaño completo la siguiente y la anterior para navegar sin esperas
    const nxt = set[(curIndex + 1) % set.length]; if (nxt) prefetchFull(nxt.full, "low");
    const prv = set[(curIndex - 1 + set.length) % set.length]; if (prv) prefetchFull(prv.full, "low");
  }
  function openLightbox(cat, i) {
    if (!lightboxSets[cat] || !lightboxSets[cat][i]) return;
    lastFocus = document.activeElement; curCat = cat; curIndex = i; lbRender();
    lb.classList.add("open"); lb.setAttribute("aria-hidden", "false"); lockScroll();
    setInert([$("#contenido"), $("footer.footer"), $("#nav")], true);
    $("#lbClose").focus();
  }
  function closeLightbox() {
    lb.classList.remove("open"); lb.setAttribute("aria-hidden", "true");
    setInert([$("#contenido"), $("footer.footer"), $("#nav")], false); unlockScroll();
    if (lastFocus && lastFocus.focus) { try { lastFocus.focus({ preventScroll: true }); } catch (e) { lastFocus.focus(); } }
  }
  function step(d) { const set = lightboxSets[curCat]; if (!set) return; curIndex = (curIndex + d + set.length) % set.length; lbRender(); }
  $("#lbClose").addEventListener("click", closeLightbox);
  $("#lbNext").addEventListener("click", () => step(1));
  $("#lbPrev").addEventListener("click", () => step(-1));
  lb.addEventListener("click", (e) => { if (e.target === lb) closeLightbox(); });
  document.addEventListener("keydown", (e) => {
    if (!lb.classList.contains("open")) return;
    if (e.key === "Escape") closeLightbox(); else if (e.key === "ArrowRight") step(1); else if (e.key === "ArrowLeft") step(-1); else trapTab(e, lb);
  });
  let tx = 0, ty = 0;
  lb.addEventListener("touchstart", (e) => { tx = e.changedTouches[0].clientX; ty = e.changedTouches[0].clientY; }, { passive: true });
  lb.addEventListener("touchend", (e) => { const dx = e.changedTouches[0].clientX - tx, dy = e.changedTouches[0].clientY - ty; if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy)) step(dx < 0 ? 1 : -1); }, { passive: true });

  /* ---------- Menú ---------- */
  const nav = $("#nav"), navLinks = $("#navLinks"), navToggle = $("#navToggle"), navScrim = $("#navScrim");
  let scrimT = null;
  const onScroll = () => nav.classList.toggle("scrolled", window.scrollY > 40);
  window.addEventListener("scroll", onScroll, { passive: true }); onScroll();
  function openMenu() {
    navLinks.classList.add("open"); clearTimeout(scrimT); navScrim.hidden = false; void navScrim.offsetWidth; navScrim.classList.add("show");
    navToggle.setAttribute("aria-expanded", "true"); navToggle.setAttribute("aria-label", "Cerrar menú"); lockScroll();
    setInert([$("#contenido"), $("footer.footer")], true);
    const fl = navLinks.querySelector("a"); if (fl) fl.focus();
  }
  function closeMenu() {
    navLinks.classList.remove("open"); navScrim.classList.remove("show");
    clearTimeout(scrimT); scrimT = setTimeout(() => { navScrim.hidden = true; }, 400);
    navToggle.setAttribute("aria-expanded", "false"); navToggle.setAttribute("aria-label", "Abrir menú");
    setInert([$("#contenido"), $("footer.footer")], false); unlockScroll();
    if (document.activeElement && navLinks.contains(document.activeElement)) navToggle.focus();
  }
  navToggle.addEventListener("click", () => { navLinks.classList.contains("open") ? closeMenu() : openMenu(); });
  navScrim.addEventListener("click", closeMenu);
  document.addEventListener("keydown", (e) => { if (!navLinks.classList.contains("open")) return; if (e.key === "Escape") { closeMenu(); navToggle.focus(); } else trapTab(e, navLinks); });

  /* ---------- varios ---------- */
  (function detectLogo() { const i = new Image(); i.onload = () => { if (i.naturalWidth > 1) document.body.classList.add("has-logo"); }; i.src = "assets/caballito.png"; })();
  const yearEl = $("#year"); if (yearEl) yearEl.textContent = new Date().getFullYear();

  let rT;
  window.addEventListener("resize", () => { clearTimeout(rT); rT = setTimeout(layoutMasonry, 120); });
  window.addEventListener("orientationchange", () => setTimeout(layoutMasonry, 220));
  if (window.ResizeObserver) { const ro = new ResizeObserver(() => { clearTimeout(rT); rT = setTimeout(layoutMasonry, 80); }); ro.observe($("#sections")); }

  window.scrollTo(0, 0);
  window.addEventListener("load", () => { setTimeout(() => window.scrollTo(0, 0), 0); setTimeout(layoutMasonry, 120); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(layoutMasonry);

  const pre = $("#preloader");
  const hidePre = () => { if (pre) pre.classList.add("done"); };

  /* ---------- carga de contenido ---------- */
  fetch("/api/content", { cache: "no-cache" })
    .then((r) => { if (!r.ok) throw new Error("api"); return r.json(); })
    .catch(() => fetch("content.json", { cache: "no-cache" }).then((r) => r.json())) // respaldo: archivo estático (local sin API)
    .then((data) => { C = normalizeContent(data); renderAll(); setTimeout(hidePre, 300); setTimeout(layoutMasonry, 500); })
    .catch((err) => {
      console.error("No se pudo cargar content.json", err);
      hidePre();
      $("#sections").innerHTML = '<p style="padding:6rem var(--pad-x);text-align:center;color:var(--muted)">No se pudo cargar el contenido. Sirve el sitio por HTTP (node server.js) o súbelo a producción.</p>';
    });
  setTimeout(hidePre, 2600); // failsafe
})();
