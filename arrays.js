/** Array1D
 *    configurable options:
 *      - number of cells
 *      - cell size
 *      - fonts
 *      - display style
 *      - hide/show label
 *      - index placement (above/below)
 *    all other options such as color, value, 
 *    border highlighting are bound to 
 *    individual cells
 */
class Array1D extends CanvasObject {
  constructor(canvasState, x1, y1, x2, y2) {
    super(canvasState, x1, y1, x2, y2);
    this.cellSize = 30;

    // round to even multiple of cellSize 
    var width = this.x2 - this.x1;
    this.x2 = this.x1 + Math.floor(width / this.cellSize) * this.cellSize;

    this.numElements = (this.x2 - this.x1) / this.cellSize + 1;

    this.array = [];
    this.cellType = typeof 0;

    this.fontFamily = "Monospace";
    this.fontSize = 12;
    this.fontStyle = "";
    this.border = "#000";
    this.displayStyle = "cell";
    this.indexPlacement = "above";
    this.borderThickness = 0;

    // keep track of anchored arrows 
    // (keyed by start and endpoints)
    this.arrows = {};

    this.initCells();
  }

  propNames() {
    return {
        "ff": "fontFamily",
        "fontFamily": "fontFamily",
        "font": "fontSize",
        "fontSize": "fontSize",
        "fs": "fontSize",
        "label": "label",
        "display": "displayStyle",
        "ds": "displayStyle",
        "cellSize": "cellSize",
        "cs": "cellSize",
        "ind": "indexPlacement",
    };
  }

  /** Array1D.config
   */
  config() {
    return {
      fontStyle: this.fontStyle,
      fontFamily: this.fontFamily,
      fontStyle: this.fontStyle,
      border: this.border,
      borderThickness: this.borderThickness,
      displayStyle: this.displayStyle,
      indexPlacement: this.indexPlacement,
      cellSize: this.cellSize,
      label: this.label + "_copy",
    };
  }

  clone() {
    var copy = super.clone();

    // copy config of array cells
    var idx = 0;
    this.array.forEach((arrNode) => {
      Object.assign(copy.array[idx], arrNode.config());
      idx++;
    });

    // default array size is 8, so truncate copy if needed
    copy.array = copy.array.slice(0, idx);

    // copy arrows
    for (var index in this.arrows) 
      copy.arrows[index] = this.arrows[index].clone();

    return copy;
  }

  /** Array1D.destroy
   *    remove array as well as any arcs it is a parent of
   */
  destroy() {
    super.destroy();
    for (var index in this.arrows) 
      this.arrows[index].destroy();
  }

  getStartCoordinates() {
    return {x: this.x1, y: this.y1};
  }

  static defaultCoordinates(cState) {
    var cellSize = 30;
    var numCells = 8;
    var length = cellSize * numCells;
    var center = cState.getCenter();

    return {
      x1: center.x,
      y1: center.y,
      x2: center.x + length,
      y2: center.y + cellSize,
    };
  }

  initCells() {
    for (var x = this.x1; x <= this.x2; x += this.cellSize) {
      this.append();
    }
  }
 
  /** Array1D.append
   *    append a new node with given value to this array
   */  
  append(value="random") {
    if (value == "random")
      value = Math.random() * this.numElements | 0;
    var arrNode = new ArrayNode(this.cState, this, value);
    
    this.array.push(arrNode); 
  }

  /** Array1D.getChildren
   *    return subarray from [low, high) 
   *
   *    if no args provided, return full array
   */
  getChildren(low, high) {
    if (low == null)
      return this.array.slice(0, this.array.length);
    return this.array.slice(low, high);
  }

  /** Array1D.configureOptions
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

    this.cellSize = parseInt(this.cellSize);

    // determine max
    if (this.displayStyle == "tower") {
      if (this.cellType != "number")
        throw "Only numeric data can be displayed with tower style.";
     
      var max = this.array.reduce(
            (max, x) => x.value > max ? x.value : max, 0.1); // avoid div by 0
      var min = this.array.reduce(
            (min, x) => x.value < min ? x.value : min, Number.POSITIVE_INFINITY);
      var maxTowerHeight = 8;

      this.array.forEach((arrNode) => {
        // draw negative values same direction as positive
        var percentHeight = (arrNode.value - min) / max;
        var tHeight = percentHeight * maxTowerHeight + 1;

        // draw towers upwards
        arrNode.towerHeight = -Math.floor(tHeight * this.cellSize);
      });
    }
  }

  /** Array1D.draw
   */
  draw(active) {
    this.configureOptions(active);

    var idx = 0;
    this.array.forEach((arrNode) => {
      arrNode.draw(active, idx);
      idx++;
    });

    for (var index in this.arrows)
      this.arrows[index].draw();
  }

  /** Array1D.move
   *    update x, y for all cells in array
   */  
  move(deltaX, deltaY) {
    super.move(deltaX, deltaY);
    this.array.forEach((arrNode) => {
      arrNode.x += deltaX;
      arrNode.y += deltaY; 
    });

    for (var index in this.arrows)
      this.arrows[index].move(deltaX, deltaY, true);
  }

  /*  outline
   *    method to show hollow box as user drags mouse 
   *    to create new array
   */
  static outline(cState, x1, y1, x2, y2) {
    cState.ctx.strokeStyle = "#000";
    cState.ctx.rect(x1, y1, x2 - x1, y2 - y1);
    cState.ctx.stroke();
  }
}

/** ArrayNode
 *    configurable options
 *      - color
 *      - border thickness
 *      - value
 */
class ArrayNode extends CanvasChildObject {
  constructor(canvasState, parentArray, value) {
    super(canvasState);

    this.parentArray = parentArray;

    // drawing options
    this.fill = "#fff";
    this.textColor = "#000";
    this.value = value;
    this.borderThickness = 1;

    this.showIndices = false;
    this.showValues = true;
  }

  /** ArrayNode.set value
   *    checks for correct type
   *    and sets _value = newVal
   */
  set value(newVal) {
    if (this.parentArray.cellType === "number") 
        newVal = Number(newVal);

    if (typeof newVal !== this.parentArray.cellType || isNaN(newVal))
      throw `Invalid type: ${this.parentArray.cellType} expected.`;
    this._value = newVal;
  }

  get value() {
    return this._value;
  }

  getParent() {
    return this.parentArray;
  }

  getStartCoordinates() {
    return {x: this.x, y: this.y};
  }

  propNames() {
    return {
        "bg": "fill",
        "background": "fill",
        "fill": "fill",
        "=": "value",
        "value": "showValues",
        "val": "showValues",
        "border": "borderThickness",
        "fg": "textColor",
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

    this.y = this.parentArray.y1;

    this.cellSize = this.parentArray.cellSize;
  }

  /** ArrayNode.draw
   */
  draw(active, idx) {
    this.configureOptions(active);

    // determine x coordinate
    this.x = (idx * this.cellSize) + this.parentArray.x1;

    // draw box
    this.ctx.beginPath();
    
    if (this.parentArray.displayStyle == "tower") {
      var yStart = this.y + this.cellSize;
      var height = this.towerHeight;
    }
    else {
      var yStart = this.y;
      var height = this.cellSize;
    }
    this.ctx.rect(this.x, yStart, this.cellSize, height);
    this.ctx.fillRect(this.x, yStart, this.cellSize, height);
    this.ctx.stroke();
    
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

    // draw value
    if (this.showValues) {
      this.ctx.fillStyle = this.textColor;
      this.ctx.fillText(valStr,
                        this.x + textOffX,
                        this.y + textOffY);
    }

    // draw indices
    if (this.showIndices) {
      // set baseline back to default
      this.ctx.textBaseline = "alphabetic";
      this.ctx.fillStyle = "#000";
      
      var yOffset = -textOffY;
      // draw above or below
      if (this.parentArray.indexPlacement == "below") {
        yOffset = textOffY + this.cellSize;
        this.ctx.textBaseline = "top";        
      }

      this.ctx.fillText(idx, 
            this.x + textOffX, this.y + yOffset);
    }

    // draw to hit detection canvas
    this.hitCtx.beginPath();
    this.hitCtx.fillStyle = this.hashColor;
    this.hitCtx.fillRect(this.x, yStart, this.parentArray.cellSize, height);
    this.hitCtx.stroke();
  }
 
  /** ArrayNode.move
   */  
  move(deltaX, deltaY) {
    this.getParent().move(deltaX, deltaY);
  }

  /** ArrayNode.click
   *    TODO:
   *    bring up editor
   */
  click(event) {
  }
}

