class BinaryHeap extends LinearCanvasObject {
  /** BinaryHeap.constructor
   *    BinaryHeap extends linear canvas object for
   *    node drawing
   *
   *    Binary heaps are drawn identically to BinaryHeaps
   *    (Reingold-Tilford algorithm)
   * 
   *    binary heaps identify nodes with unique ids 
   *    (because node values may repeat)
   */
  constructor(canvasState, x1, y1, x2, y2) {
    super(canvasState, x1, y1, x2, y2);
    this.ids = new Map();

    this.heapArray = [];
    
    this.cellSize = 40;

    this.minSep = 2;
    this.depthSep = 30;

    BinaryHeap.defaultSize = 15;

    // not edges but extra arrows
    this.arrows = new Map();
  }

  toString() {
    if (this.root == null)
      return "BinaryHeap(empty)";
    return `BinaryHeap(${this.heapArray.length})`;
  }

  propTypes() {
    return {
      ...super.propTypes(),
      "minSep": "int",
      "depthSep": "int",
    };
  }

  propNames() {
    return {
      ...super.propNames(),
      "hs": "minSep",
      "vs": "depthSep",
    };
  }
  
  methodNames() {
    return {
      "insert": BinaryHeapInsertCommand,
      "pop": BinaryHeapPopCommand,
      "find": BinaryHeapFindCommand,
      "decr": BinaryHeapDecreaseKeyCommand,
      "root": BinaryHeapRootCommand,
      "range": BinaryHeapRangeCommand,
      // "arc": BSTArrowCommand,
    };
  }

  config() {
    return {
      ...super.config(),
      minSep: this.minSep,
      depthSep: this.depthSep,
    };
  }

  /** BinaryHeap.getChildren
   *    return nodes with indices 
   *    in the range [low, high)
   */
  getChildren(low, high) {
    if (low == null) low = -Infinity;
    if (high == null) high = Infinity;
    
    return this.nodes
      .filter(node => node.index >= low && node.index < high);
  }

  /** BinaryHeap.clone
   *    clone heap array
   */
  clone() {
    var copy = super.clone();
    var copyArr = this.heapArray.map(node => node.clone());
    copyArr.forEach(node => node.parentObject = copy);
    copy.heapArray = copyArr;
    this._cloneRef = copy; return copy;
  }

  get root() {
    if (this.heapArray.length) 
      return this.heapArray[0];
    return null;
  }

  set root(newRoot) {
    if (this.heapArray.length)
      this.heapArray[0] = newRoot;
    else
      this.heapArray.push(newRoot); 
  }

  getMin() {
    return this.heapArray.reduce(
      (acc, cur) => Math.min(acc, cur.value),
      Infinity
    );
  }

  getMax() {
    return this.heapArray.reduce(
      (acc, cur) => Math.max(acc, cur.value),
      -Infinity
    );
  }
  
  /** BinaryHeap.nodes
   *    return nodes in order for value based
   *    index
   */
  get nodes() {
    return this.heapArray.slice();
  }

  /** BinaryHeap.find
   *    linear search by value
   */
  find(value) {
    for (var idx = 0; idx < this.heapArray.length; idx++)
      if (this.heapArray[idx].value == value) return this.heapArray[idx];
    return null;
  }

  /** BinaryHeap.insert
   *    recursive insert helper method
   */
  insert(value) {
    if (typeof value !== "number")
      throw "BinaryHeap only supports numeric values.";
    var newNode = new BinaryHeapNode(this.cState, this, null, value);
    newNode.index = this.newIndex();
    this.ids.set(newNode.index, newNode);

    if (this.root == null) 
      return this.root = newNode;
    
    var newIdx = this.heapArray.length;
    this.heapArray.push(newNode);
    this.siftUp(newIdx);
  }

  removeRoot() {
    var min = this.root.clone();

    if (this.heapArray.length == 1) {
      this.heapArray = [];
      return min;
    }

    var last = this.heapArray.pop();
    this.root = last;

    this.siftDown(0);
    return min;
  }

  parentIndex(idx) {
    if (idx == 0) return 0;
    return Math.floor((idx - 1) / 2);
  }

  heapPar(idx) {
    var pi = this.parentIndex(idx);
    if (pi >= 0 && pi < this.heapArray.length)
      return this.heapArray[pi];
    return null;
  }

  leftIndex(idx) {
    return 2 * idx + 1;
  }

  heapLeft(idx) {
    var li = this.leftIndex(idx);
    if (li >= 0 && li < this.heapArray.length) 
      return this.heapArray[li];
    return null;
  }

  rightIndex(idx) { 
    return 2 * idx + 2;
  }

  heapRight(idx) {
    var ri = this.rightIndex(idx);
    if (ri >= 0 && ri < this.heapArray.length) 
      return this.heapArray[ri];
    return null;
  }

  decreaseKey(node, newKey) {
    if (typeof newKey !== typeof node.value)
      throw "Invalid key type: " + typeof newKey;
    var idx = this.heapArray.indexOf(node);
    if (idx == -1) 
      throw "Cannot decrease key of non-present node";
    node.value = newKey;
    var p, l, r;
    p = this.heapPar(idx);
    l = this.heapLeft(idx);
    r = this.heapRight(idx);

    if (p && node.value < p.value)
      this.siftUp(idx);
    else if ((l && l.value < node.value) || (r && r.value < node.value))
      this.siftDown(idx);
  }


  siftUp(idx) {
    var child = this.heapArray[idx];
    var parIdx = this.parentIndex(idx);
    var par = this.heapArray[parIdx];

    while (par.value > child.value) {
      this.swapNodes(child, par);

      // move index up heap 
      // and update references
      idx = this.parentIndex(idx);
      child = this.heapArray[idx];
      par = this.heapArray[this.parentIndex(idx)];
    }
  }

  siftDown(idx) {
    var par = this.heapArray[idx];
    var l = this.heapLeft(idx);
    var r = this.heapRight(idx); 
    var child;

    if (r == null || l.value < r.value) 
      idx = this.leftIndex(idx);
    else 
      idx = this.rightIndex(idx);
    child = this.heapArray[idx];

    while (child && par.value > child.value) {
      this.swapNodes(child, par);

      l = this.heapLeft(idx);
      r = this.heapRight(idx);

      if (r == null || l.value < r.value) 
        idx = this.leftIndex(idx);
      else 
        idx = this.rightIndex(idx);

      if (child.isLeaf()) break;
      child = this.heapArray[idx];
      par = this.heapPar(idx);
    }
  }

  preorder() {
    if (this.root == null) return [];
    return Array.from(this.root.preorder());
  }

  configureOptions() {
    super.configureOptions();
    this.ctx.lineWidth = this.borderThickness;

    var font = "";
    if (this.fontStyle)
      font += this.fontStyle + " ";

    font += this.fontSize + "px ";
    font += this.fontFamily;

    this.ctx.font = font;
  }

  draw() {
    super.draw();
    // TODO only render when needed
    renderBST(this);

    this.preorder().forEach(node => {
      // determine absolute coordinates
      // of node center
      var x = this.x1 + node.relX * this.cellSize;
      var y = this.y1 + node.relY * (this.cellSize + this.depthSep);
      node.x = x;
      node.y = y;
      
      // draw edges 
      this.ctx.lineWidth = node.borderThickness;
      this.ctx.beginPath();
      this.ctx.moveTo(x, y);

      node.children().forEach(child => {
        this.ctx.lineTo(child.x, child.y);
        this.ctx.moveTo(x, y);
      });
      this.ctx.stroke();

      // draw node overtop of edges
      node.draw();
    });

    this.hitCtx.beginPath();
    this.hitCtx.fillRect(this.x1, this.y1, this.x2 - this.x1, this.y2 - this.y1);
    super.draw();
  }
  
}

class BinaryHeapNode extends NodeObject {
  constructor(canvasState, parentBinaryHeap, parNode, value) {
    super(canvasState, parentBinaryHeap, value);

    this.parNode = parNode;

    this.left = null;
    this.right = null;

    this.xleft = this;
    this.xright = this;

    this.depth = -1;
    this.relX = -1;
    this.relY = -1;

    this.parOffset = 0;
    this.rootOffset = 0;
    this.hasThread = false;
  }

  toString() {
    return `BinaryHeapNode(${this.value})`;
  }

  propTypes() {
    return {
      "textColor": "color",
      "fill": "color",
      "showValues": "bool",
      "showIndices": "bool",
      "borderThickness": "int",
    };
  }

  propNames() {
    return {
      "bg": "fill",
      "background": "fill",
      // "value": "value", -- value can't be accessed directly in BinaryHeap
      "showVal": "showValues",
      "fg": "textColor",
      "ind": "showIndices",
      "border": "borderThickness",
    };
  }

  methodNames() {
    return {
      "value": BinaryHeapNodeValueCommand,
    };
  }

  *inorder() {
    if (this.leftChild()) {
      for (var node of this.leftChild().inorder())
        yield node;
    }
    yield this;
    if (this.rightChild()) {
      for (var node of this.rightChild().inorder())
        yield node;
    }
  }

  *preorder() {
    yield this;
    if (this.leftChild()) {
      for (var node of this.leftChild().preorder())
        yield node;
    }
    if (this.rightChild()) {
      for (var node of this.rightChild().preorder())
        yield node;
    }
  }

  *postorder() {
    if (this.leftChild()) {
      for (var node of this.leftChild().postorder())
        yield node;
    }
    if (this.rightChild()) {
      for (var node of this.rightChild().postorder())
        yield node;
    }
    yield this;
  }

  /** BinaryHeapNode.leftChild
   *    must get index from parent to find
   *    left child
   */
  leftChild() {
    var idx = this.parentObject.heapArray.indexOf(this);
    return this.parentObject.heapLeft(idx);
  }

  /** BinaryHeapNode.rightChild
   *    must get index from parent to find
   *    right child
   */
  rightChild() {
    var idx = this.parentObject.heapArray.indexOf(this);
    return this.parentObject.heapRight(idx);
  }

  isLeaf() {
    return this.leftChild() == null && this.rightChild() == null;
  }

  /** BinaryHeapNode.children
   *   returns array of children 
   */
  children() {
    var children = [];
    if (this.leftChild()) children.push(this.leftChild());
    if (this.rightChild()) children.push(this.rightChild());
    return children;
  }

  getExtremes() {
    return [this.xleft, this.xright];
  }

  /** ListNode.drawValue
   */
  drawValue() {
    var valStr = this.value.toString();
    var textWidth = this.ctx.measureText(valStr).width;

    if (textWidth > this.cellSize) {
      valStr = "..";
      textWidth = this.ctx.measureText(valStr).width;
    }

    this.ctx.textBaseline = "middle";
    this.ctx.textAlign = "center";

    this.ctx.fillStyle = this.textColor;
    this.ctx.fillText(valStr, this.x, this.y);
  }

  /** BinaryHeapNode.draw
   *    draw node with center at x, y and 
   *    node value
   */
  draw() {
    super.draw();
    this.ctx.beginPath();  
    this.ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    this.ctx.stroke();
    this.ctx.fill();

    if (this.showValues && this.getParent().showValues) 
      this.drawValue();

    if (this.showIndices && this.getParent().showIndices) 
      this.drawIndex(this.index);

    this.hitCtx.beginPath();
    this.hitCtx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    this.hitCtx.fill();
  }

  /** BinaryHeapNode.drawIndex
   *    draw node index at top left 
   */
  drawIndex(idx) {
    var r = this.radius;
    var dx = -r;
    var dy = r;
    if (this.getParent().indexPlacement == "above") 
      dy *= -1;
    this.ctx.textBaseline = "alphabetic";
    this.ctx.textAlign = "center";
    this.ctx.fillStyle = "black";

    this.ctx.fillText(idx, this.x + dx, this.y + dy);
  }
}
