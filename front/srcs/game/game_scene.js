import * as THREE from "three";
import Asset from "@/game/asset";
import ASSET_PATH from "@/assets/path";
import Physics from "@/game/physics";
import { EPSILON } from "@/game/physics_utils";
import PhysicsEntity from "@/game/physics_entity";
import GameData  from "@/data/game_data";
import Player, { PLAYER_POSITION } from "@/data/player";
import ParticleGenerator from "@/game/particle_generator";
import { WALL_TYPES, DIRECTION, GameMap } from "@/data/game_map";
import { resizeTexture } from "@/utils/three_util";
import Timer from "@/game/timer";
import PowerUp, { POWER_UP_CONFIG } from "@/data/power_up";
import * as THREE_UTIL from "@/utils/three_util";
import Observable from "@/lib/observable";
import CONFIG from "@/game/config";
import { DEBUG } from "@/data/global";


export default class GameScene extends THREE.Group {

  static peddleShaderPath = {
    vertex: "srcs/shader/peddle_v.glsl",
    fragment: "srcs/shader/peddle_f.glsl",
  }

  static ballShaderPath = {
    vertex: "srcs/shader/ball_v.glsl",
    fragment: "srcs/shader/ball_f.glsl",
    atMosphereFragment: "srcs/shader/ball_atmosphere_f.glsl",
  };

  /** @type {THREE_UTIL.ShaderLoadContext} */
  static #peddleShaderLoad= THREE_UTIL.createLoadShaderContext(GameScene.peddleShaderPath);
  #peddleShaderLoaded = false;
  /** @type {THREE_UTIL.ShaderLoadContext} */
  static #ballShaderLoad = THREE_UTIL.createLoadShaderContext(GameScene.ballShaderPath);
  #ballShaderLoaded = false;

  /** @type {Physics} */
  #physics;
  /** @type {GameData} */
  #gameData;
  #gameMap;
  #timer;
  #isPreparingBall = false;
  #isVisible = document.visibilityState != "hidden";
  pixelRatio = Math.min(window.devicePixelRatio, 2);
  /** @type {{
   * physicsId: number,
   * mesh: THREE.Mesh,
   * powerUp: PowerUp,
   * }[]} */
  #activePowerUps = [];
  #activatedPowerUP= new Observable(null);

  /** @type {{
   *  keyInput: (key: string, press: boolean) => void,
   *  scoreUpdate: (data: { winPlayer: Player,
   *    scores: { [key: string]: number } }) => void ,
   *  collisionLoggerId: number,
   *}} */ //@ts-ignore
  #logger = {};

  #hitSound = {
    sound: Asset.shared.get("AUDIO", ASSET_PATH.hitSound),
    lastPlayed: 0,
    volume: 1
  };

  /** @type {{
   *    mesh: THREE.Mesh,
   *    physicsId: number
   *  }[]}
   */
  #objects = [];

  /** @type {"TOP" | "BOTTOM" | null} */
  #lostSide = null;

  /**
   * @type {{
   *  mesh: THREE.Mesh | null,
   *  atmosphere:THREE.Mesh | null,
   *  physicsId: number | null,
   * }} 
   */
  #ball = { 
    mesh: null, 
    atmosphere: null,
    physicsId: null 
  };

  get ball() {
    return {
      mesh: this.#ball.mesh,
      physicsId: this.#ball.physicsId
    };
  }

  ballColor = 0xff0000;
  #ballRadiusInGame = 3;
  #ballSpeed = 40;
  #ballStartDirection = {
    x: DIRECTION.left,
    y: DIRECTION.bottom
  };
  #stuckHandler;

  /** @type {{
   *  [key in string]: {
   *    colorTexture: THREE.Texture,
   *    normalTexture: THREE.Texture,
   *    aoRoughnessMetallnessTexture: THREE.Texture
   *  }
   * }} */
  #loadedTextures = { };

  /**
   * @type {{
   *  [key: number]: THREE.Mesh // physicsId: Mesh
   * }} 
   */
  #walls = {}; 
  #wallTextureRepeat = 0.05;

  /** @type {number} */
  wallColor = 0x00ff00;

  #safeWallHitCount = 0;

  /** @type {{
   *    mesh: THREE.Mesh,
   *    physicsId: number,
   *    hitEffect: Observable
   *  }[]}
   */
  #peddles = [];

  /** @type {{
   *    pressed: {
   *      player: number,
   *      x: number,
   *      y: number,
   *      key: string | null,
   *    }
   *   }[]}
   */
  #peddleControls = [
    {
      pressed: {
        player: 0,
        x: 0,
        y: 0,
        key: null
      }
    }, 
    {
      pressed: {
        player: 1,
        x: 0,
        y: 0,
        key: null
      }
    }
  ];

  isBallMoving = false;
  /**
   * Constants
   */
  /** @type {{
   *  [key in string]: {
   *    r: number,
   *    g: number, 
   *    b: number
   *  }
   * }}*/
  #peddleColors = { };

  peddleSizeInGame = {
    width: 0.15,
    height: 0.015
  };

  #gameSize = {
    width: 100,
    height: 100,
    depth: 1
  };

  #depth = {
    wall: 5,
    peddle: 3
  };

  /** @type {{
   *  desc: string,
   *  id: number
   * }[]} */
  #eventsIds = [];

  /** @type {ParticleGenerator} */
  #gameParticle;

  /** @param {{ 
   *  timer: Timer,
   *  stuckHandler: ((isStuck:boolean) => void) | null,
   *  data: GameData,
   *  map: GameMap
   *  }} params
   * */
  constructor({timer, stuckHandler, data, map}) {
    super();
    THREE_UTIL.loadShaders(GameScene.#peddleShaderLoad);
    THREE_UTIL.loadShaders(GameScene.#ballShaderLoad);
    GameScene.#peddleShaderLoad
    this.#timer = timer;
    this.#gameData = data;
    this.#gameMap = map;
    this.#stuckHandler = stuckHandler;
  }

  init() {
    this.#physics = new Physics();
    this
      .#setBackground()
      .#addObjects()
      .#addControls()
      .#addEvents()
      .#setVisibleCallback();
    this.#gameParticle.isPlaying = true;
  }

  /** @param {number} frameTime */
  update(frameTime) {
    this.#gameParticle.animate(frameTime);
    if (!this.#isVisible) 
      return ;
    this.#peddles.forEach(peddle => 
      peddle.hitEffect.value = Math.max(peddle.hitEffect.value - frameTime, 0));
    let frameSlice = Math.min(frameTime, CONFIG.FRAME_TIME_THRESHOLD);
    this
      .#updatePowerUps(frameTime)
      .#updateObjects({frameTime, frameSlice})
    this.#capturePeddles();
    if (this.#ball.physicsId) {
      this.#captureBall()
    }
  }

  addBall() {
    if (this.#isPreparingBall) {
      if (DEBUG.isDebug())
        console.error("preparing ball");
      return ;
    }
    this.#isPreparingBall = true;
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(this.#ballRadiusInGame, 16, 16),
      this.#createBallMaterial()
    );
    mesh.position.set(0, 0, 0);
    const ballWidth =  this.#ballRadiusInGame;
    const ballHeight = this.#ballRadiusInGame;

    const ballPhysics = PhysicsEntity.createCircle({
      type: "MOVABLE",
      collideType: "DYNAMIC",
      radius: Math.max(ballWidth, ballHeight),
      center: { x: 0, y:0 }
    });
    ballPhysics["data"] = {
      isBall: true
    };

    const physicsId = this.#physics.addObject(ballPhysics)[0];

    this.#objects.push(
      {
        mesh,
        physicsId
      },
    );
    this.add(mesh);
    this.#ball.mesh = mesh;
    this.#ball.physicsId = physicsId;
    this.#ball.atmosphere = this.#createBallAtmosphere();
    setTimeout(() => {
      this.#moveBall();
      this.#isPreparingBall = false;
    }, CONFIG.BALL_PREPARE_MS);
    return this;
  }

  #createBallAtmosphere() {
    if (!this.#ballShaderLoaded || !this.#ball.mesh) {
      return null;
    }
    const geometry = this.#ball.mesh.geometry.clone();

    const shaders = GameScene.#ballShaderLoad.loadedShader;
    const material = new THREE.ShaderMaterial({
      vertexShader: shaders["vertex"],
      fragmentShader: shaders["atMosphereFragment"],
      transparent: true,
      uniforms: {
        uGlow: { value: 0.0 }
      }
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = false;
    mesh.scale.set(1.5, 1.5, 1.0);
    mesh.position.z -= 1.0;
    this.add(mesh);
    return mesh;
  }

  #createBallMaterial() {
    /** @type { THREE.Material } */
    let material = null;
    if (!this.#ballShaderLoaded) {

      GameScene.#ballShaderLoad.isLoaded.then((loaded) =>  {
        this.#ballShaderLoaded = loaded;
        if (this.#ball.mesh) {
          //@ts-ignore
          this.#ball.mesh.material.dispose();
          this.#ball.mesh.material = this.#createBallMaterial();
        }
        if (!this.#ball.atmosphere) {
          this.#ball.atmosphere = this.#createBallAtmosphere();
        }
      })
      material = new THREE.MeshStandardMaterial({
        color: this.ballColor,
        metalness: 0.3,
        roughness: 0.4
      })
    }
    else {
      const shaders = GameScene.#ballShaderLoad.loadedShader;
      material = new THREE.ShaderMaterial({
        vertexShader: shaders["vertex"],
        fragmentShader: shaders["fragment"],
        uniforms: {
          uText: { 
            value: Asset.shared.get("TEXTURE", 
              ASSET_PATH.getTexture.normal("earth"))
          }
        }
      });
    }
    
    return material;
  }

  #moveBall() {

    const ratio = (this.#gameData.peddleSpeedRatio - 1.0) * 0.8 + 1.0;
    this.#ballStartDirection.x = (Math.random() > 0.5) ? DIRECTION.left: DIRECTION.right;
    this.#ballStartDirection.y = (this.#lostSide == DIRECTION.top) ? DIRECTION.bottom: DIRECTION.top;
    const velocity = {
      x: (this.#ballStartDirection.x == DIRECTION.right? 1 : -1) * this.#ballSpeed * ratio * (1.0 + (Math.random() - 0.5) * 0.5),
      y: (this.#ballStartDirection.y == DIRECTION.top? 1 : -1) * this.#ballSpeed * ratio
    };
    this.#physics.setState(this.#ball.physicsId,
      () => ({ velocity })
    );
  }

  showNextMatch() {
    this.#removePowerUps();
    this.#updatePeddleColors();
  }

  #removePowerUps() {
    for (let {powerUp} of this.#activePowerUps) {
      powerUp.revoke();
    }
    this.#activePowerUps = [];
  }

  removeBall() {
    if (this.#ball.physicsId == null)
      return ;
    const id = this.#ball.physicsId
    this.#physics.removeCollisionCallback(id);
    this.#physics.removeObject(id);
    this.remove(this.#ball.mesh);
    this.remove(this.#ball.atmosphere);
    this.#ball.mesh = null;
    this.#ball.atmosphere = null;
    this.#ball.physicsId = null;
    return this;
  }

  removeParticle() {
    this.#gameParticle.remove();
  }

  /** @param {Player} player */
  getPeddleColor(player) {
    return this.#peddleColors[player.nickname];
  }

  /** @param {Player} player 
   *  @param {{r: number, g: number, b: number}} color
   */
  setPeddleColor(player, color) {
    let mesh;
    this.#peddleColors[player.nickname] = color;
    if (player.nickname == this.#gameData.currentPlayers[0].nickname)
      mesh = this.#peddles[0].mesh; 
    else if (player.nickname == this.#gameData.currentPlayers[1].nickname)
      mesh = this.#peddles[1].mesh; 
    else {
      if (DEBUG.isDebug())
        console.error("player to set color not playing");
      return ;
    }
    const normalizedColor = [ 
      color.r / 255,
      color.g / 255, 
      color.b / 255 
    ];
    if (this.#peddleShaderLoaded) {
      const materials = mesh.material;
      for (let i = 2; i <= 4; ++i) {
        materials[i].uniforms.uColor.value = new THREE.Vector3(
          ...normalizedColor
        );
      }
    }
    else {
      /** @type {THREE.MeshBasicMaterial} */ //@ts-ignore
      const material = mesh.material;
      material.color.r = normalizedColor[0];
      material.color.g = normalizedColor[1];
      material.color.b = normalizedColor[2];
    }
  }

  #updatePeddleColors() {
    for (let player of this.#gameData.currentPlayers) {
      let color = this.#peddleColors[player.nickname];
      if (!color)  {
        color = {
          r: Math.random() * 255,
          g: Math.random() * 255,
          b: Math.random() * 255
        };
        this.#peddleColors[player.nickname] = color;
      }
      this.setPeddleColor(player, color);
    }
  }


  #addWalls() {
    const sizes = this.#gameMap.wallSizes;
    sizes.forEach(size => {
      const walls = this.#gameMap.getWallsBySize(size);
      const entities = this.#addWall(
        size,
        walls.map(wall => ({
          position: {
            x: (wall.centerX * 0.01 - 0.5) * this.#gameSize.width,
            y: (wall.centerY * 0.01 - 0.5) * this.#gameSize.height,
            z: this.#depth.wall * 0.5,
          },
          textureName: wall.type == "SAFE" ?
          "brick": "brick_dark"
        })
        ),
      );
      for (let i = 0; i < walls.length; ++i) {
        const wall = walls[i];
        entities[i].data = {
          isWall: true,
          wallType: wall.type,
        };
        if (wall.type == WALL_TYPES.trap) {
          if (wall.centerX == 50)
            entities[i].data.direction = 
              wall.centerY > 50 ? DIRECTION.top: DIRECTION.bottom;
        }
      }
    })
    return this;
  }

  /** @param {{
   *   width: number,
   *   height: number
   * }} wallSize
   * {{
   *  position: {
   *    x: number,
   *    y: number,
   *    z: number
   *  },
   *  textureName: string
   * }[]} wallInfo
   */
  #addWall(wallSize, wallInfo) {

    const geometry = new THREE.BoxGeometry(wallSize.width, wallSize.height, this.#depth.wall);

    let textures = {};
    wallInfo.forEach(({textureName}) => {
      if (!textures[textureName]) {
        textures[textureName] = 
          this.#createMaterialFromTexture(
            textureName, 
            (texture) => {
              resizeTexture({
                texture,
                x: wallSize.width * this.#wallTextureRepeat,
                y: wallSize.height * this.#wallTextureRepeat,
              })
            }
          ) 
      }
    })

    const meshes = wallInfo.map(({position, textureName}) =>  {
      const mesh = new THREE.Mesh(
        geometry, 
        textures[textureName]
      );
      mesh.position.set(position.x, position.y, position.z);
      return mesh;
    });

    const physics = wallInfo.map( ({ position })=> {
      return PhysicsEntity.createRect({
        type: "IMMOVABLE",
        width: wallSize.width,
        height: wallSize.height,
        center: {
          x: position.x, 
          y: position.y
        }
      });
    });
    const physicsIds = this.#physics.addObject(...physics);
    for (let i = 0; i < physicsIds.length; ++i) {
      this.#objects.push(
        {
          mesh: meshes[i],
          physicsId: physicsIds[i]
        },
      );
      this.#walls[physicsIds[i]] = meshes[i];
    }
    this.add(...meshes);
    return physics;
  }
  /** @param {string} name
   *  @param {((loaded: THREE.Texture) => void)?} onload
   */
  #createMaterialFromTexture(name, onload = null) {

    const loadedTextures = this.#loadedTextures[name];
    if (loadedTextures &&
      loadedTextures.colorTexture && 
      loadedTextures.normalTexture &&
      loadedTextures. aoRoughnessMetallnessTexture) {

      const textures = {};
      Object.entries(loadedTextures)
        .forEach(([ key, text ]) => {
          textures[key] = text.clone();
        });
      return new THREE.MeshStandardMaterial({
        map: textures.colorTexture,
        normalMap: textures.normalTexture,
        aoMap: textures.aoRoughnessMetallnessTexture,
        roughnessMap: textures.aoRoughnessMetallnessTexture,
        metalnessMap: textures.aoRoughnessMetallnessTexture,
      });

    }
    //@ts-ignore
    this.#loadedTextures[name] = {};

    /** @type {THREE.Texture} */
    const colorTexture = Asset.shared.get(
      "TEXTURE",
      ASSET_PATH.getTexture.color(name),
    ).clone();

    /** @type {THREE.Texture} */
    const normalTexture = Asset.shared.get(
      "TEXTURE",
      ASSET_PATH.getTexture.normal(name)
    ).clone();


    /** @type {THREE.Texture} */
    const aoRoughnessMetallnessTexture = Asset.shared.get(
      "TEXTURE",
      ASSET_PATH.getTexture.arm(name)
    ).clone();

    if (onload) {
      onload(colorTexture);
      onload(normalTexture);
      onload(aoRoughnessMetallnessTexture);
    }

    const material = new THREE.MeshStandardMaterial({
      map: colorTexture,
      normalMap: normalTexture,
      aoMap: aoRoughnessMetallnessTexture,
      roughnessMap: aoRoughnessMetallnessTexture,
      metalnessMap: aoRoughnessMetallnessTexture,
    });

    return material;
  }

  #setBackground() {

    const size = {
      x: this.#gameSize.width * 0.8,
      y: this.#gameSize.height * 0.8,
      z: this.#gameSize.depth * 0.5
    };

    const container = new THREE.Mesh(
      new THREE.BoxGeometry(size.x, size.z, size.z),
      new THREE.MeshBasicMaterial({
        transparent: true,
        opacity: 0,
        depthWrite: false
      })
    );
    this.#gameParticle = new ParticleGenerator({
      count: 100,
      particleSize: 16. * this.pixelRatio,
      maxSize: {
        x: 50,
        y: 50,
        z: 0.001
      }
    });
    this.#gameParticle.setColor([
      "#008DDA",
      "#41C9E2",
      "#ACE2E1",
      "#F7EEDD",
    ])
    this.#gameParticle.createParticles()
      .then(() => {
        const particles = this.#gameParticle.getParticles();
        container.scale.z = 0.2;
        container.add(particles);
        this.add(container);
      });
    return this;
  }

  #addObjects() {
    this.#addWalls()
      .#addPeddles()
    return this;
  }

  #addPeddles() {
    const size = {
      width: this.#gameSize.width * this.peddleSizeInGame.width,
      height: this.#gameSize.height * this.peddleSizeInGame.height,
    };

    const geometry = new THREE.BoxGeometry(
      size.width,
      size.height,
      this.#depth.peddle
    );

    /** @type {{ r: number, g: number, b: number}[]} */
    const colors = [];

    this.#gameData.currentPlayers.forEach(
      (player, i) => {
        const color = {
          r: Math.random() * 255,
          g: Math.random() * 255,
          b: Math.random() * 255
        };
        this.#peddleColors[player.nickname] = color;
        colors[i] = color;
      });

    const materials = colors.map(color => {
      return Array(6).fill(
        new THREE.MeshBasicMaterial({
          color: new THREE.Color(
            `rgb(${Math.floor(color.r)}, ${Math.floor(color.g)}, ${Math.floor(color.b)})`),
        })
      ) 
    })

    const positions = [
      {
        x: 0,
        y: this.#gameSize.height * 0.4
      },
      {
        x: 0,
        y: this.#gameSize.height * - 0.4
      },
    ];

    const meshes = materials.map((material, index) => {
      const mesh = new THREE.Mesh(
        geometry,
        material
      );
      const pos = positions[index];
      mesh.position.set(pos.x, pos.y, this.#depth.peddle * 0.5);
      return mesh;
    });

    GameScene.#peddleShaderLoad.isLoaded.then(() => {
      this.#peddleShaderLoaded = true;
      meshes.forEach((mesh, i) => {
        const color = colors[i];
        const hitEffect = this.#peddles[i].hitEffect;
        const shaders = GameScene.#peddleShaderLoad.loadedShader;
        for (let i = 2; i <= 4; ++i) { 
          let direction = "#define " + (
            i == 4 ? "FRONT": (i == 2 ? "ABOVE": "BELOW")
          ) + "\n"; 
          const material = new THREE.ShaderMaterial({
            vertexShader: shaders["vertex"],
            fragmentShader: direction + shaders["fragment"],
            uniforms: {
              uColor: { value: new THREE.Vector3(
                color.r / 255, color.g / 255, color.b / 255
              )},
              uHit: { value: 0.0 }
            },
          });
          mesh.material[i].dispose();
          mesh.material[i] = material;
        }
        hitEffect.subscribe((hit) => {
          for (let i = 2; i <=4; ++i) {
            mesh.material[i].uniforms.uHit.value = hit;
          }
        })
      })
    });

    const physicsEntities = positions.map((pos, index) => {
      const entity = PhysicsEntity.createRect({
        type: "MOVABLE",
        width: size.width,
        height: size.height,
        center: {
          x: pos.x,
          y: pos.y
        }
      });
      entity.data = {
        isPeddle: true,
        player: PLAYER_POSITION[ index == 0 ? DIRECTION.top: DIRECTION.bottom]
      };
      return entity;
    });
    const physicsIds = this.#physics.addObject(...physicsEntities);
    for (let i = 0; i < physicsIds.length; ++i) {
      this.#objects.push({
        mesh: meshes[i],
        physicsId: physicsIds[i]
      });
      this.#peddles.push({
        mesh: meshes[i],
        physicsId: physicsIds[i],
        hitEffect: new Observable(0.0)
      });
    };
    this.add(...meshes);
  }

  #addControls() {
    window.addEventListener("keydown", event => {
      const controlKey = this.#gameData.controlMap[event.key];
      if (!controlKey)
        return ;
      if (this.#logger.keyInput) {
        this.#logger.keyInput(event.key, true);
      }
      switch (controlKey.type) {
        case ("MOVE"):
          this.#peddleControls[controlKey.player].pressed = {
            x: controlKey.x,
            y: controlKey.y,
            player: controlKey.player,
            key: event.key
          };
          break;
        case ("ACTION"):
          if (controlKey.action == "USE_POWER_UP" &&
            this.#activatedPowerUP.value == null) {
            const player = this.#gameData.currentPlayers[controlKey.player];
            this.#usePowerUp(player, controlKey.player);
          }
          break;
      }
    });

    window.addEventListener("keyup", event => {
      const controlKey = this.#gameData.controlMap[event.key];
      if (!controlKey)
        return ;
      if (this.#logger.keyInput) {
        this.#logger.keyInput(event.key, false);
      }
      switch (controlKey.type) {
        case ("MOVE"):
          if (this.#peddleControls[controlKey.player].pressed.key 
            == event.key) {
            this.#peddleControls[controlKey.player].pressed = {
              x: 0, 
              y: 0,
              key: null,
              player: controlKey.player
            };
            break;
          }
      }
    })
    return this;
  }

  /** @param {Player} player 
   *  @param {number} playerIndex
   **/
  #usePowerUp(player, playerIndex) {
    if (this.#gameData.getPowerUpCountFor(player) == 0) {
      if (DEBUG.isDebug())
        console.log(player.nickname, " has no power up");
      return ;
    }
    const info = this.#gameData.usePowerUp(player);
    this.#activatedPowerUP.value = info.type;

    const powerUp = new PowerUp({
      duration: POWER_UP_CONFIG.defaultDuration,
      info
    });
    let target = null;
    switch (info.type) {
      case ("SUMMON"):
        break;
      case ("BUFF"):
        if (info.target == "PEDDLE") {
          const peddle = this.#peddles[playerIndex];
          target = this.#physics.getState(peddle.physicsId);
          this.#usePowerUpToPeddle(peddle, powerUp);
        }
        break;
      case ("DEBUFF"):
        if (info.target == "PEDDLE") {
          const opponentIndex = playerIndex == 0 ? 1: 0;
          const peddle = this.#peddles[opponentIndex];
          target = this.#physics.getState(peddle.physicsId);
          this.#usePowerUpToPeddle(peddle, powerUp);
        }
        break; 
    }

    if (!target) {
      if (DEBUG.isDebug())
        console.error("not implemented");
      return ;
    }
    powerUp.use(target); 
    switch (info.type)  {
      case ("BUFF"): {
        /** @type {HTMLAudioElement} */
        const sound = Asset.shared.get("AUDIO", ASSET_PATH.buffSound);
        sound.play();
      }
        break;
      case ("DEBUFF"): {
        /** @type {HTMLAudioElement} */
        const sound = Asset.shared.get("AUDIO", ASSET_PATH.deBuffSound);
        sound.play();
      }
        break;
    }
  }

  /** @param{{
   *    mesh: THREE.Mesh,
   *    physicsId: number
   *    }} peddle,
   *  @param { PowerUp } powerUp
   */
  #usePowerUpToPeddle(peddle, powerUp) {
    switch (powerUp.info.key) {
      case ("PEDDLE_SPEED_UP"):
        powerUp.setTotalDuration(POWER_UP_CONFIG.peddleSpeedUpDuration);
        break;
      case ("PEDDLE_SPEED_DOWN"):
        powerUp.setTotalDuration(POWER_UP_CONFIG.peddleSpeedDownDuration);
        break;
      default: break;
    }
    powerUp.setUseCallback((state) => {
      if (powerUp.info.key.includes("PEDDLE_SIZE")) {
        this.#physics.setState(peddle.physicsId, 
          ({position}) => {
            let x = position.x;
            if (position.x > 0) {
                x -= state.width * 0.5;
            }
            return {
              position: {
                x,
                y: position.y
              },
              width: state.width,
            }
          });
        const scale = state.width / powerUp.defaultTargetStatus.width; 
        peddle.mesh.scale.setX(scale);
      }
    });
    powerUp.setRevokeCallback((state) => {
      if (powerUp.info.key.includes("PEDDLE_SIZE")) {
        this.#physics.setState(peddle.physicsId, () => ({width: state.width}));
        const scale = state.width / powerUp.defaultTargetStatus.width; 
        peddle.mesh.scale.setX(scale);
      }
      else if (powerUp.info.key.includes("PEDDLE_SPEED")) {
        this.#physics.setState(
          peddle.physicsId, () =>
          ({
            velocity: state.velocity 
          })
        )
      }
    })
    this.#activePowerUps.push({
      mesh: peddle.mesh,
      physicsId: peddle.physicsId,
      powerUp 
    });
  }

  #addEvents() {

    const hitSoundEventId = this.#physics.addCollisionCallback(
      (collider, collidee, _time) => {
        if (Math.abs(this.#timer.elapsedTime - this.#hitSound.time) < CONFIG.SOUND_EFFECT_THRESHOLD)
          return false;
        if (collider.isShape("CIRCLE") || collidee.isShape("CIRCLE")) {
          return true;
        }
        return false;
      },
      () => {
        this.#hitSound.sound.currentTime = 0;
        this.#hitSound.sound.volume = this.#hitSound.volume;
        this.#hitSound.sound.play();
        this.#hitSound.time = this.#timer.elapsedTime;
      }
    );

    const hitBallEffectId = this.#physics.addCollisionCallback(
      (collider, collidee, _time) => {

        if (!collider.isShape("CIRCLE") && !collidee.isShape("CIRCLE")) {
          return false;
        }
        return (collider.data?.isPeddle || collidee.data?.isPeddle);
      },
      (collider, collidee, _time) => {
        if (this.#stuckHandler && this.#safeWallHitCount > CONFIG.SAFE_WALL_STUCK_THRESHOLD) {
          this.#stuckHandler(false);
        }
        this.#safeWallHitCount = 0;
        /** @type {PhysicsEntity} */
        const ball = collider.isShape("CIRCLE") ? collider: collidee;
        const ballSpeedX = Math.abs(ball.velocity.x);
        const maxSpeed = CONFIG.MAX_BALL_SPEED * this.#gameData.peddleSpeedRatio;
        const minSpeed = CONFIG.MIN_BALL_SPEED * this.#gameData.peddleSpeedRatio;
        if (ballSpeedX > maxSpeed ) {
          ball.velocity.x = maxSpeed * (ball.velocity.x < 0 ? -1: 1);
        }
        else if (ballSpeedX < minSpeed) {

          ball.velocity.x = minSpeed * (ball.velocity.x < 0 ? -1: 1);
        }
        if (this.#ball.atmosphere) { 
          /** @type { THREE.ShaderMaterial } *///@ts-ignore
          const material = this.#ball.atmosphere.material;
          material.uniforms.uGlow.value = 0.8;
        }
        /** @type {PhysicsEntity} */
        const peddle = ball == collider ? collidee: collider;
        ball.velocity.x += peddle.velocity.x * 0.1;
        const peddleIndex = peddle["physicsId"] == this.#peddles[0].physicsId ? 0: 1;

        this.#peddles[peddleIndex].hitEffect.value = 1.0;
      }
    )

    const safeWallEventId = this.#physics.addCollisionCallback(
      (collider, collidee, _time) => {

        if (!this.#stuckHandler) 
          return false;
        if (!collider.isShape("CIRCLE") && !collidee.isShape("CIRCLE")) {
          return false;
        } 
        return (collidee.data?.wallType == WALL_TYPES.safe) ;
      },
      (_collider, _collidee, _time) => {
        this.#safeWallHitCount += 1;
        if (this.#safeWallHitCount > CONFIG.SAFE_WALL_STUCK_THRESHOLD) {
          this.#stuckHandler(true); 
        }
      }
    )

    const ballOutEventId = this.#physics.addCollisionCallback(
      (collider, collidee, _time) => {

        if (!collider.isShape("CIRCLE") && !collidee.isShape("CIRCLE")) {
          return false;
        }
        return (collidee.data && collidee.data.wallType &&
          collidee.data.wallType == WALL_TYPES.trap);
      },
      (_collider, collidee, _time) => {
        this.#lostSide = collidee.data.direction;
        if (this.#stuckHandler && this.#safeWallHitCount > CONFIG.SAFE_WALL_STUCK_THRESHOLD) {
          this.#stuckHandler(false);
        }
        this.#safeWallHitCount = 0;
        this.#lostSide = collidee.data.direction;
        this.#handleScoreChange();
      }
    )

    this.#eventsIds.push({
      desc: "hitSoundEvent",
      id: hitSoundEventId
    });
    this.#eventsIds.push({
      desc: "ballOutEvent",
      id: ballOutEventId
    });
    this.#eventsIds.push({
      desc: "hitBallEffect",
      id: hitBallEffectId
    });
    this.#eventsIds.push({
      desc: "safeWallEventId",
      id: safeWallEventId
    });

    return this;
  }

  #updateGameData() {
    if (!this.#lostSide)
      return ;
    /** @type {GameData} */ //@ts-ignore: casting
    const gameData = this.#gameData;
    /** @type {Player[]} */
    const players = gameData.currentPlayers;
    if (this.#lostSide != DIRECTION.top && 
      this.#lostSide != DIRECTION.bottom) {
      throw "invalid side " + this.#lostSide;
    }
    const winSide = this.#lostSide == DIRECTION.top ? DIRECTION.bottom: DIRECTION.top;
    const winPlayer = players[PLAYER_POSITION[winSide]];
    /** @type {{ [key in string] : number }} */
    const scores = {};
    this.#gameData.currentPlayers.forEach(p => 
      scores[p.nickname] = this.#gameData.getScore(p)
    );
    scores[winPlayer.nickname] += 1;
    gameData.setScore({
      player: winPlayer, 
      score: scores[winPlayer.nickname]
    })
    this.#sendGameScoreUpdate({ winPlayer, scores }); 
    return this;
  }

  #updatePowerUps(frameTime) {
    for (let {powerUp} of this.#activePowerUps) {
      powerUp.update(frameTime);
      if (powerUp.isEnd) {
        powerUp.revoke();
        this.#activatedPowerUP.value = null;
      }
    }
    this.#activePowerUps = this.#activePowerUps.filter(({powerUp}) => !powerUp.isEnd);
    return this;
  }

  /**
   * @param {{
   *  frameTime: number,
   *  frameSlice: number
   * }} args
   */
  #updateObjects({frameTime, frameSlice}) {
    const frame = frameTime;
    const ratio = this.#gameData.peddleSpeedRatio;
    this.#peddles.forEach((peddle, index) => {
      const control = this.#peddleControls[index];
      const activePowerUp = this.#activePowerUps.find(({physicsId}) => physicsId == peddle.physicsId);
      this.#physics.setState(peddle.physicsId,
        (state) => {
          let vel = { ...state.velocity };
          const speedPowerUp = activePowerUp && activePowerUp.powerUp.targetStatus.velocity;
          let accel = CONFIG.PEDDLE_ACCEL * ratio;
          let decel = CONFIG.PEDDLE_DECEL_RATIO * ratio;
          if (speedPowerUp) {
            const status = activePowerUp.powerUp.targetStatus;
            vel.x = status.velocity.x;
            if( activePowerUp.powerUp.info.key == "PEDDLE_SPEED_UP")
            {
              accel *= 2;
              decel *= 2;
            }
            else {
              accel *= 0.5;
              decel *= 0.5;
            }
          }

          if (control.pressed.x == 0) {
            vel.x = Math.abs(vel.x) < EPSILON ? 0: vel.x * decel;
          }
          else {
            vel.x += accel * (control.pressed.x > 0 ? 1: -1);
            if (!speedPowerUp) {
              vel.x = THREE.MathUtils.clamp(
                vel.x,  
                -CONFIG.MAX_PEDDLE_SPEED * ratio, 
                CONFIG.MAX_PEDDLE_SPEED * ratio);
            }
          }
          return { velocity: {
            ...vel
          }};
        })
    })
    while (frameTime > EPSILON) {
      this.#physics.update(frameSlice);
      frameTime -= frameSlice; 
      frameSlice = Math.min(frameTime, CONFIG.FRAME_TIME_THRESHOLD);
    }
    const states = this.#physics.allStates;
    this.#objects.forEach(({mesh, physicsId}) => {
      if (!states[physicsId])
        return ;
      const position = states[physicsId].position;
      mesh.position.set(position.x, position.y, mesh.position.z);
    });
    if (this.#ball.mesh && this.#ball.physicsId) {
      const velocity = this.#physics.getState(this.#ball.physicsId).velocity;
      this.#ball.mesh.rotation.x += velocity.x * 0.001;
      this.#ball.mesh.rotation.y += velocity.y * 0.001;
    }
    if (this.#ball.mesh && this.#ball.atmosphere)  {
      const position = this.#ball.mesh.position;
      this.#ball.atmosphere.position.setX(position.x);
      this.#ball.atmosphere.position.setY(position.y); 
      /** @type { THREE.ShaderMaterial } *///@ts-ignore
      const material = this.#ball.atmosphere.material;
      material.uniforms.uGlow.value = Math.max(0, 
        material.uniforms.uGlow.value - frame * 0.5);
    }
    return this;
  }

  /** @description Prevent ball go out */
  #captureBall() {
    const ballPosition = this.#physics.getState(this.#ball.physicsId).position;
    if (ballPosition.y <= -48) {
      this.#lostSide = "TOP";
      this.#handleScoreChange();
    }
    else if (ballPosition.y > 48) {
      this.#lostSide = "BOTTOM";
      this.#handleScoreChange();
    }
  }

  #capturePeddles() {
    this.#peddles.forEach(peddle  => {
      const state = this.#physics.getState(peddle.physicsId);
      let modifyX = null;
      if (state.position.x < -50) {
        modifyX = -45;
      }
      else if (state.position.x + state.width > 50) {
        modifyX = 45 - state.width;
      }
      if (modifyX) {
        this.#physics.setState(peddle.physicsId, () => ({ position: {
          x: modifyX,
          y: state.position.y
        } }));
      }
    })
  }

  #handleScoreChange() {
    if (this.#stuckHandler && this.#safeWallHitCount > CONFIG.SAFE_WALL_STUCK_THRESHOLD) {
      this.#stuckHandler(false);
    }
    this.#safeWallHitCount = 0;
    this.removeBall()
    this.#updateGameData();
    return this;
  }

  /**
   *  Collect data
   */

  /** @param {{ 
   *    winPlayer: Player
   *    scores: { [key in string]: number}
   * }} params
   * */
  #sendGameScoreUpdate({ winPlayer, scores }) {
    if (!this.#logger.scoreUpdate)
      return;

    /** @type {{ [key in string] :number }} */
    this.#logger.scoreUpdate({
      winPlayer,
      scores
    });
  }

  /** @param {number} playerIndex */
  getPeddleInfo(playerIndex) {
    const physicsId = this.#peddles[playerIndex].physicsId;
    return this.#physics.getState(physicsId);
  }

  getBallInfo() {
    if (!this.#ball?.physicsId)
      return {};
    const physicsId = this.#ball.physicsId;
    return this.#physics.getState(physicsId);
  }

  /** @param {(key: string, press: boolean) => void} logger */
  setKeyLogger(logger) {
    this.#logger.keyInput= logger;
  }

  /** @param {(data: { winPlayer: Player,
   *    scores: { [key: string]: number } }) => void } logger */
  setScoreLogger(logger) {
    this.#logger.scoreUpdate = logger;
  }

  /** @param {(_: {collider: PhysicsEntity, collidee: PhysicsEntity}) => void} logger */
  setCollisionLogger(logger) {
    const id = this.#physics.addCollisionCallback(
      (_collider, _collidee, _time) =>  true,
      (collider, collidee, _time) => {
        collider["info"] = this.#getLoggingInfo(collider);
        collidee["info"] = this.#getLoggingInfo(collidee);
        logger({ collider, collidee })
      },
    );
    this.#eventsIds.push({
      desc: "collision logger",
      id
    });
    this.#logger.collisionLoggerId = id;
  }

  /** @param {PhysicsEntity} entity */
  #getLoggingInfo(entity) {
    const id = entity["physicsId"];
    if (id == null || id == undefined)  {
      if (DEBUG.isDebug())
        console.error("no physics id");
      return null;
    }
    //@ts-ignore
    const data = entity.data;
    if (data == null)
      return null;
    if (data.isBall) {
      return { type: "BALL" };
    }
    if (data.isPeddle) {
      return { 
        ...data,
        playerNickname: this.#gameData.currentPlayers[data.player].nickname
      };
    }
    return data;
  }

  /** @param {(_: (string | null)) => void} callback */
  subscribePowerUp(callback) {
    this.#activatedPowerUP.subscribe(activated => callback(activated));
  }

  #setVisibleCallback() {
    window.addEventListener('blur', 
      () => 
      this.#isVisible = false,
      false);
    window.addEventListener('focus', 
      () => this.#isVisible = true,
      false);
    document.addEventListener("visibilitychange",
      () => {
        //Only work 
        setTimeout(() => {
          this.#isVisible = !document.hidden;
        }, 10);
      },
      false
    );
    return this;
  }

  _addHelper() {
    //this.gui = new GUI();
    this.gui = null;
    if (this.gui)
      return ;
    this.gui.close();

    const color = this.gui.addFolder("color");

    color.addColor(this, "ballColor")
      .onChange(newColor => {
        if (this.#ball.mesh)
          this.#ball.mesh.material.color.set(newColor);
      })

    color.addColor(this, "wallColor")
      .onChange(newColor => {
        Object.entries(this.#walls) 
          .forEach(([id, mesh]) => {
            mesh.material.color.set(newColor);
          })
      })

    Object.entries(this.#peddleColors).forEach(([player], index) => {
      color.addColor(this.#peddleColors, player) 
        .onChange(newColor => {
          this.#peddles[index].mesh.material.color.set(newColor);
        })
    })

    const axesHelper = new THREE.AxesHelper(5);
    axesHelper.setColors(
      new THREE.Color(0xffffff), 
      new THREE.Color(0xffffff), 
      new THREE.Color(0xffffff)
    )
    this.add(axesHelper);
  }
}
