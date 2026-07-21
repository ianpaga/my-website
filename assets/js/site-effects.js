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
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d", { alpha: true });
    const symbols = ["-", "/", "|", "+", "·"];
    const particles = [];

    canvas.className = "symbol-field";
    canvas.setAttribute("aria-hidden", "true");
    document.body.prepend(canvas);

    let viewportWidth = window.innerWidth;
    let viewportHeight = window.innerHeight;
    let pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    let pointerX = viewportWidth * 0.5;
    let pointerY = viewportHeight * 0.35;
    let pointerSeen = false;
    let lastFrame = performance.now();
    let lastPointerEmission = 0;
    let accentColor = getComputedStyle(root).getPropertyValue("--site-accent").trim();

    const randomBetween = (minimum, maximum) => minimum + Math.random() * (maximum - minimum);
    const randomSymbol = () => symbols[Math.floor(Math.random() * symbols.length)];

    const createAmbientParticle = () => ({
      type: "ambient",
      symbol: randomSymbol(),
      x: Math.random() * viewportWidth,
      y: Math.random() * viewportHeight,
      velocityX: randomBetween(-0.014, 0.014),
      velocityY: randomBetween(-0.018, -0.005),
      age: randomBetween(0, 5000),
      lifetime: randomBetween(6500, 11000),
      size: randomBetween(10, 15),
      rotation: randomBetween(-0.35, 0.35),
    });

    const createPointerParticle = () => {
      const angle = Math.random() * Math.PI * 2;
      const radius = randomBetween(22, 88);
      const orbitSpeed = randomBetween(0.018, 0.05);

      return {
        type: "pointer",
        symbol: randomSymbol(),
        x: pointerX + Math.cos(angle) * radius,
        y: pointerY + Math.sin(angle) * radius,
        velocityX: Math.cos(angle) * 0.018 - Math.sin(angle) * orbitSpeed,
        velocityY: Math.sin(angle) * 0.018 + Math.cos(angle) * orbitSpeed,
        age: 0,
        lifetime: randomBetween(850, 1700),
        size: randomBetween(12, 19),
        rotation: angle + randomBetween(-0.35, 0.35),
      };
    };

    const ambientParticleTarget = () => Math.min(48, Math.max(22, Math.round((viewportWidth * viewportHeight) / 32000)));

    const fillAmbientField = () => {
      const ambientCount = particles.filter((particle) => particle.type === "ambient").length;

      for (let index = ambientCount; index < ambientParticleTarget(); index += 1) {
        particles.push(createAmbientParticle());
      }
    };

    const resizeSymbolField = () => {
      viewportWidth = window.innerWidth;
      viewportHeight = window.innerHeight;
      pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(viewportWidth * pixelRatio);
      canvas.height = Math.round(viewportHeight * pixelRatio);
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      fillAmbientField();
    };

    const drawParticle = (particle, opacity) => {
      context.save();
      context.globalAlpha = opacity;
      context.fillStyle = accentColor;
      context.font = `500 ${particle.size}px "Space Grotesk", monospace`;
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.translate(particle.x, particle.y);
      context.rotate(particle.rotation);
      context.fillText(particle.symbol, 0, 0);
      context.restore();
    };

    const animateSymbolField = (time) => {
      const elapsed = Math.min(time - lastFrame, 32);
      lastFrame = time;
      context.clearRect(0, 0, viewportWidth, viewportHeight);

      if (pointerSeen && time - lastPointerEmission > 95 && particles.length < 90) {
        particles.push(createPointerParticle());
        lastPointerEmission = time;
      }

      for (let index = particles.length - 1; index >= 0; index -= 1) {
        const particle = particles[index];
        particle.age += elapsed;
        particle.x += particle.velocityX * elapsed;
        particle.y += particle.velocityY * elapsed;

        if (particle.type === "ambient") {
          if (particle.x < -30) particle.x = viewportWidth + 30;
          if (particle.x > viewportWidth + 30) particle.x = -30;
          if (particle.y < -30 || particle.age >= particle.lifetime) {
            particles.splice(index, 1);
            continue;
          }

          const progress = particle.age / particle.lifetime;
          drawParticle(particle, Math.sin(progress * Math.PI) * 0.22);
        } else {
          const progress = particle.age / particle.lifetime;

          if (progress >= 1) {
            particles.splice(index, 1);
            continue;
          }

          particle.velocityX *= 0.996;
          particle.velocityY *= 0.996;
          drawParticle(particle, Math.sin(progress * Math.PI) * 0.72);
        }
      }

      fillAmbientField();
      window.requestAnimationFrame(animateSymbolField);
    };

    window.addEventListener(
      "mousemove",
      (event) => {
        pointerX = event.clientX;
        pointerY = event.clientY;
        pointerSeen = true;

        if (particles.length < 90) {
          particles.push(createPointerParticle(), createPointerParticle());
        }
      },
      { passive: true }
    );

    window.addEventListener("resize", resizeSymbolField, { passive: true });

    const themeObserver = new MutationObserver(() => {
      accentColor = getComputedStyle(root).getPropertyValue("--site-accent").trim();
    });

    themeObserver.observe(root, { attributes: true, attributeFilter: ["data-theme"] });
    resizeSymbolField();
    fillAmbientField();
    window.requestAnimationFrame(animateSymbolField);
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
