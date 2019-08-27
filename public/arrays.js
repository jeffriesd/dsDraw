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

    this.displayStyle = "cell";

    // keep track of anchored arrows 
    // (keyed by start and endpoints)
    this.arrows = new Map();

    // randomly assign values between 0 and randSeed
    this.randomSeed = 100;
    Array1D.randomSeed = 100;

    this.labelMargin = defaultLabelMargin;
  }

  toString() {
    return `Array1D(${this.array.length})`;
  }

  /** Array1D.nodes
   *    getter method for super class
   */
  get nodes() {
    return this.array;
  }

  propTypes() {
    return {
      ...super.propTypes(),
      "displayStyle": ["tower", "cell"],
      "maxTowerHeight": "int",
      "seed": "int",
    }
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

  methodNames() {
    return {
      "length": Array1DLengthCommand,
      "resize": Array1DResizeCommand,
      "swap": Array1DSwapCommand,
      // "arc": Array1DArrowCommand,
      "copy": Array1DCopyCommand,
      "sort": Array1DSortCommand,
    };
  }

  config() {
    return {
      ...super.config(),
      maxTowerHeight: this.maxTowerHeight,
      randomSeed: this.randomSeed,
    };
  }

  clone(cloneHandle) {
    var copy = super.clone(cloneHandle);

    // copy config of array cells
    var copyArr = this.array.map(node => node.clone(cloneHandle));
    copyArr.forEach(node => node.parentObject = copy);
    copy.array = copyArr;

    return copy;
  }

  draw() {
    this.nodes.forEach((node, idx) => {
      node.configAndDraw(idx);
      idx++;
    });
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

  /** Array1D.getChildren
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
  configureOptions() {
    super.configureOptions();

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
        // araw negative values same direction as positive
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

  toString() {
    return `ArrayNode(${this.value})`;
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

  /** ArrayNode.draw
   */
  draw(idx) {
    

    this.x = (idx * this.cellSize) + this.getParent().x1;
    this.y = this.getParent().y1;

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

