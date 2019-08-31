
class Array1DCommand extends CanvasObjectMethod {

  checkIndices(...indices) {
    var len = this.receiver.array.length;
    
    indices.forEach(i => {
      if (i >= len || i < 0 || isNaN(Number(i)))
        this.argsError(`Invalid index: '${i}'`);
    });
  }
}

class Array1DLengthCommand extends Array1DCommand {
  executeSelf() {
    return this.receiver.array.length; 
  }

  undo() {}
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
  
  executeChildren() {
    super.executeChildren();
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
       
      this.receiver.arrows.forEach((arrow, aidx) => {
        var start = aidx[0];
        var end = aidx[1];
        if (start >= this.newLength || end >= this.newLength) {
          this.prevArrows.set(aidx, arrow);
          this.receiver.arrows.deleteEquiv(aidx);
          arrow.destroy();
        }
      });
    }
  }

  undo() {
    this.receiver.array = this.prevArray.slice();

    // add back any removed arrows
    this.receiver.arrows = new Map(this.prevArrows);
  }
}

class Array1DSwapCommand extends Array1DCommand {

  executeChildren() {
    super.executeChildren();
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

  undo() {
    this.executeSelf();
  }

  usage() {
    return "array.swap [index1] [index2]";
  }
}

class Array1DArrowCommand extends Array1DCommand {
  constructor(receiver, index1, index2) {
    super(receiver, index1, index2);
    this.arrow = null;
  }

  executeChildren() {
    super.executeChildren();
    this.i1 = this.args[0];
    this.i2 = this.args[1];
  }

  checkArguments() {
    this.checkIndices(this.i1, this.i2);
  }

  /** Array1DArrowCommand.execute
   *    add an arc from i1 to i2
   */
  executeSelf() {
    if (this.receiver.arrows.hasEquiv([this.i1, this.i2])) return;
    var fromAnchor = this.receiver.array[this.i1];
    var toAnchor = this.receiver.array[this.i2];

    if (this.arrow == null) {
      var cs = this.receiver.cellSize;
      var x1 = (this.i1 * cs) + this.receiver.x1;
      var x2 = (this.i2 * cs) + this.receiver.x1;
      
      // anchor to center of cells
      x1 += Math.floor(cs / 2);
      x2 += Math.floor(cs / 2);
    
      var y = this.receiver.y1;
      
      this.arrow = 
        new CurvedArrow(this.receiver.cState, x1, y, x2, y, fromAnchor, toAnchor);
      this.arrow.keyRestore = [this.i1, this.i2];

      // set control points so arc goes above by default
      var mid = Math.floor((x1 + x2) / 2);
      this.arrow.cp1.x = Math.floor((x1 + mid) / 2);
      this.arrow.cp2.x = Math.floor((mid + x2) / 2);
      this.arrow.cp1.y = y - cs;
      this.arrow.cp2.y = y - cs;
    } 
    this.receiver.arrows.set([this.i1, this.i2], this.arrow);
  }

  /** Array1DArrowCommand.undo
   *    remove arrow if it exists 
   */
  undo() {
    if (this.arrow != null) {
      this.arrow.destroy();
      this.receiver.arrows.deleteEquiv([this.i1, this.i2]);
    }
  }

  usage() {
    return "array.arc(fromIndex, toIndex)";
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
  
  executeChildren() {
    super.executeChildren();
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
      this.argsError(`'${this.argNodes[0]}' is not an array.`);
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

  /** Array1DCopyCommand.undo
   *    restore contents of dest array
   */
  undo() {
    this.savedValues.forEach((v, idx) => {
      this.destArr.array[this.destStart + idx].value = v;
    });
  }

  usage() {
    return "array.copy [destArr] [[numCopy]] [[srcIndex]] [[dstIndex]]";
  }

}

class Array1DSortCommand extends Array1DCommand {
  constructor(receiver) {
    super(receiver);
    // save state for undo 
    this.savedArray = this.receiver.array.slice(); 
  }

  executeSelf() {
    this.receiver.array = this.receiver.array.sort(
      (a, b) => a.value > b.value
    );
  }

  undo() {
    this.receiver.array = this.savedArray.slice();
  }
}