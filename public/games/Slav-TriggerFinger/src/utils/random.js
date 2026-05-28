export function randomInt(max) {
  return Math.floor(Math.random() * max);
}

export function randomRange(min, max) {
  return min + Math.random() * (max - min);
}

export function randomChoice(items) {
  return items[randomInt(items.length)];
}

export function pickRandom(items, count) {
  const pool = [...items];
  const picked = [];

  while (picked.length < count && pool.length > 0) {
    const index = randomInt(pool.length);
    picked.push(pool.splice(index, 1)[0]);
  }

  return picked;
}
