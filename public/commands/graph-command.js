
/** Graph Command  */
class GraphCommand extends CanvasObjectMethod {
}

/** saveGraphCoords
 *    save graph coordinates for restoring
 *    graph shape pre-render 
 * 
 *    @param {Graph} g 
 *    @returns Map {nodeId : Int -> {x : Float, y : Float}}
 */
function saveGraphCoords(g) {
  var coords = new Map();
  g.nodes.forEach(node => {
    coords.set(node.index, { x: node.x, y: node.y });
  });
  return coords;
}


/** restoreGraphCoords
 *    restore node coordinates in place
 * 
 *    @param {Graph} g 
 *    @param {Map{Int, {Int, Int}}} coords
 */
function restoreGraphCoords(g, coords) {
  var c;
  g.nodes.forEach(node => {
    c = coords.get(node.index);
    node.x = c.x;
    node.y = c.y;
  });
}

class GraphDeleteNodeCommand extends GraphCommand {
  constructor(receiver, nodeId) {
    super(receiver, nodeId);
    // save adjacency
    this.savedAdj = new Map();
    receiver.adjacency.forEach((adj, nid) => {
      this.savedAdj.set(nid, adj.slice());
    });
    this.coords = saveGraphCoords(this.receiver);
    this.newCoords = undefined;
  }

  executeChildren() {
    super.executeChildren();
    this.nodeId = this.args[0];
  }

  checkArguments() {
    if (! this.receiver.adjacency.has(this.nodeId)) 
      throw `No node with id ${this.nodeId}`;
  }

  executeSelf() {
    // save coords from render first time
    if (this.newCoords == undefined) {
      renderGraph(this.receiver);
      this.newCoords = saveGraphCoords(this.receiver);
    }
    else {
      restoreGraphCoords(this.receiver, this.newCoords);
    }

    this.receiver.adjacency.delete(this.nodeId);
    this.receiver.adjacency.forEach((adj, nid) => {
      adj = Array.from(adj.filter(x => x != this.nodeId));
    });
  }

  /** GraphDeleteNodeCommand.undo
   *    restore state of adjacency list
   */
  undo() {
    this.receiver.adjacency = new Map();
    this.savedAdj.forEach((adj, nid) => {
      this.receiver.adjacency.set(nid, adj.slice());
    });
    restoreGraphCoords(this.receiver, this.coords);
  }
}

class GraphRenderCommand extends GraphCommand {
  constructor(receiver, iterations) {
    super(receiver, iterations);
    // save node positions
    this.coords = saveGraphCoords(receiver);
  }

  executeChildren() {
    super.executeChildren();
    this.iterations = this.args[0];
  }

  checkArguments() {
    if (this.iterations > 10000) 
      throw "A maximum of 10,000 iterations is allowed"
  }

  executeSelf() {
    if (this.newCoords == undefined) {
      renderGraph(this.receiver, this.iterations);
      this.newCoords = saveGraphCoords(this.receiver);
    }
  }

  undo() {
    restoreGraphCoords(this.receiver, this.coords);
  }

}
