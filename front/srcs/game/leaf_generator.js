import * as THREE from "three";
import { Animation, AnimationCurves } from "@/game/animation";
import { Vector3 } from "three";
import Asset from "@/game/asset";
import ASSET_PATH from "@/assets/path";

/** LeafGenerator. */
export default class LeafGenerator {

  /** @type {THREE.Group} */
  #cacheLeaf = null;
  leafScale = 0.001;
  speed = 0.003;

  #_isEnd = true;

  /** @type {number} */
  duration;

  /** @type {{
   *  [key in number]: {
   *    rotating: Animation,
   *    falling: Animation,
   *    factor: number,
   *    leaf: THREE.Group
   *  }
   * }} */
  #leaves = {};

  /** constructor. */
  constructor() {
    this.duration = 1.5;
  }

  /** @param {{
   *   container: THREE.Mesh,
   *   count: number,
   *   startY: number,
   *   endY: number,
   * }} params */
  generate({ 
    container, 
    count,
    startY, 
    endY }) {
    if (!this.#cacheLeaf)
      return ;
    const bound =  {
      x: 10,
      y: startY - endY,
      z: 10
    }
    for (let i = 0; i < count; i++) {
      const newLeaf = this.#createLeaf({
        bound,
        index: i
      });
      this.#leaves[i] = newLeaf;
      container.add(newLeaf.leaf);
    }
    this.#_isEnd = false;
  }

  /** @param {{ 
   *  bound: {
   *   x: number, 
   *   y: number, 
   *   z: number
   *  },
   *  index: number
   * }} params */
  #createLeaf({bound, index}) {

    const mesh = this.#cacheLeaf.clone();
    const scale = this.leafScale * THREE.MathUtils.randFloat(0.5, 1.5);
    mesh.scale.set(scale, scale, scale);
    const startAngle = {
      x: (Math.random() - 0.5) * Math.PI,
      y: (Math.random() - 0.5) * Math.PI,
      z: (Math.random() - 0.5) * Math.PI,
    };
    const endAngle = {
      x: startAngle.x * THREE.MathUtils.randInt(5, 10) * Math.PI,
      y: (Math.random() - 0.5) * Math.PI,
      z: (Math.random() - 0.5) * Math.PI
    };
    mesh.position.set(
      (Math.random() - 0.5) * bound.x,
      THREE.MathUtils.randFloat(0.8, 1.5) * bound.y,
      (Math.random() - 0.5) * bound.z
    );
    mesh.rotation.set(
      (Math.random() - 0.5) * Math.PI,
      (Math.random() - 0.5) * Math.PI,
      (Math.random() - 0.5) * Math.PI,
    )
    return ({
      leaf: mesh,
      rotating: new Animation({
        start: new Vector3(
          startAngle.x,
          startAngle.y,
          startAngle.z
        ),
        end: new Vector3(
          endAngle.x,
          endAngle.y,
          endAngle.z,
        ),
        repeat: true,
        key: "leafRotation" + index,
        curve: AnimationCurves.smoothstep
      }),
      falling: new Animation({
        start: mesh.position.clone(),
        end: new Vector3(
          mesh.position.x + (Math.random() - 0.5) * bound.x * 0.5,
          0,
          mesh.position.z + (Math.random() - 0.5) * bound.z * 0.5),
        repeat: false,
        key: "leafFalling" + index,
        curve: AnimationCurves.smoothstep,
      }),
      factor: THREE.MathUtils.randFloat(0.5, 1.5),
    });
  }

  get isEnd() {
    return this.#_isEnd;
  }

  animate() {
    if (this.#_isEnd)
      return ;
    Object.entries(this.#leaves).forEach(([key, {
      leaf,
      falling,
      rotating,
      factor
    }]) => {
      const speed = this.speed * factor;
      falling.proceed(speed)
      rotating.proceed(speed);
      const position = falling.current;
      const rotation = rotating.current;
      leaf.position.set(
        position.x,
        position.y,
        position.z
      );
      leaf.rotation.set(
        rotation.x,
        rotation.y,
        rotation.z
      );
      if (falling.isFinished) {
        this.#leaves[key].leaf.removeFromParent()
        delete this.#leaves[key];
      }
    })
  }

  /**
   * load.
   */
  load() {
    Asset.shared.load({
      type: "GLTF",
      path: ASSET_PATH.leaf,
      onLoad: (gltf) => {
        const leaf = gltf.scene;
        const material = new THREE.MeshLambertMaterial({
          color: "#4CAF50"
        });

        leaf.traverse(/** @param {THREE.Object3D} child */child => {
          if (child instanceof THREE.Mesh && 
            child.isMesh) {
            child.material = material;
          }
        })
        this.#cacheLeaf = leaf;
      }
    })
  }
}
