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
    
    this.cellSize = 40;

    this.minSep = 2;
    this.depthSep = 30;

    BST.defaultSize = 15;

    // not edges but extra arrows
    this.arrows = new Map();
  }

  toString() {
    if (this.root == null)
      return "BST(empty)";
    return `BST(${this.root.size()})`;
  }

  propTypes() {
    return {
      ...super.propTypes(),
      "minSep": "int",
      "depthSep": "int",
    }
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
      "insert": BSTInsertCommand,
      "remove": BSTRemoveCommand,
      "find": BSTFindCommand,
      "inorder": BSTInorderCommand,
      "preorder": BSTPreorderCommand,
      "postorder": BSTPostorderCommand,
      "min": BSTMinCommand,
      "max": BSTMaxCommand,
      "root": BSTRootCommand,
      "range": BSTRangeCommand,
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

  /** BST.getChildren
   *    return nodes with indices 
   *    in the [low, high)
   */
  getChildren(low, high) {
    if (low == undefined) low = 0;
    if (high == undefined) high = this.newIndex();

    return this.inorder()
      .filter(node => node.index >= low && node.index < high);
  }

  /** BST.clone
   *    do recursive clone of tree 
   *    and update parentObj reference
   */
  clone() {
    var copy = super.clone();
    copy.root = this.root.deepCopy();
    copy.claimChildren(copy.root);
    this._cloneRef = copy; return copy;
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
      newNode.index = this.newIndex();
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
    // TODO move ancestor collapsed to render
    renderBST(this);

    this.preorder().forEach(node => {
      if (node.ancestorHas("collapsed")) return;
      if (node.collapsed) return node.drawTriangle();

      var x = node.x;
      var y = node.y;
      
      // draw black edges with stroke = 1
      this.ctx.strokeStyle = "black";
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

    // super.drawArrows();
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

    this.collapsed = false;

    this.depth = -1;
    this.relX = -1;
    this.relY = -1;

    this.parOffset = 0;
    this.rootOffset = 0;
    this.hasThread = false;
  }

  toString() {
    return `BSTNode(${this.value})`;
  }

  propTypes() {
    return {
      "fill": "color",
      "showIndices": "bool",
      "showValues": "bool",
      "borderThickness": "int",
      "textColor": "color",
      "showIndices": "bool",
      "collapsed": "bool"
    };
  }

  propNames() {
    return {
      "bg": "fill",
      "background": "fill",
      "fill": "fill",
      // "value": "value", -- value can't be accessed directly in BST
      "showVal": "showValues",
      "border": "borderThickness",
      "fg": "textColor",
      "ind": "showIndices",
      "collapsed": "collapsed",
    };
  }

  methodNames() {
    return {
      "pred": BSTNodePredecessorCommand,
      "succ": BSTNodeSuccessorCommand,
      "value": BSTNodeValueCommand,
      "left": BSTNodeLeftCommand,
      "right": BSTNodeRightCommand,
      "parent": BSTNodeParentCommand,
      "rotate": BSTNodeRotateCommand,
    };
  }

  config() {
    return {
      ...super.config(),
      collapsed: this.collapsed,
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

  size() {
    if (this.isLeaf()) return 1;
    var size = 1;
    if (this.left) size += this.left.size();
    if (this.right) size += this.right.size();
    return size;
  }

  ancestorHas(prop) {
    if (this.parNode == null) return this[prop];
    return this.parNode[prop] || this.parNode.ancestorHas(prop);
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

  /** BSTNode.rotateRight
   *    helper method when this node is left child
   *  
   *        A                       B
   *      /  \                     / \
   *     B    t3      becomes     t1  A  
   *    / \                          / \
   *   t1  t2                       t2  t3
   * 
   */
  rotateRight() {
    if (this.parNode == null) return;
    var nodeA = this.parNode;

    // attach t2 as left child of nodeA
    var t2 = this.rightChild();
    nodeA.left = t2;
    if (t2)
      t2.parNode = nodeA;

    this.right = nodeA;

    if (nodeA === this.getParent().root)
      this.getParent().root = this;
    else {
      if (nodeA.isLeftChild())
        nodeA.parNode.left = this;
      else 
        nodeA.parNode.right = this;
    }

    this.parNode = nodeA.parNode;
    nodeA.parNode = this;
  }

  /** BSTNode.rotateLeft
   *    helper method when this node is right child
   *  
   *        A                       B
   *      /  \                     / \
   *     t1   B     becomes       A  t3
   *         / \                 / \
   *        t2  t3              t1  t2
   *
   */
  rotateLeft() {
    if (this.parNode == null) return;
    var nodeA = this.parNode;

    // attach t2 to nodeA
    var t2 = this.leftChild();
    nodeA.right = t2;
    if (t2)
      t2.parNode = nodeA;
    this.left = null;

    // attach nodeA as left child of (this) nodeB
    this.left = nodeA;

    // special case if nodeA is root
    if (nodeA === this.getParent().root)
      this.getParent().root = this;
    else {
      if (nodeA.isLeftChild())
        nodeA.parNode.left = this;
      else
        nodeA.parNode.right = this;
    }

    this.parNode = nodeA.parNode;
    nodeA.parNode = this;
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
    return parNode;
  }

  /** BSTNode.succ
   *    return inorder successor 
   */
  succ() {
    if (this.rightChild())
      return this.rightChild().getMin();
    var curNode = this;
    var parNode = curNode.parNode;
    while (parNode && curNode && (curNode !== parNode.leftChild())) {
      curNode = parNode;
      parNode = curNode.parNode;
    }
    return parNode;
  }

  isLeaf() {
    return this.left == null && this.right == null;
  }

  isLeftChild() {
    return this.parNode && this.parNode.leftChild() === this;
  }

  isRightChild() {
    return this.parNode && this.parNode.rightChild() === this;
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
    this._cloneRef = copy; return copy;
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

  /** BSTNode.drawValue
   *    draw in circle (vs square)
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

  drawTriangle() {
    this.ctx.beginPath();
    this.ctx.moveTo(this.x - this.radius, this.y + this.radius);
    this.ctx.lineTo(this.x, this.y - this.cellSize);
    this.ctx.lineTo(this.x + this.radius, this.y + this.radius);
    this.ctx.lineTo(this.x - this.radius, this.y + this.radius);
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
