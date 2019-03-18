// TODO
// organize command classes into separate files
//
// TODO
// create range() function ala python
// also rand() and randn()

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


class ShiftDragCommand extends DrawCommand {
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
    this.receiver.shiftDrag(dx, dy);
  }

  undo() {
    var dx = this.oldPos.x - this.receiver.x;
    var dy = this.oldPos.y - this.receiver.y;
    // drag back to initial point
    this.receiver.shiftDrag(dx, dy);
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
  }

  execute() {
    if (this.receivers == null) this.doClone();

    this.receivers.forEach(r => r.restore());

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

  /** GetVariableCommand.execute
   *    return command class (for function calls)
   *    or value of variable (usual case)
   */
  execute() {
    if (this.variableName in mainCommands)
      return mainCommands[this.variableName];
    if (this.variableName in constructors)
      return constructors[this.variableName];
    return VariableEnvironment.getVar(this.variableName);
  }

  undo() {}
}

class ConsoleCommand {
  constructor(...argNodes) {
    this.argNodes = argNodes;
  }

  
  /** ConsoleCommand.executeChildren
   *  //TODO check for cached literal result
   *  //TODO push nodes to stack for reverse postorder (recursive undo)
   */
  executeChildren() {
    this.args = 
      this.argNodes
      .filter(node => node != undefined)
      .map(node => node.command.execute());  
  }

  checkArguments() { }

  /** ConsoleCommand.execute
   *    Template method:
   *      - execute children (post order)
   *      - check results for semantic constraints
   *      - execute self
   */
  execute() {
    this.executeChildren();
    this.checkArguments();
    return this.executeSelf();
  }

  //TODO undo postorder traversal...
  undo() {}
}

class ConsoleDestroyCommand extends ConsoleCommand {
  constructor(cState, receiver) {
    super(receiver);
    this.cState = cState;
    // save label for undoing
    this.objLabel = receiver.command.execute().label;
  }

  executeChildren() {
    super.executeChildren();
    this.receiver = this.args[0];
  }

  checkArguments() {
    if (! (this.receiver instanceof CanvasObject))
      throw `Cannot delete non-CanvasObject '${this.receiver}'.`;
  }

  executeSelf() {
    this.receiver.destroy();
  }

  undo() {
    this.receiver.restore();
    this.receiver.label = this.objLabel;
  }
}


class AssignVariableCommand extends ConsoleCommand {
  constructor(variableName, value) {
    super(value);
    this.variableName = variableName;
  }

  executeChildren() {
    super.executeChildren();
    this.value = this.args[0];
    this.constructed = this.argNodes[0].constructed;
  }

  /** AssignVariableCommand.execute
   *    either assign label to result of constructor 
   *    (which calls VarEnv.setVar) or simply call
   *    VarEnv.setVar
   */
  executeSelf() {
    if (this.constructed)
      this.value.label = this.variableName;
    else
      VariableEnvironment.setVar(this.variableName, this.value); 
  }

  undo() {
    if (VariableEnvironment.hasVar(this.variableName))
      VariableEnvironment.deleteVar(this.variableName);
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
 *    configures propName property 
 *    of receiver object
 *
 *    user can configure single object
 *    or range of objects
 *
 *    e.g.
 *    myArray.cs = 20
 *    myBST.inorder()[0].bg = "red"
 *    ^ receiverNode   ^
 */
class ConfigCommand extends ConsoleCommand {
  constructor(receiver, propName, rValueNode) {
    super(rValueNode);
    this.receiver = receiver;
    this.propName = propName;

    if (this.receiver == null) 
      throw "Cannot configure null"; 
    if (this.receiver.propNames == undefined)
      throw `Cannot configure receiver '${this.receiver.constructor.name}'.`;
      
    var propNames = this.receiver.propNames();
    this.property = propNames[this.propName];

    // save original value for undo
    this.oldValue = this.receiver[this.property];
  }

  executeChildren() {
    super.executeChildren();
    this.value = this.args[0];
  }

  /** ConfigCommand.checkArguments
   *    TODO add checking for expected types
   */
  checkArguments() {
    this.value = this.parseValue(this.value);
    if (! (this.receiver instanceof CanvasObject || 
        this.receiver instanceof CanvasChildObject))
      throw "Cannot configure non-canvas object";
    if (this.property == undefined)
      throw `${this.receiver.constructor.name} has no property '${this.property}'.`;
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
  executeSelf() {
    this.receiver[this.property] = this.value;
  }

  undo() {
    this.receiver[this.property] = this.oldValue;
  }
}

/** GetChildrenCommand
 *    this command acts as an overloaded operator. 
 *    it returns an array, either from the elements of a user
 *    defined 'list' or the elements of a data structure
 */
class GetChildrenCommand extends ConsoleCommand {
  constructor(receiver, low, high) {
    super(receiver, low, high);
    this.lowArgNode = low;
    this.highArgNode = high;
  }

  executeChildren() {
    super.executeChildren();
    this.receiver = this.args[0];
    if (this.lowArgNode != null)
      this.low = this.lowArgNode.command.execute();
    else this.low = null;
    if (this.highArgNode != null)
      this.high = this.highArgNode.command.execute();
    else this.high = null;
  }

  checkArguments() {
    if (this.low !== null && typeof this.low != "number")
      throw "Lower bound of accessor is not a number:" + this.low;
    if (this.high !== null && typeof this.high != "number")
      throw "Higher bound of accessor is not a number:" + this.high;
  }

  /** GetChildrenCommand.executeSelf
   *    use getChildren method if receiver is a data structure,
   *    otherwise slice the array
   */
  executeSelf() {
    console.log("childr rec = ", this.receiver.constructor.name);
    if (this.receiver instanceof Array) {
      if (this.low == null) this.low = 0;
      if (this.high == null) this.high = this.receiver.length;
      return this.receiver.slice(this.low, this.high)
    }
    if (this.receiver instanceof CanvasObject) {
      if (this.receiver.getChildren == undefined)
        throw `${this.receiver.constructor.name} does not support access by key.`;
      return this.receiver.getChildren(this.low, this.high);
    }
    throw `Cannot perform access on '{this.receiver.constructor.name}'.`;
  }

  undo() {}
}

/** GetChildCommand
 *    this command acts as an overloaded operator. 
 *    it returns a single element, either from the elements of a user
 *    defined 'list', a user defined 'dict' or the 
 *    elements of a data structure
 */
class GetChildCommand extends ConsoleCommand {
  constructor(receiver, key) {
    super(receiver, key);
  }

  executeChildren() {
    super.executeChildren();
    this.receiver = this.args[0];
    this.key = this.args[1];
  }

  checkArguments() {
    if (this.receiver instanceof Array)
      if (this.key < 0 || this.key >= this.receiver.length)
        throw "Array index out of bounds: " + this.key;
  }

  /** GetChildCommand.executeSelf
   *    use getChildren method if receiver is a data structure,
   *    otherwise slice the array
   */
  executeSelf() {
    if (this.receiver instanceof Array) 
      return this.receiver[this.key];

    if (this.receiver instanceof CanvasObject) {
      if (this.receiver.getChildren == undefined)
        throw `${this.receiver.constructor.name} does not support access by key.`;
      return this.receiver.getChildren(this.key, this.key+1)[0];
    }

    if (this.receiver.constructor == Object) 
      return this.receiver[this.key];

    throw `Cannot perform access on '${this.receiver.constructor.name}'.`;
  }
}

class GetPropertyCommand extends ConsoleCommand {
  /** GetPropertyCommand
   *    This command performs a property access on a
   *    CanvasObject, a CanvasChildObject, or an Array 
   *    ('list' in user terms)
   *
   *    property access also covers method calls
   *    and returns an object for the 
   *    method-building operand node to use
   *
   *    note this means that a user can enter
   *    "myObj.method" and it is still a valid expression
   *    however, other operands nodes (besides method-builder)
   *    don't expect this return value and will handle 
   *    the error accordingly
   */
  constructor(receiverNode, propName) {
    super(receiverNode);
    this.propName = propName;
  }

  executeChildren() {
    super.executeChildren();
    this.receiver = this.args[0];
  }

  /** GetPropertyCommand.checkArguments
   *    receiver object must be a CanvasObject,
   *    CanvasChildObject, or an Array
   *
   *    if Canvas object, convert provided property
   *    name to actual property e.g. "bg" => "fill"
   *    or "cs" => "cellSize"
   */
  checkArguments() {
    if (this.receiver == null) throw "Cannot perform access on null";
    if (this.receiver instanceof Array) {
      if (! this.receiver.hasOwnProperty(this.propName))
        throw `Undefined property '${this.propName}' for lists.`;
      this.property = this.propName;
    }
    else if (this.receiver instanceof CanvasObject 
        || this.receiver instanceof CanvasChildObject) {
      this.property = this.receiver.propNames()[this.propName];
      if (this.property == undefined)
        throw `Undefined property '${this.propName}' for ${this.receiver.constructor.name}.`;
    }
    else
      throw `Cannot perform access on '${this.receiver.constructor.name}'.`;
  }

  /** GetPropertyCommand.executeSelf
   *    if property value is not a method,
   *    just return it
   *
   *    otherwise:
   *    in order to build method command,
   *    a reference to the receiver is needed
   *    as well as the method class
   */
  executeSelf() {
    if (typeof this.property == "string")
      return this.receiver[this.property];

    return {
      receiver: this.receiver,
      methodClass: this.property,
    };
  }
}

/** RangeConfigCommand
 *    set a property for a range of child objects
 *
 *    e.g. arr[2:].bg = "red"
 */
class RangeConfigCommand extends ConsoleCommand {
  constructor(receiverNode, property, rValueNode) {
    super(receiverNode, rValueNode);
    this.configCommands = [];
    this.property = property;
    console.log("rValueNode = ", rValueNode);
  }

  executeChildren() {
    super.executeChildren();
    this.receivers = this.args[0];
    if (! (this.receivers instanceof Array))
      this.receivers = [this.receivers];

    // must be passed to ConfigCommand as an opNode
    this.rValueNode = this.argNodes[1];
  }

  checkArguments() {
    if (this.receivers.some(x => ! (x instanceof CanvasObject || x instanceof CanvasChildObject)))
      throw "Cannot configure range of non-CanvasObjects";
  }

  executeSelf() {
    if (this.configCommands.length == 0) {
      this.receivers.forEach((receiver) => {
        this.configCommands.push(new ConfigCommand(receiver, this.property, this.rValueNode));
      });
    }
    this.configCommands.forEach(cmd => cmd.execute());
  }

  undo() {
    this.configCommands.forEach(cmd => cmd.undo());
  }
}

class AssignListElementCommand extends ConsoleCommand {

  executeChildren() {
    super.executeChildren();
    this.list = this.args[0];
    this.index = this.args[1];
    this.rValue = this.args[2];
  }

  checkArguments() {
    if (! (this.list instanceof Array))
      throw "Cannot assign value to non-list " + listName;
    if (this.index < 0 || this.index >= this.list.length) 
      throw "Array index out of bounds: " + this.index;
  }

  executeSelf() {
    this.oldValue = this.list[this.index];
    this.list[this.index] = this.rValue;
  }

  undo() {
    this.list[this.index] = this.oldValue;
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

class CanvasObjectConstructor extends ConsoleCommand {
  constructor(cState, ...argNodes) {
    super(...argNodes);
    this.cState = cState;
  }

  /** CanvasObjectConstructor.createObject
   *    default no args constructor
   */
  createObject() {
    var coords = this.cState.getCenter();
    var x2 = coords.x + this.canvasClass.defaultWidth();
    var y2 = coords.y + this.canvasClass.defaultHeight();
    this.newObj = new this.canvasClass(this.cState, 
      coords.x, coords.y, x2, y2);
  }

  applyStyle() {
    if (this.styleOptions == undefined) return; 
    var validOptions = this.newObj.propNames();
    console.log(validOptions);
    if (Object.keys(this.styleOptions)
      .every(x => validOptions.hasOwnProperty(x))) {
        Object.entries(this.styleOptions)
          .forEach(([k, v]) => this.newObj[validOptions[k]] = v);
    }
    else
      throw "Invalid style options";
  }

  /** CanvasObjectConstructor.executeSelf
   *    create object if uninitialized.
   *    add object to canvas by calling restore
   *    and return it as an object so label assignment
   *    can be performed when user enters
   *    'x = array()'
   *    but not for
   *    'y = x'
   */
  executeSelf() {
    if (this.newObj == undefined) {
      this.createObject();
      this.applyStyle();
    }
    this.newObj.restore();
    return this.newObj;
  }

  undo() {
    this.newObj.destroy();
  }

  parseError(errMessage) {
    if (this.usage)
      throw errMessage + "\nUsage: " + this.usage();
    throw errMessage;
  }
}


class TextBoxConstructor extends CanvasObjectConstructor {
  constructor(...args) {
    super(...args);
    this.canvasClass = TextBox;
  }
}

class MathBoxConstructor extends CanvasObjectConstructor {
  constructor(...args) {
    super(...args);
    this.canvasClass = MathBox;
  }
}

class RectBoxConstructor extends CanvasObjectConstructor {
  constructor(...args) {
    super(...args);
    this.canvasClass = RectBox;
  }
}

class RoundBoxConstructor extends CanvasObjectConstructor {
  constructor(...args) {
    super(...args);
    this.canvasClass = RoundBox;
  }
}

class DiamondBoxConstructor extends CanvasObjectConstructor {
  constructor(...args) {
    super(...args);
    this.canvasClass = DiamondBox;
  }
}

class ParallelogramBoxConstructor extends CanvasObjectConstructor {
  constructor(...args) {
    super(...args);
    this.canvasClass = ParallelogramBox;
  }
}

class ConnectorConstructor extends CanvasObjectConstructor {
  constructor(...args) {
    super(...args);
    this.canvasClass = Connector;
  }
}

class CurvedArrowConstructor extends CanvasObjectConstructor {
  constructor(...args) {
    super(...args);
    this.canvasClass = CurvedArrow;
  }
}

class CanvasObjectMethod extends ConsoleCommand {

  constructor(receiver, ...argNodes) {
    super();
    this.receiver = receiver;
    this.argNodes = argNodes;
  }

  parseError(errMessage) {
    if (this.usage)
      throw errMessage + "\nUsage: " + this.usage();
    throw errMessage;
  }
}



/** Array1DConstructor
 *    array constructor syntax:
 *      array([[initializer]], [[styleOptions]])
 *
 *      e.g. 
 *      array("random", { ds: "tower" })
 *      array([1, 2, 3, 4])
 *      array()
 *
 *    default initializer is random
 *    default array length is 8
 */
class Array1DConstructor extends CanvasObjectConstructor {
  constructor(cState, ...args) {
    super(cState, ...args);
    this.canvasClass =  Array1D;
  }
  
  executeChildren() {
    super.executeChildren();
    this.initializer = this.args[0];
    // default parameters
    if (this.initializer == undefined) this.initializer = "random";

    this.styleOptions = this.args[1];
  }

  /** Array1DConstructor.checkArguments
   *    initializer must be string "random"
   *    or array
   */
  checkArguments() {
    if (! (this.initializer == "random" || this.initializer instanceof Array))
      this.parseError("Invalid array initializer. Must be 'random' or list");
  }
  
  createObject() {
    this.coords = Array1D.defaultCoordinates(this.cState);
    this.newObj = new Array1D(this.cState, this.coords.x1, this.coords.y1, this.coords.x2,
      this.coords.y2);

    if (this.initializer == "random")
      randomArray(Array1D.defaultLength, Array1D.randomSeed).forEach(x => this.newObj.append(x));
    else if (this.initializer instanceof Array)
      this.initializer.forEach(x => this.newObj.append(x));
  }

  usage() {
    return "array(initializer, styleOptions)";
  }
}



class Array1DCommand extends CanvasObjectMethod {

  checkIndices(...indices) {
    var len = this.receiver.array.length;
    
    indices.forEach(i => {
      if (i >= len || i < 0 || isNaN(Number(i)))
        this.parseError(`Invalid index: '${i}'`);
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
      this.parseError("Array.resize argument must be number");
  }

  checkArguments() {
    if (this.newLength < 1)
      this.parseError(`Invalid array length: ${this.newLength}`);
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
      
      // create new locked arrow
      var anchors = {from: fromAnchor, to: toAnchor};

      this.arrow = 
        new CurvedArrow(this.receiver.cState, x1, y, x2, y, anchors);
      this.arrow.keyRestore = [this.i1, this.i2];

      // set control points so arc goes above by default
      var mid = Math.floor((x1 + x2) / 2);
      this.arrow.cp1.x = Math.floor((x1 + mid) / 2);
      this.arrow.cp2.x = Math.floor((mid + x2) / 2);
      this.arrow.cp1.y = y - cs;
      this.arrow.cp2.y = y - cs;
    } 
    this.receiver.arrows.set([this.i1, this.i2], this.arrow);
    this.arrow.restore();
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
      this.parseError(`'${this.argNodes[0]}' is not an array.`);
    if (this.destStart < 0 || this.destStart >= this.destArr.array.length)
      this.parseError(`Invalid index: ${this.destStart}`);

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

/** LinkedList commands
 */

/** LinkedListConstructor 
 *    array constructor syntax:
 *      array(initializer, styleOptions)
 *
 *      e.g. 
 *      array("random", { ds: "tower" })
 *      array([1, 2, 3, 4])
 *      array()
 *
 *    default initializer is random
 *    default array length is 8
 */
class LinkedListConstructor extends CanvasObjectConstructor {
  constructor(cState, ...args) {
    super(cState, ...args);
    this.canvasClass =  LinkedList;
  }

  executeChildren() {
    super.executeChildren();
    this.initializer = this.args[0];
    this.styleOptions = this.args[1];
  }

  createObject() {
    this.coords = LinkedList.defaultCoordinates(this.cState);
    this.newObj = new LinkedList(
      this.cState, this.coords.x1, this.coords.y1, this.coords.x2, this.coords.y2);

    // default parameters
    if (this.initializer == undefined) this.initializer = "random";

    if (this.initializer == "random")
      randomArray(LinkedList.defaultLength, LinkedList.randomSeed).forEach(x => this.newObj.append(x));
    else if (this.initializer instanceof Array)
      this.initializer.forEach(x => this.newObj.append(x));
    else 
      this.parseError("Invalid initializer");
  }

  usage() {
    return "array(initializer, styleOptions)";
  }
}

class LinkedListCommand extends CanvasObjectMethod {
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

  executeChildren() {
    super.executeChildren();
    this.fromIndex = this.args[0];
    this.value = this.args[1];
  }

  checkArguments() {
    this.checkIndices(this.fromIndex);
    if (isNaN(Number(this.value)))
      this.parseError("Invalid value for linked list:" + this.value);
  }

  executeSelf() {
    this.fromNode = this.receiver.list.get(this.fromIndex);
    // addNode creates new node and new edge
    this.newNode = this.receiver.addNode(this.fromNode, this.value);
  }

  undo() {
    // remove node and newly created edge
    this.receiver.removeNode(this.newNode);
  }
}

class LinkedListLinkCommand extends LinkedListCommand {

  executeChildren() {
    super.executeChildren();
    this.fromIndex = this.args[0];
    this.toIndex = this.args[1];
  }

  checkArguments() {
    this.checkIndices(this.fromIndex, this.toIndex);
  }

  executeSelf() {
    this.fromNode = this.receiver.list.get(this.fromIndex);
    this.toNode = this.receiver.list.get(this.toIndex);
    this.receiver.addEdge(this.fromNode, this.toNode);
  }

  undo() {
    this.receiver.removeEdge(this.fromNode, this.toNode);
  }
}

class LinkedListCutCommand extends LinkedListCommand {

  executeChildren() {
    super.executeChildren();
    this.fromIndex = this.args[0];
    this.toIndex = this.args[1];

    // save arrow object for undo
    this.edge = null;
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
   *    restore cut edge (it will add itself back
   *    to parent map in its restore method)
   */
  undo() {
    this.edge.restore();
  }
}

class LinkedListRemoveCommand extends LinkedListCommand {
  constructor(receiver, removeIdx) {
    super(receiver, removeIdx);

    this.node = null;
    this.removedArrows = [];
  }

  executeChildren() {
    super.executeChildren();
    this.removeIndex = this.args[0];
  }

  checkArguments() {
    this.checkIndices(this.removeIndex);
  }

  executeSelf() {
    if (this.node == null) {
      this.node = this.receiver.list.get(this.removeIndex);
      this.receiver.arrows.forEach((arr, idx) => {
        if (idx.includes(this.removeIndex))
          this.removedArrows.push(arr);
      });
    }
    this.receiver.list.delete(this.removeIndex);
    this.removedArrows.forEach(arr => arr.destroy());
  }

  undo() {
    this.receiver.list.set(this.removeIndex, this.node);
    this.removedArrows.forEach(arr => arr.restore());
  }
}

class BSTConstructor extends CanvasObjectConstructor {
  constructor(cState, ...args) {
    super(cState, ...args);
    this.canvasClass = BST;
  }

  executeChildren() {
    super.executeChildren();
    this.initializer = this.args[0];
    this.styleOptions = this.args[1];
  }

  buildComplete(bst, arr, low, high) {
    if (low > high) return;
    var mid = Math.floor((low + high) / 2);
    bst.insert(arr[mid]);
    this.buildComplete(bst, arr, low, mid - 1);
    this.buildComplete(bst, arr, mid + 1, high);
  }

  createObject() {
    this.coords = BST.defaultCoordinates(this.cState);
    this.newObj = new BST(
      this.cState, this.coords.x1, this.coords.y1, this.coords.x2, this.coords.y2);

    // default parameters
    if (this.initializer == undefined) this.initializer = "random";

    var len = BST.defaultSize;
    if (this.initializer == "random")
      randomArray(len, BST.randomSeed).forEach(x => this.newObj.insert(x));
    else if (this.initializer == "complete") {
      var vals = randomArray(len, BST.randomSeed).sort((a, b) => a > b);
      this.buildComplete(this.newObj, vals, 0, len - 1);
    }
    else if (this.initializer instanceof Array)
      this.initializer.forEach(x => this.newObj.insert(x));
    else 
      this.parseError("Invalid initializer");
  }

  usage() {
    return "bst(initializer, styleOptions)";
  }
}

class BSTCommand extends CanvasObjectMethod {
}

class BSTArrowCommand extends BSTCommand {
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
    if (this.receiver.getChild(this.i1) == null)
      throw "Invalid index: " + this.i1;
    if (this.receiver.getChild(this.i2) == null)
      throw "Invalid index: " + this.i2;
  }

  /** BSTArrowCommand.execute
   *    add an arc from node with index i1 to 
   *    node with index i2
   */
  executeSelf() {
    if (this.receiver.arrows.hasEquiv([this.i1, this.i2])) return;
    var fromAnchor = this.receiver.getChild(this.i1);
    var toAnchor = this.receiver.getChild(this.i2);

    if (this.arrow == null) {
      // create new locked arrow
      var anchors = {from: fromAnchor, to: toAnchor};
      this.arrow = 
        new CurvedArrow(this.receiver.cState, 
          fromAnchor.x, fromAnchor.y, toAnchor.x, toAnchor.y, anchors);
      this.arrow.keyRestore = [this.i1, this.i2];
    } 
    this.receiver.arrows.set([this.i1, this.i2], this.arrow);
    this.arrow.restore();
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


class BSTInsertCommand extends BSTCommand {
  constructor(receiver, valueNode) {
    super(receiver, valueNode);
    if (this.receiver.root == null)
      this.oldTree = null
    else
      this.oldTree = this.receiver.root.deepCopy();
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
      this.newTree = this.receiver.root.deepCopy();
    }
    this.receiver.root = this.newTree.deepCopy();
    this.receiver.claimChildren(this.receiver.root);
  }

  /** BSTInsertCommand.undo
   *    remove inserted node
   */
  undo() {
    if (this.oldTree == null)
      this.receiver.root = null;
    else
      this.receiver.root = this.oldTree.deepCopy();
    this.receiver.claimChildren(this.receiver.root);
  }
}

class BSTRemoveCommand extends BSTCommand {
  constructor(receiver, valueNode) {
    super(receiver, valueNode);
    this.oldTree = this.receiver.root.deepCopy();
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
      this.newTree = this.receiver.root.deepCopy();
    }
    this.receiver.root = this.newTree.deepCopy();
    this.receiver.claimChildren(this.receiver.root);
  }

  undo() {
    this.receiver.root = this.oldTree.deepCopy();
    this.receiver.claimChildren(this.receiver.root);
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
    if (this.low == undefined) this.low = this.receiver.root.getMin().value;
    if (this.high == undefined) this.low = this.receiver.root.getMax().value + 1;
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
 * returns list of BSTNodes
 */
class BSTInorderCommand extends BSTCommand {
  executeSelf() {
    return this.receiver.inorder();
  }

  undo() {}
}

/**
 * returns list of BSTNodes
 */
class BSTPreorderCommand extends BSTCommand {
  executeSelf() {
    return this.receiver.preorder();
  }

  undo() {}
}


/**
 * returns list of BSTNodes
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
    if (this.receiver.root == null) return null;
    return this.receiver.root.getMin();
  }
}

/** BSTMaxCommand
 *    returns reference to max value node
 */
class BSTMaxCommand extends BSTCommand {
  executeSelf() {
    if (this.receiver.root == null) return null;
    return this.receiver.root.getMax();
  }
}


/** BSTRootCommand
 *    returns reference to root node
 */
class BSTRootCommand extends BSTCommand {
  executeSelf() {
    if (this.receiver.root == null) return null;
    return this.receiver.root;
  }
}

/**
 * BSTNode methods
 */
class BSTNodeCommand extends CanvasObjectMethod {
}

class BSTNodeRotateCommand extends BSTNodeCommand {
  // rotate self with parent
  executeSelf() {
    if (this.receiver.parNode == null) {
      this.undoDir = "none";
    }

    if (this.receiver.isLeftChild()) {
      this.undoDir = "left";
      this.receiver.rotateRight();
    }

    else {
      this.undoDir = "right";
      this.receiver.rotateLeft();
    }
  }

  undo() {
    if (this.undoDir == "left" && this.receiver.rightChild())
      this.receiver.rightChild().rotateLeft();
    else if (this.undoDir == "right" && this.receiver.leftChild())
      this.receiver.leftChild().rotateRight();
  }
}

class BSTNodeLeftCommand extends BSTNodeCommand {
  executeSelf() {
    return this.receiver.leftChild();
  }
}

class BSTNodeRightCommand extends BSTNodeCommand {
  executeSelf() {
    return this.receiver.rightChild();
  }
}

class BSTNodeParentCommand extends BSTNodeCommand {
  executeSelf() {
    return this.receiver.parNode;
  }
}

class BSTNodePredecessorCommand extends BSTNodeCommand {
  executeSelf() {
    return this.receiver.pred();
  }
}

class BSTNodeSuccessorCommand extends BSTNodeCommand {
  executeSelf() {
    return this.receiver.succ();
  }
}

class BSTNodeValueCommand extends BSTNodeCommand {
  executeSelf() {
    return this.receiver.value;
  }
}

/**
 * Heap methods
 */
class BinaryHeapConstructor extends CanvasObjectConstructor {
  constructor(cState, ...args) {
    super(cState, ...args);
    this.canvasClass = BinaryHeap;
  }

  executeChildren() {
    super.executeChildren();
    this.initializer = this.args[0];
    this.styleOptions = this.args[1];
  }

  createObject() {
    this.coords = BinaryHeap.defaultCoordinates(this.cState);
    this.newObj = new BinaryHeap(
      this.cState, this.coords.x1, this.coords.y1, this.coords.x2, this.coords.y2);

    // default parameters
    if (this.initializer == undefined) this.initializer = "random";

    var len = BinaryHeap.defaultSize;
    if (this.initializer == "random")
      randomArray(len, BinaryHeap.randomSeed).forEach(x => this.newObj.insert(x));
    else if (this.initializer instanceof Array)
      this.initializer.forEach(x => this.newObj.insert(x));
    else 
      this.parseError("Invalid initializer");
  }

  usage() {
    return "bheap(initializer, styleOptions)";
  }
}

class BinaryHeapCommand extends CanvasObjectMethod {
}

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

  executeChildren() {
    super.executeChildren();
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

  undo() {
    this.receiver.heapArray = this.oldHeap.slice();
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

  undo() {
    this.receiver.heapArray = this.oldHeap.slice();
  }
}

class BinaryHeapFindCommand extends BinaryHeapCommand {
  executeChildren() {
    super.executeChildren();
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
  executeChildren() {
    super.executeChildren();
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

  executeChildren() {
    super.executeChildren();
    this.receiverNode = this.args[0];
    this.newKey = this.args[1];
  }

  checkArguments() {
    if (! (this.receiverNode instanceof BinaryHeapNode))
      throw "Cannot decrease key of non BinaryHeapNode";
    if (this.receiverNode.parentObject !== this.receiver)
      throw "BinaryHeap can only decrease keys of its own nodes";
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

/**
 * Built-in math (rand, randn)
 */

class RandomIntCommand extends ConsoleCommand {
  constructor(cState, min, max) {
    super(min, max);
    this.value = null;
  }
  executeChildren() {
    super.executeChildren();
    this.min = this.args[0];
    this.max = this.args[1];
    if (this.min == undefined) { 
      this.min = 0; this.max = 100; 
    }
    else if (this.max == undefined) {
      this.max = this.min;
      this.min = 0;
    }
  }

  checkArguments() {
    if (! (typeof this.min == "number" && typeof this.max == "number"))
      throw "randn arguments must be integers";
    if (this.max <= this.min)
      throw "randn arguments must be provided in increasing order";
  }

  executeSelf() {
    if (this.value == null)
      this.value = (Math.random() * (this.max - this.min )) | 0 + this.min;
    return this.value;
  }
}

class RandomFloatCommand extends ConsoleCommand {
  constructor() {
    super();
    console.log("new rand");
    this.value = null;
  }
  executeChildren() {}
  executeSelf() {
    if (this.value == null) 
      this.value = Math.random();
    return this.value;
  }
}
