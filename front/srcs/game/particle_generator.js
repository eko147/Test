import * as THREE from "three";
import { hexToRGB } from "@/utils/color_util";
import * as THREE_UTIL from "@/utils/three_util";

/**
 * Particles.
 */
export default class ParticleGenerator {

  static shaderPath = {
    vertex: "srcs/shader/galaxy_v.glsl",
    fragment: "srcs/shader/galaxy_f.glsl",
  }

  /** @type {THREE_UTIL.ShaderLoadContext} */
  static #shaderLoad = THREE_UTIL.createLoadShaderContext(ParticleGenerator.shaderPath);

  /** @type {THREE.Group} */
  #particleContainer;

  /** @type {number} */
  count;

  #useShader;

  /** @type {number} */
  particleSize;

  /** @type {THREE.Points} */
  #particles;

  /** @type {boolean} */
  isPlaying;

  /** @type {{
      x: number, 
      y: number, 
      z: number
    }}
    */
  maxSize;

  /** @type {number[][] | null} */
  #colors = null;

  animationConfig = {
    speedCoefficient: 0.1,
    randomCoefficent: 2.0,
  }

  /**
   * constructor.
   *
   * @params {{
   *   size: {
   *    x: number,
   *    y: number,
   *    z: number
   *   },
   *   count: number,
   *   useShader: boolean,
   *   particleSize: number,
   *   maxSize?: {
   *    x: number,
   *    y: number,
   *    z: number
   *   },
   * }}
   */
  constructor({
    count,
    particleSize,
    useShader = true,
    maxSize = null,
  }) {
    THREE_UTIL.loadShaders(ParticleGenerator.#shaderLoad);
    this.count = count;
    this.particleSize = particleSize;
    this.#particleContainer = new THREE.Group();
    this.#useShader = useShader;
    this.maxSize = maxSize;
    this.isPlaying = true;
  }

  /** @param {string[]} colors */
  setColor(colors) {
    this.#colors = colors.map(c => {
      if (c[0] != "#") {
        return (hexToRGB("#" + c.toLowerCase()));
      }
      return hexToRGB(c.toLowerCase());
    })
  }

  /** createParticles. */
  async createParticles() {
    const isLoaded = await ParticleGenerator.#shaderLoad.isLoaded;
    if (!isLoaded)
      return ;

    const buffer = new THREE.BufferGeometry()
    const vertices = new Float32Array(this.count * 3);
    const colors = this.#colors ? new Uint8Array(this.count * 3): new Float32Array(this.count * 3);
    const speeds = new Float32Array(this.count);
    const randomness = new Float32Array(this.count);
    const scales = new Float32Array(this.count);

    const maxSize = this.maxSize ?? {
      x: 10, 
      y: 10, 
      z: 10
    };
    for (let i3 = 0; i3 < this.count; ++i3) {
      //xyz
      const x =  (Math.random() - 0.5) * maxSize.x;
      const y = (Math.random() - 0.5) * maxSize.y;
      const z = (Math.random() - 0.5) * maxSize.z;
      vertices[i3] = x;
      vertices[i3 + 1] = y;
      vertices[i3 + 2] = z;

      // rgb
      if (this.#colors) {
        const color = this.#colors[i3 % this.#colors.length];
        colors[i3 ] = color[0];
        colors[i3 + 1]  = color[1];
        colors[i3 + 2]  = color[2];
      }
      else {
        colors[i3] = Math.random(); 
        colors[i3 + 1] = Math.random();
        colors[i3 + 2] = Math.random();
      }

      //animate

      speeds[i3] = Math.max(Math.random(), 0.5) * this.animationConfig.speedCoefficient * (i3 > this.count * 0.5 ? 1: -1);
      randomness[i3] = (Math.random() - 0.5) * this.animationConfig.randomCoefficent; 
      scales[i3] = Math.max(Math.random(), 0.5);
    }

    buffer.setAttribute("position",
      new THREE.BufferAttribute(vertices, 3)
    );
    buffer.setAttribute("color",
      new THREE.BufferAttribute(colors, 3)
    );
    buffer.setAttribute("aSpeed",
      new THREE.BufferAttribute(speeds, 1)
    );
    buffer.setAttribute("aRandomness",
      new THREE.BufferAttribute(randomness, 1)
    );
    buffer.setAttribute("aScale",
      new THREE.BufferAttribute(scales, 1)
    );

    let material;
    const shaders = ParticleGenerator.#shaderLoad.loadedShader;

    const fragmentShader = this.#useShader ? 
      shaders.fragment: `
      varying vec3 vColor;
      void main() {
        float dist = 1.0 - distance(gl_PointCoord, vec2(0.5));
        float strength = pow(dist, 10.0) * 2.0;
        gl_FragColor = vec4(vColor, strength);
        #include <colorspace_fragment>
      }
    `;

    material = new THREE.ShaderMaterial({
      vertexShader: shaders.vertex,
      fragmentShader: fragmentShader,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
      vertexColors: true,
      uniforms: {
        uTime: { value: 0.0 },
        uSize: { value: this.particleSize },
        uMaxRange: { 
          value: new THREE.Vector2(maxSize.x * 0.5, maxSize.y * 0.5) },
      }
    });
    this.#particles = new THREE.Points(buffer, material);
    this.#particleContainer.add(this.#particles);
    return this;
  }

  getParticles() {
    return this.#particleContainer;
  }

  remove() {
    this.#particles.removeFromParent();
    this.#particleContainer.remove();
  }

  /**
   * animate.
   */
  animate(frameTime) {
    if (!this.isPlaying || !this.#particles)
      return;

    /** @type { THREE.ShaderMaterial } */
    const material = this.#particles.material;
    material.uniforms.uTime.value += frameTime;
  }
}

