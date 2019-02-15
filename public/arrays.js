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
class Array1D extends LinearCanvasObject {
  constructor(canvasState, x1, y1, x2, y2) {
    super(canvasState, x1, y1, x2, y2);

    // round to even multiple of cellSize 
    var width = this.x2 - this.x1;
    this.x2 = this.x1 + Math.floor(width / this.cellSize) * this.cellSize;

    Array1D.defaultLength = 8;

    this.array = [];
    this.cellType = typeof 0;
    this.maxTowerHeight = 8;

    this.displayStyle = "tower";

    // keep track of anchored arrows 
    // (keyed by start and endpoints)
    this.arrows = new Map();

    // randomly assign values between 0 and randSeed
    this.randomSeed = 100;
    Array1D.randomSeed = 100;
  }

  /** Array1D.nodes
   *    getter method for super class
   */
  get nodes() {
    return this.array;
  }

  propNames() {
    return {
      ...super.propNames(),
      "display": "displayStyle",
      "ds": "displayStyle",
      "height": "maxTowerHeight",
      "seed": "randomSeed",
    };
  }

  config() {
    return {
      ...super.config(),
      maxTowerHeight: this.maxTowerHeight,
      randomSeed: this.randomSeed,
    };
  }

  clone() {
    var copy = super.clone();

    // copy config of array cells
    var idx = 0;
    this.array.forEach((arrNode) => {
      copy.array[idx] = new ArrayNode(this.cState, copy, 0);
      Object.assign(copy.array[idx], arrNode.config());
      idx++;
    });

    // default array size is 8, so truncate copy if needed
    copy.array = copy.array.slice(0, idx);

    // copy arrows
    this.arrows.forEach((arr, index) => {
      var cparrow = arr.clone();
      cparrow.restore();
      
      // index is [a, b]
      var i1 = index[0];
      var i2 = index[1];
  
      // copy anchors
      cparrow.lockedFrom = copy.array[i1];
      cparrow.lockedTo = copy.array[i2];
      cparrow.locked = copy;

      copy.arrows.set(index, cparrow);
    });

    return copy;
  }

  /** Array1D.destroy
   *    remove array as well as any arcs it is a parent of
   */
  destroy() {
    super.destroy();
    this.arrows.forEach(arr => arr.destroy());
  }

  getStartCoordinates() {
    return {x: this.x1, y: this.y1};
  }

  static defaultCoordinates(cState) {
    var cellSize = 40; // default cell size TODO define in constants
    var length = cellSize * Array1D.defaultLength;
    var center = cState.getCenter();

    return {
      x1: center.x,
      y1: center.y,
      x2: center.x + length,
      y2: center.y + cellSize,
    };
  }

  initCells() {
    for (var x = this.x1; x < this.x2; x += this.cellSize) {
      this.append();
    }
  }
 
  /** Array1D.append
   *    append a new node with given value to this array
   */  
  append(value="random") {
    if (value == "random")
      value = Math.random() * this.randomSeed | 0;
    var arrNode = new ArrayNode(this.cState, this, value);
    
    this.array.push(arrNode); 
    return value;
  }

  /** Array1D.configureOptions
   *    set border, border color,
   *    font, and set style (cell or tower)
   */
  configureOptions(active) {
    super.configureOptions(active);

    this.cellSize = parseInt(this.cellSize);

    // determine max
    if (this.displayStyle == "tower") {
      if (this.cellType != "number")
        throw "Only numeric data can be displayed with tower style.";
     
      var max = this.array.reduce(
            (max, x) => x.value > max ? x.value : max, 0.1); // avoid div by 0
      var min = this.array.reduce(
            (min, x) => x.value < min ? x.value : min, Number.POSITIVE_INFINITY);

      this.array.forEach((arrNode) => {
        // draw negative values same direction as positive
        var percentHeight = (arrNode.value - min) / max;
        var tHeight = percentHeight * this.maxTowerHeight + 1;

        // draw towers upwards
        arrNode.towerHeight = -Math.floor(tHeight * this.cellSize);
      });
    }
  }
}

/** ArrayNode
 *    configurable options
 *      - color
 *      - border thickness
 *      - value
 */
class ArrayNode extends NodeObject {

  /** ArrayNode.set value
   *    checks for correct type
   *    and sets _value = newVal
   */
  set value(newVal) {
    if (this.getParent().cellType === "number") 
        newVal = Number(newVal);

    if (typeof newVal !== this.getParent().cellType || isNaN(newVal))
      throw `Invalid type: ${this.getParent().cellType} expected.`;
    this._value = newVal;
  }

  get value() {
    return this._value;
  }

  getStartCoordinates() {
    return {x: this.x, y: this.y};
  }

  /** Array1D.lockArrow
   *    centers arcs on top of cells by defualt
   */
  lockArrow(arrow, dir) {
    // center on top of cell
    var cs = this.cellSize;
    var midX = this.x + Math.floor(cs / 2);
    var topY = this.y;

    if (dir == "from") {
      arrow.x1 = midX;
      arrow.y1 = topY;

      arrow.startPoint.x = midX;
      arrow.startPoint.y = topY;
    }
    else {
      arrow.x2 = midX;
      arrow.y2 = topY;
    }
  }

  configureOptions(active, idx) {
    super.configureOptions(active);

    this.x = (idx * this.cellSize) + this.getParent().x1;
    this.y = this.getParent().y1;
  }

  /** ArrayNode.draw
   */
  draw(active, idx) {
    this.configureOptions(active, idx);

    // draw box
    this.ctx.beginPath();
    
    if (this.getParent().displayStyle == "tower") {
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

    if (this.getParent().showValues && this.showValues)
      this.drawValue();
    
    if (this.getParent().showIndices && this.showIndices) 
      this.drawIndex(idx);

    // draw to hit detection canvas
    this.hitCtx.beginPath();
    this.hitCtx.fillRect(this.x, yStart, this.getParent().cellSize, height);
    this.hitCtx.stroke();
  }
}

