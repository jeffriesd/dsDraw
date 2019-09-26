
/*  Command classes encapsulate actions on the canvas
 *  through either mouse clicks or commands entered in the
 *  user console. These classes allow for simple 
 *  handling of undo/redo state.
 */


/**
 *  Console command objects
 *
 */

/** cloneObjectsMaintainAnchors
 *    function to clone every object in an array
 *    and maintain connections between arrows
 *    and their anchors
 *    @param {*} objects - array of objects
 */
function cloneObjectsMaintainAnchors(objects) {
  // clone arrows last so their anchors get cloned first
  // (false comes first in sorting)
  objects = objects.sort(x => x.locked != null);

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

/**
 * Clone canvas objects and also copy
 * variable environment state
 */
class CloneCanvasCommand {
  constructor(cState) {
    this.cState = cState;
    this.originals = this.cState.objects.slice();
  }

  cloneObjects() {
    this.receivers = cloneObjectsMaintainAnchors(this.originals);

    // also update aliases
    // this.receivers.forEach(obj => {
    //   var venv = VariableEnvironment.getInstance();
    //   if (venv.aliases.has(obj.label)) {
    //     venv.aliases.get(obj.label).forEach(alias => {
    //       if (venv.hasVar(alias))
    //         VariableEnvironment.setVar(alias, obj);
    //     });
    //   }
    // })
  }

  execute() {
    if (this.receivers == null) this.cloneObjects();

    this.receivers.forEach(r => r.restore());
    // necessary to bind labels to objects
    // in new clip when switching and labels are shared
    // this.cState.updateLabels();
  }

  undo() { 
    this.cState.clearCanvas();
  }
}

/**
 * Clone canvas objects and also copy
 * variable environment state
 */
class CloneEnvCommand {
  constructor() {
    this.cState = cState;
  }

  /** CloneEnvCommand.cloneEnv
   *    clone entire variable environment 
   *    from current canvas. Entries that point
   *    to canvas objects should point to 
   *    their clones in the new venv.
   * 
   *    this is handled automatically for 
   *    venv.canvasObjects because
   *    they get cloned by CloneCanvasCommand and
   *    updated. 
   *    however aliases of canvas objects (in venv.variables)
   *    must be updated manually
   */
  cloneEnv() {
    this.env = VariableEnvironment.clone();

    // update aliases
    this.env.mainVariables.forEach((v, k) => {
      if (v._cloneRef)
        this.env.mainVariables.set(k, v._cloneRef);
    });
  }

  execute() {
    console.log("exec cloneenv")
    if (this.env == null) this.cloneEnv();

    VariableEnvironment.setState(this.env);
  }

  undo() { 
    VariableEnvironment.clearAll();
  }
}


/** ConsoleCommand
 *    Provides some template methods for 
 *    all commands that form statements 
 *    in the language. 
 */
class ConsoleCommand {
  constructor(...argNodes) {
    this.argNodes = argNodes; // astNodes 
    this.args = []; // evaluated argNodes

    // save state before execution
    this.prevState = null;

    // save childnodes which
    // successfully get executed on first execute
    this.executedChildren = false;
    this.savedChildren = [];
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

  argsError(errMessage) {
    if (this.usage)
      throw errMessage + "\nUsage: " + this.usage();
    throw errMessage;
  }

  /** ConsoleCommand.precheckArguments
   *    check number of arguments etc. before
   *    arguments get evaluated
   */
  precheckArguments() {
  }
  
  /** ConsoleCommand.executeChildren
   *  //TODO check for cached literal result
   *  //TODO push nodes to stack for reverse postorder (recursive undo)
   *  
   *  do synchronously so any sync child commands
   *  are certain to be evaluated 
   * 
   *  e.g. 
   * 
   *  x = f()
   * 
   *  if f is a sync function it needs 
   *  to finish executing and pushing/popping namespaces
   */
  executeChildren() {
    return new Promise(resolve => {
      this.precheckArguments();
      this.args = [];

      resolve(
        // filter is necessary at least for interpreation of arr[:]
        this.argNodes.filter(node => node != undefined)
        .reduce((prev, current) => {
          return prev.then(_ => {
            return liftCommand(current.command)
              .then(ret => this.args.push(ret));
          });
        }, new Promise(resolve => resolve()))
      );
    });
  }

  getChildValues() { }

  checkArguments() { }

  saveState() { }

  restoreState(state) { }

  /** ConsoleCommand.execute
   *    Template method:
   *      - execute children (post order)
   *      - check results for semantic constraints
   *      - execute self
   */
  execute() {
    return this.executeChildren()
    .then(() => this.executedChildren = true)
    .then(() => {
      this.getChildValues();
      this.checkArguments();
      if (this.prevState == undefined) this.prevState = this.saveState();

      return this.executeSelf();
    })
  }

  
  /** ConsoleCommand.undo
   *    undo the earliest actions first, so 
   *    first undo "children"
   *    (i.e. argument nodes) in reverse
   *    and then undo self 
   */
  undo() {
    try {
      // if error occurred in this command,
      // it likely can't be undone successfully 
      this.undoSelf();
    }
    catch(err) {
      console.warn("failed to undo", this.constructor.name);
    }
    finally {
      this.argNodes.slice().reverse()
        .filter(cmd => cmd != undefined)
        .forEach(cmd => cmd.command.undo());
    }
  }

  undoSelf() { 
    console.log("using default undo");
    this.restoreState(this.prevState);
  }

  // safeUndo() {
  //   this.undoSelf();
  //   this.argNodes.slice().reverse()
  //     .filter(node => node != undefined)
  //     .forEach(argNode => {
  //       if (argNode.command.prevState)
  //         argNode.command.restoreState(argNode.command.prevState);
  //     });
  // }
}

/**
 * Just calls destroy on first argument
 */
// class ConsoleDestroyCommand extends ConsoleCommand {
//   constructor(cState, receiver) {
//     super(receiver);
//     this.cState = cState;
//   }
// 
//   usage() {
//     return "delete(objLabel)";
//   }
// 
//   precheckArguments() {
//     this.checkArgsLength(1);
//   }
// 
//   getChildValues() {
//     this.receiver = this.args[0];
//     this.objLabel = this.receiver.label;
//   }
// 
//   checkArguments() {
//     if (! (this.receiver instanceof CanvasObject))
//       throw `Cannot delete non-CanvasObject '${stringify(this.receiver)}'.`;
//   }
// 
//   /** ConsoleDestroyCommand.executeSelf
//    *    hide object and destroy variable bindings
//    */
//   executeSelf() {
//     this.deletedBindings = VariableEnvironment.deleteCanvasObj(this.receiver.label);
//     this.receiver.hide();
//   }
// 
//   /** ConsoleDestryCommand.saveState
//    *    save relevant part of variable environment 
//    *    (i.e. the canvas object label binding
//    *      and any variable bindings that point to it)
//    */
//   saveState() {
//     return {
//       
//     };
//   }
// 
//   restoreState(state) {
// 
//   }
// 
//   // undoSelf() {
//   //   this.deletedBindings.forEach((v, k) => {
//   //     VariableEnvironment.setVar(k, v);
//   //   });
//   //   this.receiver.unhide();
//   // }
// }

class AssignVariableCommand extends ConsoleCommand {
  constructor(variableName, value) {
    super(value);
    this.variableName = variableName;

    this.previousValue = undefined;
    if (VariableEnvironment.hasVar(this.variableName))
      this.previousValue = VariableEnvironment.getVar(this.variableName);

    // variables that corresponed to function names
    // can't be reassigned
    if (VariableEnvironment.hasFunction(this.variableName))
      throw `Cannot reassign function name: '${this.variableName}' .`;
  }

  /** AssignVariableCommand.executeChildren
   *    evaluate opNode on right side of equals 
   */
  getChildValues() {
    this.value = this.args[0];
  }

  /** AssignVariableCommand.execute
   *    either assign label to result of constructor/function
   *    (which calls VarEnv.setVar) or simply call
   *    VarEnv.setVar
   */
  executeSelf() {
    // if (this.value instanceof CanvasObject) {
    //   if (this.funcReturn)
    //     this.value.label = this.variableName;
    // }

    // CBHERE
    VariableEnvironment.setVar(this.variableName, this.value); 
  }

  /** AssignVariableCommand.undoSelf
   *    restore previous value
   */
  // undoSelf() {
  //   if (this.previousValue === undefined)
  //     VariableEnvironment.deleteVar(this.variableName);
  //   else
  //     VariableEnvironment.setVar(this.variableName, this.previousValue)
  // }

  /** AssignVariableCommand.saveState
   *    save current binding of this.variableName
   */
  saveState() {
    var prevValue = undefined;
    if (VariableEnvironment.hasVar(this.variableName))
      prevValue = VariableEnvironment.getVar(this.variableName)
    return {
      previousValue :  prevValue,
    };
  }

  restoreState(state) {
    if (state.previousValue !== undefined)
      VariableEnvironment.setVar(this.variableName, state.previousValue);
    else 
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
    
    // propName is either exact property name or alias
    if (Object.values(this.receiver.propNames()).includes(this.propName)) // exact
      this.property = this.propName;
    else // alias
      this.property = this.receiver.propNames()[this.propName];

    // save original value for undo
    // this.oldValue = this.receiver[this.property];
  }

  getChildValues() {
     
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
      throw `Invalid value '${this.value}' for property '${this.propName}'. Expected type: ${expectedType}.`;
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

  // undoSelf() {
  //   this.receiver[this.property] = this.oldValue;
  // }

  saveState() {
    return {
      prevValue : this.receiver[this.property],
    }
  }

  restoreState(state) {
    this.receiver[this.property] = state.prevValue;
  }
}

// take value directly (as opposed to valueNode in ConfigCommand)
class MenuConfigCommand extends ConfigCommand {
  constructor(receiver, propName, value) {
    super(receiver, propName);
    this.value = value;
  }

  getChildValues() {
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

  // undoSelf() {
  // }

  // no save/restore (handled by ConfigCommand)
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

  getChildValues() {
     
    this.receiver = this.args[0];
    if (this.lowArgNode != null)
      this.low = this.args[1];
    else this.low = null;
    if (this.highArgNode != null)
      this.high = this.args[2];
    else this.high = null;
  }

  checkArguments() {
    if (this.low !== null && typeof this.low != "number")
      throw "Lower bound of accessor is not a number:" + this.low;
    if (this.high !== null && typeof this.high != "number")
      throw "Higher bound of accessor is not a number:" + this.high;
  }

  /** GetChildrenCommand.executeSelf
   *    if receiver is a data structure, use getChildren
   *    if receiver is dictionary, return entries with low <= key < high
   *    otherwise slice the array
   */
  executeSelf() {
    if (this.receiver instanceof Array) {
      if (this.low == null) this.low = 0;
      if (this.high == null) this.high = this.receiver.length;
      return this.receiver.slice(this.low, this.high)
    }
    if (this.receiver instanceof CanvasObject || this.receiver instanceof LanguageObject) {
      if (this.receiver.getChildren == undefined)
        throw `${this.receiver.constructor.name} does not support access by key.`;
      return this.receiver.getChildren(this.low, this.high);
    }
    if (this.receiver instanceof Dictionary) {
      var inRange = [];
      if (this.low == null) this.low = Number.NEGATIVE_INFINITY;
      if (this.high == null) this.high = Number.POSITIVE_INFINITY;
      this.receiver.forEach((v, k) => {
        if (typeof k == "number" && k >= this.low && k < this.high)
          inRange.push(v);
      });
      return inRange;
    }
    throw `Cannot perform range access on '${this.receiver.constructor.name}'.`;
  }
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

  getChildValues() {
     
    this.receiver = this.args[0];
    this.key = this.args[1];
  }

  checkArguments() {
    if (this.receiver instanceof LanguageObject) return;
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

    if (this.receiver instanceof CanvasObject || this.receiver instanceof LanguageObject) {
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

  getChildValues() {
     
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

  getChildValues() {
     
    this.receivers = this.args[0];
    if (! (this.receivers instanceof Array))
      this.receivers = [this.receivers];

    // must be passed to ConfigCommand as an opNode
    this.rValueNode = this.argNodes[1];

    if (this.configCommands.length == 0) {
      this.receivers.forEach((receiver) => {
        this.configCommands.push(new ConfigCommand(receiver, this.property, this.rValueNode));
      });
    }
  }

  checkArguments() {
    if (this.receivers.some(x => ! (x instanceof CanvasObject || x instanceof CanvasChildObject)))
      throw "Cannot configure range of non-CanvasObjects";
  }

  executeSelf() {
    return this.configCommands.reduce((prev, cur) => {
      return prev.then(() => cur.execute());
    }, new Promise(resolve => resolve()));
  }

  saveState() {
    return { 
      stateMap : this.configCommands.map(cmd => [cmd, cmd.saveState()]),
    };
  }

  restoreState(state) {
    state.stateMap.forEach(([cmd, cmdState]) => cmd.restoreState(cmdState));
  }

  // undoSelf() {
  //   this.configCommands.forEach(cmd => cmd.undo());
  // }
}

class AssignListElementCommand extends ConsoleCommand {

  // assign list/list value at idx/key
  getChildValues() {
     
    this.list = this.args[0];
    this.index = this.args[1];
    this.rValue = this.args[2];
  }

  checkArguments() {
    if (this.list instanceof Dictionary) return;
    if (! (this.list instanceof Array))
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

  // undoSelf() {
  //   this.list[this.index] = this.oldValue;
  // }

  saveState() {
    if (this.list instanceof Dictionary) 
      return {
        previousValue : this.list.get(this.index),
      };
    else if (this.list instanceof Array)
      return {
        previousValue : this.list[this.index],
      };
  }

  restoreState(state) {
    if (this.list instanceof Dictionary) 
      this.list.set(this.index, state.previousValue);
    else if (this.list instanceof Array)
      this.list[this.index] = state.previousValue;
  }
}

class CanvasObjectMethod extends ConsoleCommand {

  constructor(receiver, ...argNodes) {
    super();
    this.receiver = receiver;
    this.argNodes = argNodes;
  }

}
/**
 * Heap methods
 */

class BinaryHeapCommand extends CanvasObjectMethod {
}


/**
 * Built-in math (rand, randn), util (range)
 */

class RandomIntCommand extends ConsoleCommand {
  constructor(cState, min, max) {
    super(min, max);
    this.value = null;
  }
  getChildValues() {
     
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
  getChildValues() {}
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

  getChildValues() {
     
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

/** BuildDictCommand
 *    The array of argnodes correspond to dictionary values,
 *    and there is an additional array argument for the keys
 *    
 *    Keys are raw text (not quoted string)
 *    and values can be any expression
 * 
 *    since the values could require executing async functions,
 *    BuildDictCommand counts as a console command
 */
class BuildDictCommand extends ConsoleCommand {
  constructor(keys, ...args) {
    super(...args); 
    this.keys = keys;
  }

  precheckArguments() {
    if (this.keys.length != this.argNodes.length)
      throw "Dictionary requires same number of keys and values";
  }

  executeSelf() {
    this.dict = new Dictionary();
    this.args.forEach((value, i) => {
      this.dict.set(this.keys[i], value);
    });
    return this.dict;
  }
}

/** BuildListCommand
 *    The array of argnodes is exactly the array
 *    of expressions specified in the list constructor
 */
class BuildListCommand extends ConsoleCommand {
  executeSelf() {
    return this.args.slice();
  }
}

class GetVariableCommand {
  constructor(varName) {
    this.varName = varName;
  }

  execute() {
    if (this.varName in mainCommands)
      return mainCommands[this.varName];
    if (this.varName in constructors)
      return constructors[this.varName];
    return VariableEnvironment.getVar(this.varName);
  }

  undo() { }
}

// for debugging

class DirCommand extends ConsoleCommand {
  constructor(cState, ...args) {
    super(...args);
  }

  getChildValues() {
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


/** Show a hidden canvas object
 */
class ShowCommand extends ConsoleCommand {
  constructor(cState, ...args) {
    super(...args);
  }

  getChildValues() {
    this.receiver = this.args[0];
  }

  precheckArguments() {
    this.checkArgsLength(1);
  }

  /** ShowCommand.checkArguments
   *    receiver should be top-level canvas object
   */
  checkArguments() {
    if (this.receiver instanceof CanvasObject) return;
    throw "Argument to 'show' must be top-level canvas object";
  }

  executeSelf() {
    this.receiver.unhide();
  }

  // undoSelf() {
  //   if (this.wasHidden) this.receiver.hide();
  // }

  saveState() {
    return {
      hidden: this.receiver.dead,
    }
  }

  restoreState(state) {
    if (state.hidden) this.receiver.hide();
    else this.receiver.unhide();
  }
}

class HideCommand extends ConsoleCommand {
  constructor(cState, ...args) {
    super(...args);
  }

  getChildValues() {
    this.receiver = this.args[0];
  }

  precheckArguments() {
    this.checkArgsLength(1);
  }

  /** HideCommand.checkArguments
   *    receiver should be top-level canvas object
   */
  checkArguments() {
    if (this.receiver instanceof CanvasObject) return;
    throw "Argument to 'show' must be top-level canvas object";
  }

  executeSelf() {
    this.receiver.hide();
  }

  saveState() {
    return { hidden: this.receiver.dead };
  }

  restoreState(state) {
    if (state.hidden) this.receiver.hide();
    else this.receiver.unhide();
  }
}

class ClearCanvasCommand extends ConsoleCommand {
  constructor(cState) {
    super();
  }

  executeSelf() {
  }
}

/** BuckCommand
 *    the buck command comes in two forms:
 * 
 *    buck getter:
 *      $(objLabel) 
 *    restrictions: 
 *      objlabel must evaluate to a string
 *    return:
 *      canvas object with label objLabel, if it exists
 *      null otherwise 
 *    
 *    buck setter: 
 *      $(objLabel, canvasObject)
 *    restrictions:
 *      objLabel must evaluate to a string
 *      canvasObject must be a CanvasObject
 */
class BuckCommand extends ConsoleCommand {
  constructor(cState, ...args) {
    if (args.length == 1) return new BuckGetCommand(...args);
    if (args.length == 2) return new BuckSetCommand(...args);
    // otherwise throw exception
    super(...args);
    this.checkArgsLength(1, 2);
  }

}

class BuckGetCommand extends ConsoleCommand {
  usage() {
    return "$(objLabel) returns the canvas object with this label if it exists";
  }

  getChildValues() {
    this.objLabel = this.args[0];
  }

  checkArguments() {
    if (typeof this.objLabel !== "string") this.argsError("objLabel must be a string");
  }

  // no state to save, restore

  executeSelf() {
    if (! VariableEnvironment.hasCanvasObj(this.objLabel)) return null;
    return VariableEnvironment.getCanvasObj(this.objLabel);
  }
}

/**
 *  what is mutated? 
 *    
 *  
 */
class BuckSetCommand extends ConsoleCommand {

  usage() {
    return "$(objLabel, canvasObject) sets a canvas objects' label";
  }

  getChildValues() {
    this.objLabel = this.args[0];
    this.canvasObject = this.args[1];
  }

  /** BuckSetCommand.checkArguments
   *    make sure canvasObject argument is indeed a CanvasObject
   *    and that no other canvas object already has this label
   */
  checkArguments() {
    if (typeof this.objLabel !== "string") this.argsError("objLabel must be a string");
    if (! (this.canvasObject instanceof CanvasObject))
      this.argsError("canvasObject argument must refer to a canvas object");

    // check that new label isn't already taken
    if (VariableEnvironment.hasCanvasObj(this.objLabel)) 
      throw `Label ${this.objLabel} is already taken.`;
  }

  /** BuckCommand.saveState
   *    
   */
  saveState() { 
    return { 
      label: this.canvasObject.label,
    }
  }

  /** BuckCommand.restoreState
   *    delete binding for canvas object's current label
   *    and create a new binding with the new label
   */
  restoreState(state) {
    VariableEnvironment.deleteCanvasObj(this.canvasObject.label);
    VariableEnvironment.setCanvasObj(state.label, this.canvasObject);
    this.canvasObject.label = state.label;
  }

  executeSelf() {
    VariableEnvironment.deleteCanvasObj(this.canvasObject.label);
    VariableEnvironment.setCanvasObj(this.objLabel, this.canvasObject);
    this.canvasObject.label = this.objLabel;
  }

}