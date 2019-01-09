
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
    
    this.list = {};
    this.arrows = {};

    this.nodeStyle = "circle";

    this.head = this.addNode();
  }

  /** LinkedList.nodes
   *    getter method for super class methods
   */
  get nodes() {
    return Object.values(this.list); 
  }

  config() {
    var parentConfig = super.config();
    return {
      ...parentConfig,
      nodeStyle: this.nodeStyle,
    };
  }

  clone() {
    var copy = super.clone();

    // copy config of each node
    for (var idx in this.list) {
      var node = this.list[idx];
      copy.list[idx] = new ListNode(this.cState, copy, 
        node.value, node.index, node.x, node.y);
      Object.assign(copy.list[idx], node.config()); 
    }

    for (var idx in this.arrows) {
      var cparrow = this.arrows[idx].clone();
      
      var i1 = parseInt(idx[0]);
      var i2 = parseInt(idx[2]);

      cparrow.lockedFrom = copy.list[i1];
      cparrow.lockedTo = copy.list[i2];
      cparrow.locked = copy;

      copy.arrows[idx] = cparrow;
    }

    // copy head
    copy.head = copy.list[this.head.index];

    return copy;
  }

  /** LinkedList.getChildren
   */
  getChildren(low, high) {
    if (low == null) 
      return this.nodes;

    var children = [];
    for (var i = low; i < high; i++) {
      if (i in this.list)
        children.push(this.list[i]);
    }
    return children;
  }

  /** LinkedList.addNode
   *    add a new node to linked list
   *    with incoming link from fromNode
   *
   *    after insertion check if list is still
   *    'linear' i.e. no branches
   */
  addNode(fromNode=null, value=null) {
    // assign new index
    var maxIdx = Object.keys(this.list).reduce(
      (acc, curr) => Math.max(acc, parseInt(curr)), -1);

    // new node uses LinkedList x1, y1, others are placed
    // to right of newest node
    var x, y;
    if (Object.keys(this.list).length) {
      x = this.list[maxIdx].x + this.cellSize * 4;
      y = this.list[maxIdx].y;
    }
    else {
      x = this.x1;
      y = this.y1;
    }
   
    var newNode = new ListNode(this.cState, this, value, maxIdx+1, x, y);
    this.list[maxIdx+1] = newNode;

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
    for (var index in this.arrows) {
      var from = this.list[parseInt(index[0])];
      var to = this.list[parseInt(index[2])];

      if (from == node || to == node)
        this.removeEdge(from, to);
    }
    delete this.list[node.index];
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
    if (e in this.arrows)
      throw `Edge ${e} already exists.`;

    // create new curved arrow that is locked to 
    // this linked list 
    var anchors = {from: fromNode, to: toNode};
    
    var arrow = new CurvedArrow(this.cState, 
      fromNode.x, fromNode.y, toNode.x, toNode.y, anchors);
    this.cState.addCanvasObj(arrow);

    this.arrows[e] = arrow;
  }

  removeEdge(fromNode, toNode) {
    var e = [fromNode.index, toNode.index];
    console.log("this.arrows = ", Object.keys(this.arrows));
    if (! (e in this.arrows))
      throw `Edge ${e} does not exist.`;
     
    var edge = this.arrows[e];
    this.arrows[e].destroy();
    return edge;
  }

  /** LinkedList.draw
   *    draw nodes, arrows will draw themselves
   */
  draw(active, idx) {
    this.configureOptions(active);

    // draw nodes
    for (var idx in this.list) 
      this.list[idx].draw(active, idx);
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

  configureOptions(active) {
    super.configureOptions(active);
    this.nodeStyle = this.getParent().nodeStyle;
    this.radius = Math.floor(this.cellSize / 2);
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
      this.ctx.rect(this.x - h, this.y - h, this.cellSize);
      this.ctx.fillRect(this.x - h, this.y - h, this.cellSize);
      this.hitCtx.fillRect(this.x - h, this.y - h, this.cellSize);
    }

    this.ctx.stroke();
    this.ctx.fill();

    this.hitCtx.fill();

    // leave node blank if value is null
    if (this.showValues && this.value !== null)
      this.drawValue();

    if (this.showIndices)
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
    if (this.cState.hotkeys[SHIFT]) {
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

