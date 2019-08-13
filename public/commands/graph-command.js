
/** Graph Command  */
class GraphCommand extends CanvasObjectMethod {

/** saveGraphCoords
 *    save graph coordinates for restoring
 *    graph shape pre-render 
 *    @returns Map {nodeId : Int -> {x : Float, y : Float}}
 */
  saveCoords() {
    var coords = new Map();
    this.receiver.nodes.forEach(node => {
      coords.set(node.index, { x: node.x, y: node.y });
    });
    return coords;
  }

  restoreCoords(coords) {
    var c;
    this.receiver.nodes.forEach(node => {
      c = coords.get(node.index);
      node.x = c.x;
      node.y = c.y;
    });
    this.receiver.snapBoundingBox();
  }


/** saveAdj
 *    deepcopy current adjacency list
 *    @returns Map {nodeId : Int -> [nodeId] : [Int]}
 */
  saveAdj() {
    var savedAdj = new Map();
    this.receiver.adjacency.forEach((adj, nid) => {
      savedAdj.set(nid, adj.slice());
    });
    return savedAdj;
  }

  restoreAdj(adj) {
    this.receiver.adjacency = new Map();
    adj.forEach((neighbors, nid) => {
      this.receiver.adjacency.set(nid, neighbors.slice());
    });
  }

  maybeRender() {
    if (this.newCoords == undefined) {
      renderGraph(this.receiver);
      this.newCoords = this.saveCoords();
    }
    this.restoreCoords(this.newCoords);
  }
}

class GraphDeleteNodeCommand extends GraphCommand {
  constructor(receiver, nodeId) {
    super(receiver, nodeId);
    // save adjacency
    this.oldAdj = this.saveAdj();

    this.oldCoords = this.saveCoords();
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
    if (this.newAdj == undefined) {
      this.receiver.adjacency.delete(this.nodeId);
      this.receiver.adjacency.forEach((adj, id) => {
        adj = Array.from(adj.filter(x => x != this.nodeId));
        this.receiver.adjacency.set(id, adj);
      });
      this.newAdj = this.saveAdj();
      console.log("removed ", this.nodeId, this.receiver.adjacency);
    }
    else
      this.restoreAdj(this.newAdj);

    // save coords from render first time
    this.maybeRender();
  }

  /** GraphDeleteNodeCommand.undo
   *    restore state of adjacency list
   */
  undo() {
    this.restoreAdj(this.oldAdj);
    this.restoreCoords(this.oldCoords);
  }
}

class GraphRenderCommand extends GraphCommand {
  constructor(receiver, iterations) {
    super(receiver, iterations);
    // save node positions
    this.oldCoords = this.saveCoords();
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
    this.maybeRender();
  }

  undo() {
    this.restoreCoords(this.oldCoords);
  }

}

class GraphAddNodeCommand extends GraphCommand {


}
