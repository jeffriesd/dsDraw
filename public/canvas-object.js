/**  
 * Verifies that rvalue of assignment is of the correct type
 * for properties of canvas objects
 * 
 * @param value - Rvalue of assignment
 * @param expectedType - expected type from propTypes map
 */
function validPropertyAssignment(value, expectedType) {
  if (expectedType == "any") return true;
  if (expectedType instanceof Array) return expectedType.includes(value);
  switch (expectedType) {
    case "any": return true;
    case "bool": 
      return (typeof value == "number") || (typeof value == "boolean");
    case "color": return validColorString(value);
    case "font": return validFontString(value);
    case "int": return (typeof value == "number") && ((value | 0) == value);
    case "float": return (typeof value == "number"); 
    case "number": return (typeof value == "number");
    case "string": return (typeof value == "string");
  }
  throw "Unexpected type constraint: " + expectedType;
}


/** CanvasObject
 *    class for macro objects such as textbox, arrows,
 *    (not ResizePoint or ArrowHead, etc.)
 */
class CanvasObject {
  constructor(canvasState, x1, y1, x2, y2) {

    this.cState = canvasState;
    this.ctx = canvasState.ctx;
    this.hitCtx = canvasState.hitCtx;
    this.hashColor = null;

    this.x1 = x1;
    this.y1 = y1;
    this.x2 = x2;
    this.y2 = y2;

    this.dead = false;
    this.cState.registerCanvasObj(this);
    
    this.labelMargin = defaultLabelMargin;

    this._label = "";

    // default label: convert 'rgb(1, 2, 3)' to 123
    // var hashStr = this.hashColor.split("rgb(")[1];
    // hashStr = hashStr.split(")")[0];
    // var hashCode = hashStr.replace(/[,\s]/g, "");
    // this.label = this.constructor.name.substring(0,1).toLowerCase() + "_" + hashCode;
    this.label = this.newLabel(this.constructor.name.substring(0,1).toLowerCase());
  }

  // generate an initial label
  newLabel(label) {
    // if 'myname1' already exists, 
    // set to 'myname2' unless user 
    while (VariableEnvironment.hasCanvasObj(label)) {
      if (VariableEnvironment.getCanvasObj(label) === this) break;
      // console.log("[WARNING]: label already in use: ", label);
      var numPattern = /\d*$/;
      var match = label.match(numPattern);
      var matchStr = match[0];
      var num = parseInt(matchStr);

      // matched number at end
      if (matchStr) 
        label = label.substr(0, match.index) + (num+1);
      else
        label = label + "1";
    }
    return label;
  }

  toString() {
    return this.constructor.name;
  }

  clone(cloneHandle) {
    if (this.config === null)
      throw `No configurable options for ${this.constructor.name}`;

    var copy = 
      new this.constructor(this.cState, this.x1, this.y1, this.x2, this.y2);

    Object.assign(copy, this.config());

    // update label and reserve it
    copy.label = copy.newLabel(this.label);
    VariableEnvironment.setCanvasObj(copy.label, copy);

    this._cloneRef = copy; 
    copy.cloneHandle = cloneHandle;

    return copy;
  }

  set label(newLabel) {
    if (! newLabel.match(variablePattern)) 
      throw "Variable name must consists of only alphanumeric (or _) characters" 
        + " and begin with an alphabetic character";

    this._label = newLabel;
  }

  get label() {
    return this._label;
  }

  static defaultWidth() {
    return 100;
  }

  static defaultHeight() {
    return 100;
  }

  get width() {
    return this.x2 - this.x1;
  }

  get height() {
    return this.y2 - this.y1;
  }

  static defaultCoordinates(cState) {
    var center = cState.getCenter();
    var w = 200;
    var h = 200;
    return {
      x1: center.x,
      y1: center.y,
      x2: center.x + w,
      y2: center.y + h,
    };
  }

  get x() {
    return this.x1;
  }

  get y() {
    return this.y1;
  }

  /** CanvasObject.objectCenter
   *    return center of object 
   */
  objectCenter() {
    return {
      x : (this.x1 + this.x2) / 2,
      y : (this.y1 + this.y2) / 2,
    };
  }

  // mapping from property to expected type
  propTypes() {
    return {};
  }

  // property names and method names
  propNames() {
    return {};
  }

  methodNames() {
    return {};
  }

  propMethodNames() {
    return {
      ...this.propNames(),
      ...this.methodNames(),
    };
  }

  getParent() {
    return this;
  }

  getStartCoordinates() {
    return {x: this.x1, y: this.y1};
  }

  /** CanvasObject.destroy
   *    remove this object from list of 
   *    repaintable objects and also clear
   *    labeling (remove from variable environment)
   */
  destroy() {
    this.hide();

    if (VariableEnvironment.hasCanvasObj(this.label))
      VariableEnvironment.deleteCanvasObj(this.label);
  }

  hide() {
    this.cState.remove(this);
    this.dead = true;
  }

  unhide() {
    this.cState.addCanvasObj(this);
    this.dead = false;
  }

  /** CanvasObject.restore
   *    restore to canvas and restore binding 
   *    if it doesnt already exist
   */
  restore() {
    this.unhide();
    if (! (VariableEnvironment.hasCanvasObj(this.label)
      && VariableEnvironment.getCanvasObj(this.label) === this))
      VariableEnvironment.setCanvasObj(this.label, this);
  }

  /** CanvasObject.active
   *    return whether this object
   *    has been selected by the user
   */
  active() {
    return this.cState.isActive(this);
  }

  deactivate() {
  }

  // clicked with no modifiers (CTRL/ALT/etc.)
  click(event) {
  }

  resize(deltaX, deltaY) {
    this.x2 += deltaX;
    this.y2 += deltaY;

    if (this.x2 < this.x1)
      this.x2 = this.x1;
    if (this.y2 < this.y1)
      this.y2 = this.y1;

    // move resize point
    if (this.resizePoint) {
      this.resizePoint.x = this.x2;
      this.resizePoint.y = this.y2;
    }
  }


  /** CanvasObject.hover
   *    default behavior to reset hover action over resize point
   */
  hover() {
    document.body.style.cursor = "default";
  }

  /** CanvasObject.floatingChildren
   *    return array of children with independent (not based
   *    on this object) coordinates. These
   *    are the objects that should be translated whenever
   *    the parent is
   */
  get floatingChildren() {
    return [];
  }

  /** CanvasObject.move
   *    move self and all children (use fromParent 
   *    flag = true to override
   *    locked child objects)
   */
  move(deltaX, deltaY) {
    this.x1 += deltaX;
    this.x2 += deltaX;
    this.y1 += deltaY;
    this.y2 += deltaY;

    this.floatingChildren.forEach(x => x.move(deltaX, deltaY, true));
  }

  moveTo(x, y) {
    this.move(x - this.x, y - this.y);
  }

  drag(deltaX, deltaY) {
  }

  configAndDraw() {
    this.configureOptions();
    this.draw();
    if (this.active()) this.drawLabel();
  }

  configureOptions() {
    this.ctx.strokeStyle = this.active() ? this.cState.activeBorder : this.strokeColor;
    this.hitCtx.fillStyle = this.hashColor;
    this.hitCtx.strokeStyle = this.hashColor;
  }

  /** CanvasObject.drawLabel
   *    draw clickable label that refers to (same hashcolor)
   *    this parent canvas object
   *    
   *    determine dimensions of label and place it so
   *    its bounding box still has space from x1/y1 of this canvas object
   */
  drawLabel() {
    // save altered properties
    var fs = this.ctx.fillStyle;
    var ss = this.ctx.strokeStyle;
    var font = this.ctx.font;
    var tb = this.ctx.textBaseline;
    var ta = this.ctx.textAlign;
    var linew = this.ctx.lineWidth;

    this.ctx.editCtx.lineWidth = 1;

    this.ctx.editCtx.beginPath();
    this.ctx.editCtx.font = "bold 12px Monospace";
    this.ctx.editCtx.textBaseline = "top";
    this.ctx.editCtx.textAlign = "left";
    var lw = this.ctx.editCtx.measureText(this.label).width;
    var lh = this.ctx.editCtx.measureText("_").width * 2;

    var lhp = 10; // label padding
    var lvp = 5;

    // label margin is specific to each object
    // (space between label and canvas obj)

    var boxx = this.x1 - (lw + this.labelMargin.width());
    var boxy = this.y1 - (lh + this.labelMargin.height());
    var boxw = lw + 2*lhp;
    var boxh = lh + 2*lvp;

    var labelx = boxx + lhp;
    var labely = boxy + lvp;

    this.ctx.editCtx.fillStyle = labelColor;
    this.ctx.editCtx.strokeStyle = "black";
    this.ctx.editCtx.rect(boxx, boxy, boxw, boxh);
    this.ctx.editCtx.fillRect(boxx, boxy, boxw, boxh);
    this.ctx.editCtx.stroke();
    this.ctx.editCtx.fillStyle = "black";
    this.ctx.editCtx.fillText(this.label, labelx, labely);
    this.ctx.editCtx.stroke();

    // draw label bg
    this.hitCtx.beginPath();
    this.hitCtx.fillStyle = this.hashColor;
    this.hitCtx.fillRect(boxx, boxy, boxw, boxh);
    this.hitCtx.fill();

    // restore altered properties
    this.ctx.strokeStyle = ss;
    this.ctx.fillStyle = fs;
    this.ctx.font = font;
    this.ctx.textBaseline = tb;
    this.ctx.textAlign = ta;
    this.ctx.lineWidth = linew;
  }

  /** CanvasObject.mouseDown
   *    Called when click begins.
   *    Move this object to end of cState objects array
   *    so recently clicked objects are drawn last (on top).
   */
  mouseDown() {
    var idx = this.cState.objects.indexOf(this);
    if (idx == -1) return;
    this.cState.objects.splice(idx, 1);
    this.cState.objects.push(this);
  }

  /** CanvasObject.doubleClick
   *    bring up menu with config options
   */
  doubleClick() {
    window.reactEditor.setState({ showOptionMenu : true });
  }

  static outline(ctx, x1, y1, x2, y2) {
    ctx.lineWidth = 1;
    ctx.strokeStyle = "#000";
    ctx.beginPath();
    ctx.rect(x1, y1, x2-x1, y2-y1);
    ctx.stroke();
  }

}

class CanvasChildObject {
  constructor(canvasState, parentObject) {
    this.cState = canvasState;
    this.parentObject = parentObject;

    this.ctx = canvasState.ctx;
    this.hitCtx = canvasState.hitCtx;
    this.hashColor = null;
    this.cState.registerCanvasObj(this);
  }

  /** CanvasChildObject.objectCenter
   *    return center of object 
   */
  objectCenter() {
    return {
      x : this.x,
      y : this.y,
    };
  }

  clone(cloneHandle) {
    if (this.config === null)
      throw `No configurable options for ${this.constructor.name}`;

    var copy = 
      new this.constructor(this.cState);

    Object.assign(copy, this.config());

    copy.cloneHandle = cloneHandle;
    this._cloneRef = copy; return copy;
  }

  get dead() {
    return this.getParent().dead;
  }

  set dead(d) {
    throw "Can't set 'dead' attribute for CanvasChildObject";
  }

  propTypes() {
    return {};
  }

  propNames() {
    return {};
  }

  methodNames() {
    return {};
  }

  propMethodNames() {
    return {
      ...this.propNames(),
      ...this.methodNames()
    };
  }

  /** CanvasChildObject.active
   *    return whether this object
   *    has been selected by the user
   */
  active() {
    return this.cState.isActive(this) || this.getParent().active();
  }

  deactivate() {
  }

  configureOptions() {
    this.ctx.strokeStyle = this.active() ? this.cState.activeBorder : this.strokeColor;
    this.ctx.fillStyle = this.fill || "transparent";
    this.hitCtx.fillStyle = this.hashColor;
    this.hitCtx.strokeStyle = this.hashColor;
  }


  /** CanvasChildObject.configAndDraw
   *    configure canvas options and draw object.
   *    may need to pass arguments such as index
   *    to draw method
   * @param  {...any} drawArgs 
   */
  configAndDraw(...drawArgs) {
    this.configureOptions();
    this.draw(...drawArgs);
  }

  click(event) {
    this.getParent().click(event);
  }

  move(deltaX, deltaY, fromParent) {
    if (fromParent) { 
      this.x += deltaX; 
      this.y += deltaY; 
    }
    else 
      this.getParent().move(deltaX, deltaY);
  }

  drag(deltaX, deltaY) {
  }

  /** Event when click begins
   */
  mouseDown() {
    this.getParent().mouseDown();
  }

  doubleClick() {
    this.getParent().doubleClick();
  }

  restore() {
    this.cState.registerCanvasObj(this);
  }

  /** CanvasChildObject.hover
   *    default behavior to reset hover action over resize point
   */
  hover() {
    document.body.style.cursor = "default";
  }
}
