/** LinearCanvasObject
 *    super class of array, list, stack, queue
 */
class LinearCanvasObject extends CanvasObject {
  constructor(canvasState, x1, y1, x2, y2) {
    super(canvasState, x1, y1, x2, y2);
    this.cellSize = 40;

    this.ids = new Map();

    this.fontFamily = "Monospace";
    this.fontSize = 12;
    this.fontStyle = "";
    this.border = "black";
    this.indexPlacement = "above";
    this.borderThickness = 0;

    // configured at parent or cell level
    this.showIndices = false; 
    this.showValues = true;

    LinearCanvasObject.randomSeed = 100;
  }

  propNames() {
    return {
      "ff": "fontFamily",
      "fontFamily": "fontFamily",
      "font": "fontSize",
      "fontSize": "fontSize",
      "fs": "fontSize",
      "cellSize": "cellSize",
      "cs": "cellSize",
      "indp": "indexPlacement",
      "ind": "showIndices",
      "val": "showValues",
    };
  }

  /** LinearCanvasObject.config
   */
  config() {
    return {
      fontStyle: this.fontStyle,
      fontFamily: this.fontFamily,
      fontSize: this.fontSize,
      border: this.border,
      borderThickness: this.borderThickness,
      displayStyle: this.displayStyle,
      indexPlacement: this.indexPlacement,
      cellSize: this.cellSize,
      label: this.label, 
      showValues: this.showValues,
      showIndices: this.showIndices,
    };
  }

  /** LinearCanvasObject.swapNodes
   *    swap nodes a and b by swapping
   *    configurations -- much easier than
   *    updating all the references
   */
  swapNodes(a, b) {
    if (a === b) return;
    if (a == null || b == null) throw "Cannot swap null nodes"
    var tempNode = a.config();
    Object.assign(a, b.config());
    Object.assign(b, tempNode);
  }

  /** LinearCanvasObject.restore
   *    restore this object and its arrows
   */
  // restore() {
  //   super.restore();
  //   this.arrows.forEach(arr => {
  //     arr.restore()
  //   });
  // }

  static defaultCoordinates(cState) {
    var center = cState.getCenter();
    return {
      x1: center.x,
      y1: center.y,
      x2: center.x,
      y2: center.y,
    };
  }

  getChild(idx) {
    return this.getChildren(idx, idx+1).pop();
  }
 
  newIndex() {
    return Array.from(this.ids.keys()).reduce(
      (acc, val) => Math.max(acc, val), -1) + 1;
  }

  /** LinearCanvasObject.configureOptions
   *    set border, border color,
   *    font, and set style (cell or tower)
   */
  configureOptions() {
    this.ctx.lineWidth = this.borderThickness;
    this.ctx.strokeStyle = this.active() ? this.cState.activeBorder : this.border;

    var font = "";
    if (this.fontStyle)
      font += this.fontStyle + " ";
    font += this.fontSize + "px ";
    font += this.fontFamily;
    this.ctx.font = font;

    // always draw cell text with left align
    this.ctx.textAlign = "left";
  }

  /** LinearCanvasObject.draw
   */
  draw() {
    super.draw();
    this.configureOptions();

    this.nodes.forEach((node, idx) => {
      node.draw(idx);
      idx++;
    });

    this.drawArrows();
  }
  
  /** LinearCanvasObject.drawArrows
   *    for each arrow in map, extract start
   *    end ending indices (which nodes are
   *    each arc anchored to?) and use
   *    getChild to get node objects. If either
   *    index is missing, don't draw anything.
   *    
   *    otherwise lock its endpoints and call
   *    arrow.draw()
   */
  drawArrows() {
    this.arrows.forEach((arrow, idx) => { 
      var fromIdx = idx[0];
      var toIdx = idx[1];
      var from = this.getChild(idx[0]);
      var to = this.getChild(idx[1]);
      if (from == null || to == null) return;
      from.lockArrow(arrow, "from");
      to.lockArrow(arrow, "to");
      arrow.draw();
    });
  }

  /** LinearCanvasObject.move
   *    update x, y for all cells in array
   */  
  move(deltaX, deltaY) {
    super.move(deltaX, deltaY);
    this.nodes.forEach((node) => {
      node.x += deltaX;
      node.y += deltaY; 
    });

    this.arrows.forEach(arr => arr.move(deltaX, deltaY, true));
  }

  /** LinearCanvasObject.deleteArrow
   *    remove arrow object from map
   */
  deleteArrow(arrObj) {
    this.arrows.forEach((arr, key) => {
      if (arr === arrObj) this.arrows.delete(key);
      arr.keyRestore = key;
    });
  }

  restoreArrow(arrObj) {
    if (arrObj.keyRestore == undefined)
      throw "Failed to restore arrow; key is undefined";
    if (! this.arrows.hasValue(arrObj))
      this.arrows.set(arrObj.keyRestore, arrObj);
  }

}

class NodeObject extends CanvasChildObject {
  constructor(canvasState, parentObject, value) {
    super(canvasState);

    this.parentObject = parentObject;

    // drawing options
    this.fill = "#fff";
    this.textColor = "#000";
    this.value = value;
    this.borderThickness = 1;

    this.showIndices = true;
    this.showValues = true;
  }

  getParent() {
    return this.parentObject;
  }

  getStartCoordinates() {
    return {x: this.x, y: this.y};
  }

  propNames() {
    return {
        "bg": "fill",
        "background": "fill",
        "fill": "fill",
        "value": "value",
        "showVal": "showValues",
        "border": "borderThickness",
        "fg": "textColor",
        "ind": "showIndices",
    };
  }

  config() {
    return {
      value: this.value,
      fill: this.fill,
      textColor: this.textColor,
      borderThickness: this.borderThickness,
      showIndices: this.showIndices,
      showValues: this.showValues,
      index: this.index,
    };
  }

  configureOptions() {
    this.ctx.strokeStyle = this.active() ? this.cState.activeBorder : "#000";
    this.ctx.fillStyle = this.fill;
    this.ctx.lineWidth = this.borderThickness;

    this.cellSize = this.getParent().cellSize;
    this.hitCtx.fillStyle = this.hashColor;
  }

  drawValue() {
    var valStr = this.value.toString();
    var textWidth = this.ctx.measureText(valStr).width;
    // make sure width doesnt exceed containing cell
    if (textWidth > this.cellSize) {
      valStr = "..";
      textWidth = this.ctx.measureText(valStr).width;
    }
    var textOffX = (this.cellSize - textWidth) / 2;

    var textHeight = this.ctx.measureText("_").width;
    var textOffY = (this.cellSize - textHeight) / 2;
    this.ctx.textBaseline = "top";

		this.ctx.fillStyle = this.textColor;
		this.ctx.fillText(valStr,
											this.x + textOffX,
											this.y + textOffY);
  }

  drawIndex(idx) {
		// set baseline back to default
		this.ctx.textBaseline = "alphabetic";
		this.ctx.fillStyle = "black";

    var textWidth = this.ctx.measureText(idx).width;
    var textOffX = (this.cellSize - textWidth) / 2;

    var textHeight = this.ctx.measureText("_").width * 2;
    var yOffset = -(this.cellSize - textHeight) / 2;
    var textOffY = (this.cellSize - textHeight) / 2;

		// draw above or below
		if (this.getParent().indexPlacement == "below") {
			yOffset = textOffY + this.cellSize;
			this.ctx.textBaseline = "top";
		}

		this.ctx.fillText(idx,
					this.x + textOffX, this.y + yOffset);
    
  }
 
  /** NodeObject.move
   */  
  move(deltaX, deltaY) {
    this.getParent().move(deltaX, deltaY);
  }

  /** NodeObject.click
   *    TODO:
   *    bring up editor
   */
  click(event) {
  }

  get radius() {
    return Math.floor(this.getParent().cellSize / 2);
  }

  /** NodeObject.lockArrow
   *    put tip of arrow on outer edge of node and use
   *    angle to determine placement on circumference 
   *
   *    move control point as well to avoid oscillation
   *    between two different angles 
   *    (visual glitch that occurs when control point is inside node)
   */
  lockArrow(arrow, dir) {
    var endAngle = arrow.endingAngle();
    var startAngle = arrow.startingAngle();

    // determine offsets from 
    // node center 
    var offX, offY;

    let inside = (n, cp) => 
      (Math.abs(n.x - cp.x) <= n.radius 
        && Math.abs(n.y - cp.y) <= n.radius);

    // center is this.x, this.y
    if (dir == "from") {
      offX = this.radius * Math.cos(startAngle);
      offY = this.radius * Math.sin(startAngle);

      arrow.x1 = this.x - offX;
      arrow.y1 = this.y - offY;
      arrow.startPoint.x = arrow.x1;
      arrow.startPoint.y = arrow.y1;

      // fix angle to avoid oscillation
      if (inside(this, arrow.cp1)) {
        arrow.cp1.x = this.x - 4 * offX;
        arrow.cp1.y = this.y - 4 * offY;
      }
    }
    else {
      offX = this.radius * Math.cos(endAngle);
      offY = this.radius * Math.sin(endAngle);

      arrow.x2 = this.x - offX;
      arrow.y2 = this.y - offY;
      if (inside(this, arrow.cp2)) {
        arrow.cp2.x = this.x - 4 * offX;
        arrow.cp2.y = this.y - 4 * offY;
      }
    }
  }
}

