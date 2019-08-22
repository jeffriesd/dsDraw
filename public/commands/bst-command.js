


class BSTCommand extends CanvasObjectMethod {

  /** BSTCommand.saveBST
   *    save the state/shape of a BST 
   */
  saveBST() {
    if (this.receiver.bst.root)
      return this.receiver.bst.root.deepCopy();
  }

  /** BSTCommand.restoreBST
   *    restore the state/shape of the BST
   * 
   * @param bstRoot previous state to restore to
   */
  restoreBST(bstRoot) {
    this.receiver.bst.root = bstRoot.deepCopy();

    // extra step here because 
    // deep copy doesn't do this by default 
    // reason: if cloning, the copied nodes get mapped to 
    // the cloned BST
    for (var node of this.receiver.bst.root.inorder())
      this.receiver.bst.ids.set(node.index, node);
  }
}


class BSTInsertCommand extends BSTCommand {
  constructor(receiver, valueNode) {
    super(receiver, valueNode);
    this.oldTree = this.saveBST();
  }

  executeChildren() {
    super.executeChildren();
    this.value = this.args[0];
  }

  checkArguments() {
    if (typeof this.value !== "number")
      throw "BST only supports numeric values";
  }

  executeSelf() {
    if (this.newTree == undefined) {
      this.receiver.insert(this.value);
      this.newTree = this.saveBST();
    }
    this.restoreBST(this.newTree);
  }

  /** BSTInsertCommand.undo
   *    remove inserted node
   */
  undo() {
    this.restoreBST(this.oldTree);
  }
}

class BSTRemoveCommand extends BSTCommand {
  constructor(receiver, valueNode) {
    super(receiver, valueNode);
    this.oldTree = this.saveBST();
  }
  executeChildren() {
    super.executeChildren();
    this.value = this.args[0];
  }

  checkArguments() {
    if (typeof this.value !== "number")
      throw "BST only supports numeric values";
    if (this.receiver.find(this.value) == null)
      throw `Cannot remove '${this.value}': not present in tree.`;
  }

  executeSelf() {
    if (this.newTree == undefined) {
      this.receiver.remove(this.value);
      this.newTree = this.saveBST();
    }
    this.restoreBST(this.newTree);
  }

  undo() {
    this.restoreBST(this.oldTree);
  }

}


class BSTFindCommand extends BSTCommand {
  executeChildren() {
    super.executeChildren();
    this.value = this.args[0];
  }

  checkArguments() {
    if (typeof this.value !== "number")
      throw "BST only supports numeric values";
  }

  executeSelf() {
    return this.receiver.find(this.value);
  }

  undo() {
  }
}

class BSTRangeCommand extends BSTCommand {
  executeChildren() {
    super.executeChildren();
    this.low = this.args[0];
    this.high = this.args[1];
    if (this.low == undefined) this.low = this.receiver.bst.root.getMin().value;
    if (this.high == undefined) this.low = this.receiver.bst.root.getMax().value + 1;
  }
  checkArguments() {
    if (typeof this.low !== "number")
      throw "Invalid lower bound: " + this.low;
    if (typeof this.high !== "number")
      throw "Invalid upper bound: " + this.high;
  }
  executeSelf() {
    return this.receiver.inorder()
      .filter(node => node.value >= this.low && node.value < this.high);
  }
}

/**
 * returns list of BSTNodeCanvasObjects
 */
class BSTInorderCommand extends BSTCommand {
  executeSelf() {
    return this.receiver.inorder();
  }

  undo() {}
}

/**
 * returns list of BSTNodeCanvasObjects
 */
class BSTPreorderCommand extends BSTCommand {
  executeSelf() {
    return this.receiver.preorder();
  }

  undo() {}
}


/**
 * returns list of BSTNodeCanvasObjects
 */
class BSTPostorderCommand extends BSTCommand {
  executeSelf() {
    return this.receiver.postorder();
  }

  undo() {}
}

/** BSTMinCommand
 *    returns reference to min value node
 */
class BSTMinCommand extends BSTCommand {
  executeSelf() {
    return this.receiver.getMin();
  }
}

/** BSTMaxCommand
 *    returns reference to max value node
 */
class BSTMaxCommand extends BSTCommand {
  executeSelf() {
    return this.receiver.getMax();
  }
}


/** BSTRootCommand
 *    returns reference to root node
 */
class BSTRootCommand extends BSTCommand {
  executeSelf() {
    return this.receiver.getRoot();
  }
}

/**
 * BSTNodeCanvasObject methods
 *  - receiver is BSTNodeCanvasObject
 *  - most actions occurr on BSTNode 
 * 
 */
class BSTNodeCanvasObjectCommand extends CanvasObjectMethod {
  constructor(...args) {
    super(...args);
    this.receiverNode = this.receiver.internalNode();
  }
}

class BSTNodeCanvasObjectRotateCommand extends BSTNodeCanvasObjectCommand {
  // rotate self with parent
  executeSelf() {
    if (this.receiverNode.parNode == null) {
      this.undoDir = "none";
    }

    if (this.receiverNode.isLeftChild()) {
      this.undoDir = "left";
      this.receiverNode.rotateRight();
    }

    else {
      this.undoDir = "right";
      this.receiverNode.rotateLeft();
    }
  }

  undo() {
    if (this.undoDir == "left" && this.receiverNode.rightChild())
      this.receiverNode.rightChild().rotateLeft();
    else if (this.undoDir == "right" && this.receiverNode.leftChild())
      this.receiverNode.leftChild().rotateRight();
  }
}

class BSTNodeCanvasObjectLeftCommand extends BSTNodeCanvasObjectCommand {
  executeSelf() {
    return this.receiver.leftChild();
  }
}

class BSTNodeCanvasObjectRightCommand extends BSTNodeCanvasObjectCommand {
  executeSelf() {
    return this.receiver.rightChild();
  }
}

class BSTNodeCanvasObjectParentCommand extends BSTNodeCanvasObjectCommand {
  executeSelf() {
    return this.receiver.getParNode();
  }
}

class BSTNodeCanvasObjectPredecessorCommand extends BSTNodeCanvasObjectCommand {
  executeSelf() {
    return this.receiver.pred();
  }
}

class BSTNodeCanvasObjectSuccessorCommand extends BSTNodeCanvasObjectCommand {
  executeSelf() {
    return this.receiver.succ();
  }
}

class BSTNodeCanvasObjectValueCommand extends BSTNodeCanvasObjectCommand {
  executeSelf() {
    return this.receiver.value;
  }
}


