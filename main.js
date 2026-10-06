const WA_NUMBER = "522203199662";
const WA_DEFAULT_MSG = "Hola, quiero agendar una consulta";
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const finePointer = window.matchMedia("(pointer: fine)").matches;

// ---------- Pantalla de carga ----------
const introShown = document.documentElement.classList.contains("is-loading");
const introDelay = introShown ? 1.5 : 0; // segundos que esperan las entradas del hero
if (introShown) {
  const root = document.documentElement;
  setTimeout(() => root.classList.add("loader-out"), 1150);
  setTimeout(() => {
    root.classList.remove("is-loading", "loader-out");
    try {
      sessionStorage.setItem("nutre-intro", "1");
    } catch (e) {}
  }, 2300);
}

document.querySelectorAll(".js-wa").forEach((link) => {
  const msg = link.dataset.waMsg || WA_DEFAULT_MSG;
  link.href = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(msg)}`;
});

document.querySelectorAll(".js-year").forEach((node) => {
  node.textContent = new Date().getFullYear();
});

// ---------- Scroll suave (sensación de trackpad) ----------
let lenis = null;
const hasGsap = !!(window.gsap && window.ScrollTrigger);

if (!reduceMotion && window.Lenis) {
  lenis = new Lenis({ lerp: 0.09, wheelMultiplier: 1, smoothWheel: true });
  if (hasGsap) {
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
  } else {
    const raf = (time) => {
      lenis.raf(time);
      requestAnimationFrame(raf);
    };
    requestAnimationFrame(raf);
  }
}

document.querySelectorAll('a[href^="#"]').forEach((link) => {
  link.addEventListener("click", (e) => {
    const id = link.getAttribute("href");
    const target = id.length > 1 && document.querySelector(id);
    if (!target) return;
    e.preventDefault();
    if (lenis) lenis.scrollTo(target, { duration: 1.4 });
    else target.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" });
  });
});

// ---------- Menú ----------
const trigger = document.querySelector(".menu-trigger");
const icon = trigger.querySelector("i");
const panel = document.querySelector(".menu-panel");

// El menú se abre desde el centro del botón que lo activa
function anchorMenuToTrigger() {
  const r = icon.getBoundingClientRect();
  panel.style.setProperty("--mx", `${r.left + r.width / 2}px`);
  panel.style.setProperty("--my", `${r.top + r.height / 2}px`);
}

function setMenu(open) {
  anchorMenuToTrigger();
  panel.classList.toggle("open", open);
  icon.classList.toggle("active", open);
  document.body.classList.toggle("menu-open", open);
  trigger.setAttribute("aria-expanded", String(open));
  trigger.setAttribute("aria-label", open ? "Cerrar menú" : "Abrir menú");
  if (lenis) open ? lenis.stop() : lenis.start();
  // Con el menú abierto, el teclado no puede llegar al contenido de atrás
  document.querySelectorAll("main, .wa-float").forEach((el) => (el.inert = open));
  if (open) panel.querySelector("a")?.focus({ preventScroll: true });
  else if (document.activeElement && panel.contains(document.activeElement)) trigger.focus({ preventScroll: true });
}

trigger.addEventListener("click", () => setMenu(!panel.classList.contains("open")));
panel.querySelectorAll("a").forEach((link) => link.addEventListener("click", () => setMenu(false)));
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") setMenu(false);
});

// ---------- Barra superior flotante ----------
// Se vuelve material translúcido al salir del hero, se esconde al bajar y regresa al subir.
const topbar = document.querySelector(".topbar");
const hero = document.querySelector(".hero");
let lastY = window.scrollY;
let ticking = false;

function updateTopbar() {
  const y = window.scrollY;
  const heroEnd = (hero ? hero.offsetHeight : 600) * 0.85;
  const floating = y > heroEnd;
  topbar.classList.toggle("is-floating", floating);
  const delta = y - lastY;
  if (Math.abs(delta) > 6) {
    // umbral pequeño para no parpadear con movimientos mínimos
    topbar.classList.toggle("is-hidden", floating && delta > 0 && !reduceMotion);
    lastY = y;
  }
  if (!floating) topbar.classList.remove("is-hidden");
  ticking = false;
}
window.addEventListener(
  "scroll",
  () => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(updateTopbar);
    }
  },
  { passive: true },
);
updateTopbar();

// ---------- WhatsApp flotante ----------
// Se retira en el hero (escritorio) y en el contacto, donde ya hay botones de WhatsApp a la vista.
const waFloat = document.querySelector(".wa-float");
const contact = document.querySelector(".contact");
if (waFloat && "IntersectionObserver" in window) {
  const wide = window.matchMedia("(min-width: 621px)");
  const away = { hero: false, contact: false };
  const sync = () => waFloat.classList.toggle("is-away", (away.hero && wide.matches) || away.contact);
  if (hero) new IntersectionObserver(([e]) => { away.hero = e.intersectionRatio > 0.35; sync(); }, { threshold: [0, 0.35, 1] }).observe(hero);
  if (contact) new IntersectionObserver(([e]) => { away.contact = e.isIntersecting; sync(); }, { rootMargin: "0px 0px -35% 0px" }).observe(contact);
  wide.addEventListener("change", sync);
}

// Al enfocar con teclado, la barra siempre reaparece
topbar.addEventListener("focusin", () => topbar.classList.remove("is-hidden"));

// iOS solo aplica :active (respuesta al presionar) si hay un listener táctil
document.addEventListener("touchstart", () => {}, { passive: true });

// Solo una pregunta frecuente abierta a la vez
const faqItems = document.querySelectorAll(".faq-item");
faqItems.forEach((item) =>
  item.addEventListener("toggle", () => {
    if (item.open) faqItems.forEach((other) => other !== item && (other.open = false));
    if (hasGsap) ScrollTrigger.refresh();
  }),
);

// ---------- Animaciones ----------
// Un solo momento orquestado: la entrada del título principal
const splitTargets = []; // el título del hero ahora entra con el efecto de enfoque

// Envuelve cada palabra en una máscara para animarla desde abajo
function splitWords(el) {
  const walk = (node) => {
    [...node.childNodes].forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE) {
        const parts = child.textContent.split(/(\s+)/);
        const frag = document.createDocumentFragment();
        parts.forEach((part) => {
          if (!part) return;
          if (/^\s+$/.test(part)) {
            frag.appendChild(document.createTextNode(" "));
          } else {
            const w = document.createElement("span");
            w.className = "w";
            const wi = document.createElement("span");
            wi.className = "wi";
            wi.textContent = part;
            w.appendChild(wi);
            frag.appendChild(w);
          }
        });
        child.replaceWith(frag);
      } else if (child.nodeType === Node.ELEMENT_NODE && child.tagName !== "BR") {
        walk(child);
      }
    });
  };
  walk(el);
  return el.querySelectorAll(".wi");
}

if (hasGsap && !reduceMotion) {
  gsap.registerPlugin(ScrollTrigger);
  document.documentElement.classList.add("motion");

  splitTargets.forEach((selector) => {
    document.querySelectorAll(selector).forEach((el) => {
      const words = splitWords(el);
      // el título deja de usar el fade simple: ahora entra palabra por palabra
      el.classList.remove("reveal");
      const isHero = el.classList.contains("hero-title");
      gsap.from(words, {
        yPercent: 115,
        rotate: 4,
        duration: 1.2,
        ease: "expo.out",
        stagger: 0.045,
        delay: isHero ? 0.25 : 0,
        scrollTrigger: isHero ? undefined : { trigger: el, start: "top 88%" },
      });
    });
  });

  // Entrada del hero
  gsap.from(".hero-kicker, .hero-bottom", { y: 30, opacity: 0, duration: 1.2, ease: "expo.out", delay: 0.6 + introDelay, stagger: 0.12 });
  gsap.from(".topbar", { y: -30, opacity: 0, duration: 1, ease: "expo.out", delay: 0.2 + introDelay });

  // El texto del hero se aleja al hacer scroll
  gsap.to(".hero-content", {
    yPercent: -14,
    opacity: 0.15,
    ease: "none",
    scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true },
  });

  // Parallax de la imagen
  gsap.fromTo(
    ".manifesto-image img",
    { yPercent: -3, scale: 1.07 },
    { yPercent: 3, scale: 1.07, ease: "none", scrollTrigger: { trigger: ".manifesto", start: "top bottom", end: "bottom top", scrub: true } },
  );

  // "Hablemos" se desliza
  gsap.fromTo(
    ".contact-watermark",
    { xPercent: 6 },
    { xPercent: -14, ease: "none", scrollTrigger: { trigger: ".contact", start: "top bottom", end: "bottom bottom", scrub: true } },
  );

  // Las fotos de los especialistas suben un poco al hacer scroll
  document.querySelectorAll(".person-visual > img").forEach((img) => {
    gsap.fromTo(
      img,
      { yPercent: 8 },
      { yPercent: -2, ease: "none", scrollTrigger: { trigger: img.closest(".person"), start: "top bottom", end: "bottom top", scrub: true } },
    );
  });

  // Inclinación 3D de las tarjetas del equipo
  if (finePointer) {
    // Botones magnéticos
    document.querySelectorAll(".pill-link, .wa-float, .circle-link").forEach((btn) => {
      // quickTo re-dirige desde el valor actual: interrumpible, nunca salta
      const x = gsap.quickTo(btn, "x", { duration: 0.6, ease: "expo.out" });
      const y = gsap.quickTo(btn, "y", { duration: 0.6, ease: "expo.out" });
      btn.addEventListener("pointermove", (e) => {
        const r = btn.getBoundingClientRect();
        x((e.clientX - (r.left + r.width / 2)) * 0.2);
        y((e.clientY - (r.top + r.height / 2)) * 0.2);
      });
      btn.addEventListener("pointerleave", () => {
        x(0);
        y(0);
      });
    });
  }

  window.addEventListener("load", () => ScrollTrigger.refresh());
}

// Aparición suave del resto de elementos
const observer = new IntersectionObserver(
  (entries) =>
    entries.forEach((entry) => {
      if (entry.isIntersecting) entry.target.classList.add("visible");
    }),
  { threshold: 0.15 },
);
document.querySelectorAll(".reveal").forEach((node) => observer.observe(node));

// ---------- Momento estrella: mente y cuerpo se unen ----------
// La sección se queda fija; al bajar, los dos bloques se juntan y se funden en verde bosque.
// Va ligada al scroll (no al tiempo): si el usuario sube, la animación se rebobina.
const fusion = document.querySelector(".fusion");
if (fusion && !reduceMotion) {
  fusion.classList.add("is-pinned");
  const mind = fusion.querySelector(".fusion-mind");
  const body = fusion.querySelector(".fusion-body");
  const mindWord = mind.querySelector("span");
  const bodyWord = body.querySelector("span");
  const labels = fusion.querySelectorAll(".fusion-half small");
  const core = fusion.querySelector(".fusion-core");
  const words = [...splitWords(fusion.querySelector(".fusion-title"))];
  const extras = fusion.querySelectorAll(".fusion-core p, .fusion-core .pill-link");

  const clamp = (v) => Math.min(1, Math.max(0, v));
  const range = (p, a, b) => clamp((p - a) / (b - a));
  const inOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
  const out = (t) => 1 - Math.pow(1 - t, 3);
  const lerp = (a, b, t) => a + (b - a) * t;

  let queued = false;
  function render() {
    queued = false;
    const rect = fusion.getBoundingClientRect();
    const total = fusion.offsetHeight - window.innerHeight;
    const p = clamp(-rect.top / total);

    // 1) Los bloques se acercan desde los lados y crecen hasta tocarse
    const join = inOut(range(p, 0, 0.45));
    const gap = window.innerWidth < 620 ? 16 : 30; // en celular se separan menos para que las palabras no se corten
    const radius = lerp(48, 0, join);
    mind.style.transform = `translateX(${lerp(-gap, 0, join)}%) scale(${lerp(0.8, 1, join)})`;
    body.style.transform = `translateX(${lerp(gap, 0, join)}%) scale(${lerp(0.8, 1, join)})`;
    mind.style.borderRadius = `${radius}px`;
    body.style.borderRadius = `${radius}px`;
    mindWord.style.transform = `translateX(${lerp(0, 10, join)}%)`;
    bodyWord.style.transform = `translateX(${lerp(0, -10, join)}%)`;
    labels.forEach((l) => (l.style.opacity = 1 - range(p, 0.25, 0.4)));

    // 2) Del punto donde se tocan nace el verde bosque
    const grow = range(p, 0.42, 0.64);
    core.style.clipPath = `circle(${(grow * grow * 75).toFixed(2)}% at 50% 50%)`;

    // 3) La frase entra palabra por palabra, luego el texto y el botón
    words.forEach((w, i) => {
      const t = out(range(p, 0.6 + i * 0.012, 0.72 + i * 0.012));
      w.style.transform = `translateY(${lerp(115, 0, t)}%)`;
    });
    extras.forEach((el, i) => {
      const t = out(range(p, 0.78 + i * 0.05, 0.9 + i * 0.05));
      el.style.opacity = t;
      el.style.translate = `0 ${lerp(24, 0, t)}px`;
    });
  }
  const request = () => {
    if (!queued) {
      queued = true;
      requestAnimationFrame(render);
    }
  };
  window.addEventListener("scroll", request, { passive: true });
  window.addEventListener("resize", request);
  render();
}

// =========================================================
// Ideas del TikTok (QClay) adaptadas
// =========================================================

// ---- Títulos que pasan de borrosos a nítidos ----
function splitFocus(el) {
  let i = 0;
  const walk = (node) => {
    [...node.childNodes].forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE) {
        const frag = document.createDocumentFragment();
        child.textContent.split(/(\s+)/).forEach((part) => {
          if (!part) return;
          if (/^\s+$/.test(part)) return frag.appendChild(document.createTextNode(" "));
          const w = document.createElement("span");
          w.className = "fw";
          w.style.setProperty("--i", i++);
          w.textContent = part;
          frag.appendChild(w);
        });
        child.replaceWith(frag);
      } else if (child.nodeType === Node.ELEMENT_NODE && child.tagName !== "BR") {
        walk(child);
      }
    });
  };
  walk(el);
}

if (!reduceMotion && "IntersectionObserver" in window) {
  const focusObserver = new IntersectionObserver(
    (entries) =>
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-focused");
          focusObserver.unobserve(entry.target);
        }
      }),
    { threshold: 0.35 },
  );
  document.querySelectorAll(".focus-title").forEach((el) => {
    splitFocus(el);
    el.classList.add("focus-ready");
    if (el.classList.contains("hero-title")) {
      setTimeout(() => el.classList.add("is-focused"), 250 + introDelay * 1000);
    } else {
      focusObserver.observe(el);
    }
  });
}

// ---- Fotos flotantes del hero ----
const heroSection = document.querySelector(".hero");
const floats = [...document.querySelectorAll(".hero-floats .float")];
if (heroSection && floats.length) {
  setTimeout(() => heroSection.classList.add("floats-in"), 300);

  if (!reduceMotion) {
    // El mouse las mueve un poco (cada una según su profundidad) y al bajar se van más rápido que el texto
    let tx = 0, ty = 0, cx = 0, cy = 0;
    if (finePointer) {
      heroSection.addEventListener("pointermove", (e) => {
        tx = e.clientX / window.innerWidth - 0.5;
        ty = e.clientY / window.innerHeight - 0.5;
      });
      heroSection.addEventListener("pointerleave", () => (tx = ty = 0));
    }
    const tick = () => {
      // seguimiento suave, críticamente amortiguado (sin rebote)
      cx += (tx - cx) * 0.08;
      cy += (ty - cy) * 0.08;
      const y = Math.min(window.scrollY, window.innerHeight);
      if (y < window.innerHeight) {
        floats.forEach((f) => {
          const d = Number(f.dataset.depth || 1);
          f.style.translate = `${(cx * 40 * d).toFixed(2)}px ${(cy * 30 * d - y * 0.25 * d).toFixed(2)}px`;
        });
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
}

// ---- Bento de principios: los íconos se dibujan al aparecer ----
const bento = document.querySelector(".bento");
if (bento && "IntersectionObserver" in window) {
  const bentoObserver = new IntersectionObserver(
    ([entry]) => {
      if (entry.isIntersecting) {
        bento.classList.add("in-view");
        bentoObserver.disconnect();
      }
    },
    { threshold: 0.3 },
  );
  bentoObserver.observe(bento);
} else if (bento) {
  bento.classList.add("in-view");
}

// ---- Equipo: el fondo toma el color de quien está en pantalla ----
const teamSection = document.querySelector(".team");
const stories = [...document.querySelectorAll(".story")];
if (teamSection && stories.length && "IntersectionObserver" in window) {
  const revealObserver = new IntersectionObserver(
    (entries) =>
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          revealObserver.unobserve(entry.target);
        }
      }),
    { threshold: 0.2 },
  );
  // Banda central de la pantalla: quien la cruza "pinta" el fondo
  const toneObserver = new IntersectionObserver(
    (entries) =>
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          teamSection.dataset.tone = entry.target.dataset.tone;
        } else if (entry.target === stories[0] && entry.boundingClientRect.top > 0) {
          delete teamSection.dataset.tone; // subiste por encima del equipo
        } else if (entry.target === stories[stories.length - 1] && entry.boundingClientRect.top < 0) {
          delete teamSection.dataset.tone; // ya pasaste al equipo
        }
      }),
    { rootMargin: "-45% 0px -45% 0px" },
  );
  stories.forEach((st) => {
    revealObserver.observe(st);
    toneObserver.observe(st);
  });
} else {
  stories.forEach((st) => st.classList.add("is-visible"));
}

// =========================================================
// Servicios en scroll horizontal
// =========================================================
const hs = document.querySelector(".hs");
if (hs && !reduceMotion) {
  const track = hs.querySelector(".hs-track");
  const bar = hs.querySelector(".hs-progress span");
  let distance = 0;
  let queuedHs = false;
  hs.classList.add("is-pinned");

  const measure = () => {
    distance = Math.max(0, track.scrollWidth - window.innerWidth);
    hs.style.height = `${distance + window.innerHeight}px`;
    renderHs();
  };
  function renderHs() {
    queuedHs = false;
    const top = hs.getBoundingClientRect().top;
    const p = distance ? Math.min(1, Math.max(0, -top / distance)) : 0;
    track.style.transform = `translate3d(${(-p * distance).toFixed(1)}px, 0, 0)`;
    if (bar) bar.style.transform = `scaleX(${p})`;
  }
  window.addEventListener("scroll", () => {
    if (!queuedHs) {
      queuedHs = true;
      requestAnimationFrame(renderHs);
    }
  }, { passive: true });
  window.addEventListener("resize", measure);
  window.addEventListener("load", measure);
  measure();

  // Con teclado: al enfocar un panel, el scroll lo trae a la vista
  track.querySelectorAll(".hs-panel").forEach((panelEl, i, all) => {
    panelEl.addEventListener("focus", () => {
      const target = hs.getBoundingClientRect().top + window.scrollY + (distance * i) / Math.max(1, all.length - 1);
      window.scrollTo({ top: target });
    });
  });
}

// =========================================================
// Cursor personalizado (solo con mouse)
// =========================================================
const cursor = document.querySelector(".cursor");
if (cursor && finePointer && !reduceMotion) {
  const ring = cursor.querySelector(".cursor-ring");
  const label = ring.querySelector("em");
  const dot = cursor.querySelector(".cursor-dot");
  let mx = -100, my = -100, rx = -100, ry = -100;
  document.documentElement.classList.add("has-cursor");

  window.addEventListener("pointermove", (e) => {
    mx = e.clientX;
    my = e.clientY;
    cursor.classList.add("is-on");
    dot.style.transform = `translate3d(${mx}px, ${my}px, 0)`; // el punto va pegado al mouse, sin retraso
  }, { passive: true });
  document.addEventListener("pointerleave", () => cursor.classList.remove("is-on"));
  window.addEventListener("blur", () => cursor.classList.remove("is-on"));

  // El aro sigue con suavidad (sin rebote)
  const follow = () => {
    rx += (mx - rx) * 0.2;
    ry += (my - ry) * 0.2;
    ring.style.transform = `translate3d(${rx.toFixed(1)}px, ${ry.toFixed(1)}px, 0)`;
    requestAnimationFrame(follow);
  };
  requestAnimationFrame(follow);

  document.addEventListener("pointerover", (e) => {
    const big = e.target.closest(".hs-panel");
    const link = e.target.closest("a, button, summary, .chip");
    cursor.classList.toggle("is-big", !!big);
    cursor.classList.toggle("is-link", !big && !!link);
    label.textContent = big ? "Agendar" : "";
  });
  document.addEventListener("pointerdown", () => cursor.classList.add("is-down"));
  document.addEventListener("pointerup", () => cursor.classList.remove("is-down"));
}

// =========================================================
// Aviso de cookies: el mapa de Google solo se carga si se acepta
// =========================================================
(() => {
  const KEY = "nutre-cookies"; // "si" | "no"
  const banner = document.querySelector(".cookie-banner");
  const map = document.querySelector(".contact-map iframe");
  const blocked = document.querySelector(".map-blocked");
  const read = () => { try { return localStorage.getItem(KEY); } catch { return null; } };
  const save = (v) => { try { localStorage.setItem(KEY, v); } catch {} };

  function apply(choice) {
    const ok = choice === "si";
    if (map) {
      if (ok && !map.src) map.src = map.dataset.src;
      if (!ok && map.src) map.removeAttribute("src");
      map.hidden = !ok;
    }
    if (blocked) blocked.hidden = ok;
  }
  function show() {
    if (!banner) return;
    banner.hidden = false;
    requestAnimationFrame(() => banner.classList.add("is-in"));
  }
  function hide() {
    if (!banner) return;
    banner.classList.remove("is-in");
    setTimeout(() => (banner.hidden = true), 400);
  }
  function choose(v) {
    save(v);
    apply(v);
    hide();
  }

  apply(read());
  if (!read()) setTimeout(show, document.documentElement.classList.contains("is-loading") ? 2600 : 800);
  document.querySelectorAll(".js-cookie-accept").forEach((b) => b.addEventListener("click", () => choose("si")));
  document.querySelectorAll(".js-cookie-reject").forEach((b) => b.addEventListener("click", () => choose("no")));
  document.querySelectorAll(".js-cookie-open").forEach((b) => b.addEventListener("click", show));
})();

// =========================================================
// Portada: mente y cuerpo se acercan al cargar y se funden al bajar
// Todo sale del valor actual en cada cuadro, así nunca salta.
// =========================================================
(() => {
  const visual = document.querySelector(".hero-visual");
  if (!visual) return;
  const mente = visual.querySelector(".hv-mente");
  const cuerpo = visual.querySelector(".hv-cuerpo");
  const core = visual.querySelector(".hv-core");
  const lMente = visual.querySelector(".hv-label-mente");
  const lCuerpo = visual.querySelector(".hv-label-cuerpo");
  const heroEl = document.querySelector(".hero");
  const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (still) {
    visual.classList.add("is-in");
    return;
  }

  const start = performance.now() + (document.documentElement.classList.contains("is-loading") ? 1700 : 250);
  const easeOut = (t) => 1 - Math.pow(1 - t, 4);
  const ptr = { x: 0, y: 0, tx: 0, ty: 0 };
  let visible = true;

  if (window.matchMedia("(pointer: fine)").matches) {
    heroEl.addEventListener("pointermove", (e) => {
      ptr.tx = (e.clientX / window.innerWidth) * 2 - 1;
      ptr.ty = (e.clientY / window.innerHeight) * 2 - 1;
    });
    heroEl.addEventListener("pointerleave", () => (ptr.tx = ptr.ty = 0));
  }
  new IntersectionObserver(([e]) => (visible = e.isIntersecting)).observe(heroEl);
  setTimeout(() => visual.classList.add("is-in"), Math.max(0, start - performance.now()));

  function frame(now) {
    requestAnimationFrame(frame);
    if (!visible) return;
    const s = mente.offsetWidth;
    const enter = easeOut(Math.min(1, Math.max(0, (now - start) / 1600)));
    const p = Math.min(1, window.scrollY / (heroEl.offsetHeight * 0.8));
    ptr.x += (ptr.tx - ptr.x) * 0.06;
    ptr.y += (ptr.ty - ptr.y) * 0.06;

    const apart = (1 - enter) * s * 0.42; // al cargar vienen separados
    const merge = p * s * 0.2;           // al bajar se funden más
    const dx = apart - merge;
    const tm = `${(-dx + ptr.x * 14).toFixed(1)}px ${(ptr.y * 10).toFixed(1)}px`;
    const tc = `${(dx - ptr.x * 9).toFixed(1)}px ${(-ptr.y * 7).toFixed(1)}px`;
    mente.style.translate = lMente.style.translate = tm;
    cuerpo.style.translate = lCuerpo.style.translate = tc;
    core.style.scale = (1 + p * 0.35).toFixed(3);
    visual.style.opacity = (1 - p * 0.6).toFixed(3);
  }
  requestAnimationFrame(frame);
})();
