/** Graph Command  */
class GraphCommand extends CanvasObjectMethod {
  constructor(receiver, ...args) {
    super(receiver, ...args);
    this.oldAdj = this.receiver.copyAdjacency();
    this.oldArrowCoords = this.saveArrows();
    this.oldCoords = this.saveCoords();
  }

  /** GraphCommand.undo
   *    by default, restore adjacency list and coordinates
   */
  // undoSelf() {
  //   this.receiver.setAdjacency(this.oldAdj);
  //   this.restoreCoords(this.oldCoords);
  //   this.restoreArrows(this.oldArrowCoords);
  // }

  saveState() {
    return {
      adj : this.receiver.copyAdjacency(),
      arrowCoords : this.saveArrows(),
      coords : this.saveCoords(),
    };
  }

  restoreState(state) {
    this.receiver.setAdjacency(state.adj);
    this.restoreArrows(state.arrowCoords);
    this.restoreCoords(state.coords);
  }

  /** saveGraphCoords
   *    save graph coordinates for restoring
   *    graph shape pre-render 
   * 
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
  }

  saveArrows() {
    var arrCoords = new EdgeMatrix();
    this.receiver.arrows.forEach((i, j, arrow) => {  
      arrCoords.set(i, j, {
        cp1: {
          x: arrow.cp1.x,
          y: arrow.cp1.y,
        },
        cp2: {
          x: arrow.cp2.x,
          y: arrow.cp2.y,
        }
      });
    });
    return arrCoords;
  }

  restoreArrows(arrCoords) {
    arrCoords.forEach((i, j, coords) => {
      var arr = this.receiver.arrows.get(i, j);
      arr.cp1.x = coords.cp1.x;
      arr.cp1.y = coords.cp1.y;
      arr.cp2.x = coords.cp2.x;
      arr.cp2.y = coords.cp2.y;
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
      this.newAdj = this.receiver.copyAdjacency();
    }
    else
      this.receiver.setAdjacency(this.newAdj);
  }

  maybeRender() {
    if (this.newCoords == undefined) {
      this.receiver.render();
      this.newCoords = this.saveCoords();
      this.newArrowCoords = this.saveArrows();
    }
    this.restoreCoords(this.newCoords);
    this.restoreArrows(this.newArrowCoords);
  }

  checkNodeId(nid) {
    if (! this.receiver.graph.adjacency.has(nid)) 
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

  getChildValues() {
    this.iterations = this.args[0];
  }

  checkArguments() {
    if (this.iterations > 10000) 
      this.argsError("A maximum of 10,000 iterations is allowed");
  }

  executeSelf() {
    this.maybeRender();
  }

  saveState() {
    return {
      arrowCoords : this.saveArrows(),
      coords : this.saveCoords(),
    };
  }

  restoreState(state) {
    this.restoreArrows(state.arrowCoords);
    this.restoreCoords(state.coords);
  }
}


class GraphDeleteNodeCommand extends GraphCommand {

  usage() {
    return "g.delNode(nodeId)";
  }

  precheckArguments() {
    this.checkArgsLength(1);
  }

  getChildValues() {
     
    this.nodeId = this.args[0];
  }

  checkArguments() {
    this.checkNodeId(this.nodeId);
  }

  executeSelf() {
    this.maybeUpdateAdj(() => {
      this.receiver.deleteNode(this.nodeId);
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

  getChildValues() {
     
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
   */
  getChildValues() {
     
    this.fromId = this.args[0];
    this.toId = this.args[1];
  }

  checkArguments() {
    // self edges not allowed
    if (this.fromId == this.toId)
      throw "Self edges not allowed"

    // check that both nodes exist
    this.checkNodeId(this.fromId);
    this.checkNodeId(this.toId);

    // check that edge doesn't exist already
    if (this.receiver.hasEdge(this.fromId, this.toId))
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

  getChildValues() {
     
    this.fromId = this.args[0];
    this.toId = this.args[1];
  }

  checkArguments() {
    // self edges not allowed
    if (this.fromId == this.toId)
      throw "Self edges not allowed"

    // check that both nodes exist
    this.checkNodeId(this.fromId);
    this.checkNodeId(this.toId);

    // check that edge doesn't exist already
    if (! this.receiver.hasEdge(this.fromId, this.toId))
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


class GraphNodeCommand extends CanvasObjectMethod {
  getOutgoing() {
    var graphCO = this.receiver.getParent();
    var graph = graphCO.graph;
    var ids = Array.from(graph.adjacency.get(this.receiver.index));
    return ids.map(id => graphCO.ids.get(id));
  }

  getIncoming() {
    var graphCO = this.receiver.getParent();
    var graph = graphCO.graph;
    var incoming = [];
    graph.adjacency.forEach((neighbors, idx) => {
      if (neighbors.has(this.receiver.index)) incoming.push(idx);
    });
    return incoming.map(id => graphCO.ids.get(id));
  }
}

class GraphNodeIncomingCommand extends GraphNodeCommand {

  precheckArguments() {
    this.checkArgsLength(0);
  }

  executeSelf() {
    var graphCO = this.receiver.getParent();
    if (graphCO instanceof DiGraphCanvasObject)
      return super.getIncoming();
    return super.getIncoming().concat(super.getOutgoing());
  }
}

class GraphNodeOutgoingCommand extends GraphNodeCommand {

  precheckArguments() {
    this.checkArgsLength(0);
  }

  executeSelf() {
    var graphCO = this.receiver.getParent();
    if (graphCO instanceof DiGraphCanvasObject)
      return super.getOutgoing();
    return super.getIncoming().concat(super.getOutgoing());
  }
}