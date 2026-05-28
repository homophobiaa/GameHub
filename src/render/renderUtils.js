import { clamp } from "../utils/math.js";

export function hexToRgb(hex) {
  const rgbMatch = String(hex).match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
  if (rgbMatch) {
    return {
      r: Number(rgbMatch[1]),
      g: Number(rgbMatch[2]),
      b: Number(rgbMatch[3]),
    };
  }

  const clean = String(hex).replace("#", "");
  const value = Number.parseInt(clean.length === 3
    ? clean.split("").map((part) => part + part).join("")
    : clean, 16);

  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
}

export function mixHex(a, b, amount) {
  const from = hexToRgb(a);
  const to = hexToRgb(b);
  const mix = (start, end) => Math.round(start + (end - start) * amount);
  return `rgb(${mix(from.r, to.r)}, ${mix(from.g, to.g)}, ${mix(from.b, to.b)})`;
}

export function easeInOut(progress) {
  const t = clamp(progress, 0, 1);
  return t * t * (3 - 2 * t);
}
