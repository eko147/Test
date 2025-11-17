import { DEBUG } from "@/data/global";
import Observable from "@/lib/observable";
import ObservableObject from "@/lib/observable_object";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";

/** @typedef {"AUDIO" | "GLTF" | "TEXTURE" } ASSET_TYPE */

export default class Asset {
  #textureLoader;
  #gltfLoader;

  /** @type {Asset} */
  static #_shared;
  static get shared() {
    if (!this.#_shared) {
      return new Asset();
    }
    return this.#_shared;
  }

  /** @type {{
   * [key in string]: ASSET_TYPE
   * }} */
  static type = Object.freeze({
    audio: "AUDIO",
    gltf: "GLTF",
    texture: "TEXTURE",
  });

  #_toLoad;
  #_loadedCount;
  #loaded;

  get toLoad() {
    return this.#_toLoad.value;
  }

  get loadedCount() {
    return this.#_loadedCount.value;
  }

  get loadedPercentage() {
    if (this.#_toLoad.value == 0) 
      return 1;
    return (this.#_loadedCount.value / this.#_toLoad.value);
  }

  /** @param {(count: number) => void} callback */
  onStartLoad(callback) {
    this.#_toLoad.subscribe((total) => {
      callback(total);
    })
  }

  /** @param {(count: number) => void} callback */
  onLoaded(callback) {
    this.#_loadedCount.subscribe((loadedCount) => {
      callback(loadedCount);
    })
  }

  /** @param {ASSET_TYPE} type
   *  @param {string} path
   */
  get(type, path) {
    if (this.#loaded[path])
      return this.#loaded[path];
    switch (type) {
      case (Asset.type.audio):
        this.#loaded[path] = new Audio(path);
        break;
      case (Asset.type.texture):
        this.#loaded[path] = this.#textureLoader.load(path);
        break;
      default:
        if (DEBUG.isDebug())
          console.error(path, "is not loaded");
        return null;
    }
    return this.#loaded[path]; 
  }

  /** @param {{
   *    path: string,
   *    onLoad: (loaded: any) => void
   *    type: ASSET_TYPE
   *   }} params
   */
  async load({ path, onLoad, type }) {
    this.#_toLoad.value += 1;
    if (!this.#loaded[path])
      switch (type) {
        case (Asset.type.audio):
          this.get(type, path);
          break;
        case (Asset.type.gltf):
          this.#loaded[path] = 
            await this.#gltfLoader.loadAsync(path)
            .catch(err => {
              if (DEBUG.isDebug())
                console.error(err);
            })
          break;
        case (Asset.type.texture):
          this.#loaded[path] = 
            await this.#textureLoader.loadAsync(path)
            .catch(err => {
              if (DEBUG.isDebug())
                console.error(err);
            })
          break;
      }
    this.#_loadedCount.value += 1;
    onLoad(this.#loaded[path]);
    return this.#loaded[path];
  }

  constructor() {
    if (Asset.#_shared) 
      return Asset.#_shared
    this.#textureLoader = new THREE.TextureLoader()
    this.#gltfLoader = new GLTFLoader();
    this.#_toLoad = new Observable(0);
    this.#_loadedCount = new Observable(0);
    this.#loaded = new ObservableObject({});
    Asset.#_shared = this;
  }
};

