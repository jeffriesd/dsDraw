/** Graph Command  */
class GraphCommand extends CanvasObjectMethod {
  constructor(receiver, ...args) {
    super(receiver, ...args);
    this.oldAdj = this.saveAdj();
    this.oldCoords = this.saveCoords();
  }

  /** GraphCommand.undo
   *    by default, restore adjacency list and coordinates
   */
  undo() {
    this.restoreAdj(this.oldAdj);
    this.restoreCoords(this.oldCoords);
  }

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
    this.receiver.adjacency.forEach((neighbors, nid) => {
      savedAdj.set(nid, new Set(neighbors));
    });
    return savedAdj;
  }

  restoreAdj(adj) {
    this.receiver.adjacency = new Map();
    adj.forEach((neighbors, nid) => {
      this.receiver.adjacency.set(nid, new Set(neighbors));
    });
  }

  /** GraphCommand.maybeUpdateAdj
   * 
   * @param {() -> _} cb is a callback that should do something 
   *      like deleting or adding a node before the adjacency
   *      list state is saved.
   */
  maybeUpdateAdj(cb) {
    if (this.newAdj == undefined) {
      cb();
      this.newAdj = this.saveAdj();
    }
    else
      this.restoreAdj(this.newAdj);
  }

  maybeRender() {
    if (this.newCoords == undefined) {
      renderGraph(this.receiver);
      this.newCoords = this.saveCoords();
    }
    this.restoreCoords(this.newCoords);
  }

  checkNodeId(nid) {
    if (! this.receiver.adjacency.has(nid)) 
      this.argsError(`No node with id ${nid}`);
  }
}

class GraphRenderCommand extends GraphCommand {

  usage() {
    return "g.render(); g.render(numIterations)";
  }

  precheckArguments() {
    this.checkArgsLength(0, 1);
  }

  executeChildren() {
    super.executeChildren();
    this.iterations = this.args[0];
  }

  checkArguments() {
    if (this.iterations > 10000) 
      this.argsError("A maximum of 10,000 iterations is allowed");
  }

  executeSelf() {
    this.maybeRender();
  }

  // only restore coordinates
  undo() {
    this.restoreCoords(this.oldCoords);
  }
}


class GraphDeleteNodeCommand extends GraphCommand {

  usage() {
    return "g.delNode(nodeId)";
  }

  precheckArguments() {
    this.checkArgsLength(1);
  }

  executeChildren() {
    super.executeChildren();
    this.nodeId = this.args[0];
  }

  checkArguments() {
    this.checkNodeId(this.nodeId);
  }

  executeSelf() {
    this.maybeUpdateAdj(() => {
      this.receiver.adjacency.delete(this.nodeId);
      this.receiver.adjacency.forEach((neighbors, id) => {
        neighbors.delete(this.nodeId);
      });
    });

    // save coords from render first time
    this.maybeRender();
  }
}

class GraphAddNodeCommand extends GraphCommand {
  usage() {
    return "g.addNode(nodeValue)";
  }

  precheckArguments() {
    this.checkArgsLength(1);
  }

  executeChildren() {
    super.executeChildren();
    this.nodeValue = this.args[0];
  }

  executeSelf() {
    this.maybeUpdateAdj(() => this.receiver.addNode(this.nodeValue));
    this.maybeRender();
  }
}

class GraphAddEdgeCommand extends GraphCommand {

  usage() {
    return "g.addEdge(fromId, toId)";
  }

  precheckArguments() {
    this.checkArgsLength(2);
  }

  /** GraphAddEdgeCommand
   *    use upper triangular edge-order for undirected graph
   */
  executeChildren() {
    super.executeChildren();
    this.fromId = this.args[0];
    this.toId = this.args[1];

    if (this.fromId > this.toId) {
      var t = this.fromId;
      this.fromId = this.toId;
      this.toId = t;
    }
  }

  checkArguments() {
    // self edges not allowed
    if (this.fromId == this.toId)
      throw "Self edges not allowed"

    // check that both nodes exist
    this.checkNodeId(this.fromId);
    this.checkNodeId(this.toId);

    // check that edge doesn't exist already
    var fromAdj = this.receiver.adjacency.get(this.fromId);
    if (fromAdj.has(this.toId))
      this.argsError(`Edge (${this.fromId}, ${this.toId}) already exists"`);
  }

  executeSelf() {
    this.maybeUpdateAdj(() => {
      this.receiver.addEdge(this.fromId, this.toId);
    });
    this.maybeRender();
  }

}

class GraphDeleteEdgeCommand extends GraphCommand {
  usage() {
    return "g.delEdge(fromId, toId)";
  }

  precheckArguments() {
    this.checkArgsLength(2);
  }

  executeChildren() {
    super.executeChildren();
    this.fromId = this.args[0];
    this.toId = this.args[1];

    if (this.fromId > this.toId) {
      var t = this.fromId;
      this.fromId = this.toId;
      this.toId = t;
    }
  }

  checkArguments() {
    // self edges not allowed
    if (this.fromId == this.toId)
      throw "Self edges not allowed"

    // check that both nodes exist
    this.checkNodeId(this.fromId);
    this.checkNodeId(this.toId);

    // check that edge doesn't exist already
    var fromAdj = this.receiver.adjacency.get(this.fromId);
    if (! fromAdj.has(this.toId))
      this.argsError(`Edge (${this.fromId}, ${this.toId}) doesn't exist`);
  }

  /** GraphDeleteEdgeCommand.executeSelf
   *    remove edge from adjacency list of 
   */
  executeSelf() {
    this.maybeUpdateAdj(() => {
      this.receiver.deleteEdge(this.fromId, this.toId);
    });
  }
}
