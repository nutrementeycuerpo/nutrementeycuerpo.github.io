// Áreas del consultorio: pantalla de bienvenida (inicio) y utilidades de las páginas de área
(function () {
  var WA_NUMBER = "5212215755446";
  var isAreaPage = document.body.classList.contains("ar");

  // En las páginas de área no corre main.js: aquí se arman los enlaces de WhatsApp y el año
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
  }

  // ---------- Pantalla de bienvenida: ¿qué área buscas? ----------
  var gate = document.querySelector(".area-gate");
  if (!gate) return;

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
  gate.querySelectorAll("a.gate-card").forEach(function (a) { a.addEventListener("click", remember); });
  gate.addEventListener("keydown", function (e) { if (e.key === "Escape") close(); });

  // Si está la pantalla de carga, se espera a que termine
  var wait = root.classList.contains("is-loading") ? 2300 : 0;
  setTimeout(open, wait);
})();
