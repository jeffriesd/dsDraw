// TODO
// organize command classes into separate files

/*  Command classes encapsulate actions on the canvas
 *  through either mouse clicks or commands entered in the
 *  user console. These classes allow for simple 
 *  handling of undo/redo state.
 */

class DrawCommand {
  constructor(cState, receiver) {
    this.cState = cState;
    this.receiver = receiver;
    this.state = this.getState();
  }

  /*  CanvasState class stores state of canvas when click starts
   *    - hotkeys
   *    - coordinates of receiver
   */
  getState() {
    return {
      hotkeys: this.cState.hotkeyStartState,
      startPoint: this.cState.mouseDown,
      endPoint: this.cState.mouseUp,
    };
  }

  execute() {
    throw "Execute not implemented for " + this.constructor.name;
  }

  undo() {
    throw "Undo not implemented for " + this.constructor.name;
  }
}


/**  Handles object instantiation using click and drag
 */
class ClickCreateCommand extends DrawCommand {
  constructor(cState, receiver) {
    super(cState, receiver);
  }

  execute() {
    this.receiver.restore();
  }

  undo() {
    this.receiver.destroy();
  }
}


/** MoveCommand
 *    supports single element or group translation on canvas
 */
class MoveCommand extends DrawCommand {
  constructor(cState, receiver) {
    super(cState, receiver);

    var deltaX = this.state.endPoint.x - this.state.startPoint.x;
    var deltaY = this.state.endPoint.y - this.state.startPoint.y;

    if (this.cState.selectGroup.size) 
      this.group = Array.from(this.cState.selectGroup);
    else
      this.group = [this.receiver];

    // move only applies to parent objects
    this.group = this.group.map(obj => obj.getParent());

    // determine final positions so undo/redo 
    // doesn't keep applying relative drag
    this.oldPos = this.group.map(r => { 
      return { x: r.x - deltaX, y: r.y1 - deltaY } 
    });
    this.newPos = this.oldPos.map(p => { 
      return { x: p.x + deltaX, y: p.y + deltaY } 
    });
  }

  execute() {
    this.group.forEach((receiver, i) => {
      var dx = this.newPos[i].x - receiver.x;
      var dy = this.newPos[i].y - receiver.y1;
      receiver.move(dx, dy);
    });
  }

  undo() {
    // move (translate) back to initial point
    this.group.forEach((receiver, i) => {
      var dx = this.oldPos[i].x - receiver.x;
      var dy = this.oldPos[i].y - receiver.y1;
      receiver.move(dx, dy);
    });
  }
}

class DragCommand extends DrawCommand {
  constructor(cState, receiver) {
    super(cState, receiver);

    var deltaX = this.state.endPoint.x - this.state.startPoint.x;
    var deltaY = this.state.endPoint.y - this.state.startPoint.y;

    this.oldPos = {x: this.receiver.x - deltaX, y: this.receiver.y - deltaY };
    this.newPos = {x: this.receiver.x, y: this.receiver.y };
  }

  execute() {
    var dx = this.newPos.x - this.receiver.x;
    var dy = this.newPos.y - this.receiver.y;
    this.receiver.drag(dx, dy);
  }

  undo() {
    var dx = this.oldPos.x - this.receiver.x;
    var dy = this.oldPos.y - this.receiver.y;
    // drag back to initial point
    this.receiver.drag(dx, dy);
  }
}

class CloneCommand extends DrawCommand {
  constructor(cState, receiver) {
    super(cState, receiver);

    var deltaX = this.state.endPoint.x - this.state.startPoint.x;
    var deltaY = this.state.endPoint.y - this.state.startPoint.y;

    if (this.cState.selectGroup.size)  
      this.group = Array.from(this.cState.selectGroup);
    else
      this.group = [this.receiver];

    // don't clone objects that are 'locked' -- they get cloned 
    // by parent object
    this.group = this.group.filter(r => ! r.getParent().locked);

    this.newPos = this.group.map(r => {
      return { x: r.x + deltaX, y: r.y + deltaY };
    });

    this.clones = this.group.map(r => r.getParent().clone());
  }
 
  /** CloneCommand.execute
   *    Clone all objects in selection except those
   *    objects which are 'locked' to a parent,
   *    e.g. an arc that is attached to an array
   */  
  execute() {
    this.clones.forEach((cl, i) => {
      cl.restore();

      var dx = this.newPos[i].x - cl.x;
      var dy = this.newPos[i].y - cl.y;
      cl.move(dx, dy);
    });
  }

  undo() {
    this.clones.forEach((clone) => {
      clone.destroy();
    });
  }
}

/** ClickDestroyCommand
 *    Delete an object from canvas by clicking delete
 *    button in toolbar.
 *
 *    TODO:
 *    make group delete command (undo in single press)
 */
class ClickDestroyCommand {
  constructor(cState, ...receivers) {
    this.cState = cState;
    this.receivers = receivers;
  }

  execute() {
    this.receivers.forEach(r => r.destroy());
  }

  undo() {
    this.receivers.forEach(r => r.restore());
  }
}

class SelectCommand {
  constructor(cState) {
    this.cState = cState;

    this.x1 = cState.mouseDown.x;
    this.y1 = cState.mouseDown.y;
    this.x2 = cState.mouseUp.x;
    this.y2 = cState.mouseUp.y;
  }

  /** SelectCommand.execute
   *    iterate through canvas objects and check if 
   *    starting point is in selected rectangle.
   *    also call mousedown for each object to raise
   *    it to top.
   */
  execute() {
    this.cState.selectGroup.clear();
    var toRaise = [];
  
    this.cState.objects.forEach((cObject) => {
      var pObj = cObject.getParent();
      var pt = cObject.getStartCoordinates();

      if (pt.x <= this.x2 && pt.x >= this.x1 
           && pt.y <= this.y2 && pt.y >= this.y1) {
        this.cState.selectGroup.add(pObj);
        toRaise.push(pObj);
      }
    });

    // raise in reverse order to 
    // reflect prev order (last on top)
    toRaise.forEach(canvasObj => canvasObj.mouseDown());

    // if only one thing selected, set it
    // as active and show options
    if (this.cState.selectGroup.size == 1) {
      this.cState.selectGroup.forEach((obj) => {
        this.cState.activeObj = obj;
        this.cState.showToolbar();
      });
    }
  }

  /** SelectCommand.undo
   *    if selection is not already undone, 
   *    then clear selection 
   *    TODO -- restore cState objects order (undo raise)
   */
  undo() {
    if (this.cState.selectGroup.size)
      this.cState.selectGroup.clear();
  }
}


/**
 *  Console command objects
 *
 */
class RelabelCommand {
  constructor(cState, receiverLabel, newLabel) {
    this.receiver = VariableEnvironment.getCanvasObj(receiverLabel);
    if (this.receiver == null) throw `No object with label '${receiverLabel}'.`;
    this.newLabel = newLabel;
    // save old label for undo
    this.oldLabel = receiverLabel;
  } 

  execute() {
    this.receiver.label = this.newLabel; 
  }

  undo() {
    this.receiver.label = this.oldLabel;
  }

}


class ConsoleDestroyCommand {
  constructor(cState, receiver) {
    this.cState = cState;
    this.receiver = receiver;
    if (! (this.receiver instanceof CanvasObject))
      throw `Cannot delete non-CanvasObject '${this.receiver}'.`;

    // save label for undoing
    this.objLabel = receiver.label;
  }

  execute() {
    this.receiver.destroy();
  }

  undo() {
    this.receiver.restore();
    this.receiver.label = this.objLabel;
  }
}

class CloneCanvasCommand {
  constructor(cState) {
    this.cState = cState;
    this.originals = this.cState.objects.slice();
  }

  /** CloneCanvasCommand.doClone
   *    helper method to perform cloning
   *    before execution -- allows object
   *    labels to be shared across clips
   */
  doClone() {
    this.receivers = this.originals
      .filter(obj => ! obj.locked)
      .map(obj => obj.clone());
    this.receivers.forEach(x => {
      console.log("cloning item, locked = ", x.locked);
    });
  }

  execute() {
    if (this.receivers == null) this.doClone();

    this.receivers.forEach(r => {
      r.restore();
    });

    // necessary to bind labels to objects
    // in new clip when switching and labels are shared
    this.cState.updateLabels();
  }

  undo() {
    this.receivers.forEach(r => {
      r.destroy();
    });
  }
}

class GetVariableCommand { 
  constructor(variableName) {
    this.variableName = variableName;
  }

  execute() {
    return VariableEnvironment.getVar(this.variableName);
  }

  undo() {}
}

class AssignVariableCommand {
  constructor(variableName, value) {
    this.variableName = variableName.replace(/\"/g, "");
    this.value = value;

  }

  /** AssignVariableCommand.execute
   *    either assign label to result of constructor 
   *    (which calls VarEnv.setVar) or simply call
   *    VarEnv.setVar
   */
  execute() {
    if (this.value.constructed instanceof CanvasObject) 
      this.value.constructed.label = this.variableName;
    else
      VariableEnvironment.setVar(this.variableName, this.value); 
  }
  undo() {
    if (VariableEnvironment.hasVar(this.variableName))
      VariableEnvironment.deleteVar(this.variableName);
  }
}

// allow multiple names to be used
// for some classes e.g. array, array1d
const classNames = {
  "array": Array1D,
  "array1d": Array1D, 
  "list": LinkedList,
  "tb": TextBox,
  "tbox": TextBox,
  "text": TextBox,
  "math": MathBox,
  "rectbox": RectBox,
  "rbox": RectBox,
  "roundbox": RoundBox,
  "rdbox": RoundBox,
  "dbox": DiamondBox,
  "pbox": ParallelogramBox,
  "conn": Connector,
  "arrow": CurvedArrow,
}

class ConsoleCreateCommand {
  constructor(canvasState, objType, label="") {
    this.cState = canvasState;
    this.objType = objType.toLowerCase();
    this.objClass = classNames[this.objType];
    
    if (this.objClass == null) 
      throw `No class known by name '${objType}'.`;
 
    this.coords = this.objClass.defaultCoordinates(this.cState);

    this.label = label;
  }

  execute() {
    // if label already exists, reject command
    if (VariableEnvironment.hasVar(this.label)) 
      throw `Object with label '${this.label}' already exists.`;

    // check if undo has happened
    if (this.obj == null) {
      this.obj = 
        new this.objClass(this.cState, this.coords.x1, this.coords.y1,
                            this.coords.x2, this.coords.y2);  
    }
    this.cState.addCanvasObj(this.obj);

    this.obj.label = this.label;
    
    return this.obj;
  }

  undo() {
    if (this.obj)
      this.obj.destroy(); 
  }
}

/**   convert user-entered text to actual value
 *    e.g. on = true, off = false
 */
const conversionValues = {
  "on": true,
  "off": false,
};

/** ConfigCommand 
 *    receiver param is an actual object (not string). This way
 *    RangeConfigCommand can create a bunch of ConfigCommand
 *    objects for the child objects (e.g. array cells),
 *    which won't have names themselves
 */
class ConfigCommand {
  constructor(receiver, property, value) {
    this.receiver = receiver;

    var propNames = this.receiver.propNames();
    this.property = propNames[property];

    if (this.property == null)
      throw `${receiver.constructor.name} has no property '${property}'.`;

    this.value = this.parseValue(value);

    // save original value for undo
    this.oldValue = this.receiver[this.property];
  }

  /** ConfigCommand.parseValue
   *    convert user-entered text to actual value
   *    e.g. on = true, off = false
   */
  parseValue(value) {
    if (conversionValues[value] != null)
      return conversionValues[value];
    return value;
  }

  /** ConfigCommand.execute
   *    set property to some value
   */
  execute() {
    this.receiver[this.property] = this.value;
  }

  undo() {
    this.receiver[this.property] = this.oldValue;
  }
}

/** RangeConfigCommand
 *    accepts an iterable and a property value or
 *    interable of property values
 *
 *    e.g.
 *    myarr[0:5] bg red
 *
 *    myarr[] fg white   // [] = entire list
 *
 *    myarr[0:5] = other[0:5]   // copy values
 */
class RangeConfigCommand {
  constructor(parentObj, range, property, value) {
    this.parentObj = parentObj;
    this.range = range;
    this.receivers = this.getReceivers(this.parentObj);

    // if value iterable, apply each item 
    // to corresponding receiver
    // if (value.length === undefined) 
    //   this.values = [value];
    // else
    this.value = value;

    console.log("parent in range cmd is ", parentObj.label);

    this.configCommands = [];

    this.receivers.forEach((receiver) => {
      var configCmd = new ConfigCommand(receiver, property, this.value);
      this.configCommands.push(configCmd);
    });
  }

  /** RangeConfigCommand.getReceivers
   *    parses range in input and 
   *    pulls elements [3, 4, 5]
   *    with `arr1[3:5]`
   */
  getReceivers(parentObj) {
    var brackets = /(\[|\])/g
    var range = this.range.replace(brackets, "")

    // input was a1[]
    if (range == "") 
      return parentObj.getChildren();
     
    var rangeSpl = range.split(":");
    var low = parseInt(rangeSpl[0]);

    var high = low + 1; // default: arr[3] = (3, 4)
    if (rangeSpl.length > 1) {
      if (rangeSpl[1] == "") // arr[3:] = (3, arr.length)
        high = parentObj.getChildren().length;
      else  // arr[3:5] = (3, 5)
        high = parseInt(rangeSpl[1]);
    }

    if (isNaN(low) || isNaN(high))
      throw `Invalid range: [${low}: ${high}]`;

    return parentObj.getChildren(low, high);
  }

  execute() {
    this.configCommands.forEach((command) => command.execute());
  }

  undo() {
    this.configCommands.forEach((command) => command.undo());
  }
}

class MacroCommand {
  constructor(commands) {
    this.commands = commands;
  }

  execute() {
    this.commands.forEach((command) => command.execute());
  }

  undo() {
    this.commands.forEach((command) => command.undo());
  }
}

class CanvasObjectCommand {

  parseError(errMessage) {
    if (this.usage)
      throw errMessage + "\nUsage: " + this.usage();
    throw errMessage;
  }
}


class CanvasObjectConstructor extends CanvasObjectCommand {
  constructor(cState) {
    super();
    this.cState = cState;
  }

  /** CanvasObjectConstructor.execute
   *    add object to canvas by calling restore
   *    and return it as an object so label assignment
   *    can be performed when user enters
   *    'x = array()'
   *    but not for
   *    'y = x'
   */
  execute() {
    this.newObj.restore();
    return { constructed: this.newObj };
  }

  undo() {
    this.newObj.destroy();
  }
}

class Array1DConstructor extends CanvasObjectConstructor {
  constructor(cState, initializer, styleOptions) {
    super(cState);
    this.coords = Array1D.defaultCoordinates(this.cState);
    this.newObj = new Array1D(this.cState, this.coords.x1, this.coords.y1, this.coords.x2,
      this.coords.y2);

    // default parameters
    if (initializer == undefined) initializer = "random";

    if (initializer == "random")
      for (var i = 0; i < Array1D.defaultLength; i++) this.newObj.append();
    else if (initializer instanceof Array)
      initializer.forEach(x => this.newObj.append(x));
    else 
      this.parseError("Invalid initializer");
  }

  usage() {
    return "array(initializer, styleOptions)";
  }
}


class Array1DCommand extends CanvasObjectCommand {
  constructor(receiver) {
    super();
    this.receiver = receiver;
  }

  checkIndices(...indices) {
    var len = this.receiver.array.length;
    
    indices.forEach(i => {
      if (i >= len || i < 0 || isNaN(Number(i)))
        this.parseError(`Invalid index: '${i}'`);
    });
  }
}

class Array1DLengthCommand extends Array1DCommand {
  execute() {
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
    super(receiver);

    if (newLength < 1)
      this.parseErro(`Invalid array length: ${newLength}`);

    this.newLength = newLength;

    // save old array for undo
    this.prevArray = this.receiver.array.slice();
    this.prevArrows = new Map();

    this.newValues = null;
  }

  execute() {
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
          this.receiver.arrows.delete(aidx);
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
  constructor(receiver, index1, index2) {
    super(receiver);

    this.checkIndices(index1, index2);

    this.i1 = index1;
    this.i2 = index2;
  }

  execute() {
    var t = this.receiver.array[this.i1];
    this.receiver.array[this.i1] = this.receiver.array[this.i2];
    this.receiver.array[this.i2] = t;
  }

  undo() {
    this.execute();
  }

  usage() {
    return "array.swap [index1] [index2]";
  }
}

class Array1DArrowCommand extends Array1DCommand {
  constructor(receiver, index1, index2) {
    super(receiver);

    this.checkIndices(index1, index2);

    this.i1 = index1;
    this.i2 = index2;

    this.arrow = null;
  }

  /** Array1DArrowCommand.execute
   *    add an arc from i1 to i2
   */
  execute() {
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
      
      // create new locked arrow
      var anchors = {from: fromAnchor, to: toAnchor};

      this.arrow = 
        new CurvedArrow(this.receiver.cState, x1, y, x2, y, anchors);

      // set control points so arc goes above by default
      var mid = Math.floor((x1 + x2) / 2);
      this.arrow.cp1.x = Math.floor((x1 + mid) / 2);
      this.arrow.cp2.x = Math.floor((mid + x2) / 2);
      this.arrow.cp1.y = y - cs;
      this.arrow.cp2.y = y - cs;
    } 
    this.receiver.cState.addCanvasObj(this.arrow);

    // add arrow to array mapping
    if (! this.receiver.arrows.hasEquiv([this.i1, this.i2])) 
      this.receiver.arrows.set([this.i1, this.i2], this.arrow);
  }

  /** Array1DArrowCommand.undo
   *    remove arrow if it exists 
   */
  undo() {
    // arrow exists
    if (this.receiver.arrows.hasEquiv([this.i1, this.i2])) {
      var toDelete = this.receiver.arrows.get([this.i1, this.i2]);
      this.receiver.arrows.delete([this.i1, this.i2]);
      toDelete.destroy();
    }
  }

  usage() {
    return "array.arc [fromIndex] [toIndex]";
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
  constructor(receiver, destLabel, numCopy, srcIndex, destIndex) {
    super(receiver);

    this.destArr = VariableEnvironment.getCanvasObj(destLabel);

    if (this.destArr == null)
      this.parseError(`No canvas object with label '${destLabel}'.`);

    if (! (this.destArr instanceof Array1D))
      this.parseError(`'${destLabel}' is not an array.`);

    if (numCopy !== undefined)
      this.numCopy = numCopy;
    else
      this.numCopy = this.receiver.array.length;

    if (srcIndex !== undefined) {
      this.checkIndices(srcIndex);
      this.srcStart = srcIndex;
    }
    else 
      this.srcStart = 0;

    if (destIndex !== undefined) {
      if (destIndex < 0 || destIndex >= this.destArr.array.length)
        this.parseError(`Invalid index: ${destIndex}`);
      
      this.destStart = parseInt(destIndex);
    }
    else
      this.destStart = 0;

    // clip bounds
    this.srcEnd =
      Math.min(this.srcStart + this.numCopy, this.receiver.array.length);
    this.destEnd = 
      Math.min(this.destStart + this.numCopy, this.destArr.array.length);

    // save values for undo
    this.savedValues = null;
  }

  /** Array1DCopyCommand.execute
   *    iterate through each array and copy values
   *    as long as both arrays have remaining elements
   */
  execute() {
    if (this.savedValues == null) {
      this.savedValues = 
        this.destArr.getChildren(this.srcStart, this.srcEnd).map((x) => x.value);
    }

    var si = this.srcStart, di = this.destStart;
    for (; si < this.srcEnd && di < this.destEnd; si++, di++)
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
    return "array.copy [destLabel] [[numCopy]] [[srcIndex]] [[dstIndex]]";
  }

}

class Array1DSortCommand extends Array1DCommand {
  constructor(receiver) {
    super(receiver);
    // save state for undo 
    this.savedArray = this.receiver.array.slice(); 
  }

  execute() {
    this.receiver.array = this.receiver.array.sort(
      (a, b) => a.value > b.value
    );
  }

  undo() {
    this.receiver.array = this.savedArray.slice();
  }
}


/** LinkedList commands
 */
class LinkedListCommand extends CanvasObjectCommand {
  constructor(receiver) {
    super();
    this.receiver = receiver;
  }

  checkIndices(...indices) {
    indices.forEach(i => {
      if (! (this.receiver.list.hasEquiv(i))) {
        console.log(i, "not in ", this.receiver.list);
        this.parseError(`Invalid index: ${i}.`);
      }
    });
  }
}

class LinkedListInsertCommand extends LinkedListCommand {
  constructor(receiver, fromIndex, value) {
    super(receiver);

    fromIndex = parseInt(fromIndex);

    this.checkIndices(fromIndex);

    this.value = value;
    this.fromNode = this.receiver.list.get(fromIndex);
    this.newNode = null;
  }

  execute() {
    // addNode creates new node and new edge
    this.newNode = this.receiver.addNode(this.fromNode, this.value);
  }

  undo() {
    // remove node and newly created edge
    this.receiver.removeNode(this.newNode);
  }
}

class LinkedListLinkCommand extends LinkedListCommand {
  constructor(receiver, fromIndex, toIndex) {
    super(receiver);

    fromIndex = parseInt(fromIndex);
    toIndex = parseInt(toIndex);

    this.checkIndices(fromIndex, toIndex);
  
    this.fromNode = this.receiver.list.get(fromIndex);
    this.toNode = this.receiver.list.get(toIndex);
  }

  execute() {
    this.receiver.addEdge(this.fromNode, this.toNode);
  }

  undo() {
    this.receiver.removeEdge(this.fromNode, this.toNode);
  }
}

class LinkedListCutCommand extends LinkedListCommand {
  constructor(receiver, fromIndex, toIndex) {
    super(receiver);

    fromIndex = parseInt(fromIndex);
    toIndex = parseInt(toIndex);

    this.checkIndices(fromIndex, toIndex);

    this.fromNode = this.receiver.list.get(fromIndex);
    this.toNode = this.receiver.list.get(toIndex);
    this.fromIndex = fromIndex;
    this.toIndex = toIndex;

    // save state for undo
    this.edge = null;
  }

  execute() {
    this.edge = this.receiver.removeEdge(this.fromNode, this.toNode);
  }

  /** LinkedListCutCommand.undo 
   *    restore cut edge
   */
  undo() {
    this.receiver.arrows.set([this.fromIndex, this.toIndex], this.edge);
    this.edge.restore();
  }
}
