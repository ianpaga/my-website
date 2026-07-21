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
    const particleLabels = [
      { base: "ν", script: "e", scriptPosition: "subscript" },
      { base: "ν", script: "μ", scriptPosition: "subscript" },
      { base: "ν", script: "τ", scriptPosition: "subscript" },
      { base: "e", script: "−", scriptPosition: "superscript" },
      { base: "e", script: "+", scriptPosition: "superscript" },
      { base: "γ" },
      { base: "W", script: "−", scriptPosition: "superscript" },
      { base: "W", script: "+", scriptPosition: "superscript" },
      { base: "W", script: "0", scriptPosition: "superscript" },
      { base: "Z", script: "0", scriptPosition: "superscript" },
      { base: "H" },
      { base: "τ", script: "−", scriptPosition: "superscript" },
      { base: "τ", script: "+", scriptPosition: "superscript" },
      { base: "μ", script: "−", scriptPosition: "superscript" },
      { base: "μ", script: "+", scriptPosition: "superscript" },
    ];
    const particles = [];
    const supernovae = [];

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
    let supernovaColor = root.dataset.theme === "dark" ? "255, 176, 112" : "214, 91, 47";

    const randomBetween = (minimum, maximum) => minimum + Math.random() * (maximum - minimum);
    const randomParticleLabel = () => particleLabels[Math.floor(Math.random() * particleLabels.length)];

    const createAmbientParticle = () => ({
      type: "ambient",
      label: randomParticleLabel(),
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
        label: randomParticleLabel(),
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

    const createSupernova = (staggered = false) => {
      const lifetime = randomBetween(7000, 11000);

      return {
        x: randomBetween(0.08, 0.92) * viewportWidth,
        y: randomBetween(0.08, 0.92) * viewportHeight,
        age: staggered ? randomBetween(0, lifetime * 0.92) : 0,
        lifetime,
        maxRadius: randomBetween(38, 76),
        rotation: randomBetween(0, Math.PI * 2),
        rayLengths: Array.from({ length: 12 }, () => randomBetween(0.72, 1.28)),
      };
    };

    const ambientParticleTarget = () => Math.min(48, Math.max(22, Math.round((viewportWidth * viewportHeight) / 32000)));
    const supernovaTarget = () => (viewportWidth < 700 ? 2 : 4);

    const fillAmbientField = () => {
      const ambientCount = particles.filter((particle) => particle.type === "ambient").length;

      for (let index = ambientCount; index < ambientParticleTarget(); index += 1) {
        particles.push(createAmbientParticle());
      }
    };

    const fillSupernovaField = (staggered = false) => {
      for (let index = supernovae.length; index < supernovaTarget(); index += 1) {
        supernovae.push(createSupernova(staggered));
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
      fillSupernovaField(supernovae.length === 0);
    };

    const drawParticle = (particle, opacity) => {
      context.save();
      context.globalAlpha = opacity;
      context.fillStyle = accentColor;
      context.textAlign = "left";
      context.textBaseline = "middle";
      context.translate(particle.x, particle.y);
      context.rotate(particle.rotation);

      const mathFont = '"STIX Two Math", "Cambria Math", "Times New Roman", serif';
      const scriptSize = particle.size * 0.58;
      context.font = `italic 500 ${particle.size}px ${mathFont}`;
      const baseWidth = context.measureText(particle.label.base).width;
      let scriptWidth = 0;

      if (particle.label.script) {
        context.font = `500 ${scriptSize}px ${mathFont}`;
        scriptWidth = context.measureText(particle.label.script).width;
      }

      const startX = -(baseWidth + scriptWidth) / 2;
      context.font = `italic 500 ${particle.size}px ${mathFont}`;
      context.fillText(particle.label.base, startX, 0);

      if (particle.label.script) {
        const scriptY = particle.label.scriptPosition === "subscript" ? particle.size * 0.34 : particle.size * -0.36;
        context.font = `500 ${scriptSize}px ${mathFont}`;
        context.fillText(particle.label.script, startX + baseWidth, scriptY);
      }

      context.restore();
    };

    const drawSupernova = (supernova) => {
      const progress = supernova.age / supernova.lifetime;
      const glow = Math.sin(progress * Math.PI);
      const radius = 8 + supernova.maxRadius * progress;

      context.save();
      context.translate(supernova.x, supernova.y);
      context.rotate(supernova.rotation + progress * 0.35);

      const gradient = context.createRadialGradient(0, 0, 0, 0, 0, radius);
      gradient.addColorStop(0, `rgba(${supernovaColor}, ${0.42 * glow})`);
      gradient.addColorStop(0.18, `rgba(${supernovaColor}, ${0.2 * glow})`);
      gradient.addColorStop(0.55, `rgba(${supernovaColor}, ${0.07 * glow})`);
      gradient.addColorStop(1, `rgba(${supernovaColor}, 0)`);
      context.fillStyle = gradient;
      context.beginPath();
      context.arc(0, 0, radius, 0, Math.PI * 2);
      context.fill();

      context.globalAlpha = glow * 0.18;
      context.strokeStyle = `rgb(${supernovaColor})`;
      context.lineWidth = 0.75;
      context.beginPath();
      context.arc(0, 0, radius * 0.62, 0, Math.PI * 2);
      context.stroke();

      context.globalAlpha = glow * 0.14;
      supernova.rayLengths.forEach((rayLength, index) => {
        const angle = (index / supernova.rayLengths.length) * Math.PI * 2;
        const innerRadius = radius * 0.22;
        const outerRadius = radius * rayLength;
        context.beginPath();
        context.moveTo(Math.cos(angle) * innerRadius, Math.sin(angle) * innerRadius);
        context.lineTo(Math.cos(angle) * outerRadius, Math.sin(angle) * outerRadius);
        context.stroke();
      });

      context.globalAlpha = glow * 0.5;
      context.fillStyle = `rgb(${supernovaColor})`;
      context.beginPath();
      context.arc(0, 0, Math.max(1, radius * 0.035), 0, Math.PI * 2);
      context.fill();
      context.restore();
    };

    const animateSymbolField = (time) => {
      const elapsed = Math.min(time - lastFrame, 32);
      lastFrame = time;
      context.clearRect(0, 0, viewportWidth, viewportHeight);

      for (let index = supernovae.length - 1; index >= 0; index -= 1) {
        const supernova = supernovae[index];
        supernova.age += elapsed;

        if (supernova.age >= supernova.lifetime) {
          supernovae.splice(index, 1);
          continue;
        }

        drawSupernova(supernova);
      }

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
      fillSupernovaField();
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
      supernovaColor = root.dataset.theme === "dark" ? "255, 176, 112" : "214, 91, 47";
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
