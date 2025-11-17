#define TWO_PI 6.28318530718

uniform float uTime;

varying vec3 vColor;
varying float vAlpha;
varying float vTime;

mat2 get2dRotateMatrix(float _angle)
{
    return mat2(cos(_angle), - sin(_angle), sin(_angle), cos(_angle));

}

void main() {

  vec2 p = (gl_PointCoord - 0.5) * get2dRotateMatrix(sin(uTime * 0.5 * vAlpha) * TWO_PI) + 0.5;

  vec2 uv = vec2(
      p.x + sin(p.y * 50.) * 0.1,
      p.y + sin(p.x * 50.) * 0.1
      );

  float dist =  distance(uv, vec2(0.5));

  float strength = pow(0.5 - dist, 5.0);

  vec3 color = mix(vec3(0.0), vColor, strength);
  float alpha = sin(vAlpha + uTime * 0.25) + cos(vAlpha + uTime * 0.5);

  gl_FragColor = vec4(color, max(alpha, 0.25)); 

#include <colorspace_fragment>
}
