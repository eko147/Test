import View from "@/lib/view";
import GraphData from "@/data/graph";

export default class GraphView extends View {

  /** @type { GraphData } */
  #graphData;
  /** @type { HTMLCanvasElement } */
  #canvas;
  /** @type {{
   *  width: number,
   *  height: number
   * }}
   */
  #size;
  #axies;
  /** @type {{
   *  width: number,
   *  height: number
   * }}
   */
  #innerSize;
  /** @type { CanvasRenderingContext2D } */
  #ctx;
  #config = {
    axisColor: "#dedede",
    axisWidth: 4,
    labelColor: "#000000",
    labelFont : "20px Sans-serif",
    axisFont: "10px Sans-serif",
  };

  constructor({data}) {
    super();
    const analytics = data.analytics;
    this.#graphData = analytics.createGraph()[0];
    this.#axies = this.#graphData.axies;
  }

  connectedCallback() {
    super.connectedCallback();
    this.#canvas = this.querySelector("#graph-canvas");  
    this.#size = { 
      width: this.#canvas.width,
      height: this.#canvas.height
    };
    this.#innerSize= {
      width: this.#size.width - 50,
      height: this.#size.height - 50
    };
    this.#ctx = this.#canvas.getContext("2d");
    this.#draw();
  }

  #draw() {
    this
      .#drawData()
      .#drawAxies()
      .#drawLabel();
  }

  #drawData() {
    const lineData = this.#graphData.getDefaultData();
    const x = this.#axies["X"];
    const y = this.#axies["Y"];

    for (let data in lineData) {
      const x = data[x.name];
      const y = data[y.name];
      const point = (x - x.min) / x.length;
    }
    return this;
  }

  #drawAxies() {

    this.#ctx.beginPath();
    this.#ctx.moveTo(0, this.#innerSize.height);
    this.#ctx.lineTo(this.#size.width, this.#innerSize.height);
    this.#ctx.moveTo(this.#size.width - this.#innerSize.width, 0);
    this.#ctx.lineTo(this.#size.width - this.#innerSize.width, this.#size.height);
    this.#ctx.lineWidth = this.#config.axisWidth;
    this.#ctx.strokeStyle = this.#config.axisColor;
    this.#ctx.stroke();
    this.#ctx.closePath();
    return this;
  }

  #drawLabel() {

    this.#ctx.font = this.#config.labelFont;
    this.#ctx.strokeStyle = this.#config.labelColor;
    this.#ctx.fillText(
      this.#graphData.label,
      this.#size.width * 0.5,
      this.#size.height - this.#innerSize.height
    );

    const axisSize = {
      width: 20,
      height: 20,
      margin: 10
    };

    this.#ctx.font = this.#config.axisFont;
    this.#ctx.fillText(
      this.#axies["X"].name,
      axisSize.margin, 
      axisSize.height + axisSize.margin
    );
  
    this.#ctx.fillText(
      this.#axies["Y"].name,
      this.#size.width - axisSize.width - axisSize.margin,
      this.#size.height - axisSize.height - axisSize.margin
    );
  
    return this;
  }

  disconnectedCallback() {
    super.disconnectedCallback();
  }
}
