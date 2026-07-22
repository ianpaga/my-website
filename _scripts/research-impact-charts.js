---
permalink: /assets/js/research-impact-charts.js
---

(function () {
  const chartCanvases = document.querySelectorAll("[data-impact-chart]");
  if (!chartCanvases.length) return;

  const renderers = [];

  function getPalette(canvas) {
    const styles = getComputedStyle(canvas);
    const color = (name, fallback) => styles.getPropertyValue(name).trim() || fallback;
    return {
      accent: color("--site-accent", "#2f6f72"),
      ink: color("--site-ink", "#202426"),
      line: color("--site-line", "#d9ddde"),
      muted: color("--site-muted", "#6f7779"),
      surface: color("--site-surface", "#ffffff"),
    };
  }

  function prepareCanvas(canvas) {
    const width = Math.max(canvas.clientWidth, 280);
    const height = Math.max(canvas.clientHeight, 80);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    const context = canvas.getContext("2d");
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    context.clearRect(0, 0, width, height);
    return { context, width, height };
  }

  function roundedRectangle(context, x, y, width, height, radius) {
    const corner = Math.min(radius, width / 2, height / 2);
    context.beginPath();
    context.moveTo(x + corner, y);
    context.lineTo(x + width - corner, y);
    context.quadraticCurveTo(x + width, y, x + width, y + corner);
    context.lineTo(x + width, y + height - corner);
    context.quadraticCurveTo(x + width, y + height, x + width - corner, y + height);
    context.lineTo(x + corner, y + height);
    context.quadraticCurveTo(x, y + height, x, y + height - corner);
    context.lineTo(x, y + corner);
    context.quadraticCurveTo(x, y, x + corner, y);
    context.closePath();
  }

  function traceCurve(context, points) {
    context.moveTo(points[0].x, points[0].y);
    for (let index = 1; index < points.length; index += 1) {
      const previous = points[index - 1];
      const current = points[index];
      const midpoint = (previous.x + current.x) / 2;
      context.bezierCurveTo(midpoint, previous.y, midpoint, current.y, current.x, current.y);
    }
  }

  function initializeCitationChart(canvas) {
    const items = Array.from(canvas.parentElement.querySelectorAll("[data-chart-series='citations'] li"));
    const data = items.map((item) => ({
      year: Number(item.dataset.year),
      value: Number(item.dataset.value),
    }));
    let hoveredIndex = -1;
    let points = [];

    const render = () => {
      const { context, width, height } = prepareCanvas(canvas);
      const palette = getPalette(canvas);
      const bounds = { top: 14, right: 12, bottom: height - 25, left: 32 };
      const peak = Math.max(...data.map((item) => item.value), 1);
      const yMaximum = Math.ceil(peak / 10) * 10;
      const plotWidth = width - bounds.left - bounds.right;
      const plotHeight = bounds.bottom - bounds.top;

      context.font = '10px "Space Grotesk", sans-serif';
      context.textBaseline = "middle";
      context.lineWidth = 1;

      [yMaximum, yMaximum / 2, 0].forEach((tick) => {
        const y = bounds.bottom - (tick / yMaximum) * plotHeight;
        context.strokeStyle = palette.line;
        context.beginPath();
        context.moveTo(bounds.left, y);
        context.lineTo(width - bounds.right, y);
        context.stroke();
        context.fillStyle = palette.muted;
        context.textAlign = "right";
        context.fillText(String(Math.round(tick)), bounds.left - 6, y);
      });

      points = data.map((item, index) => ({
        x: bounds.left + (index / Math.max(data.length - 1, 1)) * plotWidth,
        y: bounds.bottom - (item.value / yMaximum) * plotHeight,
      }));

      context.save();
      context.beginPath();
      traceCurve(context, points);
      context.lineTo(points[points.length - 1].x, bounds.bottom);
      context.lineTo(points[0].x, bounds.bottom);
      context.closePath();
      context.globalAlpha = 0.14;
      context.fillStyle = palette.accent;
      context.fill();
      context.restore();

      context.beginPath();
      traceCurve(context, points);
      context.strokeStyle = palette.accent;
      context.lineWidth = 2;
      context.stroke();

      points.forEach((point, index) => {
        context.beginPath();
        context.arc(point.x, point.y, index === hoveredIndex ? 4 : 2.5, 0, Math.PI * 2);
        context.fillStyle = index === hoveredIndex ? palette.accent : palette.surface;
        context.fill();
        context.strokeStyle = palette.accent;
        context.lineWidth = 2;
        context.stroke();

        context.fillStyle = palette.muted;
        context.textAlign = "center";
        context.fillText(String(data[index].year), point.x, height - 9);
      });

      if (hoveredIndex >= 0) {
        const point = points[hoveredIndex];
        const label = `${data[hoveredIndex].value} citations`;
        context.font = '500 10px "Space Grotesk", sans-serif';
        const tooltipWidth = context.measureText(label).width + 14;
        const tooltipHeight = 22;
        const tooltipX = Math.min(
          Math.max(point.x - tooltipWidth / 2, bounds.left),
          width - bounds.right - tooltipWidth,
        );
        const tooltipY = point.y - tooltipHeight - 8 < 2 ? point.y + 9 : point.y - tooltipHeight - 8;
        roundedRectangle(context, tooltipX, tooltipY, tooltipWidth, tooltipHeight, 4);
        context.fillStyle = palette.surface;
        context.fill();
        context.strokeStyle = palette.line;
        context.lineWidth = 1;
        context.stroke();
        context.fillStyle = palette.ink;
        context.textAlign = "center";
        context.textBaseline = "middle";
        context.fillText(label, tooltipX + tooltipWidth / 2, tooltipY + tooltipHeight / 2);
      }
    };

    canvas.addEventListener("pointermove", (event) => {
      if (!points.length) return;
      const rectangle = canvas.getBoundingClientRect();
      const pointerX = event.clientX - rectangle.left;
      hoveredIndex = points.reduce(
        (closest, point, index) =>
          Math.abs(point.x - pointerX) < Math.abs(points[closest].x - pointerX) ? index : closest,
        0,
      );
      render();
    });
    canvas.addEventListener("pointerleave", () => {
      hoveredIndex = -1;
      render();
    });

    renderers.push(render);
  }

  function initializeCategoryChart(canvas) {
    const items = Array.from(canvas.parentElement.querySelectorAll("[data-chart-series='categories'] li"));
    const data = items.map((item) => ({
      category: item.dataset.category,
      value: Number(item.dataset.value),
    }));

    const render = () => {
      const { context, width, height } = prepareCanvas(canvas);
      const palette = getPalette(canvas);
      const peak = Math.max(...data.map((item) => item.value), 1);
      const left = 62;
      const right = 28;
      const top = 8;
      const rowHeight = (height - top - 8) / data.length;
      const plotWidth = width - left - right;

      context.font = '11px "Space Grotesk", sans-serif';
      context.textBaseline = "middle";

      data.forEach((item, index) => {
        const centerY = top + rowHeight * index + rowHeight / 2;
        const barHeight = Math.min(12, rowHeight * 0.42);
        context.fillStyle = palette.muted;
        context.textAlign = "right";
        context.fillText(item.category, left - 8, centerY);

        roundedRectangle(context, left, centerY - barHeight / 2, plotWidth, barHeight, barHeight / 2);
        context.save();
        context.globalAlpha = 0.35;
        context.fillStyle = palette.line;
        context.fill();
        context.restore();

        const barWidth = (item.value / peak) * plotWidth;
        roundedRectangle(context, left, centerY - barHeight / 2, barWidth, barHeight, barHeight / 2);
        context.fillStyle = palette.accent;
        context.fill();

        context.fillStyle = palette.ink;
        context.textAlign = "left";
        context.fillText(String(item.value), Math.min(left + barWidth + 7, width - 12), centerY);
      });
    };

    renderers.push(render);
  }

  chartCanvases.forEach((canvas) => {
    if (canvas.dataset.impactChart === "citations") initializeCitationChart(canvas);
    if (canvas.dataset.impactChart === "categories") initializeCategoryChart(canvas);
  });

  const resizeObserver = new ResizeObserver(() => renderers.forEach((render) => render()));
  chartCanvases.forEach((canvas) => resizeObserver.observe(canvas));

  const themeObserver = new MutationObserver(() => renderers.forEach((render) => render()));
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "data-theme"] });
})();
