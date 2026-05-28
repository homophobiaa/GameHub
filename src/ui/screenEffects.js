import { ENEMY_BREACH_Y } from "../config/gameplay.js";

export function playShockwaveScreenEffect({ screenEffects, sceneEl, canvas, renderer }) {
  if (!screenEffects || !sceneEl || !canvas || !renderer) {
    return;
  }

  const sceneRect = sceneEl.getBoundingClientRect();
  const canvasRect = canvas.getBoundingClientRect();
  const x = canvasRect.left - sceneRect.left + renderer.arena.x + renderer.arena.width / 2;
  const y = canvasRect.top - sceneRect.top + renderer.yToScreen(ENEMY_BREACH_Y);
  const finalDiameter = Math.hypot(sceneRect.width, sceneRect.height) * 2;
  const startSize = 46;
  const ring = document.createElement("span");
  ring.className = "shockwave-screen-ring";
  ring.style.left = `${x}px`;
  ring.style.top = `${y}px`;
  ring.style.setProperty("--shockwave-scale", `${finalDiameter / startSize}`);
  screenEffects.append(ring);
  ring.addEventListener("animationend", () => ring.remove(), { once: true });
}
