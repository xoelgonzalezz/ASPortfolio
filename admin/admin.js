/* =========================================================
   Panel de administración — Agustín Segura Prado
   App de una sola página, sin dependencias. Edita content.json
   (vía /api/content) y sube fotos (vía /api/upload, a Vercel Blob).
   ========================================================= */
(function () {
  "use strict";

  var LANGS = ["es", "gl", "en"];
  var UI_KEYS = [
    { key: "skip", label: "Saltar al contenido" },
    { key: "sobremi", label: "Sobre mí (menú)" },
    { key: "contacto", label: "Contacto (menú)" },
    { key: "hero_cta1", label: "Botón 1 de la portada" },
    { key: "hero_cta2", label: "Botón 2 de la portada" },
    { key: "footer_tag", label: "Pie: descripción" },
    { key: "footer_top", label: "Pie: enlace «arriba»" },
    { key: "footer_rights", label: "Pie: derechos" },
    { key: "legal1", label: "Texto «Aviso legal»" },
    { key: "legal2", label: "Texto «Privacidad»" },
    { key: "video_fallback", label: "Vídeo: enlace de respaldo" },
    { key: "video_notice", label: "Vídeo: aviso de cookies" }
  ];

  var data = null;
  var lang = "es";
  var current = "hero";
  var activeSection = -1;
  var dirty = false;

  /* ---------- utilidades ---------- */
  var $ = function (s) { return document.querySelector(s); };
  var $$ = function (s) { return Array.prototype.slice.call(document.querySelectorAll(s)); };
  function frag() { return document.createDocumentFragment(); }
  function icon(n) { return h("i", { class: "ti ti-" + n, "aria-hidden": "true" }); }
  function blank() { return { es: "", gl: "", en: "" }; }
  function ensure(o) { o = o && typeof o === "object" ? o : {}; LANGS.forEach(function (l) { if (o[l] == null) o[l] = ""; }); return o; }
  function tr(f) { return (f && (f[lang] != null ? f[lang] : f.es)) || ""; }
  function reorder(a, from, to) { var x = a.splice(from, 1)[0]; a.splice(to, 0, x); }

  function h(tag, attrs) {
    var e = document.createElement(tag), i, k, v;
    if (attrs) for (k in attrs) {
      v = attrs[k];
      if (v == null || v === false) continue;
      if (k === "class") e.className = v;
      else if (k === "html") e.innerHTML = v;
      else if (k === "style" && typeof v === "object") Object.assign(e.style, v);
      else if (k.indexOf("on") === 0 && typeof v === "function") e.addEventListener(k.slice(2), v);
      else e.setAttribute(k, v === true ? "" : v);
    }
    for (i = 2; i < arguments.length; i++) {
      var kids = arguments[i];
      if (!Array.isArray(kids)) kids = [kids];
      kids.forEach(function (c) {
        if (c == null || c === false) return;
        e.appendChild(typeof c === "object" ? c : document.createTextNode(String(c)));
      });
    }
    return e;
  }

  function resolveImg(v) {
    if (!v) return "";
    if (/^https?:\/\//.test(v)) return v;
    if (v.indexOf("/") >= 0) return v.charAt(0) === "/" ? v : "/" + v;
    return "/assets/full/" + v; // nombre suelto -> como hace la web
  }
  function extractYt(s) {
    s = String(s).trim();
    var m = s.match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([A-Za-z0-9_-]{6,})/);
    return m ? m[1] : s;
  }

  function toast(msg, type) {
    var t = $("#toast"); t.textContent = ""; t.appendChild(icon(type === "err" ? "alert-triangle" : "check"));
    t.appendChild(document.createTextNode(" " + msg));
    t.className = "toast show" + (type === "err" ? " err" : "");
    clearTimeout(t._t); t._t = setTimeout(function () { t.className = "toast" + (type === "err" ? " err" : ""); }, 2600);
  }
  function busy(on, msg) { $("#busy").classList.toggle("hidden", !on); if (msg) $("#busyMsg").textContent = msg; }

  async function apiJSON(url, method, body) {
    var opt = { method: method || "GET", headers: {}, credentials: "same-origin" };
    if (body !== undefined) { opt.headers["Content-Type"] = "application/json"; opt.body = JSON.stringify(body); }
    var r = await fetch(url, opt);
    var j = {}; try { j = await r.json(); } catch (e) {}
    if (r.status === 401) { if (url.indexOf("/api/login") < 0) showLogin(); throw new Error(j.error || "Sesión caducada"); }
    if (!r.ok) throw new Error(j.error || "Error " + r.status);
    return j;
  }

  /* ---------- estado / guardado ---------- */
  function markDirty() {
    dirty = true;
    var b = $("#saveBadge"); b.className = "savebadge dirty"; b.innerHTML = '<i class="ti ti-circle-dot"></i> Sin guardar';
  }
  function markClean() {
    dirty = false;
    var b = $("#saveBadge"); b.className = "savebadge"; b.innerHTML = '<i class="ti ti-circle-check"></i> Guardado';
  }
  async function save() {
    if (!data) return;
    var btn = $("#saveBtn"); btn.disabled = true;
    try { await apiJSON("/api/content", "PUT", data); markClean(); toast("Guardado · la web ya está actualizada"); }
    catch (e) { toast(e.message || "No se pudo guardar", "err"); }
    finally { btn.disabled = false; }
  }

  /* ---------- imagen: elegir + reescalar + subir ---------- */
  function downscale(file) {
    return new Promise(function (res, rej) {
      var reader = new FileReader();
      reader.onload = function () {
        var img = new Image();
        img.onload = function () {
          var w = img.naturalWidth, ht = img.naturalHeight, max = 2560;
          var s = Math.min(1, max / Math.max(w, ht));
          w = Math.round(w * s); ht = Math.round(ht * s);
          var c = document.createElement("canvas"); c.width = w; c.height = ht;
          c.getContext("2d").drawImage(img, 0, 0, w, ht);
          res(c.toDataURL("image/jpeg", 0.85));
        };
        img.onerror = function () { rej(new Error("No se pudo procesar la imagen")); };
        img.src = reader.result;
      };
      reader.onerror = function () { rej(new Error("No se pudo leer el archivo")); };
      reader.readAsDataURL(file);
    });
  }
  function pickImage(cb) {
    var inp = h("input", { type: "file", accept: "image/*" });
    inp.style.display = "none"; document.body.appendChild(inp);
    inp.addEventListener("change", async function () {
      var f = inp.files && inp.files[0]; inp.remove();
      if (!f) return;
      try {
        busy(true, "Procesando foto…");
        var dataUrl = await downscale(f);
        busy(true, "Subiendo…");
        var r = await apiJSON("/api/upload", "POST", { dataUrl: dataUrl, filename: f.name });
        cb(r.url);
      } catch (e) { toast(e.message || "No se pudo subir", "err"); }
      finally { busy(false); }
    });
    inp.click();
  }

  /* ---------- drag & drop para reordenar ---------- */
  function enableDrag(container, arr) {
    var from = -1;
    Array.prototype.forEach.call(container.querySelectorAll(":scope > [data-i]"), function (node) {
      node.setAttribute("draggable", "true");
      node.addEventListener("dragstart", function (e) { from = +node.dataset.i; node.classList.add("drag"); e.dataTransfer.effectAllowed = "move"; });
      node.addEventListener("dragend", function () { node.classList.remove("drag"); });
      node.addEventListener("dragover", function (e) { e.preventDefault(); });
      node.addEventListener("drop", function (e) {
        e.preventDefault(); var to = +node.dataset.i;
        if (from >= 0 && from !== to) { reorder(arr, from, to); markDirty(); render(); }
      });
    });
  }

  /* ---------- piezas de formulario ---------- */
  function field(label, control, hint) {
    return h("div", { class: "field" },
      h("label", {}, label, hint ? h("span", { class: "hint" }, " · " + hint) : null),
      control);
  }
  function i18nField(obj, label, opts) {
    opts = opts || {}; ensure(obj);
    var input = opts.textarea ? h("textarea", { rows: opts.rows || 2 }) : h("input", { type: "text" });
    input.value = obj[lang] || "";
    input.addEventListener("input", function () { obj[lang] = input.value; markDirty(); });
    return field(label, input, opts.hint);
  }
  function textField(owner, key, label, opts) {
    opts = opts || {};
    var input = opts.textarea ? h("textarea", { rows: opts.rows || 2 }) : h("input", { type: opts.type || "text" });
    input.value = owner[key] != null ? owner[key] : "";
    input.addEventListener("input", function () { owner[key] = input.value; markDirty(); });
    return field(label, input, opts.hint);
  }
  function checkbox(label, owner, key) {
    var input = h("input", { type: "checkbox" }); input.checked = !!owner[key];
    input.addEventListener("change", function () { owner[key] = input.checked; markDirty(); });
    return h("label", { class: "field", style: { display: "flex", gap: "9px", alignItems: "center", cursor: "pointer" } },
      input, h("span", { style: { fontSize: ".85rem" } }, label));
  }
  function langBar() {
    return h("div", { class: "langtabs" }, LANGS.map(function (l) {
      return h("button", { type: "button", class: l === lang ? "on" : "", onclick: function () { lang = l; render(); } }, l.toUpperCase());
    }));
  }
  function screenHead(title, sub, actions) {
    return h("div", { class: "screen__head" },
      h("div", {}, h("div", { class: "screen__title disp" }, title), sub ? h("div", { class: "screen__sub" }, sub) : null),
      actions || null);
  }
  function imageField(label, owner, key) {
    var prev = h("div", { class: "single__prev" },
      owner[key] ? h("img", { src: resolveImg(owner[key]), alt: "" })
        : h("div", { class: "muted", style: { display: "grid", placeItems: "center", height: "100%", fontSize: ".75rem" } }, "Sin foto"));
    var side = h("div", {},
      h("button", { class: "btn ghost sm", type: "button", onclick: function () { pickImage(function (url) { owner[key] = url; markDirty(); render(); }); } }, icon("upload"), " Cambiar foto"),
      h("div", { class: "muted", style: { fontSize: ".72rem", marginTop: "8px", maxWidth: "320px" } }, "JPG o PNG. Se optimiza sola para web."));
    return field(label, h("div", { class: "single" }, prev, side));
  }
  function upBtn(arr, i) { return h("button", { class: "iconbtn", title: "Subir", disabled: i === 0, onclick: function () { if (i > 0) { reorder(arr, i, i - 1); markDirty(); render(); } } }, icon("chevron-up")); }
  function downBtn(arr, i) { return h("button", { class: "iconbtn", title: "Bajar", disabled: i === arr.length - 1, onclick: function () { if (i < arr.length - 1) { reorder(arr, i, i + 1); markDirty(); render(); } } }, icon("chevron-down")); }
  function delBtn(arr, i, ask) { return h("button", { class: "iconbtn", title: "Eliminar", onclick: function () { if (!ask || confirm(ask)) { arr.splice(i, 1); markDirty(); render(); } } }, icon("trash")); }

  /* ---------- vídeos ---------- */
  function videosEditor(arr) {
    var box = h("div", {});
    arr.forEach(function (v, i) {
      var yt = h("input", { type: "text", placeholder: "ID o URL de YouTube", style: { flex: "1 1 150px" } }); yt.value = v.yt || "";
      yt.addEventListener("input", function () { v.yt = yt.value.trim(); markDirty(); });
      yt.addEventListener("change", function () { v.yt = extractYt(yt.value); yt.value = v.yt; });
      var tt = h("input", { type: "text", placeholder: "Título (opcional)", style: { flex: "1 1 130px" } }); tt.value = v.title || "";
      tt.addEventListener("input", function () { v.title = tt.value; markDirty(); });
      box.appendChild(h("div", { class: "row", style: { marginBottom: "8px", alignItems: "center", gap: "8px" } },
        yt, tt, upBtn(arr, i), downBtn(arr, i), delBtn(arr, i)));
    });
    box.appendChild(h("button", { class: "btn ghost sm", type: "button", onclick: function () { arr.push({ yt: "", title: "" }); markDirty(); render(); } }, icon("plus"), " Añadir vídeo"));
    return box;
  }
  function groupsEditor(sec) {
    var box = h("div", {});
    sec.groups.forEach(function (g, gi) {
      box.appendChild(h("div", { class: "card", style: { background: "var(--bg-2)" } },
        h("div", { class: "card__head" }, h("span", { class: "card__title" }, "Grupo " + (gi + 1)), upBtn(sec.groups, gi), downBtn(sec.groups, gi), delBtn(sec.groups, gi, "¿Eliminar este grupo de vídeos?")),
        i18nField(g.title, "Título del grupo"),
        i18nField(g.meta, "Subtítulo / créditos"),
        checkbox("Vídeo grande (horizontal)", g, "feature"),
        h("div", { class: "flabel", style: { marginTop: "8px" } }, "Vídeos"),
        videosEditor(g.videos)));
    });
    box.appendChild(h("button", { class: "btn ghost sm", type: "button", onclick: function () { sec.groups.push({ title: blank(), meta: blank(), feature: false, videos: [] }); markDirty(); render(); } }, icon("plus"), " Añadir grupo"));
    return box;
  }

  /* ---------- fotos ---------- */
  function photoGrid(sec) {
    var grid = h("div", { class: "photos" });
    sec.photos.forEach(function (p, i) {
      grid.appendChild(h("figure", { class: "photo", "data-i": i },
        h("img", { src: resolveImg(p), alt: "", loading: "lazy" }),
        h("span", { class: "num" }, i + 1),
        h("div", { class: "photo__bar" },
          h("button", { class: "mini", title: "Mover antes", onclick: function () { if (i > 0) { reorder(sec.photos, i, i - 1); markDirty(); render(); } } }, icon("chevron-left")),
          h("div", { style: { display: "flex", gap: "4px" } },
            h("button", { class: "mini", title: "Mover después", onclick: function () { if (i < sec.photos.length - 1) { reorder(sec.photos, i, i + 1); markDirty(); render(); } } }, icon("chevron-right")),
            h("button", { class: "mini del", title: "Eliminar foto", onclick: function () { sec.photos.splice(i, 1); markDirty(); render(); } }, icon("trash"))))));
    });
    grid.appendChild(h("div", { class: "photo add", onclick: function () { pickImage(function (url) { sec.photos.push(url); markDirty(); render(); }); } }, icon("upload")));
    return grid;
  }

  /* ---------- secciones ---------- */
  function addSection(type) {
    var base = { id: type + "-" + (data.sections.length + 1), type: type, nav: blank(), title: blank(), desc: blank() };
    if (type === "video") base.groups = [{ title: blank(), meta: blank(), feature: false, videos: [] }];
    else { base.photos = []; base.videos = []; }
    data.sections.push(base); activeSection = data.sections.length - 1; current = "sections"; markDirty(); render();
  }
  function sectionEditor(sec) {
    var box = h("div", { class: "subtle" });
    box.appendChild(i18nField(sec.nav, "Nombre en el menú"));
    box.appendChild(i18nField(sec.title, "Título", { hint: "puedes poner parte en cursiva con <i>texto</i>" }));
    box.appendChild(i18nField(sec.desc, "Descripción", { textarea: true, rows: 3 }));
    box.appendChild(textField(sec, "id", "ID (aparece en la URL)", { hint: "minúsculas, números y guiones" }));
    if (sec.type === "video") {
      box.appendChild(h("div", { class: "flabel", style: { marginTop: "12px" } }, "Grupos de vídeos"));
      box.appendChild(groupsEditor(sec));
    } else {
      box.appendChild(h("div", { class: "flabel", style: { marginTop: "12px" } }, "Fotos (arrastra o usa las flechas para ordenar)"));
      var grid = photoGrid(sec); box.appendChild(grid);
      setTimeout(function () { enableDrag(grid, sec.photos); }, 0);
      box.appendChild(h("div", { class: "flabel", style: { marginTop: "14px" } }, "Vídeos de YouTube (opcional, se muestran encima de las fotos)"));
      box.appendChild(videosEditor(sec.videos));
    }
    return box;
  }

  /* ---------- pantallas ---------- */
  function screenHero() {
    var f = frag();
    f.appendChild(screenHead("Portada", "La gran foto de inicio y el texto de bienvenida."));
    f.appendChild(langBar());
    f.appendChild(imageField("Foto principal", data.hero, "image"));
    f.appendChild(i18nField(data.hero.eyebrow, "Antetítulo"));
    f.appendChild(i18nField(data.hero.lede, "Texto de introducción", { textarea: true, rows: 3 }));
    f.appendChild(i18nField(data.hero.caption, "Pie de foto"));
    return f;
  }
  function screenSections() {
    var f = frag();
    f.appendChild(screenHead("Secciones", "Arrastra o usa las flechas para reordenar. Pulsa una para editarla.",
      h("div", { class: "row", style: { flex: "0 0 auto" } },
        h("button", { class: "btn ghost sm", type: "button", onclick: function () { addSection("gallery"); } }, icon("camera"), " Galería"),
        h("button", { class: "btn ghost sm", type: "button", onclick: function () { addSection("video"); } }, icon("video"), " Audiovisual"))));
    f.appendChild(langBar());
    var list = h("div", {});
    if (!data.sections.length) list.appendChild(h("div", { class: "empty" }, "No hay secciones todavía."));
    data.sections.forEach(function (sec, i) {
      var open = activeSection === i;
      var card = h("div", { class: "card" + (open ? " active" : ""), "data-i": i });
      card.appendChild(h("div", { class: "card__head" },
        h("i", { class: "ti ti-grip-vertical grip", "aria-hidden": "true" }),
        icon(sec.type === "video" ? "video" : "camera"),
        h("button", { class: "card__title", style: { border: 0, background: "none", font: "inherit", textAlign: "left", cursor: "pointer", padding: 0 }, onclick: function () { activeSection = open ? -1 : i; render(); } },
          tr(sec.nav) || "(sin nombre)"),
        h("span", { class: "badge" }, sec.type === "video" ? "Audiovisual" : "Galería"),
        upBtn(data.sections, i), downBtn(data.sections, i),
        delBtn(data.sections, i, "¿Eliminar esta sección entera?"),
        h("button", { class: "iconbtn", title: open ? "Cerrar" : "Editar", onclick: function () { activeSection = open ? -1 : i; render(); } }, icon(open ? "chevron-up" : "edit"))));
      if (open) card.appendChild(sectionEditor(sec));
      list.appendChild(card);
    });
    f.appendChild(list);
    setTimeout(function () { enableDrag(list, data.sections); }, 0);
    return f;
  }
  function screenAbout() {
    var f = frag();
    f.appendChild(screenHead("Sobre mí", "Tu foto, tu biografía y los servicios."));
    f.appendChild(langBar());
    f.appendChild(imageField("Foto", data.about, "image"));
    f.appendChild(i18nField(data.about.title, "Título", { hint: "admite <i>cursiva</i>" }));
    f.appendChild(i18nField(data.about.p1, "Párrafo 1", { textarea: true, rows: 4, hint: "admite <strong>negrita</strong>" }));
    f.appendChild(i18nField(data.about.p2, "Párrafo 2", { textarea: true, rows: 4 }));
    f.appendChild(h("div", { class: "flabel", style: { marginTop: "8px" } }, "Etiquetas de servicios (" + lang.toUpperCase() + ")"));
    f.appendChild(stringListEditor(data.about.chips[lang]));
    return f;
  }
  function stringListEditor(arr) {
    var box = h("div", { class: "chips" });
    arr.forEach(function (s, i) {
      var inp = h("input", { type: "text" }); inp.value = s;
      inp.addEventListener("input", function () { arr[i] = inp.value; markDirty(); });
      box.appendChild(h("div", { class: "chip" }, inp, upBtn(arr, i), downBtn(arr, i), delBtn(arr, i)));
    });
    box.appendChild(h("button", { class: "btn ghost sm", type: "button", style: { marginTop: "4px", alignSelf: "flex-start" }, onclick: function () { arr.push(""); markDirty(); render(); } }, icon("plus"), " Añadir etiqueta"));
    return box;
  }
  function screenContact() {
    var f = frag();
    f.appendChild(screenHead("Contacto", "El titular de la sección final."));
    f.appendChild(langBar());
    f.appendChild(i18nField(data.contact.title, "Título", { textarea: true, rows: 2, hint: "admite <br> para salto de línea y <i>cursiva</i>" }));
    return f;
  }
  function screenSite() {
    var f = frag();
    f.appendChild(screenHead("Redes y datos", "Email y redes sociales (iguales en los tres idiomas)."));
    f.appendChild(textField(data.site, "name", "Nombre"));
    f.appendChild(textField(data.site, "email", "Email", { type: "email" }));
    f.appendChild(textField(data.site, "instagram", "Instagram (enlace)", { hint: "https://…" }));
    f.appendChild(textField(data.site, "instagramHandle", "Instagram (@usuario)"));
    f.appendChild(textField(data.site, "linkedin", "LinkedIn (enlace)", { hint: "https://…" }));
    f.appendChild(textField(data.site, "linkedinLabel", "LinkedIn (texto que se ve)"));
    return f;
  }
  function screenUi() {
    var f = frag();
    f.appendChild(screenHead("Textos web", "Botones, menú y pie de página, en cada idioma."));
    f.appendChild(langBar());
    var box = h("div", {});
    UI_KEYS.forEach(function (u) { box.appendChild(textField(data.ui[lang], u.key, u.label)); });
    f.appendChild(box);
    return f;
  }

  var SCREENS = { hero: screenHero, sections: screenSections, about: screenAbout, contact: screenContact, site: screenSite, ui: screenUi };

  function render() {
    if (!data) return;
    $$("#side .navit").forEach(function (b) { b.classList.toggle("on", b.dataset.screen === current); });
    var host = $("#screen"); host.innerHTML = "";
    host.appendChild(SCREENS[current]());
  }

  /* ---------- normalización (evita huecos en el contenido) ---------- */
  function normalize(d) {
    d.site = d.site || {}; d.hero = d.hero || {}; d.about = d.about || {}; d.contact = d.contact || {}; d.ui = d.ui || {};
    d.sections = Array.isArray(d.sections) ? d.sections : [];
    ["eyebrow", "lede", "caption"].forEach(function (k) { d.hero[k] = ensure(d.hero[k]); });
    d.hero.image = d.hero.image || "";
    ["title", "p1", "p2"].forEach(function (k) { d.about[k] = ensure(d.about[k]); });
    d.about.image = d.about.image || "";
    d.about.chips = d.about.chips || {};
    LANGS.forEach(function (l) { if (!Array.isArray(d.about.chips[l])) d.about.chips[l] = []; });
    d.contact.title = ensure(d.contact.title);
    LANGS.forEach(function (l) { d.ui[l] = d.ui[l] || {}; UI_KEYS.forEach(function (u) { if (d.ui[l][u.key] == null) d.ui[l][u.key] = ""; }); });
    d.sections.forEach(function (sec) {
      sec.nav = ensure(sec.nav); sec.title = ensure(sec.title); sec.desc = ensure(sec.desc);
      if (sec.type === "video") {
        sec.groups = Array.isArray(sec.groups) ? sec.groups : [];
        sec.groups.forEach(function (g) { g.title = ensure(g.title); g.meta = ensure(g.meta); g.videos = Array.isArray(g.videos) ? g.videos : []; });
      } else {
        sec.photos = Array.isArray(sec.photos) ? sec.photos : [];
        sec.videos = Array.isArray(sec.videos) ? sec.videos : [];
      }
    });
  }

  /* ---------- sesión ---------- */
  function showLogin() { $("#app").classList.add("hidden"); $("#login").classList.remove("hidden"); var p = $("#pass"); if (p) p.focus(); }
  async function start() {
    $("#login").classList.add("hidden"); $("#app").classList.remove("hidden");
    try { data = await apiJSON("/api/content", "GET"); normalize(data); markClean(); render(); }
    catch (e) { toast(e.message || "No se pudo cargar el contenido", "err"); }
  }
  async function boot() {
    try { var s = await apiJSON("/api/login", "GET"); if (s.auth) return start(); } catch (e) {}
    showLogin();
  }

  /* ---------- arranque ---------- */
  document.addEventListener("DOMContentLoaded", function () {
    $("#loginForm").addEventListener("submit", async function (e) {
      e.preventDefault();
      var err = $("#loginErr"); err.textContent = ""; var btn = $("#loginBtn"); btn.disabled = true;
      try { await apiJSON("/api/login", "POST", { password: $("#pass").value }); $("#pass").value = ""; await start(); }
      catch (ex) { err.textContent = ex.message || "No se pudo entrar"; }
      finally { btn.disabled = false; }
    });
    $("#saveBtn").addEventListener("click", save);
    $("#logoutBtn").addEventListener("click", async function () {
      try { await apiJSON("/api/logout", "POST", {}); } catch (e) {}
      data = null; dirty = false; showLogin();
    });
    $$("#side .navit").forEach(function (b) {
      b.addEventListener("click", function () { current = b.dataset.screen; activeSection = -1; render(); });
    });
    document.addEventListener("keydown", function (e) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") { e.preventDefault(); save(); }
    });
    window.addEventListener("beforeunload", function (e) { if (dirty) { e.preventDefault(); e.returnValue = ""; } });
    boot();
  });
})();
