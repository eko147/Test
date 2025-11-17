//@ts-nocheck
import { DEBUG } from "@/data/global";
import binding from "@/lib/binding";
import Observable from "@/lib/observable";
import ObservableObject from "@/lib/observable_object";
import View from "@/lib/view";

const DATA_BINDING_KEY = "data-bindingkey";
const DATA_BINDING_PATH = "data-bindingpath";
const DATA_EVENT_KEY = "data-eventkey";

/**
 * @typedef {{ [key: string]: 
 * { set?: () => void, get: () => any }
 * }} BindingParams
 */

/**
 * BindedView.
 * @extends {View}
 */
export default class BindedView extends View {

  /**
   * @type {BindingParams}   */
  #bindingParams; 

  /** @param {{data: any, bindingParams: BindingParams}} */
  constructor({data, bindingParams}) {
    super({data});
    this.#bindingParams = bindingParams;
  }

  connectedCallback() {
    super.connectedCallback();
    this.#bindElements();
  }

  /**
   * @param {Element} element 
   */
  #bindEvent(element) {
    const key = element.getAttribute(DATA_BINDING_KEY);
    const path = element.getAttribute(DATA_BINDING_PATH); 
    const eventKey = element.getAttribute(DATA_EVENT_KEY);
    const found = this.#bindingParams[key];
    if (!found || !(found.set)) {
      if (DEBUG.isDebug())
        console.error("fail to bind event ", key);
      return ;
    }
    element.addEventListener(eventKey, () => {
      found.set(element[path]);
    })
  }

  #bindElements() {
    const elements = this.querySelectorAll(`[${DATA_BINDING_KEY}]`)
    for (let i = elements.length - 1; i >= 0; i--) {
      const element = elements[i];
      if (!element.hasAttribute(DATA_BINDING_PATH))
        continue ;
      this.#bindElement(element);
      if (element.hasAttribute(DATA_EVENT_KEY)) {
        this.#bindEvent(element);
      }
    }
  }

  /**
   * @param {Element} element 
   */
  #bindElement(element) {
    const key = element.getAttribute(DATA_BINDING_KEY);
    const path = element.getAttribute(DATA_BINDING_PATH); 
    const found = this.#bindingParams[key];
    if (!found && DEBUG.isDebug()) {
      console.error("fail to bind ", key);
      return;
    }
    element[path] = found.get();
  }

  reRender() {
    super.reRender();
    this.#bindElements();
  }

}
