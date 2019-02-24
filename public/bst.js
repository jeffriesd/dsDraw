class BST extends LinearCanvasObject {
  /** BST.constructor
   *    BST extends linear canvas object for
   *    node drawing
   *
   *    bst unique attributes are
   *    minSep (horizontal spacing in 
   *    Reingold-Tilford algorithm) and 
   *    depthSep for vertical spacing
   *
   *    bsts identify nodes with unique ids 
   *    (because node values may repeat)
   */
  constructor(canvasState, x1, y1, x2, y2) {
    super(canvasState, x1, y1, x2, y2);
    this.ids = new Map();
    this.root = null;
    
    this.cellSize = 20;

    this.minSep = 6;
    this.depthSep = 30;

    BST.defaultSize = 15;

    // not edges but extra arrows
    this.arrows = new Map();
  }

  propNames() {
    return {
      ...super.propNames(),
      "hs": "minSep",
      "vs": "depthSep",
      "insert": BSTInsertCommand,
      "remove": BSTRemoveCommand,
      "find": BSTFindCommand,
      "inorder": BSTInorderCommand,
      "preorder": BSTPreorderCommand,
      "postorder": BSTPostorderCommand,
      "pred": BSTPredecessorCommand,
      "succ": BSTSuccessorCommand,
      "min": BSTMinCommand,
      "max": BSTMaxCommand,
    };
  }

  config() {
    return {
      ...super.config(),
      minSep: this.minSep,
      depthSep: this.depthSep,
    };
  }

  /** BST.getChildren
   *    return nodes with values 
   *    in the range [low, high)
   */
  getChildren(low, high) {
    if (low == null) low = this.root.getMin().value;
    if (high == null) high = this.root.getMax().value + 1;
    
    return this.inorder()
      .filter(node => node.value >= low && node.value < high);
  }

  /** BST.clone
   *    do recursive clone of tree 
   *    and update parentObj reference
   */
  clone() {
    var copy = super.clone();
    copy.root = this.root.deepCopy();
    copy.claimChildren(copy.root);
    return copy;
  }

  /** BST.claimChildren
   *    update parentObject reference
   *    in every node in given subtree (BSTNode object)
   */
  claimChildren(root) {
    for (var node of root.inorder())
      node.parentObject = this;
  }

  inorder() {
    if (this.root == null) return [];
    return Array.from(this.root.inorder());
  }

  preorder() {
    if (this.root == null) return [];
    return Array.from(this.root.preorder());
  }

  postorder() {
    if (this.root == null) return [];
    return Array.from(this.root.postorder());
  }
  
  /** BST.nodes
   *    return nodes in order for value based
   *    range indexing e.g. bst[3:8]
   */
  get nodes() {
    return Array.from(this.inorder());
  }

  /** BST.insert
   *    recursive insert helper method
   */
  insert(value) {
    if (typeof value !== "number")
      throw "BST only supports numeric values.";
    this.root = this._insert(this.root, null, value);
  }

  /** BST._insert
   *    recursive bst insert 
   *
   *    new node gets instantiated with
   *    references to CanvasState, this BST object,
   *    the parent node (null if root) and a bst key (number)
   */
  _insert(root, par,  value) {
    if (root == null) { 
      var newNode = new BSTNode(this.cState, this, par, value);
      newNode.index = this.newId();
      this.ids.set(newNode.index, newNode);
      return newNode;
    }

    if (value <= root.value) 
      root.left = this._insert(root.left, root, value);
    else
      root.right = this._insert(root.right, root, value);

    return root;
  }

  /** BST.find
   *    BST recursive find helper
   */
  find(value) {
    return this._find(this.root, value);
  }

  /** BST._find
   *    BST recursive find in O(logn)
   */
  _find(node, value) {
    if (node == null) return;
    if (node.value == value) return node;
    if (value <= node.value) return this._find(node.leftChild(), value);
    return this._find(node.rightChild(), value);
  }

  remove(value) {
    if (this.find(value) == null) return;
    if (this.root.isLeaf()) this.root = null;
    else this.root = this._remove(this.root, value);
  }

  /** BST._remove
   *   
   *    TODO
   *    fix case where node being removed has
   *    two children and its predecessor has
   *    the same value
   */
  _remove(node, value) {
    if (node == null) return null;
    if (node.value == value) {
      if (node.leftChild() == null) return node.rightChild();
      if (node.rightChild() == null) return node.leftChild();
      
      // swap current node with predecessor then remove
      var predNode = node.pred();
      this.swapNodes(predNode, node);      

      // remove the node that was swapped to 
      // predecessor's position
      if (predNode === predNode.parNode.leftChild())
        predNode.parNode.left = this._remove(predNode.parNode.leftChild(), value);
      else predNode.parNode.right = this._remove(predNode.parNode.rightChild(), value);
    }
    else if (value < node.value)
      node.left = this._remove(node.leftChild(), value);
    else 
      node.right = this._remove(node.rightChild(), value);

    return node;
  }

  /** BST.swapNodes
   *    swap nodes a and b by swapping
   *    configurations -- much easier than
   *    updating all the references
   */
  swapNodes(a, b) {
    if (a === b) return;
    if (a == null || b == null) throw "Cannot swap null nodes"

    console.log("before swap!");
    console.log("par of ", a.value, " = ", a.parNode ? a.parNode.value : null);
    console.log("par of ", b.value, " = ", b.parNode ? b.parNode.value : null);
    var tempNode = a.config();
    Object.assign(a, b.config());
    Object.assign(b, tempNode);
    console.log("par of ", a.value, " = ", a.parNode ? a.parNode.value : null);
    console.log("par of ", b.value, " = ", b.parNode ? b.parNode.value : null);
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
      // "value": "value", -- value can't be accessed directly in BST
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

  *postorder() {
    if (this.left) {
      for (var node of this.left.postorder())
        yield node;
    }
    if (this.right) {
      for (var node of this.right.postorder())
        yield node;
    }
    yield this;
  }

  leftChild() {
    return this.left;
  }

  rightChild() {
    return this.right;
  }

  /** BSTNode.getMax
   *    return rightmost (maximum key)
   *    node in this subtree
   */
  getMax() {
    if (this.rightChild())
      return this.rightChild().getMax();
    return this;
  }

  /** BSTNode.getMin
   *    return leftmost (minimum key)
   *    node in this subtree
   */
  getMin() {
    if (this.leftChild())
      return this.leftChild().getMin();
    return this;
  }

  /** BSTNode.pred
   *    return inorder predecessor
   */
  pred() {
    if (this.leftChild())
      return this.leftChild().getMax();
    var curNode = this; 
    var parNode = this.parNode;
    while (parNode && (curNode !== parNode.rightChild())) {
      curNode = parNode;
      parNode = curNode.parNode;
    }
    return curNode;
  }

  /** BSTNode.succ
   *    return inorder successor 
   */
  succ() {
    if (this.rightChild())
      return this.rightChild().getMin();
    var curNode = this; 
    var parNode = this.parNode;
    while (parNode && (curNode !== parNode.leftChild())) {
      curNode = parNode;
      parNode = curNode.parNode;
    }
    return curNode;
  }

  isLeaf() {
    return this.left == null && this.right == null;
  }

  /** BSTNode.deepCopy
   *    perform deep copy of root node
   *    for cloning. nodes still need
   *    reference to parent BST 
   *    (taken care of in BST.clone)
   *
   *    update parentNode references 
   *    as part of traversal
   */
  deepCopy(par) {
    var copy = this.clone();
    if (this.left) copy.left = this.left.deepCopy(copy);
    if (this.right) copy.right = this.right.deepCopy(copy);
    copy.parNode = par;
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
      this.drawIndex(this.index);

    this.hitCtx.beginPath();
    this.hitCtx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    this.hitCtx.fill();
  }

  /** BSTNode.drawIndex
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
