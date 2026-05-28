import { renderGameOverPanel, renderIntermissionPanel } from "./intermissionPanel.js";

const SCROLLABLE_SELECTORS = [
  ".upgrade-panel",
  ".intermission-shell",
  ".store-menu",
  ".store-choice-list",
  ".editor-tab",
  ".debug-menu",
];

export class IntermissionView {
  constructor(overlay) {
    this.overlay = overlay;
  }

  getScrollableNodes() {
    return SCROLLABLE_SELECTORS.flatMap((selector) =>
      [...this.overlay.querySelectorAll(selector)].map((node, index) => ({
        selector,
        index,
        node,
      })),
    );
  }

  captureScroll() {
    return this.getScrollableNodes().map(({ selector, index, node }) => ({
      selector,
      index,
      top: node.scrollTop,
      left: node.scrollLeft,
    }));
  }

  restoreScroll(scrollState) {
    if (!scrollState?.length) {
      return;
    }

    const apply = () => {
      scrollState.forEach(({ selector, index, top, left }) => {
        const node = this.overlay.querySelectorAll(selector)[index];
        if (node) {
          node.scrollTop = top;
          node.scrollLeft = left;
        }
      });
    };

    apply();
    if (typeof requestAnimationFrame === "function") {
      requestAnimationFrame(apply);
    }
  }

  playEnterAnimation() {
    const panel = this.overlay.querySelector(".upgrade-panel");
    if (!panel) {
      return;
    }

    this.overlay.classList.remove("is-entering");
    panel.classList.remove("is-entering");
    void panel.offsetWidth;
    this.overlay.classList.add("is-entering");
    panel.classList.add("is-entering");

    panel.addEventListener("animationend", () => {
      panel.classList.remove("is-entering");
    }, { once: true });

    window.setTimeout(() => {
      this.overlay.classList.remove("is-entering");
    }, 240);
  }

  renderIntermission(options) {
    const shouldAnimate = this.overlay.hidden;
    const scrollState = this.captureScroll();
    this.overlay.hidden = false;
    this.overlay.innerHTML = renderIntermissionPanel(options);
    if (shouldAnimate) {
      this.playEnterAnimation();
    }
    this.restoreScroll(scrollState);
  }

  renderGameOver(score, waveIndex) {
    const shouldAnimate = this.overlay.hidden;
    this.overlay.hidden = false;
    this.overlay.innerHTML = renderGameOverPanel(score, waveIndex);
    if (shouldAnimate) {
      this.playEnterAnimation();
    }
  }

  clear() {
    this.overlay.innerHTML = "";
  }

  hide() {
    this.overlay.hidden = true;
    this.overlay.classList.remove("is-entering");
  }
}
