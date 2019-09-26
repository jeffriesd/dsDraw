/** LinkedList commands
 */

class LinkedListCommand extends CanvasObjectMethod {
  checkIndices(...indices) {
    indices.forEach(i => {
      if (! (this.receiver.list.hasEquiv(i))) {
        this.argsError(`Invalid index: ${i}.`);
      }
    });
  }

  saveState() {
    return {
      previousList : new Map(this.receiver.list),
      previousArrows : new Map(this.receiver.arrows),
    }
  }

  restoreState(state) {
    this.receiver.list = new Map(state.previousList);
    this.receiver.arrows = new Map(state.previousArrows);
  }
}

class LinkedListInsertCommand extends LinkedListCommand {

  getChildValues() {
     
    this.fromIndex = this.args[0];
    this.value = this.args[1];
  }

  checkArguments() {
    this.checkIndices(this.fromIndex);
    if (isNaN(Number(this.value)))
      this.argsError("Invalid value for linked list:" + this.value);
  }

  executeSelf() {
    this.fromNode = this.receiver.list.get(this.fromIndex);
    // addNode creates new node and new edge
    this.newNode = this.receiver.addNode(this.fromNode, this.value);
  }

  // undoSelf() {
  //   // remove node and newly created edge
  //   this.receiver.removeNode(this.newNode);
  // }

}

class LinkedListLinkCommand extends LinkedListCommand {

  getChildValues() {
     
    this.fromIndex = this.args[0];
    this.toIndex = this.args[1];
  }

  checkArguments() {
    this.checkIndices(this.fromIndex, this.toIndex);
  }

  executeSelf() {
    if (this.newState == undefined) {
    this.fromNode = this.receiver.list.get(this.fromIndex);
    this.toNode = this.receiver.list.get(this.toIndex);
    this.receiver.addEdge(this.fromNode, this.toNode);
    this.newState = this.saveState();
    }
    else this.restoreState(this.newState);
  }

  // undoSelf() {
  //   this.receiver.removeEdge(this.fromNode, this.toNode);
  // }
}

class LinkedListCutCommand extends LinkedListCommand {

  getChildValues() {
     
    this.fromIndex = this.args[0];
    this.toIndex = this.args[1];
  }

  checkArguments() {
    this.checkIndices(this.fromIndex, this.toIndex);
  }

  executeSelf() {
    this.fromNode = this.receiver.list.get(this.fromIndex);
    this.toNode = this.receiver.list.get(this.toIndex);
    this.edge = this.receiver.removeEdge(this.fromNode, this.toNode);
  }

  /** LinkedListCutCommand.undo 
   *    restore cut edge in arrows map
   */
  // undoSelf() {
  //   this.receiver.arrows.set([this.fromIndex, this.toIndex], this.edge);
  // }
}

class LinkedListRemoveCommand extends LinkedListCommand {
  constructor(receiver, removeIdx) {
    super(receiver, removeIdx);
    this.node = null;
  }

  getChildValues() {
     
    this.removeIndex = this.args[0];
  }

  checkArguments() {
    this.checkIndices(this.removeIndex);
  }

  executeSelf() {
    // if (this.node == null) {
    //   this.node = this.receiver.list.get(this.removeIndex);
    // }
    if (this.newState == undefined) {
      this.receiver.list.delete(this.removeIndex);
      this.newState = this.saveState();
    }
    else this.restoreState(this.newState);
  }

  // undoSelf() {
  //   this.receiver.list.set(this.removeIndex, this.node);
  // }
}
