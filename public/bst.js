/** BST 
 *    internal representation of BST data
 *    
 *    BSTCanvasObject just keeps a map of id -> BSTNodeCanvasObject
 *    this way when BST state (shape) needs to be saved and restored,
 *    only the underlying BST data needs to change, instead of doing
 *    a deep copy on all the CanvasObjects when a deep copy/clone 
 *    of the other information (drawing properties etc.) isn't really necessary.
 */
class BSTNode {
  constructor(parentBST, parNode, value) {
    this.parentBST = parentBST;
    this.value = value;

    this.parNode = parNode;

    this.left = null;
    this.right = null;

    this.collapsed = false;

    // Reingold Tilford render attributes
    this.xleft = this;
    this.xright = this;

    this.depth = -1;
    this.relX = -1;
    this.relY = -1;

    this.parOffset = 0;
    this.rootOffset = 0;
    this.hasThread = false;
  }

  deepCopy(par) {
    var copy = new BSTNode(this.parentBST, par, this.value);
    if (this.left) copy.left = this.left.deepCopy(copy);
    if (this.right) copy.right = this.right.deepCopy(copy);

    copy.index = this.index;
    return copy;
  }

  size() {
    if (this.isLeaf()) return 1;
    var size = 1;
    if (this.left) size += this.left.size();
    if (this.right) size += this.right.size();
    return size;
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

    if (nodeA === this.parentBST.root)
      this.parentBST.root = this;
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
    if (nodeA === this.parentBST.root)
      this.parentBST.root = this;
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

}

class BST {
  constructor(bstCanvasObject) {
    this.bstCanvasObject = bstCanvasObject;
    this.root = null;
    this.ids = new Map();
  }

  clone() {
    var copy = new BST(this.bstCanvasObject);
    copy.root = this.root.deepCopy();
    for (var node of copy.root.inorder()) {
      // update cloned node parentBST
      node.parentBST = copy;
      // update cloned bst id map
      copy.ids.set(node.index, node);
    }

    return copy;
  }

  /** BST.addNode
   *    register new BST node with unique id 
   *    in both this class (underlying data structure)
   *    and the canvas object class
   *  
   * @param {*} index  unique id of bst node 
   * @param {*} bstNode  reference to bst node
   */
  addNode(bstNode, index, value) {
    this.ids.set(index, bstNode);
    this.bstCanvasObject.addNode(index, value);
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
      var newNode = new BSTNode(this, par, value);
      newNode.index = this.bstCanvasObject.newIndex();
      this.addNode(newNode, newNode.index, value);
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
    if (value <= node.value) return this._find(node.left, value);
    return this._find(node.right, value);
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
      if (node.left == null) return node.right;
      if (node.right == null) return node.left;
      
      // swap current node with predecessor then remove
      var predNode = node.pred();
      this.swapNodes(predNode, node);      

      // remove the node that was swapped to 
      // predecessor's position
      if (predNode === predNode.parNode.left)
        predNode.parNode.left = this._remove(predNode.parNode.left, value);
      else predNode.parNode.right = this._remove(predNode.parNode.right, value);
    }
    else if (value < node.value)
      node.left = this._remove(node.left, value);
    else 
      node.right = this._remove(node.right, value);

    return node;
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
}


class BSTCanvasObject extends LinearCanvasObject {
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
    this.bst = new BST(this);
    this.root = null;
    
    this.cellSize = 40;

    this.minSep = 2;
    this.depthSep = 30;

    this.minSep = 2;
    this.depthSep = 30;

    BSTCanvasObject.defaultSize = 15;
  }

  toString() {
    if (this.bst.root == null)
      return "BST(empty)";
    return `BST(${this.bst.root.size()})`;
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

  /** BSTCanvasObject.addNode
   *    add a new canvas object node with 
   *    provided unique index
   */
  addNode(index, value) {
    this.ids.set(index, new BSTNodeCanvasObject(this.cState, this, value, index));
  }

  /** BEGIN WRAPPER METHODS FOR ACCESSING INTERNAL BST 
   */
  insert(value) {
    this.bst.insert(value);
  }

  remove(value) {
    this.bst.remove(value);
  }

  find(value) {
    var node = this.bst.find(value);
    if (node) 
      return this.ids.get(node.index);
  }

  inorder() {
    var nodes = this.bst.inorder();
    return nodes.map(node => this.ids.get(node.index));
  }

  preorder() {
    var nodes = this.bst.preorder();
    return nodes.map(node => this.ids.get(node.index));
  }

  postorder() {
    var nodes = this.bst.preorder();
    return nodes.map(node => this.ids.get(node.index));
  }

  getMin() {
    if (this.bst.root) {
      var min = this.bst.root.getMin();
      return this.ids.get(min.index);
    }
  }

  getMax() {
    if (this.bst.root) {
      var max = this.bst.root.getMax();
      return this.ids.get(max.index);
    }
  }

  getRoot() {
    if (this.bst.root)
      return this.ids.get(this.bst.root.index);
  }

  /** END WRAPPER METHODS FOR INTERNAL BST
  */

  /** BSTCanvasObject.clone
   *    do recursive clone of tree 
   *    and update parentObj reference
   */
  clone(cloneHandle) {
    var copy = super.clone(cloneHandle);
    copy.bst = this.bst.clone();
    copy.bst.bstCanvasObject = copy;

    // clone canvas nodes and set ids
    this.nodes.forEach(node => {
      var cnode = node.clone(cloneHandle);
      cnode.parentObject = copy;
      copy.ids.set(node.index, cnode);
    });

    return copy;
  }


  /** BST.nodes
   *    return nodes in order for value based
   *    range indexing e.g. bst[3:8]
   */
  get nodes() {
    return Array.from(this.inorder());
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
    // TODO only render when needed
    // TODO move ancestor collapsed to render
    renderBST(this, this.bst);

    // TODO make this a recursive preorder 
    // so collapsed subtrees can be skipped
    this.preorder().forEach(node => {
      if (node.ancestorHas("collapsed")) return;
      if (node.collapsed) return node.drawTriangle();

      var x = node.x;
      var y = node.y;
      
      // draw black edges with stroke = 1
      this.ctx.lineWidth = node.borderThickness;
      this.ctx.beginPath();
      this.ctx.moveTo(x, y);

      node.children().forEach(child => {
        this.ctx.lineTo(child.x, child.y);
        this.ctx.moveTo(x, y);
      });
      this.ctx.stroke();

      // draw node overtop of edges
      node.configAndDraw();
    });

    // super.drawArrows();
  }
}

class BSTNodeCanvasObject extends NodeObject {
  constructor(canvasState, parentBST, value, index) {
    super(canvasState, parentBST, value, index);

    this.collapsed = false;
  }

  /** BSTNodeCanvasObject
   *    give canvas object node access to internal bst node
   *    which it represents
   */
  internalNode() {
    return this.getParent().bst.ids.get(this.index);
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
      "pred": BSTNodeCanvasObjectPredecessorCommand,
      "succ": BSTNodeCanvasObjectSuccessorCommand,
      "value": BSTNodeCanvasObjectValueCommand,
      "left": BSTNodeCanvasObjectLeftCommand,
      "right": BSTNodeCanvasObjectRightCommand,
      "parent": BSTNodeCanvasObjectParentCommand,
      "rotate": BSTNodeCanvasObjectRotateCommand,
    };
  }

  config() {
    return {
      ...super.config(),
      collapsed: this.collapsed,
    };
  }

  // currently only used for collapsed
  ancestorHas(prop) {
    var parNode = this.getParNode();
    if (parNode == null) return this[prop];
    return parNode[prop] || parNode.ancestorHas(prop);
  }

  internalToCanvasNode(node) {
    if (node) return this.getParent().ids.get(node.index);
  }

  /** BEGIN WRAPPER METHODS FOR ACCESSING INTERNAL BST */

  /** BSTNode.children
   *   returns array of children 
   */
  children() {
    return this.internalNode().children();
  }

  leftChild() {
    return this.internalToCanvasNode(this.internalNode().leftChild());
  }

  rightChild() {
    return this.internalToCanvasNode(this.internalNode().rightChild());
  }

  getParNode() {
    return this.internalToCanvasNode(this.internalNode().parNode);
  }

  pred() {
    return this.internalToCanvasNode(this.internalNode().pred());
  }

  succ() {
    return this.internalToCanvasNode(this.internalNode().succ());
  }

  /** END WRAPPER METHODS FOR ACCESSING BST */

  /** BSTNodeCanvasObject.drawValue
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

  /** BSTNodeCanvasObject.drawIndex
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
