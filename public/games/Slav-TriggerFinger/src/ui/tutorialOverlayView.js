const DEFAULT_HIGHLIGHT_PADDING = 14;
const DEFAULT_TOOLTIP_WIDTH = 340;
const DEFAULT_TOOLTIP_GAP = 28;
const DEFAULT_SCREEN_PADDING = 12;
const DEFAULT_SCRIM_OPACITY = 0.58;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function rectToLocal(rect, bounds) {
  return {
    left: rect.left - bounds.left,
    top: rect.top - bounds.top,
    right: rect.right - bounds.left,
    bottom: rect.bottom - bounds.top,
    width: rect.width,
    height: rect.height,
  };
}

function normalizeRect(rect) {
  const left = Math.min(rect.left, rect.right ?? rect.left + rect.width);
  const right = Math.max(rect.right ?? rect.left + rect.width, rect.left);
  const top = Math.min(rect.top, rect.bottom ?? rect.top + rect.height);
  const bottom = Math.max(rect.bottom ?? rect.top + rect.height, rect.top);
  return {
    left,
    top,
    right,
    bottom,
    width: right - left,
    height: bottom - top,
  };
}

function unionRects(rects) {
  return normalizeRect({
    left: Math.min(...rects.map((rect) => rect.left)),
    top: Math.min(...rects.map((rect) => rect.top)),
    right: Math.max(...rects.map((rect) => rect.right)),
    bottom: Math.max(...rects.map((rect) => rect.bottom)),
  });
}

function rectFromSource({ container, bounds, source }) {
  if (source.targetRect) {
    return normalizeRect(source.targetRect.isLocal
      ? source.targetRect
      : rectToLocal(source.targetRect, bounds));
  }

  if (!source.targetSelector) {
    return null;
  }

  const target = container.querySelector(source.targetSelector);
  return target ? normalizeRect(rectToLocal(target.getBoundingClientRect(), bounds)) : null;
}

function localCalloutFromStep({ container, bounds, step }) {
  const sources = Array.isArray(step.targetRects)
    ? step.targetRects.map((targetRect) => ({ targetRect }))
    : [step];
  const highlightRects = sources
    .map((source) => rectFromSource({ container, bounds, source }))
    .filter(Boolean);
  if (highlightRects.length === 0) {
    return null;
  }

  const anchorRect = step.anchorRect
    ? rectFromSource({ container, bounds, source: { targetRect: step.anchorRect } })
    : null;
  return {
    step,
    rect: anchorRect ?? unionRects(highlightRects),
    highlightRects,
  };
}

function localCalloutsFromStep({ container, bounds, step }) {
  const rawCallouts = Array.isArray(step.callouts) ? step.callouts : [step];
  return rawCallouts
    .map((callout) => localCalloutFromStep({
      container,
      bounds,
      step: {
        ...step,
        ...callout,
        dim: callout.dim ?? step.dim,
        blocking: callout.blocking ?? step.blocking,
        scrimOpacity: callout.scrimOpacity ?? step.scrimOpacity,
      },
    }))
    .filter(Boolean);
}

function padRect(rect, bounds, padding = DEFAULT_HIGHLIGHT_PADDING) {
  return {
    left: clamp(rect.left - padding, 0, bounds.width),
    top: clamp(rect.top - padding, 0, bounds.height),
    right: clamp(rect.right + padding, 0, bounds.width),
    bottom: clamp(rect.bottom + padding, 0, bounds.height),
  };
}

function rectsOverlap(a, b) {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

function subtractRect(source, hole) {
  if (!rectsOverlap(source, hole)) {
    return [source];
  }

  const overlap = {
    left: clamp(hole.left, source.left, source.right),
    right: clamp(hole.right, source.left, source.right),
    top: clamp(hole.top, source.top, source.bottom),
    bottom: clamp(hole.bottom, source.top, source.bottom),
  };
  const pieces = [
    { left: source.left, top: source.top, width: source.width, height: overlap.top - source.top },
    { left: source.left, top: overlap.bottom, width: source.width, height: source.bottom - overlap.bottom },
    { left: source.left, top: overlap.top, width: overlap.left - source.left, height: overlap.bottom - overlap.top },
    { left: overlap.right, top: overlap.top, width: source.right - overlap.right, height: overlap.bottom - overlap.top },
  ];

  return pieces
    .filter((piece) => piece.width > 0 && piece.height > 0)
    .map((piece) => normalizeRect({
      left: piece.left,
      top: piece.top,
      right: piece.left + piece.width,
      bottom: piece.top + piece.height,
    }));
}

function scrimStyle({ left, top, width, height }, opacity) {
  return `left:${left}px;top:${top}px;width:${Math.max(0, width)}px;height:${Math.max(0, height)}px;--tutorial-scrim-opacity:${opacity};`;
}

function renderScrims(rects, bounds, opacity = DEFAULT_SCRIM_OPACITY) {
  let scrims = [normalizeRect({
    left: 0,
    top: 0,
    right: bounds.width,
    bottom: bounds.height,
  })];
  rects.forEach((rect) => {
    scrims = scrims.flatMap((scrim) => subtractRect(scrim, rect));
  });

  return scrims
    .map((scrim) => `<span class="game-tutorial-scrim" style="${scrimStyle(scrim, opacity)}"></span>`)
    .join("");
}

function tooltipPosition(rect, bounds, step) {
  const screenPadding = step.screenPadding ?? DEFAULT_SCREEN_PADDING;
  const gap = step.tooltipGap ?? DEFAULT_TOOLTIP_GAP;
  const width = Math.min(step.tooltipWidth ?? DEFAULT_TOOLTIP_WIDTH, bounds.width - screenPadding * 2);
  const placement = step.placement ?? "right";
  let left = rect.right + gap;
  let top = rect.top;

  if (placement === "below") {
    left = rect.left + rect.width / 2 - width / 2;
    top = rect.bottom + gap;
  } else if (placement === "above") {
    left = rect.left + rect.width / 2 - width / 2;
    top = rect.top - (step.tooltipAboveOffset ?? 132);
  }

  if (left + width > bounds.width - screenPadding) {
    left = rect.left - width - gap;
  }

  if (left < screenPadding) {
    left = clamp(
      rect.left + rect.width / 2 - width / 2,
      screenPadding,
      bounds.width - width - screenPadding,
    );
  }

  if (top < screenPadding) {
    top = rect.bottom + gap;
  }

  return {
    left: clamp(
      left + (step.tooltipOffsetX ?? 0),
      screenPadding,
      Math.max(screenPadding, bounds.width - width - screenPadding),
    ),
    top: clamp(
      top + (step.tooltipOffsetY ?? 0),
      screenPadding,
      Math.max(screenPadding, bounds.height - (step.tooltipHeightEstimate ?? 150)),
    ),
    width,
  };
}

export function clearTutorialOverlay(container) {
  container?.querySelector("[data-game-tutorial-layer]")?.remove();
}

export function renderReadyCheckTutorialOverlay({ container, layerContainer = container, step }) {
  clearTutorialOverlay(layerContainer);
  if (!container || !layerContainer || !step) {
    return;
  }

  const bounds = layerContainer.getBoundingClientRect();
  const callouts = localCalloutsFromStep({ container, bounds, step });
  if (callouts.length === 0) {
    return;
  }

  const highlightRects = callouts.flatMap((callout) =>
    callout.highlightRects.map((rect) =>
      padRect(rect, bounds, callout.step.highlightPadding ?? DEFAULT_HIGHLIGHT_PADDING)
    )
  );
  const layer = document.createElement("div");
  layer.className = `game-tutorial-layer ${step.blocking ? "is-blocking" : ""}`;
  layer.dataset.gameTutorialLayer = "";
  layer.dataset.tutorialReadyStep = step.id;
  layer.innerHTML = `
    ${step.dim ? renderScrims(highlightRects, bounds, step.scrimOpacity ?? DEFAULT_SCRIM_OPACITY) : ""}
    ${step.dim
      ? highlightRects
        .map((rect) => `<span class="game-tutorial-highlight" style="left:${rect.left}px;top:${rect.top}px;width:${rect.right - rect.left}px;height:${rect.bottom - rect.top}px"></span>`)
        .join("")
      : ""}
    ${callouts.map((callout) => {
      const tip = tooltipPosition(callout.rect, bounds, callout.step);
      return `
        <aside
          class="game-tutorial-tooltip"
          style="left:${tip.left}px;top:${tip.top}px;width:${tip.width}px"
        >
          <p>${escapeHtml(callout.step.text)}</p>
          ${callout.step.counter
            ? `<strong class="game-tutorial-counter">${escapeHtml(callout.step.counter.current)}/${escapeHtml(callout.step.counter.total)}</strong>`
            : ""}
          ${callout.step.hint ? `<small>${escapeHtml(callout.step.hint)}</small>` : ""}
        </aside>
      `;
    }).join("")}
  `;
  layerContainer.append(layer);
}
