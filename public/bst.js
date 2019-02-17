class BST extends LinearCanvasObject {
  /** BST.constructor
   *    BST extends linear canvas object for
   *    node drawing
   *
   *    bst unique attributes are
   *    minSep (horizontal spacing in 
   *    Reingold-Tilford algorithm) and 
   *    depthSep for vertical spacing
   */
  constructor(canvasState, x1, y1, x2, y2) {
    super(canvasState, x1, y1, x2, y2);
    this.root = new BSTNode(canvasState, this, null, 0);

    this.cellSize = 10;

    for (var i =0; i < 4; i++)
      this.insert(Math.random() * 100 | 0);

    this.minSep = 6;
    this.depthSep = 30;

    // not edges but extra arrows
    this.arrows = new Map();
  }

  propNames() {
    return {
      ...super.propNames(),
      "hs": "minSep",
      "vs": "depthSep",
    };
  }

  config() {
    return {
      ...super.config(),
      minSep: this.minSep,
      depthSep: this.depthSep,
    };
  }

  /** BST.clone
   *    do recursive clone of tree 
   *    and update parentObj reference
   */
  clone() {
    var copy = super.clone();
    copy.root = this.root.deepCopy();
    for (var node of copy.inorder())
      node.parentObject = copy;
    return copy;
  }

  inorder() {
    return Array.from(this.root.inorder());
  }

  preorder() {
    return Array.from(this.root.preorder());
  }
  
  /** BST.nodes
   *    return nodes in order for value based
   *    range indexing e.g. bst[3:8]
   */
  get nodes() {
    return Array.from(this.inorder());
  }

  insert(value) {
    this.root = this._insert(this.root, null, value);
  }

  _insert(root, par,  value) {
    if (root == null) { 
      // maintain reference to last inserted node
      this.inserted = new BSTNode(this.cState, this, par, value);
      return this.inserted;
    }

    if (value <= root.value) 
      root.left = this._insert(root.left, root, value);
    else
      root.right = this._insert(root.right, root, value);

    return root;
  }

  configureOptions() {
    this.ctx.strokeStyle = this.active() ? this.cState.activeBorder : this.border;
    this.ctx.lineWidth = this.borderThickness;

    var font = "";
    if (this.fontStyle)
      font += this.fontStyle + " ";

    font += this.fontSize + "px ";
    font += this.fontFamily;

    this.ctx.font = font;

    this.hitCtx.fillStyle = this.hashColor;
    this.hitCtx.strokeStyle = this.hashColor;
  }

  draw() {
    super.draw();
    this.configureOptions();

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
  }
}

class BSTNode extends NodeObject {
  constructor(canvasState, parentBST, parNode, value) {
    super(canvasState, parentBST, value);
    this.parNode = parNode;

    this.left = null;
    this.right = null;

    this.xleft = this;
    this.xright = this;

    this.size = -1;

    this.depth = -1;
    this.relX = -1;
    this.relY = -1;

    this.shift = 0;

    this.parOffset = 0;
    this.rootOffset = 0;
    this.hasThread = false;
  }

  propNames() {
    return {
      "bg": "fill",
      "background": "fill",
      "fill": "fill",
      "value": "value",
      "showVal": "showValues",
      "fg": "textColor",
      "ind": "showIndices",
    };

  }

  config() {
    return {
      value: this.value,
      fill: this.fill,
      textColor: this.textColor,
      showIndices: this.showIndices,
      showValues: this.showValues,
    };
  }

  *inorder() {
    if (this.left) {
      for (var node of this.left.inorder())
        yield node;
    }
    yield this;
    if (this.right) {
      for (var node of this.right.inorder())
        yield node;
    }
  }

  *preorder() {
    yield this;
    if (this.left) {
      for (var node of this.left.preorder())
        yield node;
    }
    if (this.right) {
      for (var node of this.right.preorder())
        yield node;
    }
  }

  leftChild() {
    return this.left;
  }

  rightChild() {
    return this.right;
  }

  isLeaf() {
    return this.left == null && this.right == null;
  }

  deepCopy() {
    var copy = this.clone();
    if (this.left) copy.left = this.left.deepCopy();
    if (this.right) copy.right = this.right.deepCopy();
    return copy;
  }

  /** BSTNode.children
   *   returns array of children 
   */
  children() {
    var children = [];
    if (this.left) children.push(this.left);
    if (this.right) children.push(this.right);
    return children;
  }

  getExtremes() {
    return [this.xleft, this.xright];
  }

  /** BSTNode.configureOptions
   *    determine absolute coordinate from relative
   */
  configureOptions() {
    super.configureOptions();
    this.radius = this.getParent().cellSize;
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


  /** BSTNode.draw
   *    draw node with center at x, y and 
   *    node value
   */
  draw() {
    this.configureOptions();
    this.ctx.beginPath();  
    this.ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    this.ctx.stroke();
    this.ctx.fill();

    if (this.showValues && this.getParent().showValues) 
      this.drawValue();

    if (this.showIndices && this.getParent().showIndices)
      this.drawIndex();

    this.hitCtx.beginPath();
    this.hitCtx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    this.hitCtx.fill();
  }
}
