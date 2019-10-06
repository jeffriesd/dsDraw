class BinaryHeapInsertCommand extends BinaryHeapCommand {
  constructor(receiver, valueNode) {
    super(receiver, valueNode);
    this.oldHeap = this.receiver.heapArray.slice();
    this.oldHeap = this.oldHeap.map(node => {
      node = node.clone();
      node.parentObject = this.receiver;
      return node;
    });
  }

  getChildValues() {
     
    this.value = this.args[0];
  }

  checkArguments() {
    if (typeof this.value !== "number")
      throw "BinaryHeap only support numeric values";
  }

  executeSelf() {
    if (this.newHeap == undefined) {
      this.receiver.insert(this.value);
      this.newHeap = this.receiver.heapArray.slice();
    }
    this.receiver.heapArray = this.newHeap.slice();
  }

  // undoSelf() {
  //   this.receiver.heapArray = this.oldHeap.slice();
  // }

  saveState() {
    return {
      previousHeap : this.receiver.heapArray.slice(),
    }
  }

  restoreState(state) {
    this.receiver.heapArray = state.previousHeap.slice();
  }
}

class BinaryHeapPopCommand extends BinaryHeapCommand {
  constructor(receiver) {
    super(receiver);
    this.oldHeap = this.receiver.heapArray.slice();
    this.oldHeap = this.oldHeap.map(node => {
      node = node.clone();
      node.parentObject = this.receiver;
      return node;
    });
  }

  executeSelf() {
    if (this.newHeap == undefined) {
      this.popped = this.receiver.removeRoot();
      this.newHeap = this.receiver.heapArray.slice();
    }
    this.receiver.heapArray = this.newHeap.slice();
    return this.popped;
  }

  // undoSelf() {
  //   this.receiver.heapArray = this.oldHeap.slice();
  // }

  saveState() {
    return {
      previousHeap : this.receiver.heapArray.slice(),
    }
  }

  restoreState(state) {
    this.receiver.heapArray = state.previousHeap.slice();
  }
}

class BinaryHeapFindCommand extends BinaryHeapCommand {
  getChildValues() {
     
    this.value = this.args[0];
  }
  executeSelf() {
    return this.receiver.find(this.value);
  }
}

class BinaryHeapRootCommand extends BinaryHeapCommand {
  executeSelf() {
    return this.receiver.root;
  }
}

class BinaryHeapRangeCommand extends BinaryHeapCommand {
  getChildValues() {
     
    this.low = this.args[0];
    this.high = this.args[1];
    if (this.low == undefined) this.low = this.receiver.getMin();
    if (this.high == undefined) this.low = this.receiver.getMax() + 1;
  }
  checkArguments() {
    if (typeof this.low !== "number")
      throw "Invalid lower bound: " + this.low;
    if (typeof this.high !== "number")
      throw "Invalid upper bound: " + this.high;
  }
  executeSelf() {
    return this.receiver.heapArray
      .filter(node => node.value >= this.low && node.value < this.high);
  }
}


class BinaryHeapDecreaseKeyCommand extends BinaryHeapCommand {
  constructor(receiver, heapNodeOpNode, newKeyNode) {
    super(receiver, heapNodeOpNode, newKeyNode);
    this.oldHeap = this.receiver.heapArray.slice();
    this.oldHeap = this.oldHeap.map(node => {
      node = node.clone();
      node.parentObject = this.receiver;
      return node;
    });
  }

  getChildValues() {
    this.receiverIndex = this.args[0];
    this.newKey = this.args[1];
  }

  checkArguments() {
    this.receiverNode = this.receiver.ids.get(this.receiverIndex);
    if (this.receiverNode == null)
      throw `Cannot decrease key of unknown BinaryHeapNode ${this.receiverIndex}`;
  }

  executeSelf() {
    if (this.newHeap == undefined) {
      this.receiver.decreaseKey(this.receiverNode, this.newKey);
      this.newHeap = this.receiver.heapArray.slice();
    }
    this.receiver.heapArray = this.newHeap.slice();
  }

  undo () {
    this.receiver.heapArray = this.oldHeap.slice();
  }
}

class BinaryHeapNodeCommand extends CanvasObjectMethod {
}

class BinaryHeapNodeValueCommand extends BinaryHeapNodeCommand {
  executeSelf() {
    return this.receiver.value;
  }
}