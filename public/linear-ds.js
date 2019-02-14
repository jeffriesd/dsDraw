/** LinearCanvasObject
 *    super class of array, list, stack, queue
 */
class LinearCanvasObject extends CanvasObject {
  constructor(canvasState, x1, y1, x2, y2) {
    super(canvasState, x1, y1, x2, y2);
    this.cellSize = 40;

    this.fontFamily = "Monospace";
    this.fontSize = 12;
    this.fontStyle = "";
    this.border = "black";
    this.indexPlacement = "above";
    this.borderThickness = 0;

    // configured at parent or cell level
    this.showIndices = false; 
    this.showValues = true;
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

  /** LinearCanvasObject.destroy
   *    remove array as well as any arcs it is a parent of
   */
  destroy() {
    super.destroy();
    this.arrows.forEach((arr, key) => {
      arr.destroy();
      arr.keyRestore = key;
    });
  }

  /** LinearCanvasObject.restore
   *    restore this object and its arrows
   */
  restore() {
    super.restore();
    this.arrows.forEach(arr => arr.restore());
  }

  static defaultCoordinates(cState) {
    var center = cState.getCenter();
    return {
      x1: center.x,
      y1: center.y,
      x2: center.x,
      y2: center.y,
    };
  }
 
  /** LinearCanvasObject.getChildren
   *    return subarray from [low, high) 
   *
   *    if either bound is null, replace it with
   *    0 or nodes.length
   */
  getChildren(low, high) {
    if (low == null) low = 0;
    if (high == null) high = this.nodes.length;
    return this.nodes.slice(low, high);
  }

  /** LinearCanvasObject.configureOptions
   *    set border, border color,
   *    font, and set style (cell or tower)
   */
  configureOptions(active) {
    this.ctx.lineWidth = this.borderThickness;
    this.ctx.strokeStyle = active ? this.cState.activeBorder : this.border;

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
  draw(active) {
    this.configureOptions(active);

    var idx = 0;
    this.nodes.forEach((node) => {
      node.draw(active, idx);
      idx++;
    });

    this.arrows.forEach(arr => arr.draw());
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
    };
  }

  configureOptions(active) {
    this.ctx.strokeStyle = active ? this.cState.activeBorder : "#000";
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
}

