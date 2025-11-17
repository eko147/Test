export const EPSILON = 0.0001;

/** @param {Number} a
 *  @param {Number} b
 */
export function isEqualF(a, b) {
  const diff = a - b;
  if (diff < 0)
    return (diff > -EPSILON);
  return (diff < EPSILON);
}

/** @param {{
 *  x: Number,
 *  y: Number
 * }} a
 *  @param {{
 *  x: Number,
 *  y: Number
 *  }} b
 */
export function isEqual2D(a, b) {
  return (isEqualF(a.x, b.x) && isEqualF(a.y, b.y));
}

/**
 * distSquared.
 *
 * @param {{
 *  x: Number,
 *  y: Number
 * }} a
 * @param {{
 *  x: Number,
 *  y: Number
 * }} b
 */
export function distSquared2D(a, b) {
  return ((a.x - b.x) * (a.x - b.x) 
    + (a.y - b.y) * (a.y - b.y));
}

