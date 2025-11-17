import * as THREE from "three";
import Observable from "@/lib/observable";

export default class Timer {

  /**  @type {THREE.Clock} */
  #clock;
  #lastElapsedTime;
  #callbacks;
  #lastFrameId = null;

  /** @returns {number} */
  get elapsedTime() {
    return this.#lastElapsedTime.value;
  }

  constructor() {
    this.#clock = new THREE.Clock();
    this.#lastElapsedTime = new Observable(0);
    this.#clock.stop();
    this.#callbacks = [];
  }

  /** @param {(frameTime: number) => void} callback */
  onTick(callback) {
    this.#callbacks.push(callback); 
  }

  start() {
    if (this.#clock.running)
      return;
    this.#clock.start();
    this.#lastFrameId = window.requestAnimationFrame(() => this.#tick());
  }

  stop() {
    this.#callbacks = [];
    this.#clock.stop();
    if (this.#lastElapsedTime)
      window.cancelAnimationFrame(this.#lastFrameId);
  }

  #tick() {
    const current = this.#clock.getElapsedTime();
    const time = current - this.#lastElapsedTime.value;
    this.#lastElapsedTime.value = current;
    this.#lastFrameId = window.requestAnimationFrame(() => this.#tick());
    for (let callback of this.#callbacks) {
      callback(time);
    }
  }
}
