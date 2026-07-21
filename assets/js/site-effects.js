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
    const neutrinoLabels = [
      { base: "ν", script: "e", scriptPosition: "subscript", color: "nuElectron", kind: "neutrino", flavor: "e", antimatter: false },
      { base: "ν", script: "μ", scriptPosition: "subscript", color: "nuMuon", kind: "neutrino", flavor: "mu", antimatter: false },
      { base: "ν", script: "τ", scriptPosition: "subscript", color: "nuTau", kind: "neutrino", flavor: "tau", antimatter: false },
      {
        base: "ν",
        script: "e",
        scriptPosition: "subscript",
        color: "antiNuElectron",
        kind: "neutrino",
        flavor: "e",
        antimatter: true,
        overbar: true,
      },
      {
        base: "ν",
        script: "μ",
        scriptPosition: "subscript",
        color: "antiNuMuon",
        kind: "neutrino",
        flavor: "mu",
        antimatter: true,
        overbar: true,
      },
      {
        base: "ν",
        script: "τ",
        scriptPosition: "subscript",
        color: "antiNuTau",
        kind: "neutrino",
        flavor: "tau",
        antimatter: true,
        overbar: true,
      },
    ];
    const particleLabels = [
      ...neutrinoLabels,
      { base: "e", script: "−", scriptPosition: "superscript", color: "electron" },
      { base: "e", script: "+", scriptPosition: "superscript", color: "electron" },
      { base: "γ", color: "photon" },
      { base: "W", script: "−", scriptPosition: "superscript", color: "weak" },
      { base: "W", script: "+", scriptPosition: "superscript", color: "weak" },
      { base: "W", script: "0", scriptPosition: "superscript", color: "weak" },
      { base: "Z", script: "0", scriptPosition: "superscript", color: "neutral" },
      { base: "H", color: "higgs" },
      { base: "τ", script: "−", scriptPosition: "superscript", color: "tau" },
      { base: "τ", script: "+", scriptPosition: "superscript", color: "tau" },
      { base: "μ", script: "−", scriptPosition: "superscript", color: "muon" },
      { base: "μ", script: "+", scriptPosition: "superscript", color: "muon" },
    ];
    const particlePalettes = {
      light: {
        nuElectron: "#007f9f",
        nuMuon: "#654dcc",
        nuTau: "#007f68",
        antiNuElectron: "#c43f62",
        antiNuMuon: "#a744b8",
        antiNuTau: "#b96b00",
        electron: "#c23f78",
        photon: "#b87500",
        weak: "#3567d6",
        neutral: "#7655c5",
        higgs: "#d14d38",
        tau: "#008169",
        muon: "#9145b5",
      },
      dark: {
        nuElectron: "#50e1ff",
        nuMuon: "#aa96ff",
        nuTau: "#4de0ae",
        antiNuElectron: "#ff7898",
        antiNuMuon: "#ef84ff",
        antiNuTau: "#ffbd5c",
        electron: "#ff78b2",
        photon: "#ffd166",
        weak: "#78a6ff",
        neutral: "#b9a1ff",
        higgs: "#ff8b72",
        tau: "#55d6ac",
        muon: "#d58aff",
      },
    };
    const particles = [];
    const supernovae = [];

    canvas.className = "symbol-field";
    canvas.setAttribute("aria-hidden", "true");
    document.body.prepend(canvas);

    let viewportWidth = window.innerWidth;
    let viewportHeight = window.innerHeight;
    let pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    let lastFrame = performance.now();
    let colorMode = root.dataset.theme === "dark" ? "dark" : "light";
    let supernovaCoreColor = colorMode === "dark" ? "255, 182, 112" : "220, 93, 45";
    let supernovaHaloColor = colorMode === "dark" ? "124, 157, 255" : "103, 83, 196";

    const randomBetween = (minimum, maximum) => minimum + Math.random() * (maximum - minimum);
    const randomParticleLabel = () => particleLabels[Math.floor(Math.random() * particleLabels.length)];

    const createSupernovaParticle = (supernova) => {
      const angle = Math.random() * Math.PI * 2;
      const launchRadius = randomBetween(3, 10);
      const label = randomParticleLabel();
      const isNeutrino = label.kind === "neutrino";

      return {
        label,
        color: label.color,
        isNeutrino,
        x: supernova.x + Math.cos(angle) * launchRadius,
        y: supernova.y + Math.sin(angle) * launchRadius,
        heading: angle + randomBetween(-0.22, 0.22),
        speed: isNeutrino ? randomBetween(0.052, 0.082) : randomBetween(0.02, 0.042),
        swimPhase: randomBetween(0, Math.PI * 2),
        swimRate: randomBetween(0.0018, 0.0038),
        turnStrength: randomBetween(0.00012, 0.00032) * (Math.random() > 0.5 ? 1 : -1),
        lateralStrength: randomBetween(0.004, 0.011),
        nextDeflectionAt: randomBetween(520, 1180),
        nextOscillationAt: isNeutrino ? randomBetween(680, 1320) : Number.POSITIVE_INFINITY,
        previousLabel: null,
        transitionAge: 0,
        transitionDuration: 190,
        age: 0,
        lifetime: randomBetween(3400, 5600),
        size: isNeutrino ? randomBetween(15, 20) : randomBetween(12, 18),
        rotation: isNeutrino ? randomBetween(-0.08, 0.08) : angle + randomBetween(-0.18, 0.18),
        opacity: isNeutrino ? randomBetween(0.78, 0.96) : randomBetween(0.58, 0.84),
      };
    };

    const oscillateNeutrino = (particle) => {
      const availableFlavors = neutrinoLabels.filter(
        (label) => label.antimatter === particle.label.antimatter && label.flavor !== particle.label.flavor
      );

      particle.previousLabel = particle.label;
      particle.label = availableFlavors[Math.floor(Math.random() * availableFlavors.length)];
      particle.color = particle.label.color;
      particle.transitionAge = 0;
      particle.nextOscillationAt = particle.age + randomBetween(720, 1460);
    };

    const createSupernova = (staggered = false) => {
      const lifetime = randomBetween(7000, 11000);
      const age = staggered ? randomBetween(0, lifetime * 0.82) : 0;

      return {
        x: randomBetween(0.08, 0.92) * viewportWidth,
        y: randomBetween(0.08, 0.92) * viewportHeight,
        age,
        lifetime,
        maxRadius: randomBetween(52, 94),
        rotation: randomBetween(0, Math.PI * 2),
        rayLengths: Array.from({ length: 12 }, () => randomBetween(0.72, 1.28)),
        nextEmissionAt: age + randomBetween(80, 420),
        emissionInterval: randomBetween(260, 440),
      };
    };

    const supernovaTarget = () => (viewportWidth < 700 ? 2 : 4);

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
      fillSupernovaField(supernovae.length === 0);
    };

    const drawParticle = (particle, opacity, label = particle.label) => {
      context.save();
      context.globalAlpha = opacity;
      context.fillStyle = particlePalettes[colorMode][label.color];
      context.textAlign = "left";
      context.textBaseline = "middle";
      context.translate(particle.x, particle.y);
      context.rotate(particle.rotation);

      const mathFont = '"STIX Two Math", "Cambria Math", "Times New Roman", serif';
      const fontWeight = label.kind === "neutrino" ? 700 : 500;
      const scriptSize = particle.size * 0.58;
      context.font = `italic ${fontWeight} ${particle.size}px ${mathFont}`;
      const baseWidth = context.measureText(label.base).width;
      let scriptWidth = 0;

      if (label.script) {
        context.font = `${fontWeight} ${scriptSize}px ${mathFont}`;
        scriptWidth = context.measureText(label.script).width;
      }

      const startX = -(baseWidth + scriptWidth) / 2;
      context.font = `italic ${fontWeight} ${particle.size}px ${mathFont}`;

      if (label.kind === "neutrino") {
        context.shadowColor = particlePalettes[colorMode][label.color];
        context.shadowBlur = 4;
      }

      context.fillText(label.base, startX, 0);

      if (label.overbar) {
        context.strokeStyle = particlePalettes[colorMode][label.color];
        context.lineWidth = Math.max(1.1, particle.size * 0.075);
        context.beginPath();
        context.moveTo(startX - particle.size * 0.04, particle.size * -0.5);
        context.lineTo(startX + baseWidth + particle.size * 0.04, particle.size * -0.5);
        context.stroke();
      }

      if (label.script) {
        const scriptY = label.scriptPosition === "subscript" ? particle.size * 0.34 : particle.size * -0.36;
        context.font = `${fontWeight} ${scriptSize}px ${mathFont}`;
        context.fillText(label.script, startX + baseWidth, scriptY);
      }

      context.restore();
    };

    const drawSupernova = (supernova) => {
      const progress = supernova.age / supernova.lifetime;
      const bloom = Math.sin(progress * Math.PI);
      const flash = Math.exp(-progress * 7);
      const intensity = Math.min(1, bloom * 0.88 + flash * 0.72);
      const expansion = 1 - Math.pow(1 - progress, 1.55);
      const radius = 9 + supernova.maxRadius * expansion;

      context.save();
      context.translate(supernova.x, supernova.y);
      context.rotate(supernova.rotation + progress * 0.35);

      const gradient = context.createRadialGradient(0, 0, 0, 0, 0, radius);
      gradient.addColorStop(0, `rgba(${supernovaCoreColor}, ${0.68 * intensity})`);
      gradient.addColorStop(0.14, `rgba(${supernovaCoreColor}, ${0.36 * intensity})`);
      gradient.addColorStop(0.48, `rgba(${supernovaHaloColor}, ${0.16 * intensity})`);
      gradient.addColorStop(0.78, `rgba(${supernovaHaloColor}, ${0.06 * intensity})`);
      gradient.addColorStop(1, `rgba(${supernovaHaloColor}, 0)`);
      context.fillStyle = gradient;
      context.beginPath();
      context.arc(0, 0, radius, 0, Math.PI * 2);
      context.fill();

      context.globalAlpha = intensity * 0.34;
      context.strokeStyle = `rgb(${supernovaHaloColor})`;
      context.lineWidth = 1;
      context.beginPath();
      context.arc(0, 0, radius * 0.62, 0, Math.PI * 2);
      context.stroke();

      context.globalAlpha = intensity * 0.16;
      context.lineWidth = 0.65;
      context.beginPath();
      context.arc(0, 0, radius * 0.86, 0, Math.PI * 2);
      context.stroke();

      context.globalAlpha = intensity * 0.24;
      context.strokeStyle = `rgb(${supernovaCoreColor})`;
      supernova.rayLengths.forEach((rayLength, index) => {
        const angle = (index / supernova.rayLengths.length) * Math.PI * 2;
        const innerRadius = radius * 0.22;
        const outerRadius = radius * rayLength;
        context.beginPath();
        context.moveTo(Math.cos(angle) * innerRadius, Math.sin(angle) * innerRadius);
        context.lineTo(Math.cos(angle) * outerRadius, Math.sin(angle) * outerRadius);
        context.stroke();
      });

      context.globalAlpha = intensity * 0.82;
      context.fillStyle = `rgb(${supernovaCoreColor})`;
      context.beginPath();
      context.arc(0, 0, Math.max(1.5, radius * 0.045), 0, Math.PI * 2);
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

        const supernovaProgress = supernova.age / supernova.lifetime;

        if (supernovaProgress > 0.06 && supernovaProgress < 0.78 && supernova.age >= supernova.nextEmissionAt && particles.length < 80) {
          const burstSize = supernovaProgress < 0.24 && Math.random() > 0.52 ? 2 : 1;

          for (let particleIndex = 0; particleIndex < burstSize; particleIndex += 1) {
            particles.push(createSupernovaParticle(supernova));
          }

          supernova.nextEmissionAt = supernova.age + supernova.emissionInterval * randomBetween(0.72, 1.28);
        }

        drawSupernova(supernova);
      }

      for (let index = particles.length - 1; index >= 0; index -= 1) {
        const particle = particles[index];
        particle.age += elapsed;
        const progress = particle.age / particle.lifetime;

        if (progress >= 1) {
          particles.splice(index, 1);
          continue;
        }

        if (particle.isNeutrino) {
          particle.x += Math.cos(particle.heading) * particle.speed * elapsed;
          particle.y += Math.sin(particle.heading) * particle.speed * elapsed;

          if (particle.age >= particle.nextOscillationAt) {
            oscillateNeutrino(particle);
          }
        } else {
          particle.swimPhase += particle.swimRate * elapsed;
          particle.heading += Math.sin(particle.swimPhase) * particle.turnStrength * elapsed;

          if (particle.age >= particle.nextDeflectionAt) {
            particle.heading += randomBetween(-0.82, 0.82);
            particle.rotation += randomBetween(-0.3, 0.3);
            particle.nextDeflectionAt = particle.age + randomBetween(520, 1180);
          }

          const lateralSpeed = Math.cos(particle.swimPhase) * particle.lateralStrength;
          particle.x += (Math.cos(particle.heading) * particle.speed - Math.sin(particle.heading) * lateralSpeed) * elapsed;
          particle.y += (Math.sin(particle.heading) * particle.speed + Math.cos(particle.heading) * lateralSpeed) * elapsed;
          particle.speed *= Math.pow(0.99992, elapsed);
          particle.rotation += Math.sin(particle.swimPhase) * 0.00028 * elapsed;

          const bounceMargin = 16;

          if (particle.x < bounceMargin || particle.x > viewportWidth - bounceMargin) {
            particle.heading = Math.PI - particle.heading;
            particle.x = Math.min(viewportWidth - bounceMargin, Math.max(bounceMargin, particle.x));
          }

          if (particle.y < bounceMargin || particle.y > viewportHeight - bounceMargin) {
            particle.heading = -particle.heading;
            particle.y = Math.min(viewportHeight - bounceMargin, Math.max(bounceMargin, particle.y));
          }
        }

        const fadeIn = Math.min(1, progress / 0.12);
        const fadeOut = Math.pow(1 - progress, 0.82);
        const opacity = fadeIn * fadeOut * particle.opacity;

        if (particle.previousLabel) {
          particle.transitionAge += elapsed;
          const transitionProgress = Math.min(1, particle.transitionAge / particle.transitionDuration);
          drawParticle(particle, opacity * (1 - transitionProgress), particle.previousLabel);
          drawParticle(particle, opacity * transitionProgress);

          if (transitionProgress >= 1) particle.previousLabel = null;
        } else {
          drawParticle(particle, opacity);
        }
      }

      fillSupernovaField();
      window.requestAnimationFrame(animateSymbolField);
    };

    window.addEventListener("resize", resizeSymbolField, { passive: true });

    const themeObserver = new MutationObserver(() => {
      colorMode = root.dataset.theme === "dark" ? "dark" : "light";
      supernovaCoreColor = colorMode === "dark" ? "255, 182, 112" : "220, 93, 45";
      supernovaHaloColor = colorMode === "dark" ? "124, 157, 255" : "103, 83, 196";
    });

    themeObserver.observe(root, { attributes: true, attributeFilter: ["data-theme"] });
    resizeSymbolField();
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
