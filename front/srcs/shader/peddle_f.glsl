uniform vec3 uColor;
uniform float uIsFront;
uniform float uHit;

varying vec2 vUv;

float checkIsInner() {
  float isInner = (1.0 - step(0.95, vUv.x)) * step(0.05, vUv.x);

  #ifdef FRONT
    isInner *= 1.0 - step(0.35, abs(0.5 - vUv.y));
  #endif
  #ifdef ABOVE
    isInner *= 1.0 - step(0.8, vUv.y); 
  #endif
  #ifdef BELOW
    isInner *= step(0.2, vUv.y); 
  #endif

  return isInner;
}

void main() {
  vec3 color = vec3(0.0);
  float isInner = checkIsInner();
  float dist = abs(0.5 - vUv.x) + 0.5;
  color += (1.0 - isInner) * uColor;
  color += max(0.3, uHit * pow(dist, 3.0) * 2.0) * uColor ;
  gl_FragColor = vec4(color, 1.0);
}
