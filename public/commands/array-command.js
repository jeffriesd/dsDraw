
class Array1DCommand extends CanvasObjectMethod {

  checkIndices(...indices) {
    var len = this.receiver.array.length;
    
    indices.forEach(i => {
      if (i >= len || i < 0 || isNaN(Number(i)))
        this.argsError(`Invalid index: '${i}'`);
    });
  }

  saveState() {
    return { 
      prevArray : this.receiver.array.slice()
    };
  }

  restoreState(state) {
    this.receiver.array = state.prevArray.slice();
  }

}

class Array1DLengthCommand extends Array1DCommand {
  precheckArguments() {
    this.checkArgsLength(0);
  }

  executeSelf() {
    return this.receiver.array.length; 
  }
}

/** Array1DResizeCommand
 *    resize array to new length. Length must be > 0.
 *    Previous array is saved for undo method.
 *    If array is lengthened, random values are inserted.
 *
 *    When array is truncated, check to see if any arcs should 
 *    also be destroyed.
 */
class Array1DResizeCommand extends Array1DCommand {
  constructor(receiver, newLength) {
    super(receiver, newLength);
    // save old array for undo
    this.prevArray = this.receiver.array.slice();
    this.prevArrows = new Map();

    this.newValues = null;
  }

  precheckArguments() {
    this.checkArgsLength(1);
  }
  
  getChildValues() {
    this.newLength = this.args[0];

    if (typeof this.newLength != "number")
      this.argsError("Array.resize argument must be number");
  }

  checkArguments() {
    if (this.newLength < 1)
      this.argsError(`Invalid array length: ${this.newLength}`);
  }

  executeSelf() {
    var startLength = this.receiver.array.length;

    var newValues = [];
    for (var i = startLength; i < this.newLength; i++) {
      // save values for redo
      if (this.newValues == null)
        newValues.push(this.receiver.append("random"));
      else 
        this.receiver.append(this.newValues[i - startLength]);
    }
    if (newValues.length) this.newValues = newValues;

    // make array smaller
    if (this.newLength < startLength) {
      this.receiver.array = this.receiver.array.slice(0, this.newLength); 
       
    }
  }

  // undoSelf() {
  //   this.receiver.array = this.prevArray.slice();
  // }
}

class Array1DSwapCommand extends Array1DCommand {

  precheckArguments() {
    this.checkArgsLength(2);
  }
  getChildValues() {
    this.i1 = this.args[0];
    this.i2 = this.args[1]; 
  }

  checkArguments() {
    this.checkIndices(this.i1, this.i2);
  }

  executeSelf() {
    var t = this.receiver.array[this.i1];
    this.receiver.array[this.i1] = this.receiver.array[this.i2];
    this.receiver.array[this.i2] = t;
  }

  usage() {
    return "array.swap [index1] [index2]";
  }
}


/** Array1DCopyCommand
 *    copy contents (values) of this array to another
 *
 *    syntax:
 *
 *    arr.copy [label of dest array] [num elements] [source index] [dest index]
 *
 *    defaults:
 *    numCopy - length of src array
 *    srcIndex - 0 
 *    destIndex - 0
 *
 */
class Array1DCopyCommand extends Array1DCommand {
  constructor(receiver, destArr, numCopy, srcIndex, destIndex) {
    super(receiver, destArr, numCopy, srcIndex, destIndex);
    // save values for undo
    this.savedValues = null;
  }

  precheckArguments() {
    this.checkArgsLength(1, 4);
  }
  
  getChildValues() {
    this.destArr = this.args[0];
    this.numCopy = this.args[1];
    this.srcStart = this.args[2];
    this.destStart = this.args[3];

    // default parameters
    if (this.numCopy == undefined)
      this.numCopy = this.receiver.array.length;
    if (this.srcStart == undefined)
      this.srcStart = 0;
    else this.srcStart = this.srcStart;
    if (this.destStart == undefined)
      this.destStart = 0;
    else this.destStart = this.destStart;
  }

  checkArguments() {
    if (! (this.destArr instanceof Array1D))
      this.argsError(`'${this.args[0]}' is not an array.`);
    if (this.destStart < 0 || this.destStart >= this.destArr.array.length)
      this.argsError(`Invalid index: ${this.destStart}`);

    // calculate upper bounds
    this.srcEnd =
      Math.min(this.srcStart + this.numCopy - 1, this.receiver.array.length - 1);
    this.destEnd = 
      Math.min(this.destStart + this.numCopy - 1, this.destArr.array.length - 1);

    this.checkIndices(this.srcStart, this.srcEnd);
  }

  /** Array1DCopyCommand.execute
   *    iterate through each array and copy values
   *    as long as both arrays have remaining elements
   */
  executeSelf() {
    if (this.savedValues == null) {
      this.savedValues = 
        this.destArr.getChildren(this.srcStart, this.srcEnd).map((x) => x.value);
    }

    var si = this.srcStart, di = this.destStart;
    for (; si <= this.srcEnd && di <= this.destEnd; si++, di++)
      this.destArr.array[di].value = this.receiver.array[si].value; 
  }

  saveState() {
    return { 
      prevValues: this.destArr.array.slice().map(x => x.value),
    }
  }

  restoreState(state) {
    state.prevValues.forEach((v, i) => this.destArr.array[i].value = v);
  }

  usage() {
    return "array.copy(destArr, [numCopy = array.length()], [srcIndex = 0], [dstIndex = 0])";
  }

}

class Array1DSortCommand extends Array1DCommand {
  constructor(receiver) {
    super(receiver);
    // save state for undo 
    this.savedArray = this.receiver.array.slice(); 
  }

  precheckArguments() {
    this.checkArgsLength(0);
  }

  executeSelf() {
    this.receiver.array = this.receiver.array.sort(
      (a, b) => a.value > b.value
    );
  }

  // undoSelf() {
  //   this.receiver.array = this.savedArray.slice();
  // }

  saveState() {
    return {
      prevArray: this.receiver.array.slice(),
    }
  }

  restoreState(state) {
    this.receiver.array = state.prevArray.slice();
  }
}


/** 
 *  Possible updates to array:
 *    - values reassigned (copy, swap, sort, etc.)
 *    - resize (resize, copy, etc.)
 */
class Array1DGetTreeCommand extends Array1DCommand {
  constructor(receiver) {
    super(receiver);
  }

  precheckArguments() {
    this.checkArgsLength(0);
  }

  /** Array1DTreeCommand
   *    return tree that sits on top of this array
   */
  executeSelf() {
    return this.receiver.tree;
  }
}

class ArrayTreeRootCommand extends Array1DCommand {
  precheckArguments() { this.checkArgsLength(0); }
  executeSelf() {
    if (this.receiver.levels.length == 0) return null;
    return this.receiver.levels[this.receiver.levels.length - 1][0];
  }
}

class ArrayTreeNodeLeftCommand extends Array1DCommand {
  precheckArguments() { this.checkArgsLength(0); }
  executeSelf() {
    // next level index
    var nli = this.receiver.levelNumber - 1;
    var li = this.receiver.levelIndex * 2;

    // down to leaves
    if (nli == -1)
      var nextLevel = this.receiver.getParent().array;
    else
      var nextLevel = this.receiver.arrayTree.levels[nli];

    if (nextLevel != undefined) {
      if (nextLevel[li] != undefined) return nextLevel[li];
    }
    return null;
  }
}


class ArrayTreeNodeRightCommand extends Array1DCommand {
  precheckArguments() { this.checkArgsLength(0); }
  executeSelf() {
    // next level index
    var nli = this.receiver.levelNumber - 1;
    var li = this.receiver.levelIndex * 2 + 1;

    if (nli == -1)
      var nextLevel = this.receiver.getParent().array;
    else
      var nextLevel = this.receiver.arrayTree.levels[nli];


    if (nextLevel != undefined) {
      if (nextLevel[li] != undefined) return nextLevel[li];
    }
    return null;
  }
}


class ArrayTreeNodeParentCommand extends Array1DCommand {
  precheckArguments() { this.checkArgsLength(0); }
  executeSelf() {
    // prev level index
    var pli = this.receiver.levelNumber + 1;
    var li = this.receiver.levelIndex >> 1;

    var prevLevel = this.receiver.arrayTree.levels[pli];

    if (prevLevel != undefined) {
      if (prevLevel[li] != undefined) return prevLevel[li];
    }
    return null;


  }
}