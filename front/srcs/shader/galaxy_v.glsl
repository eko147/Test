uniform float uTime;
uniform float uSize;
uniform vec2 uMaxRange;

attribute float aSpeed;
attribute float aScale;
attribute float aRandomness;

varying vec3 vColor;
varying float vAlpha;

vec2 movePosition(vec2 position) {

  float t = sin((uTime) * aSpeed) + aRandomness;

  float offsetX = (cos(t * 3.0) + sin(t * 0.5)) 
       * aSpeed;
  float offsetY = (cos(t * 2.0) + sin(t * 3.0)) 
     * aSpeed;
  vec2 dest = vec2(position.x + offsetX, position.y + offsetY);

  return dest;
}

void main() {

  vec4 modelPosition = modelMatrix * vec4(position, 1.0);
  vec2 movedPosition = movePosition(modelPosition.xy);
  modelPosition.xy = movedPosition.xy;
  vec2 isIn = vec2(
      step(-uMaxRange.x, movedPosition.x) 
      * step(movedPosition.x, uMaxRange.x),
      step(-uMaxRange.y, movedPosition.y) 
      * step(movedPosition.y, uMaxRange.y)
      );

  vec4 viewPosition = viewMatrix * modelPosition;
  vec4 projectedPosition = projectionMatrix  * viewPosition;
  gl_Position = projectedPosition;

  float dist = ( 1.0 / - viewPosition.z );
  gl_PointSize = uSize * dist * (aScale + sin(uTime) * 0.2);
  gl_PointSize *= (isIn.x * isIn.y);
  vColor = color;
  vAlpha = dist * aRandomness + aSpeed;
}
