
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

    this.clones = [];

    // happens after mouse up, so execute here
    this.execute();
  }
 
  /** CloneCommand.execute
   *    Clone all objects in selection except those
   *    objects which are 'locked' to a parent,
   *    e.g. an arc that is attached to an array
   */  
  execute() {
    this.group.forEach((receiver) => {
      if (! receiver.getParent().locked) {
        // check that label isn't already taken
        var cl = receiver.getParent().clone();

        // save clones for undoing
        this.clones.push(cl);
        cl.move(this.deltaX, this.deltaY);
      }
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
  constructor(cState, receiver) {
    this.cState = cState;
    this.receiver = receiver;

    // save label for undo
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
class ConsoleDestroyCommand {
  constructor(cState, receiverLabel) {
    this.cState = cState;
    this.receiver = this.cState.labeled.get(receiverLabel);

    // save label for undoing
    this.objLabel = receiverLabel;
  }

  execute() {
    this.receiver.destroy();
  }

  undo() {
    this.receiver.restore();
    this.receiver.label = this.objLabel;
  }
}

// allow multiple names to be used
// for some classes e.g. array, array1d
const classNames = {
  "array": Array1D,
  "array1d": Array1D, 
  "list": LinkedList,
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
    console.log("in ConsoleCreateCommand, objType =", objType);
    this.objType = objType.toLowerCase();
    this.objClass = classNames[this.objType];
    
    if (this.objClass == null) 
      throw `No class known by name '${objType}'.`;
 
    this.coords = this.objClass.defaultCoordinates(this.cState);

    this.label = label;
  }

  execute() {
    // if label already exists, reject command
    if (this.cState.labeled.get(this.label)) 
      throw `Object with label '${this.label}' already exists.`;

    // been done before (undo has happened)
    if (this.obj) {
      this.cState.addCanvasObj(this.obj);
    }
    else {
      this.obj = 
        new this.objClass(this.cState, this.coords.x1, this.coords.y1,
                            this.coords.x2, this.coords.y2);  
    }

    console.log("created obj:", this.obj);
   
    this.obj.label = this.label;
    
    return this.obj;
  }

  undo() {
    if (this.obj) {
      this.obj.destroy(); 
      console.log("destroying", this.obj);
    }
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

class Array1DCommand {
  constructor(receiver) {
    this.receiver = receiver;
  }

  checkIndices(...indices) {
    var len = this.receiver.array.length;
    
    indices.forEach(i => {
      if (i >= len || i < 0)
        throw `Invalid index: ${i}`;
    });
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
    super(receiver);

    if (newLength < 1)
      throw `Invalid array length: ${newLength}`;

    this.newLength = newLength;

    // save old array for undo
    this.prevArray = this.receiver.array.slice();

    this.prevArrows = {};
  }

  execute() {
    var startLength = this.receiver.array.length;
    for (var i = startLength; i <= this.newLength; i++)
      this.receiver.append("random");

    if (this.newLength < startLength) {
      this.receiver.array = this.receiver.array.slice(0, this.newLength); 
       
      for (var aidx in this.receiver.arrows) {
        var arrow = this.receiver.arrows[aidx];
        var start = parseInt(aidx.split(",")[0]);
        var end = parseInt(aidx.split(",")[1]);
        if (start >= this.newLength || end >= this.newLength) {
          this.prevArrows[aidx] = arrow;
          delete this.receiver.arrows[aidx];
          arrow.destroy();
        }
      }
    }
  }

  undo() {
    this.receiver.array = this.prevArray;

    // add back any removed arrows
    Object.assign(this.receiver.arrows, this.prevArrows);
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
   *    if one already exists, undo it
   */
  execute() {
    if (this.receiver.arrows[[this.i1, this.i2]]) {
      this.undo();
      return;
    }

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

    // add arrow to array mapping
    this.receiver.arrows[[this.i1, this.i2]] = this.arrow;
  }

  /** Array1DArrowCommand.undo
   *    remove arrow if it exists otherwise recreate it
   */
  undo() {
    // arrow exists
    if (this.receiver.arrows[[this.i1, this.i2]])  {
      var toDelete = this.receiver.arrows[[this.i1, this.i2]];
      delete this.receiver.arrows[[this.i1, this.i2]];
      toDelete.destroy();
    }
    // arrow doesn't exist
    else
      this.execute();
  }
}


/** LinkedList commands
 */
class LinkedListCommand {
  constructor(receiver) {
    this.receiver = receiver;
  }

  checkIndices(...indices) {
    indices.forEach(i => {
      if (! (i in this.receiver.list))
        throw `Invalid indices: ${index1}, ${index2}.`;
    });
  }
}

class LinkedListInsertCommand extends LinkedListCommand {
  constructor(receiver, fromIndex, value) {
    super(receiver);

    this.checkIndices(fromIndex);

    this.value = value;
    this.fromNode = this.receiver.list[fromIndex];
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

    this.checkIndices(fromIndex, toIndex);
  
    this.fromNode = this.receiver.list[fromIndex];
    this.toNode = this.receiver.list[toIndex];
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

    this.checkIndices(fromIndex, toIndex);

    this.fromNode = this.receiver.list[fromIndex];
    this.toNode = this.receiver.list[toIndex];
  }

  execute() {
    this.receiver.removeEdge(this.fromNode, this.toNode);
  }

  undo() {
    this.receiver.addEdge(this.fromNode, this.toNode);
  }
}

/** Util commands
 *  e.g. save
 */

class ExportToImageCommand {
  constructor(cState) {
    this.cState = cState;
  }

  execute() {
    var link = document.getElementById("downloadLink");
    link.setAttribute("download", "image.jpg");
    link.setAttribute("href", this.cState.canvas.toDataURL());
    link.click();
  }

  undo() {
    
  }
}
