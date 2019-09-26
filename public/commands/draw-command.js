
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
    this.cState.clearSelectGroup();
    var toRaise = [];
  
    this.cState.objects.forEach((cObject) => {
      var pObj = cObject.getParent();
      var pt = cObject.getStartCoordinates();

      if (pt.x <= this.x2 && pt.x >= this.x1 
           && pt.y <= this.y2 && pt.y >= this.y1) {
        this.cState.addToSelectGroup(pObj);
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
      this.cState.clearSelectGroup();
  }
}



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
      endPoint: this.cState.mouseMove,
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


/** MouseMoveCommand
 *    supports single element or group translation on canvas
 */
class MouseMoveCommand extends DrawCommand {
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


    this.clones = cloneObjectsMaintainAnchors(this.group);

    this.newPos = this.group.map(r => {
      return { x: r.x + deltaX, y: r.y + deltaY };
    });
  }
 
  /** CloneCommand.execute
   *    Clone all objects in selection 
   *    and translate by dx, dy
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
 */
class ClickDestroyCommand {
  constructor(cState, ...receivers) {
    this.cState = cState;
    this.receivers = receivers;
  }

  execute() {
    this.deletedBindings =  [];
    this.receivers.forEach(r => { 
      r.hide();
      // var deleted = VariableEnvironment.deleteCanvasObj(r.label);
      // this.deletedBindings.push(deleted);
    });
  }

  undo() {
    this.receivers.forEach((r, i) => {
      r.unhide();
      // this.deletedBindings[i].forEach((v,  k) => {
      //   VariableEnvironment.setVar(k, v);
      // })
    });
  }
}
