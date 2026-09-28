(function () {
  if (window.top === window.self) return;

  // Hide synchronously before the rest of the page can render.
  document.documentElement.style.display = "none";

  // Best-effort frame escape; the document stays hidden if blocked.
  try {
    window.top.location.replace(window.self.location.href);
  } catch (_error) {}
})();
