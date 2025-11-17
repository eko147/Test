varying vec2 vUv;
varying vec3 vNormal;

void main() {
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  vUv = vec2(uv.x, uv.y);
  vNormal = normalize(normalMatrix * normal);
}
