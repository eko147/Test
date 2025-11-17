import View from "@/lib/view";
import { NAVIGATE_DRIRECTION, route } from "@/router";

export default class ModeView extends View {

  constructor() {
    super();
  }

  connectedCallback() {
    super.connectedCallback();

    const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]')
    const tooltipList = [...tooltipTriggerList].map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl))

    const backBtn = document.getElementById('move-to-home');
    backBtn.addEventListener('click', () => {
      route({
        path: '/home',
        direction: NAVIGATE_DRIRECTION.backward
      })
    })
  }

}
