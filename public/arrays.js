class ArrayTree extends LanguageObject {
  constructor(arrayCanvasObject) {
    super();
    this.arrayCanvasObject = arrayCanvasObject;
    this.ids = new Map();
    this.levels = [];
  }

  toString() {
    return "ArrayTree";
  }

  propNames() {
    return {
    };
  }

  propTypes() {
    return {

    };
  }

  methodNames() {
    return {
      "root": ArrayTreeRootCommand,
    };
  }

  /** ArrayTree.nodes
   *    collect those nodes which are actively being drawn
   *    (if array is retracted, some ArrayTreeNodes may
   *      exist in this.ids which are not being drawn)
   */
  get nodes() {
    // loop through from base and check those 
    // which are currently being drawn
    var array = this.arrayCanvasObject.array;
    var curLevel = [];
    array.forEach((_n, i) => curLevel.push(i));
    var nextLevel = [];

    var nodes = [];

    var level = 0;
    while (curLevel.length > 1) {
      for (var i = 0; i < curLevel.length; i += 2) {
        nodes.push(this.getNode(level, i >> 1));
        nextLevel.push(i >> 1);
      }
      curLevel = nextLevel;
      nextLevel = [];
      level++;
    }
    return nodes;
  }
  
  /** ArrayTree.getChildren
   *    return list of ArrayTreeNodes 
   *    with low <= index < high
   *  
   *    (but only those which are currently active) 
   */
  getChildren(low, high) {
    if (low == undefined) low = Number.NEGATIVE_INFINITY;
    if (high == undefined) high = Number.POSITIVE_INFINITY;

    return this.nodes.filter(n => n.index >= low  && n.index < high);
  }

  clone(cloneHandle) {
    var copy = new ArrayTree();
    this.levels.forEach(lev => {
      var newLevel = [];
      lev.forEach(treeNode => {
        var cloneNode = treeNode.clone(cloneHandle);
        copy.ids.set(treeNode.index, cloneNode);
        cloneNode.arrayTree = copy;
        newLevel.push(cloneNode);
      });
      copy.levels.push(newLevel);
    });
    return copy;
  }

  getNode(level, index) {
    if (this.levels[level]) {
      if (this.levels[level][index] != undefined) {
        return this.levels[level][index];
      }
    }
    return null;
  }

  /** ArrayTree.newNode
   *    create new node, set unique id,
   *    and add it to the correct level
   */
  newNode(level) {
    var newIndex = Array.from(this.ids.keys()).reduce(
      (acc, val) => Math.max(acc, val), -1) + 1;
    
    var newNode = new ArrayTreeNode(
      this.arrayCanvasObject.cState, this.arrayCanvasObject,
      0, newIndex);

    this.ids.set(newIndex, newNode);

    // create level if empty
    if (this.levels[level] == undefined) {
      this.levels.push([]);
    }

    // set reference to parent ArrayTree and
    // set levelNumber & levelIndex so it's easy to 
    // get parent/left/right from node itself.
    newNode.arrayTree = this;
    newNode.levelNumber = level;
    newNode.levelIndex = this.levels[level].length;

    this.levels[level].push(newNode);

    return newNode;
  }

  forEach(f) {
    this.levels.forEach(l => l.forEach(f));
  }
}

class ArrayTreeNode extends NodeObject {
  config() {
    return {
      ...super.config(),
      levelIndex: this.levelIndex,
      levelNumber: this.levelNumber,
    }
  }

  // drawn based on array positions
  configAndDraw(x, y) {
    this.x = x;
    this.y = y;
    super.configAndDraw();
  }

  toString() {
    return `ArrayTreeNode(${this.value})`;
  }

  methodNames() {
    return {
      "left": ArrayTreeNodeLeftCommand,
      "right": ArrayTreeNodeRightCommand,
      "parent": ArrayTreeNodeParentCommand,
    }
  }
}

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
    this.nodeStyle = "square";

    // arrays can have a binary tree
    // drawn on top of them 
    // with the array elements as leaves
    // -- but default this is empty
    this.tree = null;
    this.showTree = false;
    this.treeVertSep = this.cellSize * 2;

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
      "randomSeed": "int",
      "showTree": "bool",
      "treeVertSep": "int",
    }
  }

  propNames() {
    return {
      ...super.propNames(),
      "display": "displayStyle",
      "ds": "displayStyle",
      "height": "maxTowerHeight",
      "seed": "randomSeed",
      "showTree": "showTree",
      "treeVertSep": "treeVertSep",
      "tvs": "treeVertSep",
    };
  }

  methodNames() {
    return {
      "length": Array1DLengthCommand,
      "resize": Array1DResizeCommand,
      "swap": Array1DSwapCommand,
      "copy": Array1DCopyCommand,
      "sort": Array1DSortCommand,
      "tree": Array1DGetTreeCommand,
    };
  }

  config() {
    return {
      ...super.config(),
      maxTowerHeight: this.maxTowerHeight,
      randomSeed: this.randomSeed,
      showTree: this.showTree, 
      treeVertSep: this.treeVertSep,
    };
  }

  clone(cloneHandle) {
    var copy = super.clone(cloneHandle);

    // copy config of array cells
    var copyArr = this.array.map(node => node.clone(cloneHandle));
    copyArr.forEach(node => node.parentObject = copy);
    copy.array = copyArr;

    // copy tree if it exists
    if (this.tree) {
      copy.tree = this.tree.clone(cloneHandle);
      copy.tree.arrayCanvasObject = copy;
      copy.tree.forEach(node => node.parentObject = copy);
    }

    return copy;
  }

  draw() {
    if (this.showTree) 
      this.drawTree();

    this.nodes.forEach((node, idx) => {
      node.configAndDraw(idx);
    });
  }

  /** Array1D.drawTree
   *    draw binary tree overtop of array
   *    with the array elements as leaves
   *     
   *    values of tree nodes initially undefined
   * 
   *    tree may need to be rebuilt if:
   *      - tree hasn't been built yet
   *      - array has been extended 
   *        (shrinking is ok, the extra nodes are just not drawn)
   * 
   */
  drawTree() {
    if (this.tree == undefined) this.tree = new ArrayTree(this);

    // continue drawing levels until root is reached
    var curLevel = this.array.slice();
    var nextLevel = [];

    var level = 0;
    var x; 
    var y = this.y1 + this.cellSize - this.treeVertSep;
    

    var leftChildX;
    var rightChildX;

    // draw nodes after edges so
    // nodes appear on top
    var drawNodeStack = [];


    this.ctx.save();
    this.ctx.beginPath();
    while (curLevel.length > 1) {

      for (var i = 0; i < curLevel.length; i += 2) {
        // if out of bounds
        if (i + 1 >= curLevel.length) {
          // parent is directly above
          x = curLevel[i].x;
          leftChildX = x;
          rightChildX = x;
        } else {
          // parent centered above children
          x = Math.floor((curLevel[i].x + curLevel[i+1].x) / 2);

          leftChildX = curLevel[i].x;
          rightChildX = curLevel[i+1].x;
        }

        // draw edges
        this.ctx.strokeStyle = "black";
        this.ctx.moveTo(x, y);
        this.ctx.lineTo(leftChildX, y + this.treeVertSep);
        this.ctx.moveTo(x, y);
        this.ctx.lineTo(rightChildX, y + this.treeVertSep);

        // try and draw this node 
        // if it exists, just draw
        // if not, create then draw
        var node = this.tree.getNode(level, i >> 1);
        if (node == null) node = this.tree.newNode(level);
        node.x = x;
        node.y = y;
        drawNodeStack.push([level, i >> 1, x, y]);

        nextLevel.push(this.tree.getNode(level, i>>1));
      }

      curLevel = nextLevel.slice();
      nextLevel = [];
      level++;
      y -= this.treeVertSep;
    }

    this.ctx.stroke();
    this.ctx.restore();

    // draw nodes
    drawNodeStack.forEach(([l, i, x, y]) => {
      this.tree.getNode(l, i).configAndDraw(x, y);
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
    this.y = this.cellSize + this.getParent().y1;

    this.ctx.beginPath();
    this.hitCtx.beginPath();

    var h = Math.floor(this.cellSize / 2);
    if (this.getParent().displayStyle == "tower") {
      // tower height is negative and needs to be extended downwards
      var yStart = this.y + this.cellSize;
      var height = this.towerHeight;
    }
    else {
      var yStart = this.y;
      var height = this.cellSize;
    }
    this.ctx.rect(this.x - h, yStart - h, this.cellSize, height);
    this.ctx.fillRect(this.x - h, yStart - h, this.cellSize, height);
    this.hitCtx.fillRect(this.x - h, yStart - h, this.cellSize, height);

    this.ctx.stroke();
    this.ctx.fill();

    this.hitCtx.stroke();
    this.hitCtx.fill()

    if (this.showValues && this.getParent().showValues) 
      this.drawValue();

    if (this.showIndices && this.getParent().showIndices) 
      this.drawIndex(idx);
  }
}

