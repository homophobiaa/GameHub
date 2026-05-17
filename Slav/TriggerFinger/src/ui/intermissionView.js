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

  renderIntermission(options) {
    const scrollState = this.captureScroll();
    this.overlay.hidden = false;
    this.overlay.innerHTML = renderIntermissionPanel(options);
    this.restoreScroll(scrollState);
  }

  renderGameOver(score, waveIndex) {
    this.overlay.hidden = false;
    this.overlay.innerHTML = renderGameOverPanel(score, waveIndex);
  }

  clear() {
    this.overlay.innerHTML = "";
  }

  hide() {
    this.overlay.hidden = true;
  }
}
