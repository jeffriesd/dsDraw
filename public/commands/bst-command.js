


class BSTCommand extends CanvasObjectMethod {

  /** BSTCommand.saveState
   *    save the state/shape of a BST 
   */
  saveState() {
    if (this.receiver.bst.root)
      return { bst : this.receiver.bst.root.deepCopy() };
    return { bst : null };
  }

  /** BSTCommand.restoreState
   *    restore the state/shape of the BST
   * 
   * @param bstRoot previous state to restore to
   */
  restoreState(state) {

    if (state.bst == null) {
      this.receiver.bst.root = null;
      return;
    }
    this.receiver.bst.root = state.bst.deepCopy();

    // extra step here because 
    // deep copy doesn't do this by default 
    // reason: if cloning, the copied nodes get mapped to 
    // the cloned BST
    for (var node of this.receiver.bst.root.inorder()) 
      this.receiver.bst.ids.set(node.index, node);

    // for some reason, this has the
    // side effect of making the save/restore
    // work properly -- otherwise 
    // the bst doesn't get updated properly
    // when redoing the remove command. 
    this.receiver.inorder();
  }
}


class BSTInsertCommand extends BSTCommand {
  getChildValues() {
    this.value = this.args[0];
  }

  checkArguments() {
    if (typeof this.value !== "number")
      throw "BST only supports numeric values";
  }

  executeSelf() {
    if (this.newTree == undefined) {
      this.receiver.insert(this.value);
      this.newTree = this.saveState();
    }
    this.restoreState(this.newTree);
  }

  /** BSTInsertCommand.undo
   *    remove inserted node
   */
  // undoSelf() {
  //   this.restoreState(this.oldTree);
  // }
}

class BSTRemoveCommand extends BSTCommand {

  getChildValues() {
    this.value = this.args[0];
  }

  checkArguments() {
    if (typeof this.value !== "number")
      throw "BST only supports numeric values";
    if (this.receiver.find(this.value) == null)
      throw `Cannot remove '${this.value}': not present in tree: ${this.receiver.inorder().map(n => n.value)}`;
  }

  executeSelf() {
    if (this.newTree == undefined) {
      this.receiver.remove(this.value);
      this.newTree = this.saveState();

      this.newTree.deleted = this.value;
    }
    this.restoreState(this.newTree);
  }
}


class BSTFindCommand extends BSTCommand {
  getChildValues() {
    this.value = this.args[0];
  }

  checkArguments() {
    if (typeof this.value !== "number")
      throw "BST only supports numeric values";
  }

  executeSelf() {
    return this.receiver.find(this.value);
  }

  saveState() {}
  restoreState() {}

  // undoSelf() {
  // }
}

class BSTRangeCommand extends BSTCommand {
  getChildValues() {
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

  saveState() {}
  restoreState() {}
}

/**
 * returns list of BSTNodeCanvasObjects
 */
class BSTInorderCommand extends BSTCommand {
  executeSelf() {
    return this.receiver.inorder();
  }
  saveState() {}
  restoreState() {}
}

/**
 * returns list of BSTNodeCanvasObjects
 */
class BSTPreorderCommand extends BSTCommand {
  executeSelf() {
    return this.receiver.preorder();
  }
  saveState() {}
  restoreState() {}
}


/**
 * returns list of BSTNodeCanvasObjects
 */
class BSTPostorderCommand extends BSTCommand {
  executeSelf() {
    return this.receiver.postorder();
  }
  saveState() {}
  restoreState() {}
}

/** BSTMinCommand
 *    returns reference to min value node
 */
class BSTMinCommand extends BSTCommand {
  executeSelf() {
    return this.receiver.getMin();
  }
  saveState() {}
  restoreState() {}
}

/** BSTMaxCommand
 *    returns reference to max value node
 */
class BSTMaxCommand extends BSTCommand {
  executeSelf() {
    return this.receiver.getMax();
  }
  saveState() {}
  restoreState() {}
}


/** BSTRootCommand
 *    returns reference to root node
 */
class BSTRootCommand extends BSTCommand {
  executeSelf() {
    return this.receiver.getRoot();
  }
  saveState() {}
  restoreState() {}
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
    if (this.newState) return this.restoreState(this.newState);

    if (this.receiverNode.parNode == null) 
      this.undoDir = "none";

    if (this.receiverNode.isLeftChild()) {
      this.undoDir = "left";
      this.receiverNode.rotateRight();
    }

    else {
      this.undoDir = "right";
      this.receiverNode.rotateLeft();
    }
    if (this.newState == undefined) this.newState = this.saveState();
  }

  saveState() {
    return { 
      bst : this.receiver.getParent().bst.root.deepCopy() 
    };
  }

  restoreState(state) {
    this.receiver.getParent().bst.root = state.bst.deepCopy();

    // extra step here because 
    // deep copy doesn't do this by default 
    // reason: if cloning, the copied nodes get mapped to 
    // the cloned BST
    for (var node of this.receiver.getParent().bst.root.inorder()) 
      this.receiver.getParent().bst.ids.set(node.index, node);
  }

  // undoSelf() {
  //   if (this.undoDir == "left" && this.receiverNode.rightChild())
  //     this.receiverNode.rightChild().rotateLeft();
  //   else if (this.undoDir == "right" && this.receiverNode.leftChild())
  //     this.receiverNode.leftChild().rotateRight();
  // }
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


