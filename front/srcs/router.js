import View from "@/lib/view";
import HomeView from "@/views/home/home_view";
import global from "@/data/global";
import { routes } from "@/views/config";

/** @typedef {Object} Page 
 *  @property {string} path
 *  @property {View} view
 *  @property {boolean} hasNavbar
 */

export const NAVIGATE_DRIRECTION = Object.freeze({
  forward: "FORWARD",
  backward: "BACKWOARD"
})

class Router {

  /** @type Router */
  static #_shared;
  static get transitionDistX() {
    return 30;
  }
  static get transitionOpacity() {
    return 0.7;
  }

  /** @type {{
   * prev: Page | null,
   * current: Page | null,
   * next: Page | null,
   * }} */
  #pages = {
    prev: null,
    current: null,
    next: null
  };
  get hasPrevPage() {
    return this.#pages.prev != null;
  }

  static get shared() {
    if (!this.#_shared) {
      return new Router();
    }
    return this.#_shared;
  }

  constructor() {
    if (Router.#_shared) 
      return Router.#_shared
    Router.#_shared = this;
  }

  /** @param {new ({}) => View} view
   *  @param {string} requestedDirection
   */
  async navigate(view, requestedDirection) {
    let direction = requestedDirection;
    const currentPath = this.#pages.current?.path;
    const destPath = window.location.pathname;
    if (currentPath) {
      if (currentPath == "/" && destPath == "/login") {
        direction = NAVIGATE_DRIRECTION.backward;
      }
    }

    const page = new view({
      data: {
        gameData: global.gameData,
        gameMap: global.gameMap
      },
      registerGame: {
        local: global.registerTournamentGame,
        tournament: global.registerTournamentGame,
        parameter: global.setGameParameter
      },
      endGame: global.removeGame
    });

    await page.render();
    if (!this.#pages.current) {
      await this.#setCurrentPage({page, path: destPath});
    }
    else if (direction == NAVIGATE_DRIRECTION.forward ||
      direction == NAVIGATE_DRIRECTION.backward) {
      await this.#runHorizontalNavigation({
        page,
        direction,
        path: destPath
      });
    }
    anchorToLink(page);
  }

  /** @params {{
   *  page: View,
   *  path: string
   * }} params*/
  async #setCurrentPage({page, path}) {

    const app = document.getElementById("app");
    await page.render();
    this.#pages.current = {  
      path,
      view: page,
      hasNavbar: Boolean(page.querySelector("nav-bar"))
    };
    app.innerHTML = "";
    app.appendChild(page);
  }

  async #runHorizontalNavigation({page, direction, path}) {

    this.#pages.prev = this.#pages.current; 
    this.#pages.current = {
      view: page,
      path,
      hasNavbar: Boolean(page.querySelector("nav-bar"))
    };
    const outgoingAnimation = {
      keyframe:      this.#getHorizontalKeyframe({
        direction,
        isIn: false
      }),
      option: {
        duration: 300,
        easing: "cubic-bezier(0, 0.7, 0.9, 1)"
      }
    };
    const incomingAnimation = {
      keyframe: this.#getHorizontalKeyframe({
        direction,
        isIn: true
      }),
      option: {
        duration: 500,
        easing: "ease-in",
      }
    };

    let prevAnimations = null;
    let nextAnimations = null;
    const nextPage = document.createElement("div");
    const prevPage = document.getElementById("app");
    const navbarPreserved = this.#pages.prev.hasNavbar && 
      this.#pages.current.hasNavbar;
    const prevContent = navbarPreserved ? this.#getContent(this.#pages.prev.view): null;
    const nextContent = navbarPreserved ? this.#getContent(this.#pages.current.view): null;
    if (navbarPreserved && prevContent && nextContent) {
      const prevNavbar = prevPage.querySelector("nav-bar");
      if (prevNavbar)
        prevNavbar.remove();
      prevContent.animate(
        outgoingAnimation.keyframe,
        outgoingAnimation.option
      );
      nextContent.animate(
        incomingAnimation.keyframe,
        incomingAnimation.option
      );
      prevAnimations = prevContent.getAnimations();
      nextAnimations = nextContent.getAnimations();
      }
    else {
      nextPage.animate(
        incomingAnimation.keyframe,
        incomingAnimation.option
      );

      /** @type {HTMLElement} */
      prevPage.animate(outgoingAnimation.keyframe, outgoingAnimation.option);
      prevAnimations = prevPage.getAnimations();
      nextAnimations = nextPage.getAnimations();
    }
    nextPage.classList.add("page");
    nextPage.appendChild(page);
    document.body.appendChild(nextPage);
    Promise.all(prevAnimations
      .map(animation => animation.finished))
      .then(() => {
          prevPage.remove();
      })
    Promise.all(nextAnimations
      .map(animation => animation.finished))
      .then(() => {
        nextPage.id = "app";
      })
    }
  /** @param {View} page */
  #getContent(page) {
    let root = page.children[0];
    while (root.children.length == 1) {
      root = page.children[0]
    }
    if (root) {
      const content = Boolean(root.children[0].querySelector("nav-bar")) ? root.children[1]: root.children[1];
      return content;
    }
    return null;
  }

  /** @param {{
   *    direction: string,
   *    isIn: boolean
   * }} params
   */
  #getHorizontalKeyframe({direction, isIn}) {
    const isForward = direction == NAVIGATE_DRIRECTION.forward;
    let translateX = { from: 0, to: 0 };
    if (isForward) {
      translateX = {
        from: isIn ? 50: 0,
        to: isIn ? 0: -50
      };
    }
    else {
      translateX = {
        from: isIn ? -50: 0,
        to: isIn ? 0: 50
      };
    }
    return  (
      [
        {
          opacity: isIn ? 1 - Router.transitionOpacity: 1,
          transform: `translateX(${translateX.from}%)`
        },
        {
          opacity: isIn ? 1: 1 - Router.transitionOpacity,
          transform: `translateX(${translateX.to}%)`
        }
      ]
    )
  }
}


export async function route({
  path,
  direction = NAVIGATE_DRIRECTION.forward,
  callback = () => {}
}) {
  const match = routes.find((route) => {
    return route.path == path
  })
  const view = match ? match.view : HomeView;   
  await Router.shared.navigate(view, direction);
  if (callback)
    callback();
}

/** @param {HTMLElement | Document | View} parent */
export function anchorToLink(parent) {
  const page = (parent instanceof View) ? parent.constructor.name : null;

  /** @type {HTMLAnchorElement[]} */
  const links = Array.from(parent.querySelectorAll("a[data-link]"));
  links.forEach((link) => {
    link.setAttribute("page", page);
    link.addEventListener("click", (e) => {
      e.preventDefault();
      if (link.pathname == "/game") { //@ts-ignore
        const page = e.target.getAttribute("page");
        if (!page)
          return ;
        switch (page) {
          case ("MatchView"):
            try { global.registerLocalGame(); } 
            catch { return ; }
            break;
          case ("TournamentView"):
            try { global.registerTournamentGame(); } 
            catch { return ; }
            break;
          default: break;
        }
      }
      addHistory(link.pathname);
      route({
        path: link.pathname
      });
    })
  })
}

function addHistory(path) {

  let index = window.history.state?.index;
  const history = window.history.state?.history;
  if (!history || index == undefined)
    return;
  if (history[history.length - 1] != path) {
    history.push(path);
    index++;
  }
  window.history.pushState({
    history,
    index,
  },
    "42 Pong", "/");
}
