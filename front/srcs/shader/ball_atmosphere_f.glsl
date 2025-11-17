uniform float uGlow;
varying vec3 vNormal;

void main() {

  float intensity = pow(dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
  vec3 atmosphere = vec3(0.3, 0.6 + uGlow, 1.0) * intensity;
  float alpha = intensity * step(0.1, 1.0 - intensity);

  gl_FragColor = vec4(atmosphere, alpha);

  #include <colorspace_fragment>
}
