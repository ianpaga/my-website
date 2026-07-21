(() => {
  const root = document.documentElement;
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  root.classList.add("js-ready");

  const revealElements = document.querySelectorAll("[data-reveal]");

  if (prefersReducedMotion || !("IntersectionObserver" in window)) {
    revealElements.forEach((element) => element.classList.add("is-visible"));
  } else {
    const revealObserver = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;

          const delay = Number(entry.target.dataset.delay || 0);
          window.setTimeout(() => entry.target.classList.add("is-visible"), delay);
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -48px" }
    );

    revealElements.forEach((element) => revealObserver.observe(element));
  }

  const navbar = document.querySelector("#navbar");
  const updateNavbar = () => navbar?.classList.toggle("is-scrolled", window.scrollY > 16);

  updateNavbar();
  window.addEventListener("scroll", updateNavbar, { passive: true });

  const hasFinePointer = window.matchMedia("(pointer: fine)").matches;

  if (!prefersReducedMotion) {
    const ambient = document.createElement("div");
    ambient.className = "cursor-ambient";
    ambient.setAttribute("aria-hidden", "true");
    document.body.prepend(ambient);

    let currentX = window.innerWidth * 0.5;
    let currentY = window.innerHeight * 0.3;
    let targetX = currentX;
    let targetY = currentY;
    let ambientFrame = null;

    const renderAmbient = () => {
      currentX += (targetX - currentX) * 0.09;
      currentY += (targetY - currentY) * 0.09;
      ambient.style.setProperty("--ambient-x", `${currentX}px`);
      ambient.style.setProperty("--ambient-y", `${currentY}px`);

      if (Math.abs(targetX - currentX) > 0.2 || Math.abs(targetY - currentY) > 0.2) {
        ambientFrame = window.requestAnimationFrame(renderAmbient);
      } else {
        ambientFrame = null;
      }
    };

    window.addEventListener(
      "pointermove",
      (event) => {
        targetX = event.clientX;
        targetY = event.clientY;

        if (ambientFrame === null) {
          ambientFrame = window.requestAnimationFrame(renderAmbient);
        }
      },
      { passive: true }
    );
  }

  const stage = document.querySelector(".research-hero__visual");

  if (stage && !prefersReducedMotion && hasFinePointer) {
    stage.addEventListener("pointermove", (event) => {
      const bounds = stage.getBoundingClientRect();
      const x = (event.clientX - bounds.left) / bounds.width - 0.5;
      const y = (event.clientY - bounds.top) / bounds.height - 0.5;
      stage.style.setProperty("--pointer-x", `${x * 12}px`);
      stage.style.setProperty("--pointer-y", `${y * 12}px`);
    });

    stage.addEventListener("pointerleave", () => {
      stage.style.setProperty("--pointer-x", "0px");
      stage.style.setProperty("--pointer-y", "0px");
    });
  }
})();
