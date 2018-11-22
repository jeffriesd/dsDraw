
/*  Command classes encapsulate actions on the canvas
 *  through either mouse clicks or commands entered in the
 *  user console. These classes allow for simple 
 *  handling of undo/redo state.
 */

/*  FlowchartBoxCommand(s)
 *    -- let's not create new command objects if the
 *    receiver class doesn't implement the method 
 *
 *    move(deltaX, deltaY)
 *      FlowchartBox:
 *        translates text box  
 *      Arrow:
 *        translates arrow
 *      ArrowHead:
 *        translates arrow (calls parent.move())
 *    
 *    drag(deltaX, deltaY)
 *      CurvedArrow:
 *        translates active control point 
 *      ArrowHead: 
 *        if parent is RA: creates new angle and moves end point (if shift hotkey pressed)
 *        if parent is curved: translates end point 
 *      ResizePoint:
 *        call parentBox.resize(deltaX, deltaY)
 *
 *   
 *    changing settings:
 *      can create command objects for 
 *      SetFlowchartBoxOption(receiver, optionName, optionValue)
 *        execute()
 *          -- save old option
 *          -- receiver[optionName] = optionValue
 *        undo()
 *          -- receiver[optionName] = oldOption
 *
 *    object instantiation:
 *      execute()
 *        create new object, make it active, append it to list of canvas objects
 *
 *      undo()
 *        remove from list of objects, put it on redo stack
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
    console.log("Execute not implemented for ", this.constructor.name);
  }

  undo() {
    console.log("Undo not implemented for ", this.constructor.name);
  }
}


/**  Handles object instantiation using click and drag
 */
class ClickCreateCommand extends DrawCommand {
  constructor(cState, receiver) {
    super(cState, receiver);
  }

  execute() {
    this.cState.addCanvasObj(this.receiver);
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
    this.deltaX = this.state.endPoint.x - this.state.startPoint.x;
    this.deltaY = this.state.endPoint.y - this.state.startPoint.y;

    if (this.cState.selectGroup.size) 
      this.group = new Set(this.cState.selectGroup);
    else
      this.group = [this.receiver];
  }

  execute() {
    this.group.forEach((receiver) => {
      receiver.move(this.deltaX, this.deltaY);
    });
  }

  undo() {
    // move (translate) back to initial point
    this.group.forEach((receiver) => {
      receiver.move(-this.deltaX, -this.deltaY);
    });
  }
}

class DragCommand extends DrawCommand {
  constructor(cState, receiver) {
    super(cState, receiver);
    this.deltaX = this.state.endPoint.x - this.state.startPoint.x;
    this.deltaY = this.state.endPoint.y - this.state.startPoint.y;
  }

  execute() {
    this.receiver.drag(this.deltaX, this.deltaY);
  }

  undo() {
    // drag back to initial point
    this.receiver.drag(-this.deltaX, -this.deltaY);
  }
}

class CloneCommand extends DrawCommand {
  constructor(cState, receiver) {
    super(cState, receiver);
    this.deltaX = this.state.endPoint.x - this.state.startPoint.x;
    this.deltaY = this.state.endPoint.y - this.state.startPoint.y;

    if (this.cState.selectGroup.size) 
      this.group = new Set(this.cState.selectGroup);
    else
      this.group = [this.receiver];

    // happens after mouse up, so execute here
    this.execute();
  }
  
  execute() {
    this.group.forEach((receiver) => {
      var cl = receiver.getParent().clone();

      cl.move(this.deltaX, this.deltaY);
    });

    if (this.group.size == 1) {
      this.cState.selectGroup.forEach((obj) => {
        this.cState.activeObj = obj;
        this.cState.showToolbar();
      });
    }
  }

  undo() {
    this.group.forEach((receiver) => {
      this.cState.remove(receiver);
    });
  }

}

class SelectCommand {
  constructor(cState) {
    this.cState = cState;

    this.x1 = cState.mouseDown.x;
    this.y1 = cState.mouseDown.y;
    this.x2 = cState.mouseUp.x;
    this.y2 = cState.mouseUp.y;

    console.log("new select");

    // happens after mouseup, so execute here
    this.execute();
  }

  /** SelectCommand.execute
   *    iterate through canvas objects and check if 
   *    starting point is 
   */
  execute() {
    this.cState.selectGroup.clear();
  
    this.cState.objects.forEach((cObject) => {
      var pObj = cObject.getParent();
      var pt = cObject.getStartCoordinates();

      if (pt.x <= this.x2 && pt.x >= this.x1 
           && pt.y <= this.y2 && pt.y >= this.y1)
        this.cState.selectGroup.add(pObj);
    });

    console.log("selected = ", this.cState.selectGroup);

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
   *    then clear selection, otherwise
   *    just move onto the next undo
   */
  undo() {
    if (this.cState.selectGroup.size)
      this.cState.selectGroup.clear();
    else
      this.cState.undo();
  }
}


/**
 *  Console command objects
 *
 */

// allow multiple names to be used
// for some classes e.g. array, array1d
const classNames = new Map([
      ["array", Array1D],
      ["array1d", Array1D], 
]); 

class ConsoleCreateCommand {
  constructor(canvasState, objType, label="") {
    this.cState = canvasState;
    console.log("in ConsoleCreateCOmmand, objType =", objType);
    this.objType = objType.toLowerCase();
    this.objClass = classNames.get(this.objType);
    
    if (this.objClass == null) 
      throw `No class known by name '${objType}'.`;
 
    this.coords = this.objClass.defaultCoordinates(this.cState);

    console.log("objType = ", objType);

    this.label = label;
    
  }

  execute() {
    // been done before (undo has happened)
    if (this.obj) {
      this.cState.addCanvasObj(this.obj);
    }
    else {
      this.obj = 
        new this.objClass(this.cState, this.coords.x1, this.coords.y1,
                            this.coords.x2, this.coords.y2);  
     
      this.obj.label = this.label;
    }
    
    return this.obj;
  }

  undo() {
    if (this.obj) {
      this.obj.destroy(); 
      console.log("destroying", this.obj);
    }
  }
}

const ArrayNodePropNames = new Map([
      ["bg", "fill"],
      ["background", "fill"],
      ["fill", "fill"],
      ["=", "value"],
      ["value", "value"],
      ["border", "borderThickness"],
      ["fg", "textColor"],
      ["fg", "textColor"],
      ["ind", "showIndices"]
]);

const Array1DPropNames = new Map([
    ["ff", "fontFamily"],
    ["fontFamily", "fontFamily"],
    ["font", "fontSize"],
    ["fontSize", "fontSize"],
    ["fs", "fontSize"],
    ["label", "label"]
]);

const propNames = new Map([
  ["ArrayNode", ArrayNodePropNames],
  ["Array1D", Array1DPropNames],
]);

/**   convert user-entered text to actual value
 *    e.g. on = true, off = false
 */
const conversionValues = new Map([
  ["on", true],
  ["off", false],
]);

/** ConfigCommand 
 *    receiver param is an actual object (not string). This way
 *    RangeConfigCommand can create a bunch of ConfigCommand
 *    objects for the child objects (e.g. array cells),
 *    which won't have names themselves
 */
class ConfigCommand {
  constructor(receiver, property, value) {
    this.receiver = receiver;

    this.propNames = propNames.get(receiver.constructor.name);
    console.log("constr name = ", receiver.constructor.name);

    this.property = this.propNames.get(property);

    if (this.property == null)
      throw `${receiver.constructor.name} has no property '${property}'.`;

    this.value = this.parseValue(value);
    console.log("config value = ", this.value);

    // save original value for undo
    this.oldValue = this.receiver[this.property];
  }

  /** ConfigCommand.parseValue
   *    convert user-entered text to actual value
   *    e.g. on = true, off = false
   */
  parseValue(value) {
    if (conversionValues.get(value) != null)
      return conversionValues.get(value);
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

class RangeConfigCommand {
  constructor(parentObj, range, property, value) {
    this.parentObj = parentObj;
    this.range = range;
    this.receivers = this.getReceivers();

    console.log("parent in range cmd is ", parentObj.label);

    this.configCommands = [];

    this.receivers.forEach((receiver) => {
      var configCmd = new ConfigCommand(receiver, property, value);
      this.configCommands.push(configCmd);
    });
  }

  /** RangeConfigCommand
   *    parses range in input e.g. pulls (3, 5) from arr1[3:5]
   */
  getReceivers() {
    var brackets = /(\[|\])/g
    var range = this.range.replace(brackets, "")

    // input was a1[]
    if (range == "") 
      return this.parentObj.getChildren();
     
    range = range.split(":");
    var low = parseInt(range[0]);
    var high = parseInt(range[1]);
    if (range[1] == null)
      high = low + 1;

    if (isNaN(low) || isNaN(high))
      throw `Invalid range: [${low}: ${high}]`;

    return this.parentObj.getChildren(low, high);
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
