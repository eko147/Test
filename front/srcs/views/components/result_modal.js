import View from "@/lib/view";

export default class ResultModal extends View {

  #container;
  #window;
  #data;
  #homeButton;
  #detailText;
  #confirmHandler;

  constructor({data, confirmHandler}) {
    super({data});
    this.#data = data;
    this.#confirmHandler = confirmHandler;
  }

  connectedCallback() {
    super.connectedCallback();
    this.#container = this.querySelector("#modal-container");
    this.#window = this.querySelector("#modal-content");
    this.#homeButton = this.querySelector("#home-button");
    this.#homeButton.addEventListener("click", () =>
    this.#confirmHandler());
    this.#detailText = this.querySelector("#detail-text");
    this.#detailText.innerText = this.#data.text;
    setTimeout(() => this.#showModal(),
      this.#data.delay * 1000);
  }

  #showModal() {
    this.#container.style.display = "block";
    this.#container.animate(
      {
        opacity: [0, 1],
        transform: [
          "scaleY(0.8) translateY(-20%)", 
          "scaleY(1.0) translateY(0%)"
        ],
      },
      {
        duration: 1000,
        fill: "forwards"
      }
    )
  }

  disconnectedCallback() {
    super.disconnectedCallback();
  }

}
