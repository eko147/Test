import { DEBUG } from "@/data/global";
import  PhysicsEntity, { isCircleCollideRect, isRectCollideRect } from "@/game/physics_entity"
import { isEqualF } from "@/game/physics_utils";

export default class Physics {

  /** @type {number} */
  #objId = 0;

  /** @type {{
   *  [key: number]: PhysicsEntity
   * }} */
  #allObjects = {};

  /** @type {number[]} */
  #movableObjects = [];

  /** @type {number[]} */
  #collidibleObjectIds = [];

  #elapsedTime = 0;

  /** @type {{
   * [key: number]: {
   * 		callback: (collider: PhysicsEntity, collidee: PhysicsEntity, time: number) => void,
   *		trigger: (collider: PhysicsEntity, collidee: PhysicsEntity, time: number) => boolean,
   *	}
   * }} 
   */
  #collideCallbacks = [];
  #collideCallbackId = 0;

  constructor() {

  }

  /** @param {PhysicsEntity[]} objs 
   *  @returns {number[]}
   * */
  addObject(...objs) {
    const ids = [];
    objs.forEach(obj => {
      const id = this.#objId++;
      ids.push(id);
      obj["physicsId"] = id;
      this.#allObjects[id] = obj;
      if (obj.isMovable) {
        this.#movableObjects.push(id);
      }
      this.#collidibleObjectIds.push(id);
    })
    return ids;
  }

  /** @param {number} id */
  removeObject(id) {
    const target = this.#allObjects[id];
    if (target.isMovable) {
      const index = this.#movableObjects.findIndex(i => id == i);
      if (index != -1)
        this.#movableObjects.splice(index, 1);
    }
    const index = this.#collidibleObjectIds.findIndex(i => id == i);
    if (index != -1)
      this.#collidibleObjectIds.splice(index, 1);
    delete this.#allObjects[id];
  }

  /** @param {number} objId
   *  @param {function({
   *    accel: { x: number, y: number },
   *    velocity: { x: number, y: number },
   *    position: { x: number, y: number }
   *  }):
   *  {
   *    accel?: { x: number, y: number },
   *    velocity?: { x: number, y: number },
   *    position?: { x: number, y: number }
   *    width?: number,
   *    height?: number
   *  }} setCallback
   */
  setState(objId, setCallback) {
    const obj = this.#allObjects[objId];
    if (!obj) {
      if (DEBUG.isDebug())
        console.error("Not: valid object id ", objId);
      return ;
    }
    const state = {
      accel: obj.acceleration,
      velocity: obj.velocity,
      position: obj.position,
    };
    const res = setCallback({...state});
    if (res.accel)
      obj.acceleration = res.accel;
    if (res.velocity)
      obj.velocity = res.velocity;
    if (res.position)
      obj.position = res.position;
    if (res.width) 
      obj.setWidth(res.width);
    if (res.height)
      obj.setHeight(res.height);
  }

  /**  @param {number} elapsedTime */
  update(elapsedTime) {
    this.#elapsedTime += elapsedTime;
    this.#updateVelocities(elapsedTime)
      .#updatePositions(elapsedTime)
      .#handleCollisions()
  }

  get allStates() {
    /** @type {{
     *   [key: number]: {
     *    position: { x: number, y: number },
     *    velocity: { x: number, y: number }
     *   }}} */
    const states = {};
    Object.entries(this.#allObjects)
      .forEach(([id, obj]) => {
        states[id] = {
          position: {
            x: obj.midX,
            y: obj.midY
          },
          velocity: {...obj.velocity}
        };
      });
    return states;
  }

  /**  @param {number} objId */
  getState(objId) {
    const obj = this.#allObjects[objId];
    if (!obj) 
      throw "Fail to get object for " + objId;
    return ({
      position: {...obj.position},
      velocity: {...obj.velocity},
      width: obj.width,
      height: obj.height
    });
  }

  /** 
   *	@param {(collider: PhysicsEntity, collidee: PhysicsEntity, time: number) => boolean} trigger
   * @param {(collider: PhysicsEntity, collidee: PhysicsEntity, time: number) => void} callback
   * 	@returns {number} id
   */
  addCollisionCallback(trigger, callback) {

    const id = this.#collideCallbackId++;
   
    this.#collideCallbacks[id] = {
      trigger,
      callback
      };
    return id;
    }
    /** @param {number}id */
  removeCollisionCallback(id) {
    this.#collideCallbackId[id]
  }

  /**  @param {number} elapsedTime */
  #updateVelocities(elapsedTime) {
    for (let id of this.#movableObjects) {
      const obj = this.#allObjects[id];
      const start = {...obj.velocity};
      const accel = obj.acceleration;
      if (isEqualF(accel.x, 0))
        accel.x = 0;
      if (isEqualF(accel.y, 0))
        accel.y = 0;
      const after = {
        x: start.x + accel.x * elapsedTime,
        y: start.y + accel.y * elapsedTime
      };
      if (isEqualF(after.x, 0))
        after.x = 0;
      if (isEqualF(after.y, 0))
        after.y = 0;
      obj.velocity = after;
    }
    return this;
  }

  /**  @param {number} elapsedTime */
  #updatePositions(elapsedTime) {
    for (let id of this.#movableObjects) {
      const obj = this.#allObjects[id];
      const start = {...obj.position};
      const vel = obj.velocity;
      const after = {
        x: start.x + vel.x * elapsedTime,
        y: start.y + vel.y * elapsedTime
      };
      if (isEqualF(after.x, 0))
        after.x = 0;
      if (isEqualF(after.y, 0))
        after.y = 0;
      obj.position = after;
    }
    return this;
  }

  #handleCollisions() {
    const callbackIds = Object.keys(this.#collideCallbacks)
      .sort();
    this.#getAllCollisions()
      .forEach(({collider, collidee}) => {
        if (!collidee.isDynamic || !collider.isDynamic) {
          this.#resolveCollideWithStatic(collider, collidee);
        }
        else {
          this.#resolveCollideWithDynamic(collider, collidee);
        }
        for (let id of callbackIds) {
          const {trigger, callback} = this.#collideCallbacks[Number(id)];
          if (trigger(collider, collidee, this.#elapsedTime)) {
            callback(collider, collidee, this.#elapsedTime);
          }
        }
      })
    return this;
  }

    /** @param {PhysicsEntity} collider
     *  @param {PhysicsEntity} collidee
     */
    #resolveCollideWithStatic(collider, collidee) {
      if (collidee.isDynamic) {
        const temp = collider;
        collidee = collider;
        collider = temp;
      }

      const distSquared = {
        x: Math.pow(collider.midX - collidee.midX, 2), 
        y: Math.pow(collider.midY - collidee.midY, 2)
      };

      const halfSize = {
        width: (collider.width + collidee.width) * 0.5,
        height: (collider.height + collidee.height) * 0.5
      }

      const collideAxes = {
        x: distSquared.x < Math.pow(halfSize.width, 2),
        y: distSquared.y < Math.pow(halfSize.height, 2)
      };

      if (!collideAxes.x || !collideAxes.y) {
        return ;
      }

      const collisionEpsilon = (Math.abs(collider.velocity.x) + Math.abs(collider.velocity.y)) * 0.05;
      if (collideAxes.x) {
        if (collider.velocity.x > 0 && 
          collider.midX < collidee.midX &&
          Math.abs(collider.right - collidee.left) < collisionEpsilon) {
          collider.position.x = collidee.left - collider.width; 
        }
        else if (collider.velocity.x < 0 && 
          collider.midX > collidee.midX &&
          Math.abs(collider.left - collidee.right) < collisionEpsilon) {
          collider.position.x = collidee.right;
        }
        else {
          collideAxes.x = false;
        }
      }
      if (collideAxes.y) {
        if (collider.velocity.y > 0 && 
          collider.midY < collidee.midY &&
          Math.abs(collider.top - collidee.bottom) < collisionEpsilon) {
          collider.position.y = collidee.bottom - collider.height;
        }
        else if (collider.velocity.y < 0 &&
          collider.midY > collidee.midY &&
          Math.abs(collider.bottom - collidee.top) < collisionEpsilon) {
          collider.position.y = collidee.top;
        }
        else {
          collideAxes.y = false;
        }
      }

      if (collider.isDynamic)  {
        // TODO: acceleration?
        if (collideAxes.x) { 
          collider.velocity.x *= -1;
        }
        if (collideAxes.y)
          collider.velocity.y *= -1;

        if (collideAxes.x && collideAxes.y && collider.isShape("CIRCLE")) {
          let randomness = Math.abs((Math.random() - 0.5) * 0.3);
          if (collider.velocity.x > 0) {
            collider.velocity.x *= 1.0 + randomness;
            collider.velocity.y *= 1.0 - randomness;
          }
          else {
            collider.velocity.x *= 1.0 + randomness;
            collider.velocity.y *= 1.0 - randomness;
          }
        }
      }
      else {
        collider.acceleration = { x: 0, y: 0 };
        collider.velocity = { x: 0, y:0 };
      }
    }

    /** @param {PhysicsEntity} collider
     *  @param {PhysicsEntity} collidee
     */
    #resolveCollideWithDynamic(collider, collidee) {
      throw "dynamic + dynamic collision not implemented";
    }

    #getAllCollisions() {
      const movingObjects = {};
      const collisions = [];
      for (let id in this.#allObjects) {
        const obj = this.#allObjects[id];
        if (obj && obj.isMoving) {
          collisions.push(...this.#getCollisions(
            obj, 
            Object.keys(movingObjects).map(
              id => this.#allObjects[id])
          ));
          movingObjects[id] = obj;
        }
      }
      Object.values(movingObjects).forEach(obj => {
        const collidees = this.#collidibleObjectIds
          .filter(id => !movingObjects[id])
          .map(id => this.#allObjects[id] )    
        collisions.push(
          ...this.#getCollisions(obj, collidees));
      })    
      return collisions;
    }

    /** @param {PhysicsEntity} collider
     *  @param {PhysicsEntity[]} collidees
     *  @returns {{
     *    collider: PhysicsEntity,
     *    collidee: PhysicsEntity
     *  }[]}
     */
    #getCollisions(collider, collidees) {
      const collisions = [];
      collidees.forEach(collidee => {
        if (this.#detectCollision(collider, collidee)) {
          collisions.push({ collider, collidee });
        }
      })
      return collisions;
    }

    /** @param {PhysicsEntity} collider
     *  @param {PhysicsEntity} collidee
     */
    #detectCollision(collider, collidee) {

      const circle = collider.isShape("CIRCLE") ? collider
        : (collidee.isShape("CIRCLE") ? collidee: null);
      if (circle) {
        if (collider.isShape("CIRCLE") &&
          collidee.isShape("CIRCLE")) {
          throw "Not implemented circle and circle collision";
        }
        const rect = circle == collider ? collidee: collider;
        return isCircleCollideRect(circle, rect);
      }
      if (collider.isShape("RECTANGLE") &&
        collidee.isShape("RECTANGLE")) {
        return isRectCollideRect(collider, collidee); 
      }
      throw "Not implemented collision type " + collider.shape + " + " + collidee.shape;
    }
  }
