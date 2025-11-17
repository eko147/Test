import { distSquared2D, isEqualF, isEqual2D } from "@/game/physics_utils";

export class PhysicsType {

  static get COLLIDE_TYPES() {
    return ({
      STATIC: "STATIC",
      DYNAMIC: "DYNAMIC"
    });
  }

  static get SHAPES() {
    return ({
      RECTANGLE: "RECTANGLE",
      CIRCLE: "CIRCLE"
    });
  }

  static get TYPES() {
    return ({
      MOVABLE: "MOVABLE",
      IMMOVABLE: "IMMOVABLE"
    });
  }
}

export default class PhysicsEntity {

  /** @type {{ width: Number, height: Number }} */
  #size;
  /** 
   * (minX, minY) of object
   * @type {{ x: Number, y: Number }} 
  * */
  position; 
  /** @type {{ x: Number, y: Number }} */
  velocity;
  /** @type {{ x: Number, y: Number }} */
  acceleration;
  /** @type {string} */
  #shape;
  /** @type {string} */
  #type;
  /** @type {string} */
  #collideType;
  /** @type {any} */
  data = null;

  /** @params {Object} params
   *  @param {{
   *    collideType: "STATIC" | "DYNAMIC",
   *    shape: "RECTANGLE" | "CIRCLE",
   *    type: "MOVABLE" | "IMMOVABLE",
   *    width: Number,
   *    height: Number,
   *    centerX: Number,
   *    centerY: Number
   *  }} params
   */
  constructor({type, shape, collideType, width, height, centerX, centerY}) {
    this.#type = PhysicsType.TYPES[type];
    this.#shape = PhysicsType.SHAPES[shape];
    this.#collideType = PhysicsType.COLLIDE_TYPES[collideType];
    this.#size = { width, height };
    this.position = {
      x: centerX - width * 0.5, 
      y: centerY - height * 0.5
    };
    this.velocity = { x: 0, y: 0 };
    this.acceleration = { x: 0, y: 0 };
    if (this.#shape == PhysicsType.SHAPES.CIRCLE &&
    this.#size.width != this.#size.height) {
      throw "width and height of circle not equal";
    }
  }

  /** @params {Object} params
   *  @param {{
   *    type: "MOVABLE" | "IMMOVABLE",
   *    collideType?: "STATIC" | "DYNAMIC",
   *    width: Number,
   *    height: Number,
   *    center: {
   *      x: Number,
   *      y: Number
   *    }
   *  }} params
   */
  static createRect({type, collideType = "STATIC", width, height, center}){
    return new PhysicsEntity({
      type,
      shape: "RECTANGLE",
      collideType,
      width,
      height,
      centerX: center.x,
      centerY: center.y
    });
  }
  /** @params {Object} params
   *  @param {{
   *    type: "MOVABLE" | "IMMOVABLE",
   *    collideType?: "STATIC" | "DYNAMIC",
   *    radius: Number,
   *    center: {
   *      x: Number,
   *      y: Number
   *    }
   *  }} params
   */
  static createCircle({type, collideType = "STATIC", radius, center}){
    return new PhysicsEntity({
      type,
      shape: "CIRCLE",
      collideType,
      width: radius * 2,
      height: radius * 2,
      centerX: center.x,
      centerY: center.y
    });
  }

  get type() {
    return this.#type;
  }

  get shape() {
    return this.#shape;
  }

  /**
   * Helpers
   */

  get top() {
    return this.position.y + this.#size.height;
  }

  get bottom() {
    return this.position.y;
  }

  get left() {
    return this.position.x;
  }

  get right() {
    return this.position.x + this.#size.width;
  }

  get midX() {
    return this.position.x + this.#size.width * 0.5;
  }

  get midY() {
    return this.position.y + this.#size.height * 0.5;
  }

  get radius() {
    if (this.#shape != PhysicsType.SHAPES.CIRCLE) {
      throw "get radius of non-circle";
    }
    return this.#size.width * 0.5;
  }

  get width() {
    return this.#size.width; 
  }

  get height() {
    return this.#size.height; 
  }

  setWidth(width) {
    this.#size.width = width;
  }

  setHeight(height) {
    this.#size.height = height;
  }

  /** @param {"CIRCLE" | "RECTANGLE"} shapeName 
   *  @returns Boolean
   * */
  isShape(shapeName) {
    return this.#shape == PhysicsType.SHAPES[shapeName];
  }

  /** @returns Boolean
   * */
  get isMovable() {
    return this.#type == PhysicsType.TYPES.MOVABLE;
  }

  get isDynamic() {
    return this.#collideType == PhysicsType.COLLIDE_TYPES.DYNAMIC;
  }

  get isMoving() {
    return !isEqual2D(this.velocity, {x: 0, y: 0});
  }
}  

/** @param {PhysicsEntity} circle
 *  @param {PhysicsEntity} rect
 */
export function isCircleCollideRect(circle, rect) {

  const closestInRect = { x: 0, y: 0 };

  if (circle.midX < rect.left) { 
    /* ( c ) [ r ]
     *          or 
     *             ( c )
     *                [ r ]
     */
    closestInRect.x = rect.left;
  }
  else if (circle.midX > rect.right) { 
    /* [ r ] ( c )
     *         or
     *            [ r ]
     *                ( c )
     */
    closestInRect.x = rect.right;
  }
  else {
    /* [ r ] 
     *  ( c )
     *        or
     *          [ r ]
     *         ( c )
     */
    closestInRect.x = circle.midX;
  }

  if (circle.midY < rect.bottom) {
    /*        -               -
     *      [ r ]           [ r ]
     *   -    -     or        -
     * ( c )               -  
     *   -               ( c )              
     */
    closestInRect.y = rect.bottom;
  }
  else if (circle.midY > rect.top) {

    /*        -           -
     *      ( c )       ( c )
     *   -    -   or      -
     * [ r ]           -  
     *   -           [ r ]             
     */
    closestInRect.y = rect.top;
  }
  else {
    /*        -           -
     *   -  ( c )       [ r ]   -
     * [ r ]  -   or      -   ( c )
     *   -                      - 
     *                           
     */
    closestInRect.y = circle.midY; 
  }
  return ((circle.radius * circle.radius) > distSquared2D(closestInRect, {x: circle.midX, y: circle.midY}));
}

/**
 *  @param {PhysicsEntity} a
 *  @param {PhysicsEntity} b
 */
export function isRectCollideRect(a, b) {

  if (a.midX < b.midX) {
    if (a.right < b.left)
      return false;
  }
  else {
    if (a.left > b.right)
      return false;
  }

  if (a.midY < b.midY) {
    if (a.top < b.bottom)
      return false;
  }
  else {
    if (a.bottom > b.top)
      return false;
  }
  return true;
}
