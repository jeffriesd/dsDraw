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
    this.strokeColor = "black";
    this.indexPlacement = "above";
    this.borderThickness = 1;

    // configured at parent or cell level
    this.showIndices = false; 
    this.showValues = true;

    LinearCanvasObject.randomSeed = 100;

    // label margin for circular nodes
    this.labelMargin = {
      width: () => this.cellSize * .75,
      height: () => this.cellSize * .75,
    }
  }

  propTypes() {
    return {
      "fontFamily": "font",
      "fontSize": "int",
      "cellSize": "int",
      "indexPlacement": ["above", "below"],
      "showIndices": "bool",
      "showValues": "bool"
    };
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
      strokeColor: this.strokeColor,
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
    super.configureOptions();
    this.ctx.lineWidth = this.borderThickness;

    var font = "";
    if (this.fontStyle)
      font += this.fontStyle + " ";
    font += this.fontSize + "px ";
    font += this.fontFamily;
    this.ctx.font = font;

    // always draw cell text with left align
    this.ctx.textAlign = "left";
  }
  
  get floatingChildren() {
    return this.nodes;
  }


}

class NodeObject extends CanvasChildObject {
  constructor(canvasState, parentObject, value, index) {
    super(canvasState, parentObject);

    this.index = index;

    // drawing options
    this.fill = "#fff";
    this.textColor = "#000";
    this.strokeColor = "#000";
    this.value = value;
    this.borderThickness = 1;

    this.nodeStyle = "circle";

    this.showIndices = true;
    this.showValues = true;
  }

  get dead() {
    return this.getParent().dead || ! this.getParent().nodes.includes(this);
  }

  getParent() {
    return this.parentObject;
  }

  getStartCoordinates() {
    return {x: this.x, y: this.y};
  }

  propTypes() {
    return {
      "fill": "color",
      "textColor": "color",
      "value": "any",
      "showValues": "bool",
      "showIndices": "bool",
      "borderThickness": "int",
      "strokeColor": "color"
    }
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
        "strokeColor": "strokeColor",
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
      strokeColor: this.strokeColor,
    };
  }

  /** NodeObject.configureOptions
   */
  configureOptions() {
    super.configureOptions();
    this.ctx.fillStyle = this.fill;
    this.ctx.lineWidth = this.borderThickness;

    this.cellSize = this.getParent().cellSize;
  }

  /** NodeObject.draw
   *    most generic node drawing -- circular nodes
   *    with border and possibly indices or values
   */
  draw() {
    

    this.ctx.beginPath();
    this.hitCtx.beginPath();

    if (this.nodeStyle == "circle") {
      this.ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      this.hitCtx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    }
    if (this.nodeStyle == "square") {
      var h = Math.floor(this.cellSize / 2);
      this.ctx.rect(this.x - h, this.y - h, this.cellSize, this.cellSize);
      this.ctx.fillRect(this.x - h, this.y - h, this.cellSize, this.cellSize);
      this.hitCtx.fillRect(this.x - h, this.y - h, this.cellSize, this.cellSize);
    }

    this.ctx.stroke();
    this.ctx.fill();

    this.hitCtx.stroke();
    this.hitCtx.fill()

    if (this.showValues && this.getParent().showValues) 
      this.drawValue();

    if (this.showIndices && this.getParent().showIndices) 
      this.drawIndex(this.index);
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
    var center = this.objectCenter();
    var startAngle = arrow.angleToCP(1, center.x, center.y);
    var endAngle = arrow.angleToCP(2, center.x, center.y)

    // determine offsets from 
    // node center 
    var offX, offY;

    let inside = (n, cp) => 
      (Math.abs(n.x - cp.x) <= n.radius 
        && Math.abs(n.y - cp.y) <= n.radius);

    // center is this.x, this.y
    if (dir == "from") {
      offX = this.radius * -Math.cos(startAngle);
      offY = this.radius * Math.sin(startAngle);

      arrow.x1 = this.x - offX;
      arrow.y1 = this.y - offY;

      // fix angle to avoid oscillation
      if (inside(this, arrow.cp1)) {
        arrow.cp1.x = this.x - 4 * offX;
        arrow.cp1.y = this.y - 4 * offY;
      }
    }
    else {
      offX = this.radius * -Math.cos(endAngle);
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

