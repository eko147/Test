import * as THREE from "three";

/** @param {THREE.Vector3} hsb
 * */
export function hsb2rgb(hsb) {
  let r, g, b, i, f, p, q, t;
  let h = hsb.x;
  let s = hsb.y;
  let v = hsb.z;
  i = Math.floor(h * 6);
  f = h * 6 - i;
  p = v * (1 - s);
  q = v * (1 - f * s);
  t = v * (1 - (1 - f) * s);
  switch (i % 6) {
    case 0: r = v, g = t, b = p; break;
    case 1: r = q, g = v, b = p; break;
    case 2: r = p, g = v, b = t; break;
    case 3: r = p, g = q, b = v; break;
    case 4: r = t, g = p, b = v; break;
    case 5: r = v, g = p, b = q; break;
  }
  return new THREE.Vector3(
    Math.round(r * 255),
    Math.round(g * 255),
    Math.round(b * 255)
  );
}

export function hexToRGB(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);

  return [r, g, b];
}

