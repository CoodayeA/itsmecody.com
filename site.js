// Theme toggle, header backdrop on scroll, and the typed hero line.
(() => {
  const root = document.documentElement;
  const meta = document.querySelector('meta[name="theme-color"]');
  const paint = () => meta && (meta.content = root.dataset.theme === "light" ? "#f6f4ef" : "#1a1917");
  paint();
  document.querySelector("[data-theme-toggle]")?.addEventListener("click", () => {
    root.dataset.theme = root.dataset.theme === "light" ? "dark" : "light";
    try { localStorage.setItem("theme", root.dataset.theme); } catch {}
    paint();
  });

  const top = document.querySelector("[data-top]");
  const onScroll = () => top?.classList.toggle("scrolled", scrollY > 8);
  addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  const typed = document.querySelector("[data-typed]");
  if (typed && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
    const lines = [...typed.querySelectorAll("[data-line]")];
    const full = lines.map((l) => l.textContent);
    lines.forEach((l) => (l.textContent = ""));
    let li = 0, ci = 0;
    const tick = () => {
      if (li >= lines.length) return;
      lines[li].textContent = full[li].slice(0, ++ci);
      if (ci >= full[li].length) { li++; ci = 0; setTimeout(tick, 380); }
      else setTimeout(tick, 38 + Math.random() * 50);
    };
    setTimeout(tick, 500);
  }

  document.querySelectorAll("[data-copy]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      try { await navigator.clipboard.writeText(btn.dataset.copy); } catch { location.href = "mailto:" + btn.dataset.copy; return; }
      const label = btn.lastElementChild;
      btn.classList.add("done"); label.textContent = "copied";
      setTimeout(() => { btn.classList.remove("done"); label.textContent = "to clipboard"; }, 1800);
    });
  });
})();
