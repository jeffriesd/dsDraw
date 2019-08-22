// undirected graph class
// adjacency list is upper edge matrix
// so each entry is
// i: [ ids > i]
class Graph extends LinearCanvasObject {
  constructor(canvasState, x1, y1, x2, y2) {
    super(canvasState, x1, y1, x2, y2);
    this.ids = new Map();

    // adjacency maps id -> [id]
    this.adjacency = new Map();

    this.bboxStroke = "#aaaa";
    this.bboxThickness = 2;
    
    Graph.defaultSize = 15;

    this.resizePoint = new ResizePoint(this.cState, this, this.x2, this.y2);
  }

  static defaultCoordinates(cState) {
    var center = cState.getCenter();

    var w = 600;
    var h = 600;
    return {
      x1: center.x,
      y1: center.y,
      x2: center.x + w,
      y2: center.y + h,
    }
  }

  toString() {
    // display node values
    return `Graph(${this.nodes.map(nd => nd.value)})`;
  }

  propTypes() {
    return { 
      ...super.propTypes(), 
      bboxThickness: "int",
      bboxStroke: "color",
    };
  }

  propNames() {
    return { 
      ...super.propNames(), 
      bboxThickness: "bboxThickness",
      bboxStroke: "bboxStroke",
    };
  }
  
  /** Graph.methodNames
   */
  methodNames() {
    return {
      "addNode": GraphAddNodeCommand,
      "addEdge": GraphAddEdgeCommand,
      "delNode": GraphDeleteNodeCommand,
      "render": GraphRenderCommand,
      "delEdge": GraphDeleteEdgeCommand,
      // "layout": GraphLayoutCommand,
    };
  }

  config() {
    return { 
      ...super.config(), 
      bboxStroke: this.bboxStroke,
      bboxThickness: this.bboxThickness,
    };
  }

  get floatingChildren() {
    return [this.resizePoint, ...this.nodes];
  }

  /** Graph.setAdjacency
   *    update state using deepcopy of other adjacency list 
   */
  setAdjacency(otherAdj) {
    this.adjacency = new Map();
    otherAdj.forEach((neighbors, id) => {
      this.adjacency.set(id, new Set(neighbors));
    });
  }

  /** Graph.clone
   *    clone nodes and update their parent references
   */
  clone() {
    var copy = super.clone();

    var copyNodes = this.nodes.map(node => { 
      var c = node.clone();
      c.x = node.x;
      c.y = node.y;
      return c;
    });
    copyNodes.forEach(node => node.parentObject = copy);
    copy.ids = new Map();
    copyNodes.forEach(node => copy.ids.set(node.index, node));

    // do deep copy of adjacency list because values are arrays
    copy.setAdjacency(this.adjacency);

    this._cloneRef = copy; return copy;
  }

  get nodes() {
    return Array.from(this.adjacency.keys()).map(i => this.ids.get(i));
  }

  /** Graph.getChildren
   *    return nodes with indices 
   *    in the [low, high)
   */
  getChildren(low, high) {
    if (low == undefined) low = 0;
    if (high == undefined) high = this.newIndex();

    return this.nodes
      .filter(node => node.index >= low && node.index < high);
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
    this.ctx.beginPath();

    // TODO only render when needed
    // renderGraph(this);

    // draw edges first
    this.adjacency.forEach((neighbors, i1) => {
      var node1 = this.ids.get(i1);
      var node2;
      neighbors.forEach(i2 => { 
        node2 = this.ids.get(i2);

        // skip deleted nodes
        if (! this.adjacency.has(i2)) return;

        this.ctx.moveTo(node1.x, node1.y);
        this.ctx.lineTo(node2.x, node2.y);
      });
    });
    this.ctx.stroke();

    // draw node overtop of edges
    this.nodes.forEach(node => node.draw());

    // draw bbox
    if (this.active()) {
      this.ctx.beginPath(); // start new path so last node is unaffected
      this.ctx.strokeStyle = this.bboxStroke;
      this.ctx.lineWidth = this.bboxThickness;
      this.ctx.rect(this.x1, this.y1, this.width, this.height);
      this.ctx.stroke();
    }

    this.ctx.beginPath();
    this.resizePoint.draw();
  }

  /** Graph.addNode
   *    create a new node and add it to adjacency list
   */
  addNode(value) {
    var newNode = new GraphNode(this.cState, this, value);
    var id = this.newIndex();
    newNode.index = id;
    this.ids.set(id, newNode);

    // adjacency maps GraphNode -> [id]
    this.adjacency.set(id, new Set());
    return newNode;
  }

  /** Graph.addEdge
   *    create an edge between two nodes with indices
   */
  addEdge(i1, i2) {
    if (i1 == i2) 
      throw "Self edges are not allowed"; 

    var neighbors = this.adjacency.get(i1);
    var node2 = this.ids.get(i2);

    if (neighbors == undefined || node2 == undefined) 
      throw "Node ids don't refer to existing nodes";
    
    // if edge already exists
    if (neighbors.has(i2))
      throw `Edge ${i1}, ${i2} already exists.`;
    
    neighbors.add(i2);
  }

/**   Graph.deleteEdge
   *    delete an edge but first make sure 
   *    it exists   
   *    @param {Int} i1 -- edge comes from i1
   *    @param {Int} i2 -- edge goes to i2
   */
  deleteEdge(i1, i2) {
    if (this.adjacency.has(i1)) {
      if (this.adjacency.get(i1).has(i2)) {
        this.adjacency.get(i1).delete(i2);
        return;
      }
    }
    throw `Edge ${x}, ${y} doesn't exist`
  }

  snapBoundingBox() {
    var maxX, maxY, minX, minY;
    maxX = maxY = -Infinity;
    minX = minY = Infinity;
    this.nodes.forEach(node => {
      var r = node.radius;
      maxX = Math.max(maxX, node.x + r);
      minX = Math.min(minX, node.x - r);

      maxY = Math.max(maxY, node.y + r);
      minY = Math.min(minY, node.y - r);

    });

    // move resize point 
    this.x1 = minX;
    this.x2 = maxX;
    this.y1 = minY;
    this.y2 = maxY;
    this.resizePoint.x = this.x2;
    this.resizePoint.y = this.y2;
  }

  resize(deltaX, deltaY) {
    super.resize(deltaX, deltaY);
  }

  /** Graph.doubleClick
   *    snap bbox to graph 
   */
  doubleClick() {
    super.doubleClick();
    this.snapBoundingBox();
  }
}

class GraphNode extends NodeObject {
  constructor(canvasState, parentGraph, value) {
    super(canvasState, parentGraph, value);
    // coordinate is somewhat random at first
    this._x = undefined;
    this._y = undefined;
  }

  // use getter because 
  // initial x value should be random 
  // but can't be initialized in constructor
  // if it's using parent reference 
  // (when graph is cloned parent reference is updated
  // after call to constructor)
  get x() {
    if (this._x == undefined) 
      this.x = this.getParent().x1 + Math.random() * 100;
    return this._x;
  }

  get y() {
    if (this._y == undefined)
      this.y = this.getParent().y1 + Math.random() * 100;
    return this._y;
  }

  set x(xvalue) {
    this._x = xvalue;
  }

  set y(yvalue) {
    this._y = yvalue;
  }

  toString() {
    return `GraphNode(${this.value})`;
  }

  propTypes() {
    return {
      ...super.propTypes(),
    };
  }

  propNames() {
    return {
      ...super.propNames(),
    };
  }

  methodNames() {
    return {
    };
  }

  config() {
    return {
      ...super.config(),
    };
  }

  neighbors() {
  }

  /** GraphNode.draw
   *    draw node with center at x, y and 
   *    node value
   * 
   *  TODO -- generalize -- same method as BSTNode.draw
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

  /** GraphNode.shiftDrag
   *    reposition individual nodes
   * 
   *    update bbox of parent graph
   */
  shiftDrag(deltaX, deltaY) {
    this.x += deltaX;
    this.y += deltaY;

    var g = this.getParent();
    var r = this.radius;
    g.x1 = Math.min(g.x1, this.x - r);
    g.x2 = Math.max(g.x2, this.x + r);
    g.y1 = Math.min(g.y1, this.y - r);
    g.y2 = Math.max(g.y2, this.y + r);
  }

  /** GraphNode.drawValue
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



}
