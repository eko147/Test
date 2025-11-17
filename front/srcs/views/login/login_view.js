import View from "@/lib/view";
import httpRequest from "@/utils/httpRequest";

export default class LoginView extends View {

  constructor({data}) {
    super({data});
  }

  connectedCallback() {
    super.connectedCallback();
    localStorage.clear();

    const loginBtn = this.querySelector('#btn-login');
    loginBtn.addEventListener('click', () => {
      const client_id = 'u-s4t2ud-c2f2e5bdcebfdc16951b04539fe1cb50ab27565e22cdc3aaf0c3a2d33c33a9ee';
      const redirect_uri = 'https%3A%2F%2F172.16.11.242%2Flogin';
      window.location.href = `https://api.intra.42.fr/oauth/authorize?client_id=${client_id}&redirect_uri=${redirect_uri}&response_type=code`;
    })
  }
}
