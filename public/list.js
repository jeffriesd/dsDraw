/** LinkedList
 *    CanvasObject class for linked lists. Lists
 *    may be linear or have branches. 
 *
 *    Nodes can be
 *    positioned individually by dragging or 
 *    snapped into a linear or circular shape,
 *    provided they fit the linear/circular constraints.
 *    
 *    Nodes are CanvasChildObjects, so their labels are
 *    not drawn. Instead they are assigned indices incrementally.
 *    
 */
class LinkedList extends LinearCanvasObject {
  constructor(canvasState, x1, y1, x2, y2) {
    super(canvasState, x1, y1, x2, y2);
    LinkedList.defaultLength = 4;
    
    this.list = new Map();
    this.arrows = new Map();

    this.nodeStyle = "circle";

    this.head = this.addNode(null, 0);

    LinkedList.randomSeed = 100;
  }

  /** LinkedList.nodes
   *    getter method for super class methods
   */
  get nodes() {
    return Array.from(this.list.values());
  }

  config() {
    var parentConfig = super.config();
    return {
      ...parentConfig,
      nodeStyle: this.nodeStyle,
    };
  }

  propNames() {
    return {
      ...super.propNames(),
      "display": "nodeStyle",
      "ds": "nodeStyle",
    };
  }

  clone() {
    var copy = super.clone();

    // copy config of each node
    // for (var idx in this.list) {
    this.list.forEach((node, idx) => {
      copy.list.set(idx, new ListNode(this.cState, copy, 
        node.value, node.index, node.x, node.y));
      Object.assign(copy.list.get(idx), node.config()); 
    });

    this.arrows.forEach((arr, index) => {
      var cparrow = arr.clone();
      
      var i1 = index[0];
      var i2 = index[1];

      cparrow.lockedFrom = copy.list.get(i1);
      cparrow.lockedTo = copy.list.get(i2);
      cparrow.locked = copy;

      copy.arrows.set(index, cparrow);
    });

    // copy head of list
    copy.head = copy.list.get(this.head.index);

    return copy;
  }

  /** LinkedList.getChildren
   */
  getChildren(low, high) {
    if (low == null) 
      return this.nodes;

    var children = [];
    this.list.forEach((node, idx) => {
      if (idx >= low && idx < high)
        children.push(node);
    });
    return children;
  }

  /** LinkedList.append
   *    add a new node from the current node with highest index
   */
  append(value) {
    var maxIdx = Array.from(this.list.keys()).reduce(
      (acc, curr) => Math.max(acc, parseInt(curr)), -1);
    this.addNode(this.nodes[maxIdx], value);
  }

  /** LinkedList.addNode
   *    add a new node to linked list
   *    with incoming link from fromNode
   *
   *    fromNode must be actual NodeObject
   *
   *    after insertion check if list is still
   *    'linear' i.e. no branches
   */
  addNode(fromNode=null, value=null) {
    console.log("adding node from ", fromNode ? fromNode.index : null, "to ", value);
    // assign new index
    var maxIdx = Array.from(this.list.keys()).reduce(
      (acc, curr) => Math.max(acc, parseInt(curr)), -1);

    // new node uses LinkedList x1, y1, others are placed
    // to right of newest node
    var x, y;
    if (this.list.size) {
      x = this.list.get(maxIdx).x + this.cellSize * 4;
      y = this.list.get(maxIdx).y;
    }
    else {
      x = this.x1;
      y = this.y1;
    }
   
    var newNode = new ListNode(this.cState, this, value, maxIdx+1, x, y);
    this.list.set(maxIdx+1, newNode);

    // add edge/link
    if (fromNode)
      this.addEdge(fromNode, newNode);

    return newNode;
  }

  /** LinkedList.removeNode
   *    remove node from map and delete 
   *    and return (for undo) any links
   */
  removeNode(node) {
    this.arrows.forEach((arr, index) => {
      var from = this.list.get(index[0]);
      var to = this.list.get(index[1]);

      if (from === node || to === node)
        this.removeEdge(from, to);
    });
    this.list.delete(node.index);
  }

  /** LinkedList.addEdge
   *    add an edge and create new CurvedArrow
   *
   *    arcs belong to LinkedList (manage drawing)
   *    as well as its source and destination ListNodes
   *    (manage dragging endpoints)
   *
   *    first check that edge doesn't already exist
   */
  addEdge(fromNode, toNode) {
    var e = [fromNode.index, toNode.index];
    
    // fancy Map.has because [1, 2] !== [1, 2]
    if (this.arrows.hasEquiv(e))
      throw `Edge ${e} already exists.`;

    // create new curved arrow that is locked to 
    // this linked list 
    var anchors = {from: fromNode, to: toNode};
    
    var arrow = new CurvedArrow(this.cState, 
      fromNode.x, fromNode.y, toNode.x, toNode.y, anchors);
    arrow.restore();

    this.arrows.set(e, arrow);
  }

  removeEdge(fromNode, toNode) {
    var e = [fromNode.index, toNode.index];
    console.log("this.arrows = ", Object.keys(this.arrows));
    if (! (this.arrows.hasEquiv(e)))
      throw `Edge ${e} does not exist.`;
     
    var edge = this.arrows.getEquiv(e);
    edge.destroy();
    return edge;
  }

  /** LinkedList.draw
   *    draw nodes, arrows will draw themselves
   */
  draw(active, idx) {
    this.configureOptions(active);

    // draw nodes
    this.list.forEach((node, idx) => {
      node.draw(active, idx);
    });
  }
}

class ListNode extends NodeObject {
  constructor(canvasState, parentObject, value, index, x, y) {
    super(canvasState, parentObject, value);

    this.borderThickness = 2;

    this.x = x;
    this.y = y;

    this.index = index;
  }

  get radius() {
    return Math.floor(this.getParent().cellSize / 2);
  }

  configureOptions(active) {
    super.configureOptions(active);
    this.nodeStyle = this.getParent().nodeStyle;
  }

  /** ListNode.lockArrow
   *    put tip of arrow on outer edge of node and use
   *    angle to determine placement on circumference 
   */
  lockArrow(arrow, dir) {
    var endAngle = arrow.endingAngle();
    var startAngle = arrow.startingAngle();

    // center is this.x, this.y
    var x, y;
    if (dir == "from") {
      x = this.x - this.radius * Math.cos(startAngle);
      y = this.y - this.radius * Math.sin(startAngle);

      arrow.x1 = x;
      arrow.y1 = y;
      arrow.startPoint.x = x;
      arrow.startPoint.y = y;
    }
    else {
      x = this.x - this.radius * Math.cos(endAngle);
      y = this.y - this.radius * Math.sin(endAngle);
      arrow.x2 = x;
      arrow.y2 = y;
    }
  }

  /** ListNode.draw
   */
  draw(active, idx) {
    this.configureOptions(active);    

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

    this.hitCtx.fill();

    // leave node blank if value is null
    if (this.getParent().showValues && this.showValues && this.value !== null)
      this.drawValue();

    if (this.getParent().showIndices && this.showIndices)
      this.drawIndex(idx);
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

  /** ListNode.drawIndex
   *    draw index above or below
   */
  drawIndex(idx) {
    var yOffset;
    if (this.getParent().indexPlacement == "above") 
      yOffset = -this.cellSize;
    else 
      yOffset = this.cellSize;

    this.ctx.textBaseline = "alphabetic";
    this.ctx.textAlign = "center";
    this.ctx.fillStyle = "black";

    this.ctx.fillText(idx, this.x, this.y + yOffset);

  }

  /** ListNode.drag
   *    shift + regular drag moves individual nodes around
   *
   *    dragging head moves list label
   */
  drag(deltaX, deltaY) {
    if (hotkeys[SHIFT]) {
      this.x += deltaX;
      this.y += deltaY;

      var list = this.getParent();

      if (this === this.getParent().head) {
        list.x1 += deltaX;
        list.y1 += deltaY;
        list.x2 += deltaX;
        list.y2 += deltaY;
      }
    }
  }
}

