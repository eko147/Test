import * as THREE from "three";
import View from "@/lib/view";
import { hsb2rgb } from "@/utils/color_util";
import Observable from "@/lib/observable";
import * as THREE_UTIL from "@/utils/three_util";
import { DEBUG } from "@/data/global";

const DEFAULT_SIZE = {
  width: 200,
  height: 200,
};


export default class ColorPicker extends View {

  static shaderPath = {
    vertex: "srcs/shader/color_picker_v.glsl",
    fragment: "srcs/shader/color_picker_f.glsl",
  }

  /** @type {THREE_UTIL.ShaderLoadContext} */
  static #shaderLoad = THREE_UTIL.createLoadShaderContext(ColorPicker.shaderPath);

  /** @type {{ width: number, height: number }} */
  #size;
  /** @type {HTMLDivElement} */
  #container;
  /** @type {HTMLCanvasElement} */
  #picker;
  #material;
  #renderer;
  #pickedColor;
  #onPickColor;

  /** @param {{ 
   *   color?: Observable,
   *   onPickColor: 
   *   (color: {r: number, g: number, b: number}) => void,
   *   size?: {
   *    width: number,
   *    height:number
   *   },
   *   }} params */
  constructor({color= null, onPickColor, size = DEFAULT_SIZE}) {
    super();
    THREE_UTIL.loadShaders(ColorPicker.#shaderLoad);
    if (color) {
      this.#pickedColor = color;
    }
    else {
      this.#pickedColor = new Observable({
        r: 255,
        g: 255,
        b: 255
      });
    }
    this.#onPickColor = onPickColor;
    this.#size = size ?? DEFAULT_SIZE;
    this.#pickedColor.subscribe(color => {
      this.#onColorChange(color)
    })
  }

  connectedCallback() {
    super.connectedCallback();
    /** @type {HTMLElement} */
    this.#container = this.querySelector("#picker-container");
    this.#container.style.width = this.#size.width + "px";
    this.#container.style.height= this.#size.height + "px";

    this.#drawColors()
      .then(() => {
        this.#addEventListener();
        const color = this.#pickedColor.value;
        this.#picker.style.borderColor = 
          `rgba(${color.r}, ${color.g}, ${color.b}, 1)`;
      });
  }

  async #drawColors() {
    const isLoaded = await ColorPicker.#shaderLoad.isLoaded;
    if (!isLoaded) {
      if (DEBUG.isDebug())
        console.error("shader not loaded");
      return ;
    }
    const geometry = new THREE.PlaneGeometry(2, 2, 1, 1);
    geometry.setAttribute
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    camera.position.z = 0.2;
    const u_resolution = new THREE.Vector2(
      this.#size.width,
      this.#size.height
    );
    const shaders = ColorPicker.#shaderLoad.loadedShader;
    this.#material = new THREE.ShaderMaterial({
      uniforms: {
        u_resolution: { value: u_resolution },
      },
      vertexShader: shaders.vertex,
      fragmentShader: shaders.fragment
    });
    this.#material.needsUpdate = true;
    const mesh = new THREE.Mesh(geometry, this.#material);
    const scene = new THREE.Scene();
    scene.add(mesh);
    this.#renderer = new THREE.WebGLRenderer({
      antialias: false,
      alpha: false
    });
    this.#renderer.setPixelRatio( window.devicePixelRatio );
    this.#renderer.setSize(this.#size.width, this.#size.height);
    this.#picker = this.#renderer.domElement;
    this.#picker.id = "picker";
    this.#container.appendChild(this.#picker);
    this.#renderer.render(scene, camera);
  }

  #addEventListener() {
    this.#container.addEventListener("click", 
      event => {
        this.#pickColor(event.offsetX + 2, event.offsetY + 2);
      })
  }

  /** @param {number} pointX 
   *  @param {number} pointY
   */
  #pickColor(pointX, pointY) {
    const normalized = {
      x: pointX / this.#size.width,
      y: (this.#size.height - pointY) / this.#size.height
    };
    normalized.y -= 0.1;
    const toCenter = {
      x: normalized.x - 0.5,
      y: normalized.y - 0.5
    };
    let angle = Math.atan2(toCenter.y, toCenter.x);
    let radius = Math.sqrt(toCenter.x * toCenter.x + toCenter.y * toCenter.y) * 2.0;
    if (angle < 0) 
      angle += Math.PI * 2.0;

    const color = hsb2rgb(
      new THREE.Vector3(
        angle/(Math.PI * 2.0), 
        radius,
        1.0
      ));
    this.#pickedColor.value = {
      r: color.x,
      g: color.y,
      b: color.z
    };
  }

  #onColorChange(color) {
    this.#picker.style.borderColor = 
      `rgba(${color.r}, ${color.g}, ${color.b}, 1)`;
    if (this.#onPickColor) {
      this.#onPickColor(color);
    }
  }
}
