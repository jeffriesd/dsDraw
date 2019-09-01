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


    this.newPos = this.group.map(r => {
      return { x: r.x + deltaX, y: r.y + deltaY };
    });

    this.clones = cloneObjectsMaintainAnchors(this.group);
  }
 
  /** CloneCommand.execute
   *    Clone all objects in selection 
   *    and translate by dx, dy
   */  
  execute() {
    this.clones.forEach((cl, i) => {
      cl.restore();

      console.log("moving", String(cl))

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
        console.log("adding to st")
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


/** cloneObjectsMaintainAnchors
 *    function to clone every object in an array
 *    and maintain connections between arrows
 *    and their anchors
 *    @param {*} objects - array of objects
 */
function cloneObjectsMaintainAnchors(objects) {
  // clone arrows last so their anchors get cloned first
  // (false comes first in sorting)
  objects = objects.sort(x => x instanceof Arrow);

  // use a unique object to identify
  // when anchored objects were
  // cloned by the same command
  // as the arrow/lockable objects
  var cloneHandle = {};

  return objects.map(r => {
      var clone = r.clone(cloneHandle);

      // re-anchor arrows whose anchors
      // were also cloned by this same command
      // 
      // check for cloneHandle object to 
      // see if the anchor was cloned by this same command 
      // (and not previously)
      if (r.locked) {
        var rlf = r.locked.from;
        var rlt = r.locked.to;
        clone.locked = {
          from: rlf && rlf._cloneRef && rlf._cloneRef.cloneHandle === cloneHandle ? 
                rlf._cloneRef : null,
          to:   rlt && rlt._cloneRef && rlt._cloneRef.cloneHandle === cloneHandle ? 
                rlt._cloneRef : null,
        };
      }

      return clone;
  });
}

class CloneCanvasCommand {
  constructor(cState) {
    this.cState = cState;
    this.originals = this.cState.objects.slice();
  }

  doClone() {
    this.receivers = cloneObjectsMaintainAnchors(this.originals);
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


  /** ConsoleCommand.checkArgsLength
   *    check number of arguments with inclusive
   *    bounds 
   *  
   *    @param {Int} lo 
   *    @param {Int} hi - optional if only 1 value possible
   */
  checkArgsLength(lo, hi) {
    hi = hi || lo;
    if (this.argNodes.length < lo || this.argNodes.length > hi) {
      if (hi == lo)
        throw (`Expected number of arguments: ${hi}`);
      else
        throw (`Expected number of arguments: [${lo}, ${hi}]`);
    }
  }

  /** ConsoleCommand.precheckArguments
   *    check number of arguments etc. before
   *    arguments get evaluated
   * 
   */
  precheckArguments() {
  }
  
  /** ConsoleCommand.executeChildren
   *  //TODO check for cached literal result
   *  //TODO push nodes to stack for reverse postorder (recursive undo)
   */
  executeChildren() {
    this.args = 
      this.argNodes
      // .filter(node => node != undefined) // shouldn't be necessary
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
    this.precheckArguments();
    this.executeChildren();
    this.checkArguments();
    return this.executeSelf();
  }

  //TODO undo postorder traversal...
  undo() {}
}

/**
 * Just calls destroy on first argument
 */
class ConsoleDestroyCommand extends ConsoleCommand {
  constructor(cState, receiver) {
    super(receiver);
    this.cState = cState;
  }

  executeChildren() {
    super.executeChildren();
    this.receiver = this.args[0];
    this.objLabel = this.receiver.label;
  }

  checkArguments() {
    if (! (this.receiver instanceof CanvasObject))
      throw `Cannot delete non-CanvasObject '${stringify(this.receiver)}'.`;
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

    // variables that corresponed to labeled canvas objects
    // cant be reassigned
    if (VariableEnvironment.hasVar(this.variableName)) 
      if (VariableEnvironment.getVar(this.variableName) instanceof CanvasObject) 
        throw `Cannot reassign reference to canvas object: '${this.variableName}' .`;
  }

  /** AssignVariableCommand.executeChildren
   *    evaluate opNode on right side of equals 
   */
  executeChildren() {
    super.executeChildren();
    this.value = this.args[0];
    // if rvalue is returned from function (including constructors), 
    // update the label of the canvas object
    this.funcReturn = this.argNodes[0].toString() == "buildFunctionCall";
  }

  /** AssignVariableCommand.execute
   *    either assign label to result of constructor/function
   *    (which calls VarEnv.setVar) or simply call
   *    VarEnv.setVar
   */
  executeSelf() {
    if (this.value instanceof CanvasObject) {
      if (this.funcReturn)
        this.value.label = this.variableName;
    }
    else
      VariableEnvironment.setVar(this.variableName, this.value); 
  }

  undo() {
    if (VariableEnvironment.hasVar(this.variableName))
      VariableEnvironment.deleteVar(this.variableName);
    this.argNodes[0].command.undo();
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
    
    // propName is either exact property name or alias
    if (Object.values(this.receiver.propNames()).includes(this.propName)) // exact
      this.property = this.propName;
    else // alias
      this.property = this.receiver.propNames()[this.propName];

    // save original value for undo
    this.oldValue = this.receiver[this.property];
  }

  executeChildren() {
    super.executeChildren();
    this.value = this.args[0];
  }

  /** ConfigCommand.checkArguments
   *    - possibly convert rvalue string (currently just mapping on/off to true/false).
   *    - check object being configured is canvas object.
   *    - check that property (already mapped by propNames) exists in canvas object.
   *    - check that value falls in correct 'type'
   */
  checkArguments() {
    this.value = this.parseValue(this.value);
    if (! (this.receiver instanceof CanvasObject || 
        this.receiver instanceof CanvasChildObject))
      throw "Cannot configure non-canvas object";
    if (this.property == undefined)
      throw `${this.receiver.constructor.name} has no property '${this.propName}'.`;
    var expectedType = this.receiver.propTypes()[this.property];
    if (! validPropertyAssignment(this.value, expectedType))
      throw `Invalid value '${this.value}' for property '${this.propName}'. Expected value: ${expectedType}.`;
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

// take value directly (as opposed to valueNode in ConfigCommand)
class MenuConfigCommand extends ConfigCommand {
  constructor(receiver, propName, value) {
    super(receiver, propName, value);
    this.value = value;
  }

  executeChildren() {
  }

  // convert string (from <input> unlike parsed ConfigCommand)
  parseValue(value) {
    value = super.parseValue(value);
    if (isNumber(value))
      return Number(value);
    if (value == "true") return true;
    if (value == "false") return false;
    return value;
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
    throw `Cannot perform range access on '{this.receiver.constructor.name}'.`;
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
    if (this.receiver instanceof Dictionary) return;
    if (this.receiver instanceof Array)
      if (this.key < 0 || this.key >= this.receiver.length)
        throw "Array index out of bounds: " + this.key;
    if (! (this.receiver instanceof CanvasObject
        || this.receiver.hasOwnProperty(this.key)))
      throw `Undefined property '${this.key}'.`;
  }

  /** GetChildCommand.executeSelf
   *    use getChildren method if receiver is a data structure,
   *    otherwise slice the array
   */
  executeSelf() {
    if (this.receiver instanceof Array) 
      return this.receiver[this.key];
    if (this.receiver instanceof Dictionary)
      return this.receiver.get(this.key);

    if (this.receiver instanceof CanvasObject) {
      if (this.receiver.getChildren == undefined)
        throw `${this.receiver.constructor.name} does not support access by key.`;
      return this.receiver.getChildren(this.key, this.key+1)[0];
    }

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
        || this.receiver instanceof CanvasChildObject
        || this.receiver instanceof LanguageObject) {
      this.property = this.receiver.propMethodNames()[this.propName];
      if (this.property == undefined)
        throw `Undefined property '${this.propName}' for ${this.receiver.constructor.name}.`;
    }
    else
      throw `Cannot perform property access on '${this.receiver.constructor.name}'.`;
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

  // assign list/list value at idx/key
  executeChildren() {
    super.executeChildren();
    this.list = this.args[0];
    this.index = this.args[1];
    this.rValue = this.args[2];
  }

  checkArguments() {
    if (this.list instanceof Dictionary) return;
    if (! (this.list instanceof Array || this.list.constructor == Object))
      throw "Element assignment is only allowed for lists and dicts";
    if (this.index < 0 || this.index >= this.list.length) 
      throw "Array index out of bounds: " + this.index;
  }

  executeSelf() {
    if (this.list instanceof Dictionary) {
      this.list.set(this.index, this.rValue);
      return;
    }
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

class CanvasObjectMethod extends ConsoleCommand {

  constructor(receiver, ...argNodes) {
    super();
    this.receiver = receiver;
    this.argNodes = argNodes;
  }

  argsError(errMessage) {
    if (this.usage)
      throw errMessage + "\nUsage: " + this.usage();
    throw errMessage;
  }
}
/**
 * Heap methods
 */

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
 * Built-in math (rand, randn), util (range)
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
    this.value = null;
  }
  executeChildren() {}
  executeSelf() {
    if (this.value == null) 
      this.value = Math.random();
    return this.value;
  }
}

class RangeCommand extends ConsoleCommand {
  constructor(cState, start, end, step) {
    super(start, end, step);
    this.value = null;
  }

  executeChildren() {
    super.executeChildren();
    this.start = this.args[0];
    this.end = this.args[1];
    this.step = this.args[2] || 1;
  }

  checkArguments() {
    if (this.step == 0) 
      throw "Invalid range step: 0";
    if (this.end == undefined 
      || Math.sign(this.end - this.start) != Math.sign(this.step))
      throw `Invalid range arguments: ${this.start}, ${this.end}, ${this.step}.`;
  }

  // helper function for determining when range is complete
  beyond(currValue, bound) {
    if (this.start <= this.end)
      return currValue >= bound;
    return currValue <= bound;
  }

  executeSelf() {
    if (this.value == null) {
      this.value = [];
      for (var i = this.start; ! this.beyond(i, this.end); i += this.step)
        this.value.push(i);
    }
    return this.value;
  }
}

/**
 *  User defined functions are created
 *  using the 'define' keyword. Example:
 *    
 *  define printArr(arr) {
 *    for (i = 0; i < arr.length; i = i + 1) {
 *      print(arr[i].value);   
 *    } 
 *  }   
 * 
 *  User functions maintain their own namespace
 *  (map of variable names) and force child
 *  statements to use the same namespace by pushing
 *  it onto a stack used by the VariableEnvironment class.
 *  When a variable value is requested, the top of the stack
 *  is looked at first. The local namespace gets popped off 
 *  when execution ends.
 * 
 *  Statement nodes are cloned so each call runs
 *  with fresh command objects.
 */
class UserFunctionCommand extends ConsoleCommand {
  constructor(funcDef, ...args) {
    super(...args);
    this.funcName = funcDef.funcName;
    this.statements = funcDef.statements.map(x => x.clone());
    this.argNames = funcDef.argNames;
    this.namespace = this.setArguments();
    // flag to ensure command stack is only created once
    this.storedStack = false; 
    this.executed = [];
  }

  execPush(command) {
    if (! this.storedStack) this.executed.push(command);
    return command.execute();
  }

  /** UserFunctionCommand.setArguments
   *    evaluate arguments and map to local names
   */
  setArguments() {
    if (this.argNames.length != this.argNodes.length)  {
      console.log(this.argNames, this.argNodes);
      throw `${this.funcName} requires ${this.argNames.length} arguments. Argnames = '${this.argNames}'`;
    }
    var namespace = new Map();
    this.argNames.forEach((argname, i) => {
      namespace.set(argname, this.argNodes[i].command.execute());
    });
    return namespace;
  }

  execute() {
    var ret = null;
    VariableEnvironment.pushNamespace(this.namespace);
    console.log("pushing");
    try {
      for (var i = 0; i < this.statements.length; i++) {
        this.execPush(this.statements[i].command);
        // if (this.statements[i].command instanceof ReturnCommand) break;
        // if (ret instanceof ReturnValue) break;
      }
      VariableEnvironment.popNamespace(this.namespace);
    }
    catch (e) {
      VariableEnvironment.popNamespace(this.namespace);
      // quick easy way to return value from any nested call
      if (e instanceof FunctionReturn)
        ret = e.value; 
      else // some other error
        throw e;
    }

    // indicate that further calls to execute
    // should no longer update stack
    this.storedStack = true;
    return ret;
  }

  undo() {
    VariableEnvironment.pushNamespace(this.namespace);
    try {
      this.executed.slice().reverse().forEach(cmd => cmd.undo());
      VariableEnvironment.popNamespace(this.namespace);
    }
    catch (e) {
      VariableEnvironment.popNamespace(this.namespace);
      throw e;
    }
  }
}

class ReturnCommand extends ConsoleCommand {
  executeSelf() {
    throw new FunctionReturn("Return called outside function", this.args[0]);
  }
}

class FunctionReturn extends Error {
  constructor(message, retValue) {
    super(message);
    this.value = retValue;
    this.name = "";
  }
}

// for debugging

class DirCommand extends ConsoleCommand {
  constructor(cState, ...args) {
    super(...args);
  }

  executeChildren() {
    super.executeChildren();
    this.canvasObject = this.args[0];
  }

  precheckArguments() {
    this.checkArgsLength(1);
  }

  executeSelf() {
    var keys = c => Array.from(Object.keys(c));
    var propNames = keys(this.canvasObject.propNames());
    var methNames = keys(this.canvasObject.methodNames());
    methNames = methNames.map(s => `${s}()`);

    return (propNames.concat(methNames)).map(s => `'${s}'`);
  }
}
