import * as THREE from "three";
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import GameData,{ GAME_TYPE } from "@/data/game_data";
import Player from "@/data/player";
import ParticleGenerator from "@/game/particle_generator";
import ObservableObject from "@/lib/observable_object";
import { Animation, AnimationCurves } from "@/game/animation";
import { GameMap } from "@/data/game_map";
import LeafGenerator from "@/game/leaf_generator";
import ImageGenerator from "@/utils/image_generator";
import UserLabel from "@/views/components/user_label";
import ASSET_PATH from "@/assets/path";
import Asset from "@/game/asset";
import GameScene from "@/game/game_scene";
import Timer from "@/game/timer";
import GameDataEmitter from "@/game/game_data_emitter";
import { DEBUG } from "@/data/global";

/**
 * Game Scene.
 */
export default class Scene {

  // debug
  #isDebug = false;

  /** @type {{
   *    rallyState: (changed: "START" | "END" | "RESET") => void
   *    matchState: (changed: "END" | "NEXT") => void
   *  }}
   */ //@ts-ignore
  #logger = {};

  #scene;
  #scene_objs = {};
  /** @type {GameData} */
  #gameData;

  /** @type {GameScene} */
  #gameScene;
  #canvas;
  /** @type {{
   *  width: number
   *  height: number
   * }} */

  /** @type {{
   *  container: THREE.Group,
   *  board: THREE.Object3D,
   *  generator: ImageGenerator
   * }}
   */
  #tournamentBoard = null;
  #windowSize;

  /** @type {THREE.PerspectiveCamera} */
  #camera;
  /** @type {OrbitControls} */
  #controls;

  /** @type {{
   *    raycaster: THREE.Raycaster,
   *    pointer: THREE.Vector2,
   *    lastMovedTime: number,
   *    threshold: number,
   *    hovering: "BOOMBOX" | "KEYBOARD" | "MAC" | null
   * }} */
  #mouseHandler;
  cameraPositions = { 
    start: { x: 0, y: 80, z: 30 },
    startRotate: { x: 0, y: 20, z: 10 },
    play: { x: 0.2, y: 1.8, z: 0.75 },
  };

  cameraRotations = {
    play: { x: -0.26, y: 0, z: 0}
  };

  /** @type {{
   *  list: HTMLAudioElement[],
   *  current: HTMLAudioElement,
   *  volume: number, 
   * }}
   */
  #bgm;

  /** @type {{
   *  mesh: THREE.Group,
   *  light: THREE.SpotLight,
   * }} */
  #boombox;

  /** @type {THREE.WebGLRenderer} */
  #renderer;

  /** @type {{
   * ambientLight: THREE.AmbientLight,
   * directionalLight: THREE.DirectionalLight
   * }} */ //@ts-ignore: setLights
  #lights = {};

  lightConfigs = {
    ambientColor: {
      default: 0xffffff,
      buff: 0xb3ffc6,
      deBuff: 0xffcdb3
    },
    ambientIntensity: 3,
    directionalColor: 0xffffff,
    directionalIntensity: 2
  };

  /**
   *  Object
   */

  /** @type {Timer} */
  #timer;

  #isBallMoving = false;

  peddleSizeInGame = {
    width: 0.15,
    height: 0.015
  };

  /**
   * Effect
   */

  /** @type {ParticleGenerator} */
  #sceneParticle;

  /** @type {LeafGenerator} */
  #leaf;

  /** @type {{
   *    key: string,
   *    animation: Animation,
   *    speed: number,
   *    onProgress: (
   *    current: ({ x: number, y: number, z: number }|
   *    { x: number, y: number } | number)) => void,
   *    onEnded: (last: { x: number, y: number, z: number }) => void
   *  }[]} 
   */
  #animations = [];

  /** @type {THREE.Object3D} */
  #trophy;

  /** @type {{
   *  topLeft:{
   *    generator: ImageGenerator,
   *    mesh: Promise<THREE.Mesh>,
   *    view: UserLabel
   *  },
   *  bottomRight: {
   *    generator: ImageGenerator,
   *    mesh: Promise<THREE.Mesh>,
   *    view: UserLabel
   *  },
   *  label: UserLabel,
   *  size: {
   *    width: number,
   *    height: number
   *  },
   * }}
   */
  #playerLabels;

  /**
   * @params {Object} params
   * @param {{
   *  canvas: HTMLCanvasElement,
   *  gameData: ObservableObject,
   *  gameMap: GameMap,
   *  stuckHandler: ((isStuck:boolean) => void) | null,
   * }} params
   */
  constructor({canvas, gameData, gameMap, stuckHandler = null }) {
    this.#canvas = canvas;
    //@ts-ignore
    this.#gameData = gameData;
    this.#scene = new THREE.Scene();
    this.#timer = new Timer();
    this.#gameScene = new GameScene({
      timer: this.#timer,
      map: gameMap,
      data: this.#gameData,
      stuckHandler: (stuckHandler) ? 
      /**@param {boolean} isStuck */ 
      (isStuck) => stuckHandler(isStuck): null
    });
    this.#windowSize = {
      width: canvas.width,
      height: canvas.height
    };
    this
      .#init()
      .#loadAsset();
    this.#gameScene.init();
    this
      .#loadLeaf()
      .#startRender()
      .#listenPowerUp();
    this.#gameScene.subscribePowerUp(activatedPowerUp => {
      if (activatedPowerUp == null) {
        this.#lights.ambientLight.color = new THREE.Color(this.lightConfigs.ambientColor.default);
      }
      switch (activatedPowerUp) {
        case ("BUFF"):
          this.#lights.ambientLight.color = new THREE.Color(this.lightConfigs.ambientColor.buff);
          break;
        case ("DEBUFF"):
          this.#lights.ambientLight.color = new THREE.Color(this.lightConfigs.ambientColor.deBuff);
          break;
        default: break;
      }
    })
    if (this.#isDebug)
      this._addHelper();
  }

  showNextMatch() {
    this.#updateLabels();
    this.#gameScene.showNextMatch();
    if (this.#logger.matchState) {
      this.#logger.matchState("NEXT");
    }
  }

  #updateLabels() {
    this.#updateLabel({
      player: this.#gameData.currentPlayers[0],
      position: "TopLeft"}
    );
    this.#updateLabel({
      player: this.#gameData.currentPlayers[1],
      position: "BottomRight"}
    );
    return this;
  }

  /** @param {GameDataEmitter} emitter */
  setDataEmitter(emitter) {
    this
      .#setCollectors(emitter)
      .#setEventLoggers(emitter);
  }

  /** @param {GameDataEmitter} emitter */
  #setCollectors(emitter) {
    emitter.setCollector("PEDDLE", () => this.#getPeddlesInfo()
    );
    emitter.setCollector("BALL", () => this.#gameScene.getBallInfo());
    emitter.setCollector("GAME_STATE", () => this.#getGameState());
    return this;
  }

  /** @param {GameDataEmitter} emitter */
  #setEventLoggers(emitter) {
    this.#logger.rallyState = (state => {
      let description = null;
      switch (state) {
        case ("START"):
          description = "START_RALLY";
          break;
        case ("RESET"):
          description = "RESET_RALLY";
          break;
        default:
          return ;
      }
      emitter.submitEvent("GAME_DATA_CHANGED", {
        description,
      })
    });

    this.#logger.matchState = (state) => {
      let description = null;
      switch (state) {
        case ("END"):
          description = "END_MATCH";
          break;
        case ("NEXT"):
          description = "NEXT_MATCH";
          break;
          default: return;
      }
      emitter.submitEvent("GAME_DATA_CHANGED", {
        description
      })
    }
    this.#gameScene.setKeyLogger((key, pressed) => {
      emitter.submitEvent("PLAYER_BEHAVIOR", {
        description: "PLAYER_INPUT",
        key: key,
        pressed
      });
    });

    this.#gameScene.setScoreLogger((
      { winPlayer, scores }) => {
        emitter.submitEvent("GAME_DATA_CHANGED", {
          description: "WIN_SCORE",
          winPlayer,
          scores
        });
        const winScore = this.#gameData.winScore;
        if (scores[winPlayer.nickname] == winScore &&
          this.#logger.matchState) {
          this.#logger.matchState("END");
        }
    });

    this.#gameScene.setCollisionLogger((collision) => {
      emitter.submitEvent("COLLISION", collision) 
    });
    return this;
  }
  
  #getPeddlesInfo() {
    const info = {};
    info.player1 = {
      peddle: this.#gameScene.getPeddleInfo(0),
    }
    if (this.#gameData.currentPlayers.length == 2) {
      info.player2 = {
        peddle: this.#gameScene.getPeddleInfo(0),
      }
    }
    return info;
  }

  #getGameState() {
    const state = {};
    state.scores = {};
    state.powerUps = {};
    this.#gameData.currentPlayers.forEach(player => {
      state.scores[player.nickname] = this.#gameData.getScore(player);
      state.powerUps[player.nickname] = this.#gameData.getPowerUps(player);
    });
    return state;
  }

  startGame() {
    this.#gameScene.addBall();
    this.#isBallMoving = true;
    if (this.#logger.rallyState) {
      this.#logger.rallyState("START");
    }
  }

  resetBall() {
    if (!this.#gameScene.ball.mesh) {
      return ;
    }
    if (this.#logger.rallyState) {
      this.#logger.rallyState("RESET");
    }
    this.#gameScene.removeBall();
    this.#gameScene.addBall();
    this.#isBallMoving = true;
  }

  /** @param {Player} player */
  getPlayerColor(player) {
    return this.#gameScene.getPeddleColor(player);
  }

  /** @param {Player} player 
   *  @param {{r: number, g: number, b: number}} color
   */
  setPlayerColor(player, color) {
    this.#gameScene.setPeddleColor(player, color); 
  }

  endGame(onEnd) {
    if (this.#gameScene.ball.mesh)  {
      this.#gameScene.removeBall();
    }
    /** @type {HTMLAudioElement} */
    const sound = Asset.shared.get("AUDIO", ASSET_PATH.winSound);
    sound.volume = 0.8;
    this.#bgm.current.volume = Math.max(
      this.#bgm.current.volume - 0.1, 0.05);
    sound.play();
    sound.addEventListener("ended", () => {
      this.#bgm.current.volume = this.#bgm.volume;
    });
    this.#isBallMoving = false;
    const cameraDest = { ...this.cameraPositions.play };
    cameraDest.z += 0.5;
    this.#showLeaves();
    if (this.#gameData.gameType == GAME_TYPE.localTournament 
      && this.#gameData.tournament.isLastRound) {
      cameraDest.z += 3;
      this.#moveObject({
        target: this.#camera,
        dest: cameraDest,
        speed: 0.005,
        curve: AnimationCurves.easein,
        onEnded: () => {
          this.#gameScene.removeParticle();
          this.#showTrophy(() => {
            const sound = Asset.shared.get("AUDIO",
            ASSET_PATH.tournamentWin);
          sound.volume = 0.5;
            this.#bgm.current.volume = Math.max(
            this.#bgm.current.volume - 0.1, 0.05);
          sound.play();
          sound.addEventListener("ended", () => {
            this.#bgm.current.volume = this.#bgm.volume;
            if (onEnd)
              onEnd();
          })
          });
        }
      });
    }
    else {
      this.#moveObject({
        target: this.#camera,
        dest: cameraDest,
        speed: 0.01,
        curve: AnimationCurves.easein,
        onEnded: onEnd ?? null
    });
    }
  }

  #showLeaves() {
    const container = new THREE.Mesh(
      new THREE.BoxGeometry(),
      new THREE.MeshBasicMaterial({
        transparent: true,
        opacity: 0,
        depthWrite: false
      })
    );
    container.position.z = 0.5;
    this.#scene.add(container);
    this.#leaf.generate({
      count: 50,
      startY: 5,
      endY: -1,
      container
    });
    return this;
  }

  showTournamentBoard(onEnded) {
    const cameraDest = { ...this.cameraPositions.play };
    cameraDest.x -= 1.0;
    cameraDest.z += 1.5;
    this.#moveObject({
      target: this.#camera,
      dest: cameraDest,
      speed: 0.01,
      curve: AnimationCurves.easein,
      onEnded: () => {
        /** @type {THREE.Object3D} */
        const target = this.#tournamentBoard.board;
        const targetPos = new THREE.Vector3();
        target.getWorldPosition(targetPos);
        targetPos.z += 0.5;
        this.#rotateCameraTo({
          targetPos,
          speed: 0.01,
          curve: AnimationCurves.easein,
          onEnded: onEnded
        })
      }
    });
  }

  goToGamePosition(onEnded) {
    // TODO: match event listener
    this.#moveObject({
      target: this.#camera,
      dest: {...this.cameraPositions.play},
      curve: AnimationCurves.easeout,
      speed: 0.015,
    });
    this.#animateRotation({
      target: this.#camera,
      dest: {...this.cameraRotations.play},
      speed: 0.015,
      onEnded: onEnded
    })
  }

  #showTrophy(onEnded) {
    if (!this.#trophy) {
      if (DEBUG.isDebug())
        console.error("trophy is not loaded");
      return ;
    }
    this.#trophy.position.set(
      this.#camera.position.x,
      this.#camera.position.y + 0.5, 
      this.#camera.position.z - 1.
    )
    const spotLight = new THREE.SpotLight(new THREE.Color("white"));
    spotLight.intensity = 100;
    spotLight.distance = 5;
    spotLight.angle = Math.PI * 0.1;
    spotLight.position.set(
      this.#trophy.position.x,
      this.#trophy.position.y + 1,
      this.#trophy.position.z
    );
    spotLight.target = this.#trophy;
    this.#trophy.visible = true;
    this.#scene.add(spotLight);
    const dest = new THREE.Vector3().copy(this.#trophy.position);
    dest.y -= 0.5;
    this.#moveObject({
      target: this.#trophy,
      curve: AnimationCurves.easeout,
      dest,
      speed: 0.01,
      onEnded: () => {
        onEnded();
        this.#animateRotation({
          target:this.#trophy,
          curve: AnimationCurves.linear,
          speed: 0.001,
          dest: {
            x: this.#trophy.rotation.x,
            y: this.#trophy.rotation.y + Math.PI * 2.0,
            z: this.#trophy.rotation.z
          },
          repeat: true
        });

      }
    });
  }

  updateBoard(content) {
    this.#tournamentBoard.generator.generate(content)
      .then(canvas =>  {
        const texture = new THREE.Texture(canvas);
        texture.needsUpdate = true;
        /** @type {THREE.Mesh} */ //@ts-ignore
        const board = this.#tournamentBoard.board;
        /** @type {THREE.MeshBasicMaterial} */ //@ts-ignore
        const material = board.material;
        material.map = texture
        material.needsUpdate = true;
        return ;
      });
  }

  /** @param {HTMLElement} content */
  createBoard(content) {
    Asset.shared.load({
      path: ASSET_PATH.board,
      type: "GLTF",
      onLoad: (gltf) => {
        /** @type {THREE.Object3D} */
        let root = gltf.scene;
        while (root.children.length == 1) {
          root = root.children[0];
        }
        const board = root.children.find(
          o => o.name == "Board"
        ); 
        const scene = gltf.scene;
        const width = content.style.width;
        const height = content.style.height;
        const size = {
          width: Number(width.replace("px", "")),
          height: Number(height.replace("px", "")),
        };
        this.#tournamentBoard = {
          container: scene,
          board,
          generator: new ImageGenerator({ size })
        };
        scene.rotation.y = Math.PI * 0.4;
        board.scale.x = -0.8;
        scene.position.set(-2.5, 0, 1);
        board.position.z -= 0.2;
        board.rotation.y = Math.PI;
        this.#scene.add(scene);
        this.#tournamentBoard.generator.generate(content)
          .then(canvas => {
            const texture = new THREE.Texture(canvas);
            texture.needsUpdate = true;
            /** @type {THREE.Mesh} */ //@ts-ignore
            const mesh = board;
            mesh.material = new THREE.MeshBasicMaterial({
              map: texture,
              transparent: true
            });
          })
      }
    })
  }

  #setPlayerLabels() {

    //@ts-ignore
    this.#playerLabels = {};
    const players = this.#gameData.currentPlayers;
    this.#playerLabels.size = { width: 300, height: 250 };
    //@ts-ignore 
    this.#playerLabels.topLeft = {
      generator :
      new ImageGenerator({
        size: this.#playerLabels.size
      })
    };
    //@ts-ignore 
    this.#playerLabels.bottomRight = {
      generator :
      new ImageGenerator({
        size: this.#playerLabels.size
      })
    };
    this.#playerLabels.topLeft.mesh = this.#createLabel({
      player: players[0],
      position: "TopLeft",
    });
    this.#playerLabels.bottomRight.mesh = this.#createLabel({
      player: players[1],
      position: "BottomRight",
    });
    return this;
  }

  /** @param {{
   *  player: Player,
   *  position: "TopLeft" | "BottomRight"
   * }} params */
  async #updateLabel({ player, position }) {
    const {view, generator, mesh} = position == "TopLeft" ?
      this.#playerLabels.topLeft: 
      this.#playerLabels.bottomRight;
    const powerUps = this.#gameData.getPowerUps(player);
    view.data.name = player.nickname;
    view.data.texts = ["item", ...powerUps.map(p => p.desc)];
    await view.render();
    /** @type {HTMLElement} */
    const canvas = await generator.generate(view);
    mesh.then(mesh => {
      const texture = new THREE.Texture(canvas);
      texture.minFilter = THREE.NearestFilter;
      texture.magFilter = THREE.NearestFilter;
      texture.needsUpdate = true;
        /** @type {THREE.MeshBasicMaterial} */ //@ts-ignore
      const material = mesh.material;
      material.map = texture
      material.needsUpdate = true;
    })
  }

  /** @param {{
   *  player: Player,
   *  position: "TopLeft" | "BottomRight"
   * }} params */
  async #createLabel({player, position}) {
    const powerUps = this.#gameData.getPowerUps(player);
    const view = new UserLabel({data: {
      name: player.nickname,
      texts: ["item", ...powerUps.map(p => p.desc)]
    }})
    await view.render();
    if (position == "TopLeft") {
      this.#playerLabels.topLeft.view = view;
    }
    else {
      this.#playerLabels.bottomRight.view = view;
    }
    //@ts-ignore 
    view.children[0].style.width = this.#playerLabels.size.width + "px";
    //@ts-ignore 
    view.children[0].style.height = this.#playerLabels.size.height+ "px";
    const generator = position == "TopLeft" ? this.#playerLabels.topLeft.generator : this.#playerLabels.bottomRight.generator;
    return generator.generate(view)
      .then(canvas => {
        const texture = new THREE.Texture(canvas);
        texture.minFilter = THREE.NearestFilter;
        texture.magFilter = THREE.NearestFilter;
        texture.needsUpdate = true;
        const plane = new THREE.PlaneGeometry(
          0.3, 
          0.3
        );
        const mesh = new THREE.Mesh(plane, new THREE.MeshBasicMaterial({
          map: texture,
          transparent: true
        }));
        mesh.scale.set(1.5, 1, 1);
        return mesh;
      });
  }

  prepareDisappear() {
    this.#bgm.current.pause();
    this.#bgm.current.currentTime = 0;
    this.#gameScene.removeParticle();
    this.#gameScene.removeBall(); 
    this.#gameScene.remove();
    this.#timer.stop();
    this.#gameScene = null;
    this.#scene.remove.apply(this.#scene, this.#scene.children)
  }

  #loadAsset() {
    this.#loadScene()
      .#loadTrophy();
    return this;
  }

  #loadScene() {
    /**
     * Scene
     */
    Asset.shared.load({
      type: "GLTF",
      path: ASSET_PATH.scene,
      onLoad: (gltf) => {
        const scene= gltf.scene;
        scene.scale.set(2, 2, 2);
        scene.children.forEach(obj =>  {
          this.#scene_objs[obj.name] = obj;
        });

        /** @type {THREE.Mesh} */
        const keyboard = this.#scene_objs["keyboard"];
        keyboard.scale.x *= -1;
        keyboard.position.z -= 0.1;

        /** @type {THREE.Mesh} */
        const mac = this.#scene_objs["macintosh"];


        /** @type {THREE.Mesh} */ //@ts-ignore
        const screen = mac.children[0].children[0].children[1]

        const screenBox= new THREE.Box3().setFromObject(screen);
        const screenSize = {
          x: screenBox.max.x - screenBox.min.x,
          y: screenBox.max.y - screenBox.min.y,
          z: screenBox.max.z - screenBox.min.z
        };

        const sceneBox = new THREE.Box3().setFromObject(this.#gameScene);
        const sceneSize = {
          x: sceneBox.max.x - sceneBox.min.x,
          y: sceneBox.max.y - sceneBox.min.y,
          z: sceneBox.max.z - sceneBox.min.z
        };

        this.#gameScene.position.copy(screen.position)
        this.#gameScene.position.z += 0.1;

        this.#gameScene.scale.set(
          (screenSize.x / sceneSize.x) * 0.7,
          (screenSize.y / sceneSize.y) * 0.65,
          (screenSize.x / sceneSize.x) * 0.8
        );
        const labelContainer = screen.parent;
        this.#playerLabels.topLeft.mesh
          .then(label => {
            label.position.set(-0.6, 1.2, 1.5);
            labelContainer.add(label)}
          );
        this.#playerLabels.bottomRight.mesh
          .then(label => {
            label.position.set(0.5, -0.4, 1.5);
            labelContainer.add(label);
          });
         
        screen.parent.add(this.#gameScene);
        screen.removeFromParent();

        this.#scene.add(scene);
        this.#camera.position.set(
          this.cameraPositions.start.x,
          this.cameraPositions.start.y,
          this.cameraPositions.start.z,
        );
        const screenPos = new THREE.Vector3();
        this.#gameScene.getWorldPosition(screenPos);
        if (this.#isDebug)
          this.#controls.target = screenPos;
        this.#loadboomBox(boombox => {
          boombox.scale.set(
            0.5,
            0.5,
            0.5
          );
          boombox.position.set(
            mac.position.x - 0.6,
            mac.position.y + 0.33,
            mac.position.z
          );
          boombox.rotateY(Math.PI * 0.1);
          this.#scene.add(boombox);
        })

        this.#camera.lookAt(0, 0, 0);
        this.#moveObject({
          target: this.#camera,
          dest: {...this.cameraPositions.startRotate},
          speed: 0.008,
          curve: AnimationCurves.easein,
          onEnded: () => {
            this.#sceneParticle.isPlaying = false;
            this.#sceneParticle.remove();
            this.goToGamePosition(); 
          }
        });
      }
    })
    return this;
  }

  /** @param {(boombox: THREE.Group) => void} onLoad */
  #loadboomBox(onLoad) {
    Asset.shared.load({
      type: "GLTF",
      path: ASSET_PATH.boombox,
      onLoad: (gltf) => {
        this.#boombox = {
          mesh: gltf.scene,
          light: new THREE.SpotLight(
            new THREE.Color("green"),
            0.1
          )
        };
        this.#boombox.light.position.y = 1;
        this.#boombox.light.position.z = 0.3;
        this.#boombox.light.target = this.#boombox.mesh;
        this.#boombox.mesh.add(this.#boombox.light);
        onLoad(this.#boombox.mesh);
      }
    })
    return this;
  }

  #loadTrophy() {
    if (this.#gameData.gameType !=
      GAME_TYPE.localTournament) {
      return this;
    }
    Asset.shared.load({
      type: "GLTF",
      path: ASSET_PATH.laurel_wreath,
      onLoad: (gltf) => {
        gltf.scene.scale.set(0.1, 0.1, 0.1);
        gltf.scene.position.set(1, 2, 2);
        this.#trophy = gltf.scene;
        this.#trophy.visible = false;
        this.#scene.add(this.#trophy);
      }
    })
    return this;
  }

  /** @param {{
   *    target: THREE.Object3D,
   *    dest: {
   *      x: number, y: number, z: number
   *    },
   *    speed: number,
   *    curve?: (t: number) => number,
   *    onEnded?: (last:{
   *      x: number, y: number, z: number
   *    }) => void
   * }} params
   */
  #moveObject({target, dest, speed, curve = AnimationCurves.smoothstep, onEnded = () => {}}) {
    const animation = new Animation({
      start: target.position.clone(),
      end: new THREE.Vector3(
        dest.x, 
        dest.y,
        dest.z
      ),
      curve,
      repeat: false,
      key: target.name + "Move"
    })
    this.#animations.push({
      animation,
      speed,
      onProgress: (pos) => { //@ts-ignore 
        target.position.set(pos.x, pos.y, pos.z);
      },
      onEnded,
      key: animation.key
    });
    return (this.#animations[this.#animations.length - 1]);
  }

  /** @param {{
   *    targetPos: THREE.Vector3,
   *    speed: number,
   *    curve?: (t: number) => number,
   *    onEnded?: (last:{
   *      x: number, y: number, z: number
   *    }) => void
   * }} params 
   * */
  #rotateCameraTo({targetPos, speed, 
    curve = AnimationCurves.smoothstep, onEnded = () => {}}) {
    const qCamera = this.#camera.quaternion.clone();
    this.#camera.lookAt(targetPos);
    const dest = this.#camera.quaternion.clone();
    this.#camera.quaternion.copy(qCamera);
    const animation = new Animation({
      start: 0,
      end: 1,
      curve,
      repeat: false,
      key: "cameraRotateTo"
    })
    this.#animations.push({
      animation,
      speed,
      onProgress: (progress) => { //@ts-ignore 
        this.#camera.quaternion.slerp(dest, progress);
      },
      onEnded,
      key: animation.key
    });
    return (this.#animations[this.#animations.length - 1]);
    
  }

  /** @param {{
   *    target: THREE.Object3D,
   *    dest: {
   *      x: number, y: number, z: number
   *    },
   *    speed: number,
   *    curve?: (t: number) => number,
   *    repeat?: boolean,
   *    onEnded?: (last:{
   *      x: number, y: number, z: number
   *    }) => void
   * }} params
   */
  #animateRotation({
    target,
    dest, 
    speed, 
    curve = AnimationCurves.smoothstep, 
    repeat = false,
    onEnded = () => {}}) {
    const animation = new Animation({
      start: new THREE.Vector3().copy(target.rotation),
      end: new THREE.Vector3(
        dest.x,
        dest.y,
        dest.z
      ),
      curve,
      repeat,
      key: target.name + "rotate"
    })
    this.#animations.push({
      animation,
      speed,
      onProgress: (rotation) => { //@ts-ignore 
        target.rotation.set(rotation.x, rotation.y, rotation.z);
      },
      onEnded,
      key: animation.key
    });
    return (this.#animations[this.#animations.length - 1]);
  }

  #init() {
    this
      .#setBgm()
      .#setSceneBackground()
      .#setLights()
      .#setCamera()
      .#setRenderer()
      .#setPlayerLabels()
      .#setMouseCallback()
      .#setResizeCallback();
    return this;
  }


  #setLights() {
    const gameAmbientLight = new THREE.AmbientLight(this.lightConfigs.ambientColor.default, this.lightConfigs.ambientIntensity);
    const gameDirectionalLight = new THREE.DirectionalLight(
    );
    gameAmbientLight.position.set(0, 0, 1);
    gameDirectionalLight.castShadow = true;
    gameDirectionalLight.shadow.mapSize.set(1024, 1024);
    gameDirectionalLight.shadow.camera.far = 15;
    gameDirectionalLight.position.set(0, 0, 1);
    this.#gameScene.add(gameAmbientLight, gameDirectionalLight);
    this.#lights.ambientLight = gameAmbientLight;
    this.#lights.directionalLight = gameDirectionalLight;
    return this;
  }

  #setSceneBackground() {
    this.#scene.background = new THREE.Color("black");
    const container = new THREE.Mesh(
      new THREE.BoxGeometry(),
      new THREE.MeshBasicMaterial({
        transparent: true,
        opacity: 0,
        depthWrite: false
      })
    );
    this.#sceneParticle= new ParticleGenerator({
      count: 100,
      particleSize: 2000,
      useShader: false,
      maxSize: {
        x: 100, 
        y: 100,
        z: 1
      },
    });
   this.#sceneParticle.animationConfig.speedCoefficient = 2.;
    this.#sceneParticle.animationConfig.randomCoefficent = 1;
    this.#sceneParticle.setColor([
      "#49243E",
      "#704264",
      "#FFEBB2",
      "#E9C874",
      "#008DDA",
    ]);
    this.#sceneParticle.createParticles()
      .then(() => {
        const particles = this.#sceneParticle.getParticles();
        container.add(particles);
        this.#scene.add(container);
      });
    return this;
  }

  #setBgm() {
    const list = ASSET_PATH.bgms.map(
      bgm => Asset.shared.get(
        "AUDIO", bgm.path
      ));
    this.#bgm = {
      list,
      current: list[0],
      volume: 0.15
    };
    this.#playBgm();
    return this;
  }

  #nextBgm() {
    this.#bgm.current.pause();
    this.#bgm.current.currentTime = 0;
    const currentIndex = this.#bgm.list.findIndex(bgm =>
      bgm.src == this.#bgm.current.src
    );
    if (currentIndex == -1 || 
      currentIndex == this.#bgm.list.length - 1) {
      this.#bgm.current = this.#bgm.list[0];
    }
    else {
      this.#bgm.current = this.#bgm.list[currentIndex + 1];
    }
    this.#playBgm();
  }

  #playBgm() {
    this.#bgm.current.loop = false;
    this.#bgm.current.volume = this.#bgm.volume;
    this.#bgm.current.play();
    this.#bgm.current.addEventListener("ended", 
      (event) => {
        /** @type {HTMLAudioElement} */ //@ts-ignore
        const ended = event.target;
        if (this.#bgm.current.src == ended.src) {
          this.#nextBgm();
        }
      });
  }

  #setCamera() {
    this.#camera = new THREE.PerspectiveCamera(
      75,
      this.#windowSize.width / this.#windowSize.height,
      0.1,
      150
    );
    this.#scene.add(this.#camera);
    if (this.#isDebug) {
      this.#controls = new OrbitControls(this.#camera, this.#canvas);
      this.#controls.enableDamping = true;
    }
    return this;
  }

  #setRenderer() {
    this.#renderer = new THREE.WebGLRenderer({
      canvas: this.#canvas,
      alpha: true,
      antialias: true
    });
    this.#renderer.shadowMap.enabled = true;
    this.#renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.#renderer.setSize(this.#windowSize.width, 
      this.#windowSize.height);
    const pixelRatio = Math.min(window.devicePixelRatio, 2);
    this.#renderer.setPixelRatio(pixelRatio);

    return this;
  }

  #setMouseCallback() {
    this.#mouseHandler = {
      raycaster: new THREE.Raycaster(),
      pointer: new THREE.Vector2(),
      lastMovedTime: this.#timer.elapsedTime,
      hovering: null,
      threshold: 0.1 
    };
    this.#canvas.addEventListener("mousemove", 
      (event) => {
        const elapsedTime = this.#timer.elapsedTime;
        if (!this.#boombox || 
          elapsedTime - this.#mouseHandler.lastMovedTime < this.#mouseHandler.threshold)  {
          return ;
        }
        this.#mouseHandler.lastMovedTime = elapsedTime;
        this.#mouseHandler.pointer.set(
          event.clientX / this.#windowSize.width * 2 - 1, 
          -(event.clientY / this.#windowSize.height) * 2 + 1
        );
        this.#mouseHandler.raycaster.setFromCamera(
          this.#mouseHandler.pointer,
          this.#camera
        );
        const intersect = this.#mouseHandler.raycaster.intersectObject(
          this.#boombox.mesh
        );
        if (intersect.length > 0) {
          this.#boombox.light.intensity = 10;
          this.#mouseHandler.hovering = "BOOMBOX";
        }
        else {
          this.#boombox.light.intensity = 1;
          this.#mouseHandler.hovering = null;
        }
      }
    );

    this.#canvas.addEventListener("click", () => {
      if (this.#mouseHandler.hovering == "BOOMBOX") {
        this.#nextBgm();
      }
    })
    return this;
  }

  #setResizeCallback() {
    const resizeCallback = (() => {

      const width = this.#canvas.parentElement.offsetWidth;
      const height = this.#canvas.parentElement.offsetHeight;
      this.#windowSize = {
        width,
        height,
      };

      this.#camera.aspect = width / height;
      this.#camera.updateProjectionMatrix();
      this.#renderer.setSize(width, height);
      const pixelRatio = Math.min(window.devicePixelRatio, 2);
      this.#renderer.setPixelRatio(pixelRatio);
      this.#gameScene.pixelRatio = pixelRatio;

    });
    window.addEventListener("resize", () => resizeCallback()) 
    return this;
  }

  #loadLeaf() {
    this.#leaf = new LeafGenerator();
    this.#leaf.load();
    return this;
  }

  #startRender() {
    this.#timer.onTick(frameTime => {
      if (this.#isDebug)
        this.#controls.update()
      this.#gameScene.update(frameTime);
      this.#runAnimations();
      this.#sceneParticle.animate(frameTime);
      this.#leaf.animate();
      this.#renderer.render(this.#scene, this.#camera);
    });
    this.#timer.start();
    return this;
  }

  #runAnimations() {
    this.#animations.forEach(
      ({animation, speed, onProgress, key, onEnded}) => {
        animation.proceed(speed);
        onProgress(animation.current);
        if (animation.isFinished && onEnded) {
          onEnded(animation.current);
        }
      })
    this.#animations = this.#animations.filter(e => !e.animation.isFinished);
  }

  #listenPowerUp() {
    /** @type {ObservableObject} */ //@ts-ignore
    const gameData = this.#gameData;
    gameData.subscribe("powerUps", (powerup) => {
      this.#updateLabels();
    })

    return this;
  }

  _addHelper() {

    //this.gui = new GUI();
    this.gui = {};
    if (!this.gui)
      return ;
    const sound = this.gui.addFolder("sound");

    const configs = {
      bgmVolume: 0.3,
      effectVolume: 0.8,
    };
    sound.add(configs, "bgmVolume")
      .min(0)
      .max(1)
      .step(0.001)
      .onChange(volume => {
        this.#bgm.volume = volume;
      })


    const light = this.gui.addFolder("light");

    light.addColor(this.lightConfigs.ambientColor, "default")
      .onChange(color => {
        this.#lights.ambientLight.color.set(color);
      })

    light.addColor(this.lightConfigs, "directionalColor")
      .onChange(color => {
        this.#lights.directionalLight.color.set(color);
      })

    light.add(this.lightConfigs, "ambientIntensity")
      .min(0).max(5)
      .step(0.01)
      .onChange(value => this.#lights.ambientLight.intensity = value);

    light.add(this.lightConfigs, "directionalIntensity")
      .min(0).max(5)
      .step(0.01)
      .onChange(value => this.#lights.directionalLight.intensity = value);

    light.add(this.#lights.directionalLight.position, "x")
      .name("lightPosX")
      .min(-20)
      .max(20)
      .step(0.1)
    light.add(this.#lights.directionalLight.position, "y")
      .name("lightPosY")
      .min(-20)
      .max(20)
      .step(0.1);
    light.add(this.#lights.directionalLight.position, "z")
      .name("lightPosZ")
      .min(-20)
      .max(20)
      .step(0.1);
    

    return this;
  }
}
