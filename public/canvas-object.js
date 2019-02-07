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

    this.width = this.x2 - this.x1;
    this.height = this.y2 - this.y1;

    this.cState.registerCanvasObj(this);
    
    this._label = "";

    // default label: convert 'rgb(1, 2, 3)' to 123
    // var hashStr = this.hashColor.split("rgb(")[1];
    // hashStr = hashStr.split(")")[0];
    // var hashCode = hashStr.replace(/[,\s]/g, "");
    this.label = this.constructor.name.substring(0,1).toLowerCase(); // + "_" + hashCode;
  }

  clone() {
    if (this.config === null)
      throw `No configurable options for ${this.constructor.name}`;

    var copy = 
      new this.constructor(this.cState, this.x1, this.y1, this.x2, this.y2);

    Object.assign(copy, this.config());
    return copy;
  }

  set label(value) {
    if (value == "TEMP")
      return;

    if (! value.match(variablePattern))
      throw "Variable name must consists of only alphanumeric (or _) characters" 
        + " and begin with an alphabetic character";

    // if 'myname1' already exists, 
    // set to 'myname2' unless user 
    // tries to rename object by its current name (don't change it)
    while (VariableEnvironment.hasVar(value)) {
      if (VariableEnvironment.getVar(value) === this) break;
      console.log("[WARNING]: label already in use: ", value);
      var numPattern = /\d*$/;
      var match = value.match(numPattern);
      var matchStr = match[0];
      var num = parseInt(matchStr);

      // matched number at end
      if (matchStr) 
        value = value.substr(0, match.index) + (num+1);
      else
        value = value + "1";
    }

    // if previous name is already mapping to this object, 
    // clear that mapping
    if (VariableEnvironment.hasVar(this.label)) {
      VariableEnvironment.deleteVar(this.label);
      // console.log("clearing label for ", this.label);
    }
    
    VariableEnvironment.setVar(value, this);

    this._label = value;
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

  get x() {
    return this.x1;
  }

  get y() {
    return this.y1;
  }

  getToolbar() {
    return Toolbar.getInstance(this.cState);
  }

  getOptions() {
    return ToolOptions.getInstance(this.cState);
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
   *    labeling
   */
  destroy() {
    this.cState.remove(this);
  }

  restore() {
    this.cState.addCanvasObj(this);
    VariableEnvironment.setVar(this.label, this);
  }

  deactivate() {
    this.getOptions().hide();
  }

  click(event) {
  }

  /** CanvasObject.hover
   *    default behavior to reset hover action over resize point
   */
  hover() {
    document.body.style.cursor = "default";
  }

  move(deltaX, deltaY) {
    this.x1 += deltaX;
    this.x2 += deltaX;
    this.y1 += deltaY;
    this.y2 += deltaY;
  }

  drag(deltaX, deltaY) {
  }

  drawLabel() {
    // save fillStyle and font 
    var fs = this.ctx.fillStyle;
    var font = this.ctx.font;

    this.ctx.editCtx.beginPath();
    this.ctx.editCtx.font = "bold 12px Monospace";
    this.ctx.editCtx.fillStyle = "black";
    var lw = this.ctx.editCtx.measureText(this.label).width;
    var lh = this.ctx.editCtx.measureText("_").width * 2;

    this.ctx.editCtx.fillText(this.label, 
        this.x1 - (lw + 10), this.y1 - (lh + 10));
    this.ctx.editCtx.stroke();

    // reset fillStyle and font
    this.ctx.fillStyle = fs;
    this.ctx.font = font;
  }

  /** CanvasObject.mouseDown
   *    Called when click begins.
   *    Move this object to end of cState objects array
   *    so recently clicked objects are drawn last (on top).
   */
  mouseDown() {
    var idx = this.cState.objects.indexOf(this);
    this.cState.objects.splice(idx, 1);
    this.cState.objects.push(this);
  }

  release() {
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
  constructor(canvasState) {
    this.cState = canvasState;
    this.ctx = canvasState.ctx;
    this.hitCtx = canvasState.hitCtx;
    this.hashColor = null;

    this.cState.registerCanvasObj(this);
  }

  clone() {
    if (this.config === null)
      throw `No configurable options for ${this.constructor.name}`;

    var copy = 
      new this.constructor(this.cState);
    Object.assign(copy, this.config());
    return copy;
  }

  deactivate() {
  }

  click(event) {
    this.getParent().click(event);
  }

  move(deltaX, deltaY) {
    console.log("move not implemented for", this.constructor.name);
  }

  drag(deltaX, deltaY) {
  }

  /** Event when click begins
   */
  mouseDown() {
    this.getParent().mouseDown();
  }

  release() {
  }

  restore() {
    this.cState.registerCanvasObj(this);
    VariableEnvironment.setVar(this.label, this);
  }

  /** CanvasChildObject.hover
   *    default behavior to reset hover action over resize point
   */
  hover() {
    document.body.style.cursor = "default";
  }
}
