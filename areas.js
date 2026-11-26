// Áreas del consultorio: pestañas con píldora, cambio de área con barrido de color,
// bienvenida de cristal (inicio) y utilidades de las páginas de área
(function () {
  var WA_NUMBER = "5212215755446";
  var COLORS = { todos: "#08418b", nutri: "#17794f", psi: "#b8326c" };
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var finePointer = window.matchMedia("(pointer: fine)").matches;
  var isAreaPage = document.body.classList.contains("ar");

  function areaOf(href) {
    if (!href) return null;
    if (/nutricion\/?(#.*)?$/.test(href)) return "nutri";
    if (/psicologia\/?(#.*)?$/.test(href)) return "psi";
    if (href === "./" || href === "/" || href === "index.html") return "todos";
    return null;
  }

  // ---------- Páginas de área ----------
  if (isAreaPage) {
    // Quien ya eligió un área no vuelve a ver la bienvenida al ir a "Todos"
    try { sessionStorage.setItem("nutre-area", "1"); } catch (e) {}

    document.querySelectorAll(".js-wa").forEach(function (link) {
      var msg = link.getAttribute("data-wa-msg") || "Hola, quiero agendar una consulta";
      link.href = "https://wa.me/" + WA_NUMBER + "?text=" + encodeURIComponent(msg);
    });
    document.querySelectorAll(".js-year").forEach(function (n) { n.textContent = new Date().getFullYear(); });

    var items = document.querySelectorAll(".rv");
    if (!("IntersectionObserver" in window)) {
      items.forEach(function (el) { el.classList.add("in"); });
    } else {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
      }, { threshold: 0.15, rootMargin: "0px 0px -40px 0px" });
      items.forEach(function (el) { io.observe(el); });
    }

    // Barra de avance de lectura
    var bar = document.createElement("div");
    bar.className = "ar-progress";
    bar.setAttribute("aria-hidden", "true");
    document.body.appendChild(bar);
    var ticking = false;
    function progress() {
      var max = document.documentElement.scrollHeight - innerHeight;
      bar.style.setProperty("--p", max > 0 ? Math.min(1, scrollY / max).toFixed(4) : 0);
      ticking = false;
    }
    // ---------- Barra flotante de cristal (aparece al dejar el hero) ----------
    var hero = document.querySelector(".ar-hero");
    var topTabs = document.querySelector(".ar-top .area-tabs");
    var dock = null;
    if (hero && topTabs) {
      dock = document.createElement("div");
      dock.className = "ar-dock";
      dock.inert = true;
      var brand = document.querySelector(".ar-top .brand");
      var cta = document.querySelector(".ar-top-cta");
      dock.innerHTML =
        '<a class="dock-brand" href="./" aria-label="Nutre Mente & Cuerpo, inicio">' + brand.querySelector("svg").outerHTML + "Nutre</a>";
      dock.appendChild(topTabs.cloneNode(true));
      if (cta) {
        var c = document.createElement("a");
        c.className = "dock-cta";
        c.href = cta.href;
        c.target = "_blank";
        c.rel = "noreferrer";
        c.textContent = "Agendar";
        dock.appendChild(c);
      }
      document.body.appendChild(dock);
    }

    // ---------- Frase que se ilumina palabra por palabra ----------
    var statement = document.querySelector(".ar-statement p");
    var words = [];
    if (statement) {
      (function split(node) {
        Array.prototype.slice.call(node.childNodes).forEach(function (n) {
          if (n.nodeType === 3) {
            var frag = document.createDocumentFragment();
            n.textContent.split(/(\s+)/).forEach(function (part) {
              if (!part) return;
              if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
              var w = document.createElement("span");
              w.className = "w";
              w.textContent = part;
              frag.appendChild(w);
              words.push(w);
            });
            n.parentNode.replaceChild(frag, n);
          } else if (n.nodeType === 1) split(n);
        });
      })(statement);
    }

    var personImgs = Array.prototype.slice.call(document.querySelectorAll(".ar-person-img"));

    function onScroll() {
      var vh = innerHeight;
      // Profundidad del hero: el contenido se aleja al bajar
      if (hero && !reduceMotion) {
        var hh = hero.offsetHeight;
        hero.style.setProperty("--hp", Math.max(0, Math.min(1, scrollY / hh)).toFixed(3));
      }
      if (dock) {
        var show = scrollY > hero.offsetHeight - 80;
        if (show !== dock.classList.contains("show")) {
          dock.classList.toggle("show", show);
          dock.inert = !show;
          if (show) window.dispatchEvent(new Event("resize")); // coloca la píldora ya visible
        }
      }
      if (words.length) {
        var r = statement.getBoundingClientRect();
        var p = (vh * 0.85 - r.top) / (r.height + vh * 0.35);
        var lit = Math.round(Math.max(0, Math.min(1, p)) * words.length);
        for (var i = 0; i < words.length; i++) words[i].classList.toggle("lit", i < lit);
      }
      if (!reduceMotion) {
        personImgs.forEach(function (box) {
          var b = box.getBoundingClientRect();
          if (b.bottom < 0 || b.top > vh) return;
          var t = (b.top + b.height / 2 - vh / 2) / vh; // -1..1
          box.style.setProperty("--pp", (t * -28).toFixed(1));
        });
      }
    }
    var sTick = false;
    addEventListener("scroll", function () {
      if (!ticking) { ticking = true; requestAnimationFrame(progress); }
      if (!sTick) { sTick = true; requestAnimationFrame(function () { sTick = false; onScroll(); }); }
    }, { passive: true });
    addEventListener("resize", onScroll);
    progress();
    onScroll();

    // Brillo de las tarjetas siguiendo el cursor
    if (finePointer) {
      document.querySelectorAll(".ar-card").forEach(function (card) {
        card.addEventListener("pointermove", function (e) {
          var r = card.getBoundingClientRect();
          card.style.setProperty("--mx", (e.clientX - r.left) + "px");
          card.style.setProperty("--my", (e.clientY - r.top) + "px");
        });
      });
    }
  }

  // ---------- Pestañas con píldora deslizante ----------
  document.querySelectorAll(".area-tabs").forEach(function (nav) {
    var links = Array.prototype.slice.call(nav.querySelectorAll("a"));
    var current = nav.querySelector('[aria-current="page"]') || links[0];
    var pill = document.createElement("span");
    pill.className = "area-pill";
    pill.setAttribute("aria-hidden", "true");
    nav.insertBefore(pill, nav.firstChild);
    nav.classList.add("has-pill", "no-anim");

    links.forEach(function (a) { a.style.setProperty("--tc", COLORS[areaOf(a.getAttribute("href"))] || COLORS.todos); });

    function moveTo(a) {
      if (!a.offsetWidth) return;
      links.forEach(function (l) { l.classList.toggle("is-on", l === a); });
      nav.style.setProperty("--px", a.offsetLeft - 5 + "px");
      nav.style.setProperty("--pw", a.offsetWidth + "px");
      pill.style.setProperty("--tc", a.style.getPropertyValue("--tc"));
      pill.style.left = "5px";
    }
    moveTo(current);
    requestAnimationFrame(function () { requestAnimationFrame(function () { nav.classList.remove("no-anim"); }); });

    links.forEach(function (a) {
      a.addEventListener("mouseenter", function () { moveTo(a); });
      a.addEventListener("focus", function () { moveTo(a); });
      a.addEventListener("click", function () { current = a; moveTo(a); });
    });
    nav.addEventListener("mouseleave", function () { moveTo(current); });
    nav.addEventListener("focusout", function (e) { if (!nav.contains(e.relatedTarget)) moveTo(current); });
    addEventListener("resize", function () { nav.classList.add("no-anim"); moveTo(current); requestAnimationFrame(function () { nav.classList.remove("no-anim"); }); });
    // Al volver con "atrás", la píldora regresa a su pestaña
    addEventListener("pageshow", function () { current = nav.querySelector('[aria-current="page"]') || links[0]; moveTo(current); });
  });

  // ---------- Cambio de área con barrido de color ----------
  var wipe = null;
  function goTo(href, area, x, y) {
    if (reduceMotion) { location.href = href; return; }
    if (!wipe) {
      wipe = document.createElement("div");
      wipe.className = "area-wipe";
      wipe.setAttribute("aria-hidden", "true");
      document.body.appendChild(wipe);
    }
    wipe.classList.remove("go");
    wipe.style.setProperty("--wc", COLORS[area]);
    wipe.style.setProperty("--wx", x + "px");
    wipe.style.setProperty("--wy", y + "px");
    void wipe.offsetWidth;
    wipe.classList.add("go");
    setTimeout(function () { location.href = href; }, 560);
  }
  addEventListener("pageshow", function () { if (wipe) wipe.classList.remove("go"); });

  document.addEventListener("click", function (e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target.closest && e.target.closest("a[href]");
    if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
    var href = a.getAttribute("href");
    var area = areaOf(href);
    if (!area || a.getAttribute("aria-current") === "page" || href.indexOf("#") !== -1) return;
    e.preventDefault();
    var r = a.getBoundingClientRect();
    var x = e.clientX || r.left + r.width / 2;
    var y = e.clientY || r.top + r.height / 2;
    try { sessionStorage.setItem("nutre-area", "1"); } catch (err) {}
    goTo(a.href, area, x, y);
  });

  // Carga anticipada de las otras áreas al pasar el cursor (navegadores sin speculation rules)
  if (!(HTMLScriptElement.supports && HTMLScriptElement.supports("speculationrules"))) {
    var done = {};
    document.addEventListener("pointerover", function (e) {
      var a = e.target.closest && e.target.closest("a[href]");
      if (!a || !areaOf(a.getAttribute("href")) || done[a.href]) return;
      done[a.href] = true;
      var l = document.createElement("link");
      l.rel = "prefetch";
      l.href = a.href;
      document.head.appendChild(l);
    });
  }

  // ---------- Bienvenida de cristal: ¿qué área buscas? ----------
  var gate = document.querySelector(".area-gate");
  if (!gate) return;

  // Tarjetas que se inclinan y brillan siguiendo el cursor
  if (finePointer && !reduceMotion) {
    gate.querySelectorAll(".gate-card").forEach(function (card) {
      card.addEventListener("pointermove", function (e) {
        var r = card.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width;
        var py = (e.clientY - r.top) / r.height;
        card.classList.add("is-tilting");
        card.style.setProperty("--ry", ((px - 0.5) * 10).toFixed(2) + "deg");
        card.style.setProperty("--rx", ((0.5 - py) * 8).toFixed(2) + "deg");
        card.style.setProperty("--mx", (px * 100).toFixed(1) + "%");
        card.style.setProperty("--my", (py * 100).toFixed(1) + "%");
      });
      card.addEventListener("pointerleave", function () {
        card.classList.remove("is-tilting");
        card.style.setProperty("--rx", "0deg");
        card.style.setProperty("--ry", "0deg");
      });
    });
  }

  var KEY = "nutre-area";
  var params = new URLSearchParams(location.search);
  var seen = false;
  try { seen = !!sessionStorage.getItem(KEY); } catch (e) {}
  // Se muestra una vez por visita; ?elegir la vuelve a abrir. Con un #ancla se entra directo.
  var force = params.has("elegir");
  if ((seen || location.hash) && !force) return;

  var root = document.documentElement;
  var backdrop = Array.prototype.slice.call(document.querySelectorAll("main, .topbar, .wa-float"));
  var lastFocus = null;

  function remember() { try { sessionStorage.setItem(KEY, "1"); } catch (e) {} }

  function open() {
    lastFocus = document.activeElement;
    gate.hidden = false;
    gate.classList.add("open");
    root.style.overflow = "hidden";
    backdrop.forEach(function (el) { el.inert = true; });
    var first = gate.querySelector(".gate-card");
    if (first) first.focus({ preventScroll: true });
  }

  function close() {
    remember();
    gate.classList.add("closing");
    backdrop.forEach(function (el) { el.inert = false; });
    setTimeout(function () {
      gate.classList.remove("open", "closing");
      gate.hidden = true;
      root.style.overflow = "";
      if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
    }, 520);
  }

  gate.querySelectorAll("[data-gate-close]").forEach(function (btn) {
    btn.addEventListener("click", function (e) { e.preventDefault(); close(); });
  });
  gate.addEventListener("keydown", function (e) { if (e.key === "Escape") close(); });

  // Si está la pantalla de carga, se espera a que termine
  var wait = root.classList.contains("is-loading") ? 2300 : 0;
  setTimeout(open, wait);
})();
