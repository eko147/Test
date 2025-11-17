import { DEBUG } from "@/data/global";

/**
 * Observable primitive value
 */
export default class Observable {

  #value;
  /**
   * @type {{
   * id: Number,
   * callback: (value: any) => void
   * }[]}
   */
  #listeners;
  #listenerId;
  static MAX_LISTENER = 20;


  /** @param {any} value */
  constructor(value) {
    this.#value = value;
    this.#listeners = [];
    this.#listenerId = 0;
  }

  get value() {
    return this.#value;
  }

  /**
   * @param {any} newValue
   */
  set value(newValue) {
    if (newValue != this.#value) {
      this.#value = newValue;
      this.#valueChanged();
    }
    else {
      this.#value = newValue;
    }
  }

  
  /** Call all listeners */
  #valueChanged() {
    this.#listeners.forEach(
      listener => listener.callback(this.#value)
    ) 
  }

  /** @param {(value: any) => void} listener */
  subscribe(listener) {
    if (this.#listeners.length >= Observable.MAX_LISTENER) {
      if (DEBUG.isDebug())
        console.error("max listener is exceeded");
      return -1;
    }
    const id = this.#listenerId++;
    this.#listeners.push({
      id,
      callback: listener
    });
    return id;
  }

  /** @param {Number} id */
  unSubscribe(id) {
    const found = this.#listeners.findIndex(
      e => e.id == id
    );
    if (found != -1) {
      this.#listeners.splice(found, 1); 
    }
  }
}
