import View from "@/lib/view";
import MapImageGenarator from "@/game/map_image_generator";
import { GameMap, examples } from "@/data/game_map";
import ASSET_PATH from "@/assets/path";


export default class MapSelector extends View {

  /** @type HTMLElement */
  #container;
  /** @type HTMLElement */
  #background;
  canvasSize = {
    width: 256,
    height: 256
  };

  constructor(params) {
    super();
  }

  hide() {
    const parent = this.parentNode;
    if (parent) {
      parent.style.display = "none";
    }
    else {
      this.#background.style.visibility = "hidden";
    }
  }

  connectedCallback() {
    super.connectedCallback();
    this.#container = this.querySelector("#map-selector-container");
    this.#background = this.querySelector("#map-selector-background");

    this.querySelector("#map-selector-close-button")
      .addEventListener("click", () => this.hide());
    this.#drawMaps();
  }

  async #drawMaps() {
    const mapGenerator = new MapImageGenarator({
      size: this.canvasSize
    });
    const textureName = "brick";
    await mapGenerator.loadTexture([{
      name: textureName,
      path: ASSET_PATH.getTexture.color(textureName)  
    }]);
    for (let {map, textureName} of examples) {
      const image = mapGenerator.generate({map, textureName});
      const canvas = document.createElement("canvas");
      canvas.dataset.map = JSON.stringify(map.allWalls); 
      canvas.classList.add("map-preview");
      const ctx = canvas.getContext("bitmaprenderer");
      ctx.transferFromImageBitmap(image);
      this.#container.append(canvas); 
      image.close();
    }
  }

  showMap(map) {
  }

  disconnectedCallback() {
    super.disconnectedCallback();
  }
}
