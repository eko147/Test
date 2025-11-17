uniform sampler2D uText;

varying vec2 vUv;
varying vec3 vNormal;

void main() {

  float intensity = 1.05 - dot(vNormal, vec3(0.0, 0.0, 1.0));
  vec3 atmosphere = vec3(0.3, 0.6, 1.0) * pow(intensity, 1.5);
  vec3 textColor = texture2D(uText, vUv).rgb;
  textColor += atmosphere;

  gl_FragColor = vec4(textColor, 1.0);

#include <colorspace_fragment>
}
