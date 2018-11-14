
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
      startPoint: this.cState.startPoint,
      endPoint: this.receiver.getStartCoordinates(),
    };
  }

  execute() {
    console.log("Execute not implemented for ", this.constructor.name);
  }

  undo() {
    console.log("Undo not implemented for ", this.constructor.name);
  }
}


/**  Handles object instantiation and adding to canvas
 */
class CreateCommand extends DrawCommand {
  constructor(cState, receiver) {
    super(cState, receiver);
  }

  execute() {
    this.cState.addCanvasObj(this.receiver);
  }

  undo() {
    this.cState.remove(this.receiver);
  }
}


class MoveCommand extends DrawCommand {
  constructor(cState, receiver) {
    super(cState, receiver);
    this.deltaX = this.state.endPoint.x - this.state.startPoint.x;
    this.deltaY = this.state.endPoint.y - this.state.startPoint.y;
  }

  execute() {
    this.receiver.move(this.deltaX, this.deltaY);
  }

  undo() {
    // move (translate) back to initial point
    this.receiver.move(-this.deltaX, -this.deltaY);
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

class SelectCommand {
  constructor(cState) {
    this.cState = cState;

    this.x1 = cState.mouseDown.x;
    this.y1 = cState.mouseDown.y;
    this.x2 = cState.mouseUp.x;
    this.y2 = cState.mouseUp.y;

    console.log("new select");

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

  }

  undo() {
    this.cState.selectGroup.clear();
  }
}
