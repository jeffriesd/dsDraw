/**  Javascript doesn't support literal arrays as keys for Map
*   so this will be used to store an edge matrix : Map(Int -> Map(Int -> A))
*   
*  
*   methods:
*     - get
*     - set
*     - has
*     - delete
*/
class EdgeMatrix {
  constructor() {
    this.edges = new Map();

    // use a 1d map for storing
    // all values for quick access
    // rather than having to concat 
    // all the individual maps
    this.allValues = new Set();
  }

  has(i1, i2) {
    return (
      this.edges.has(i1) && 
      this.edges.get(i1).has(i2)
    );
  }

  get(i1, i2) {
    if (this.edges.has(i1)) 
      return this.edges.get(i1).get(i2);
  }

  set(i1, i2, x) {
    if (! this.edges.has(i1)) this.edges.set(i1, new Map());
    this.edges.get(i1).set(i2, x);
    this.allValues.add(x);
  }

  delete(i1, i2) {
    if (this.edges.has(i1)) {
      if (this.edges.get(i1).has(i2)) {
        var val = this.edges.get(i1).get(i2);
        this.edges.get(i1).delete(i2);
        this.allValues.delete(val);
      }
    }
  }

  values() {
    return this.allValues.values();
  }

  /** EdgeMatrix.forEach
   *    propagate function through both map layers
   *    @param {*} f - callback function which matches two indices and an entry
   */
  forEach(f) {
    this.edges.forEach((subMap, i) => {
      subMap.forEach((entry, j) => {
        f(i, j, entry);
      });
    });
  }
}

 
 
 
 
 /**  DiGraph
  *     represent adjacency list as 
  *     map from nodeIndex -> Set(neighborIds)
  */
class DiGraph {
  constructor() {
    this.adjacency = new Map();
  }

  copyAdjacency() {
    var adjacency = new Map();
    this.adjacency.forEach((neighbors, nid) => {
      adjacency.set(nid, new Set(neighbors));
    });
    return adjacency;
  }

  /** DiGraph.setAdjacency
   *    update state using deepcopy of other adjacency list 
   */
  setAdjacency(otherAdj) {
    this.adjacency = new Map();
    otherAdj.forEach((neighbors, id) => {
      this.adjacency.set(id, new Set(neighbors));
    });
  }

  insertNode(nodeIndex) {
    this.adjacency.set(nodeIndex, new Set());    
  }

  hasEdge(fi, ti) {
    if (this.adjacency.has(fi))
      return this.adjacency.get(fi).has(ti);
    return false;
  }

  /** UDGraph.insertEdge
   * @param fi - index of outgoing end
   * @param ti - index of incoming end
   * 
   *  return indices so arrow can be added
   *  with correct indice in GraphCO
   */
  insertEdge(fi, ti) {
    if (fi == ti) 
      throw "Self edges are not allowed"; 

    var neighbors = this.adjacency.get(fi);
    var node2 = this.adjacency.get(ti);

    if (neighbors == undefined || node2 == undefined) 
      throw "Node ids don't refer to existing nodes";
    
    // if edge already exists
    if (neighbors.has(ti))
      throw `Edge ${fi}, ${ti} already exists.`;
    
    neighbors.add(ti);
    return [fi, ti];
  }

  deleteNode(nodeIndex) {
    if (this.adjacency.has(nodeIndex)) {
      this.adjacency.delete(nodeIndex);
      this.adjacency.forEach((neighbors, _nid) => {
        neighbors.delete(nodeIndex);
      });
      return;
    }    
    throw `Node ${nodeIndex} does not exist.`;
  }

  deleteEdge(fi, ti) {
    if (this.adjacency.has(fi)) {
      if (this.adjacency.get(fi).has(ti)) {
        this.adjacency.get(fi).delete(ti);
        return;
      }
    }
    throw `Edge ${fi}, ${ti} doesn't exist`
  }

}

/** UDGraph -- undirected graph structure 
 *    same implementation as DiGraph but 
 *    edges are sorted before each operation
 */
class UDGraph extends DiGraph{
  /** 
   *  return indices so arrow can be added
   *  with correct indice in GraphCO
   */
  insertEdge(fi, ti) {
    var is = [fi, ti].sort(); 
    fi = is[0], ti = is[1];
    super.insertEdge(fi, ti);
    return is;
  }

  deleteEdge(fi, ti) {
    var is = [fi, ti].sort(); 
    fi = is[0], ti = is[1];
    super.deleteEdge(fi, ti);
  }

  hasEdge(fi, ti) {
    var is = [fi, ti].sort(); 
    fi = is[0], ti = is[1];
    super.hasEdge(fi, ti);
  }
}


// Graph Canvas object class
// adjacency list is upper edge matrix
// so each entry is
// i: [ ids > i]
class GraphCanvasObject extends LinearCanvasObject {
  constructor(canvasState, x1, y1, x2, y2) {
    super(canvasState, x1, y1, x2, y2);
    this.ids = new Map();

    this.arrows = new EdgeMatrix();

    this.bboxStroke = "#aaaa";
    this.bboxThickness = 2;
    
    GraphCanvasObject.defaultSize = 10;

    this.resizePoint = new ResizePoint(this.cState, this, this.x2, this.y2);
  }

  static defaultCoordinates(cState) {
    var center = cState.getCenter();
    center = {
      x : 100,
      y : 100
    }

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
  
  /** GraphCanvasObject.methodNames
   */
  methodNames() {
    return {
      "addNode": GraphAddNodeCommand,
      "addEdge": GraphAddEdgeCommand,
      "delNode": GraphDeleteNodeCommand,
      "render": GraphRenderCommand,
      "delEdge": GraphDeleteEdgeCommand,
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
    return [this.resizePoint, ...this.nodes, ...Array.from(this.arrows.values())];
  }

  copyAdjacency() {
    return this.graph.copyAdjacency();
  }

  /** GraphCanvasObject.setAdjacency
   *    wrapper for DIGraph.setAdjacency
   *    - update state using deepcopy of other adjacency list 
   */
  setAdjacency(otherAdj) {
    this.graph.setAdjacency(otherAdj);
  }

  /** GraphCanvasObject.clone
   *    clone nodes and update their parent references
   */
  clone(cloneHandle) {
    var copy = super.clone(cloneHandle);

    copy.ids = new Map();
    this.nodes.forEach(node => { 
      // copy node config and coordinates
      var c = node.clone(cloneHandle);
      c.x = node.x;
      c.y = node.y;

      // also set parent reference, 
      // update copy id map and
      // set copied node index
      c.parentObject = copy;
      c.index = node.index;
      copy.ids.set(node.index, c);
    });

    this.arrows.forEach((i, j, arr) => {
      var from = this.ids.get(i);
      var to = this.ids.get(j);

      var cparrow = arr.clone(cloneHandle);
      cparrow.parentObject = copy;
      cparrow.x1 = from.x;
      cparrow.y1 = from.y;
      cparrow.x2 = to.x;
      cparrow.y2 = to.y;

      cparrow.cp1.x = arr.cp1.x;
      cparrow.cp1.y = arr.cp1.y;
      cparrow.cp2.x = arr.cp2.x;
      cparrow.cp2.y = arr.cp2.y;

      copy.arrows.set(i, j, cparrow);
    });

    // do deep copy of adjacency list because values are arrays
    copy.setAdjacency(this.graph.adjacency);

    return copy;
  }

  get nodes() {
    return Array.from(this.graph.adjacency.keys()).map(i => this.ids.get(i));
  }

  /** GraphCanvasObject.getChildren
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

  /** GraphCanvasObject.render
   *    set graph coordinates and straighten all
   *    arrows 
   */
  render() {
    renderGraph(this);
    this.graph.adjacency.forEach((neighbors, i1) => {
      var node1 = this.ids.get(i1);
      var node2;
      neighbors.forEach(i2 => { 
        node2 = this.ids.get(i2);
        var arrow = this.arrows.get(i1, i2);
        node1.lockArrow(arrow, "from");
        node2.lockArrow(arrow, "to");
        arrow.straighten()
      });
    });

  }

  /** GraphCanvasObject.draw
   *    draw edges first (child arrow objects)
   *    and then nodes
   */
  draw() {
    
    this.ctx.beginPath();

    // TODO only render when needed
    // renderGraph(this);

    // draw edges first
    this.graph.adjacency.forEach((neighbors, i1) => {
      var node1 = this.ids.get(i1);
      var node2;
      neighbors.forEach(i2 => { 
        node2 = this.ids.get(i2);

        // skip deleted nodes
        if (! this.graph.adjacency.has(i2)) return;

        var arrow = this.arrows.get(i1, i2);
        node1.lockArrow(arrow, "from");
        node2.lockArrow(arrow, "to");
        arrow.configAndDraw();
      });
    });
    this.ctx.stroke();

    // draw node overtop of edges
    this.nodes.forEach(node => node.configAndDraw());

    // draw bbox
    if (this.active() && this.bboxThickness > 0) {
      this.ctx.beginPath(); // start new path so last node is unaffected
      this.ctx.strokeStyle = this.bboxStroke;
      this.ctx.lineWidth = this.bboxThickness;
      this.ctx.rect(this.x1, this.y1, this.width, this.height);
      this.ctx.stroke();
    }

    this.ctx.beginPath();
    this.resizePoint.configAndDraw();
  }


  /** BEGIN WRAPPER FUNCTIONS FOR GRAPHS  */

  /** Graph.addNode
   *    create a new node, assign unique id, and add it to adjacency list
   */
  addNode(value) {
    var id = this.newIndex();
    var newNode = new GraphNode(this.cState, this, value, id);
    this.ids.set(id, newNode);

    // adjacency maps nodeId-> {neighborIds}
    this.graph.insertNode(id);
    return newNode;
  }

  deleteNode(nodeId) {
    this.graph.deleteNode(nodeId);
  }

  hasEdge(i1, i2) {
    return this.graph.hasEdge(i1, i2);
  }

  /** Graph.addEdge
   *    create an edge between two nodes with indices
   *    and create new arrow object
   */
  addEdge(i1, i2) {
    var fromNode = this.ids.get(i1);
    var toNode = this.ids.get(i2);

    // indices get swapped if using UDGraph
    var inds = this.graph.insertEdge(i1, i2);
    i1 = inds[0]; i2 = inds[1];

    
    this.arrows.set(i1, i2, this.newArrow(fromNode, toNode));
  }

/**   Graph.deleteEdge
   *    delete an edge but first make sure 
   *    it exists   
   *    @param {Int} i1 -- edge comes from i1
   *    @param {Int} i2 -- edge goes to i2
   */
  deleteEdge(i1, i2) {
    this.graph.deleteEdge(i1, i2);
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

    this.resizeBBox(minX, minY, maxX, maxY);
  }

  resizeBBox(x1, y1, x2, y2) {
    this.x1 = x1;
    this.y1 = y1;
    this.x2 = x2;
    this.y2 = y2;
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

// graph canvas object subclasses for undirected
// and directed graphs
class DiGraphCanvasObject extends GraphCanvasObject {
  constructor(canvasState, x1, y1, x2, y2) {
    super(canvasState, x1, y1, x2, y2);
    this.graph = new DiGraph();
  }

  newArrow(fromNode, toNode) {
    return new ChildArrow(this.cState, this,
      fromNode.x, fromNode.y, toNode.x, toNode.y, fromNode, toNode);
  }
}

class UDGraphCanvasObject extends GraphCanvasObject {
  constructor(canvasState, x1, y1, x2, y2) {
    super(canvasState, x1, y1, x2, y2);
    this.graph = new UDGraph();
  }

  newArrow(fromNode, toNode) {
    var arrow = new ChildArrow(this.cState, this,
      fromNode.x, fromNode.y, toNode.x, toNode.y, fromNode, toNode);
    arrow.hasHead = false;
    return arrow;
  }
}


class GraphNode extends NodeObject {
  constructor(canvasState, parentGraph, value, index) {
    super(canvasState, parentGraph, value, index);
    // coordinate is somewhat random at first
    this._x = undefined;
    this._y = undefined;

    this.relX = this.x;
    this.relY = this.y;
  }

  // use getter because 
  // initial x value should be random 
  // but can't be initialized in constructor
  // if it's using parent reference 
  // (when graph is cloned parent reference is updated
  // after call to constructor)
  get x() {
    if (this._x == undefined) 
      this.x = Math.random();
    return this._x;
  }

  get y() {
    if (this._y == undefined) 
      this.y = Math.random();
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
   *  TODO -- generalize -- same method as BSTNodeCanvasObject.draw
   */
  draw() {
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
  drag(deltaX, deltaY) {
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
