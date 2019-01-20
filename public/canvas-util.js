canvasObjectClasses = {
  "RectBox": RectBox,
  "RoundBox": RoundBox,
  "DiamondBox": DiamondBox,
  "ParallelogramBox": ParallelogramBox,
  "RightAngleArrow": RightAngleArrow,
  "CurvedArrow": CurvedArrow,
  "Connector": Connector,
  "Array1D": Array1D,
};

canvasToolClasses = {
  "SelectTool": CanvasSelect,
};


/** randInt
 *  - return a random integer in range [lo, hi)
 */
function randInt(lo, hi) {
  return Math.floor(Math.random() * (hi - lo + 1)) + lo;
}

/**  newColor
 *    creates new rgb combination and adds
 *    to set of unique colors
 *
 *  TODO:
 *    - would actually be faster
 *    to just assign colors incrementally
 *    rather than randomly (but then
 *    what if some objects get removed?)
 *    -- could do incrementally
 *    until max is reached (unlikely
 *    to ever happen anyways; max is
 *    ~ 16 M)
 */
function newColor(uniqueColors) {
  var r = randInt(0, 255);
  var g = randInt(0, 255);
  var b = randInt(0, 255);
  var newC = [r, g, b].join(" ");

  while (uniqueColors.has(newC)) {
    r = randInt(0, 255);
    g = randInt(0, 255);
    b = randInt(0, 255);
    newC = [r, g, b].join(" ");
  }
  uniqueColors.add(newC);
  return [r, g, b];
}

/**
 * CanvasState
 *  - maintains state of canvas,
 *    ie keeps track of drawn objects,
 *    handles hit detection and redrawing
 */
class CanvasState {
  constructor(canvas) {
    this.canvas = canvas;
    // this.ctx = canvas.getContext("2d");

    // event handling and event state
    this.eventHandler = new CanvasEventHandler(this);
    this.mouseDown = null;
    this.mouseUp = null;
    this.mouseMove = null;

    // keeping track of canvas objects
    this.drawMode = "SelectTool";
    this.objects = [];
    this.labeled = new Map();
    this.objectFactory = new CanvasObjectFactory(this);

    // keeping track of command history
    this.redoStack = [];
    this.undoStack = [];
    this.activeCommandType = null;

    // keeping track of active objects
    this.selectGroup = new Set();
    this.activeBorder = "#0000ff";
    this.clickedBare = true;
    this.activeObj = null;

    // hit detection with hidden canvas
    this.hitCanvas = hitCanvas;
    this.hitCtx = hitCanvas.getContext("2d");
    this.uniqueColors = new Set();
    this.colorHash = {};

    // hotkey state
    this.hotkeys = {
      [CTRL]: false,
      [SHIFT]: false,
      [ALT]: false,
    };

    // initialize toolbars and buttons
    this.bindKeys();
    this.toolbars = {};
    this.initToolbars();
    this.initButtons();
  }

  get ctx() {
    return this.canvas.getContext("2d");
  }

  clearCanvas() {
    this.objects.forEach(obj => obj.destroy());
  }

  /** CanvasState.setMode
   *    sets drawMode and updates label on toolbar
   */
  setMode(mode) {
    var dmLabel = document.getElementById("drawMode");
    console.log(dmLabel);

    dmLabel.innerHTML = "Draw mode: " + mode;
    this.drawMode = mode;
  }


  /** CanvasState.activeParent
   *    returns active macro object (parent of active obj)
   */
  activeParent() {
    if (this.activeObj)
      return this.activeObj.getParent();
  }


  /** CanvasState.bindKeys
   *    bind key press/release to change of 
   *    hotkeys object
   */
  bindKeys() {
    document.onkeydown = (event) => {
      if (event.keyCode in this.hotkeys) {
        this.hotkeys[event.keyCode] = true;
        console.log("pressed", event.keyCode);
      }
      if (event.keyCode == ESC)
        this.command

    };
    document.onkeyup = (event) => {
      if (event.keyCode in this.hotkeys) {
        this.hotkeys[event.keyCode] = false;
      }
    };
  }

  /** CanvasState.createNewCanvasObject
   *    call objectFactory to instantiate new object
   *    if in "create" mode
   */
  createNewCanvasObject() {
    if (this.drawMode in canvasObjectClasses)
      this.activeObj = this.objectFactory.createCanvasObject();
  }

  /** CanvasState.registerCanvasObj
   *    assign a unique rgb color to canvasObj 
   *    for event detection. 
   */
  registerCanvasObj(canvasObj) {
    if (canvasObj.hashColor) return;
    var rgbArr = newColor(this.uniqueColors);
    var rgbStr = rgbArr.join(" ");

    // map from rgbStr to object
    this.colorHash[rgbStr] = canvasObj;     
    canvasObj.hashColor = "rgb(" + rgbArr.join(", ") + ")";
  }

  /** CanvasState.addCanvasObj
   *   add new canvas object to array for repainting, etc.
   *   Note: only register (assign unique color) if hashColor is null
   *   (may have been previously assigned if this is being called
   *   as an undo/redo)
   */
  addCanvasObj(canvasObj) {
    if (canvasObj.hashColor == null)
      this.registerCanvasObj(canvasObj);
    // add to list of redrawable objects
    this.objects.push(canvasObj);
    console.log("adding new", canvasObj.constructor.name);
  }


  /** CanvasState.remove
   *    remove this object from list
   *    to be repainted and clear labeling
   */
  remove(removeObj) {
    this.objects = this.objects.filter(function(item) {
      return (item !== removeObj);
    });

    if (this.labeled.get(removeObj.label))
      this.labeled.delete(removeObj.label);

    removeObj.deactivate();
  }

  /** CanvasState.setCommandStartState
   *    set start state for DrawCommand
   *    whenever mouse press happens
   */
  setCommandStartState() {
    this.hotkeyStartState = Object.assign({}, this.hotkeys);
    this.startPoint = this.mouseDown;
  }

  /** CanvasState.addDrawCommand
   *    call createDrawCommand and push it 
   *    onto undoStack
   */
  addDrawCommand() {
    var drawCommand = this.createDrawCommand();
    if (drawCommand) {
      if (drawCommand.hasDrag)
        CommandRecorder.recordCommand(drawCommand, "execute");
      else
        CommandRecorder.execute(drawCommand);
      this.undoStack.push(drawCommand);
    }

    // clear redo stack
    this.redoStack = [];
  }

  /** CanvasState.createDrawCommand
   *    Create new command object
   */
  createDrawCommand() {
    if (this.activeObj) {
      switch (this.activeCommandType) {
        case "clickCreate":
          return new ClickCreateCommand(this, this.activeObj);
        case "move":
          return new MoveCommand(this, this.activeObj);
        case "drag":
          return new DragCommand(this, this.activeObj);
        case "clone":
          return new CloneCommand(this, this.activeObj);
      }
    }
    else {
      switch (this.drawMode) {
        case "SelectTool":
          return new SelectCommand(this);
      }
    }
  }

  undo() {
    if (this.undoStack.length) {
      var lastCommand = this.undoStack.pop();
      // lastCommand.undo();
      CommandRecorder.undo(lastCommand);
      console.log("undoing: ", lastCommand.constructor.name);
      this.redoStack.push(lastCommand);
    }
    else
      console.log("Nothing left to undo");
  }

  redo() {
    if (this.redoStack.length) {
      var lastCommand = this.redoStack.pop();
      CommandRecorder.execute(lastCommand);
      this.undoStack.push(lastCommand);
    }
    else 
      console.log("Nothing left to redo");
  }

  /** CanvasState.getCenter
   *    return coordinates of canvas center
   */
  getCenter() {
    var w = this.canvas.width;
    var h = this.canvas.height;
    
    return {x: Math.floor(w / 2), y: Math.floor(h / 2)};
  }


  /* getClickedObject
   *   get coordinates of mouse release
   *   and check hitCanvas/colormap to see what's
   *   at those coordinates in O(1) time
   */
  getClickedObject(mouseX, mouseY) {
    var rgb = 
      this.hitCtx.getImageData(mouseX, mouseY, 1, 1).data;
    // ignore alpha value
    var rgbStr = [rgb[0], rgb[1], rgb[2]].join(" ");
    return this.colorHash[rgbStr];
  }

  repaint() {
    // fill background (erase previous contents)
    this.ctx.fillStyle = this.canvas.style.backgroundColor;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.hitCtx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // draw box for creating text/array/etc 
    if (this.clickedBare && this.mouseDown && this.mouseMove
        && !this.activeObj) {

      // reset lineWidth for outline
      this.ctx.lineWidth = 1;

      // use tool or outline object creation
      var toolClass = null;
      if (this.drawMode in canvasObjectClasses)
        toolClass = canvasObjectClasses[this.drawMode];
      if (this.drawMode in canvasToolClasses)
        toolClass = canvasToolClasses[this.drawMode];

      if (toolClass)  {
        var x1 = this.mouseDown.x;
        var y1 = this.mouseDown.y;
        var x2 = this.mouseMove.x;
        var y2 = this.mouseMove.y;
        toolClass.outline(this, x1, y1, x2, y2);
      }
    }

    this.objects.forEach((obj) => {
      // add some highlighting to show active object/group
      var active = 
        (this.activeParent() === obj && !this.selectGroup.size)
        || this.selectGroup.has(obj);

      if (active)
        obj.drawLabel();

      obj.draw(active);
    });

    // dispatch mouseMove event even when mouse is stationary 
    // for hover actions
    if (this.mouseMove) {
      var mouseMove = new Event("mousemove");
      mouseMove.offsetX = this.mouseMove.x;
      mouseMove.offsetY = this.mouseMove.y;
      this.canvas.dispatchEvent(mouseMove);
    }
  }

  /** CanvasState.initButtons
   *    TODO
   *    Move to toolbars.js
   */
  initButtons() {
    this.buttons = [
      "rectBox",
      "roundBox",
      "diamondBox",
      "parallelogramBox",
      // "rightAngleArrow",
      "curvedArrow",
      "connector",
      "selectTool"
    ];

    this.buttons.forEach((buttonName) => {
      var button = document.getElementById(buttonName);
      // make first character uppercase
      var first = buttonName.substr(0, 1).toUpperCase();
      var className = first + buttonName.substr(1);
      button.onclick = () => this.setMode(className);
    });

    // delete button
    var deleteButton = document.getElementById("deleteButton");
    deleteButton.onclick = () => {
      var activeP = this.activeParent();
      var toDestroy = activeP ? [activeP] : this.selectGroup;
      
      // remove from canvas, hide options, and set activeObj to null
      toDestroy.forEach((activeObj) => {
        // create command for undoing
        var destroyCmd = new ClickDestroyCommand(this, activeObj);
        this.undoStack.push(destroyCmd);
        // destroyCmd.execute();
        CommandRecorder.execute(destroyCmd);

        this.activeObj = null;
      });
    }
  }

  initToolbars() {
    this.toolbars["flowchart"] = new FlowchartToolbar(this);
    this.toolbars["default"] = this.toolbars["flowchart"];
  }

  /*  showToolbars
   *    bring up toolbar for active object and set select options
   *    to appropriate values
   */
  showToolbar() {
    var active = this.activeParent();
    var activeToolbar;
    if (active && active.getToolbar) 
      activeToolbar = active.getToolbar();
    else
      activeToolbar = this.toolbars["default"];

    activeToolbar.show();
  }

}

/** CanvasObjectFactory
 *    handles CanvasObject instantiation
 */
class CanvasObjectFactory {
  constructor(canvasState) {
    this.cState = canvasState;
  }

  createCanvasObject() {
    var x1 = cState.mouseDown.x;    
    var y1 = cState.mouseDown.y;    
    var x2 = cState.mouseUp.x;    
    var y2 = cState.mouseUp.y;    

    var canvasClass = canvasObjectClasses[this.cState.drawMode];
    if (canvasClass)
      return new canvasClass(cState, x1, y1, x2, y2);
  }
} 

class CanvasEventHandler {
  constructor(canvasState) {
    this.cState = canvasState;

    // starting coordinates of drag event
    this.dragOffsetX = 0;
    this.dragOffsetY = 0;
  }
  
  mouseDown(event) {
    this.cState.mouseDown = {x: event.offsetX, y: event.offsetY};
    this.cState.mouseUp = null;

    var canvasObj = cState.getClickedObject(event.offsetX, event.offsetY);

    if (canvasObj) {
      // don't try to create new object/textbox/etc
      // if click starts on another object
      this.cState.clickedBare = false;

      //  deactivate previously active object 
      //  (e.g. end editing of textbox if another box is clicked)
      if (this.cState.activeObj && this.cState.activeObj !== canvasObj)
        this.cState.activeObj.deactivate();

      this.cState.activeObj = canvasObj;

      // mouse down event for some objects
      canvasObj.mouseDown();

      // set offset for dragging
      this.dragOffsetX = event.offsetX;
      this.dragOffsetY = event.offsetY;

      // show toolbar
      this.cState.showToolbar();

      // set start state for whatever DrawCommand 
      // is about to occur 
      this.cState.setCommandStartState();

      // only clear selection if clicking on unselected element
      if (! this.cState.selectGroup.has(canvasObj.getParent()))
        this.cState.selectGroup.clear();

    } 
    else {
      // end editing for textboxes or other updates
      if (this.cState.activeObj) {
        this.cState.activeParent().deactivate();
      }
      // hide generic options
      ToolOptions.getInstance(this.cState).hide();
  
      this.cState.clickedBare = true;
      this.cState.activeObj = null;
      this.cState.selectGroup.clear();
    }
  }

  mouseMove(event) {
    this.cState.mouseMove = {x: event.offsetX, y: event.offsetY};

    // dragging mouse and haven't released yet
    if (this.cState.mouseDown && !this.cState.mouseUp) {
      var deltaX = event.offsetX - this.dragOffsetX;
      var deltaY = event.offsetY - this.dragOffsetY;


      // draw commands happen here
      if (this.cState.activeObj) {
        if (this.cState.hotkeys[CTRL]) {
          this.cState.activeObj.move(deltaX, deltaY);
          // Group select move
          if (this.cState.selectGroup.has(this.cState.activeParent())) {
            this.cState.selectGroup.forEach((obj) => {
              if (this.cState.activeParent() !== obj)
                obj.move(deltaX, deltaY);
            });
          }

          this.cState.activeCommandType = "move";
        }
        else {
          this.cState.activeObj.drag(deltaX, deltaY);
          this.cState.activeCommandType = "drag";
        }

        // reset dragOffset
        this.dragOffsetX += deltaX;
        this.dragOffsetY += deltaY;
      }
    }
    // just moving mouse (not during click)
    else if (!this.cState.mouseDown) {
      // hover actions
      var hoverObj = this.cState.getClickedObject(this.cState.mouseMove.x, this.cState.mouseMove.y);
      if (hoverObj)
        hoverObj.hover();
      else
        document.body.style.cursor = "default";
    }
  }
  
  mouseUp(event) {
    this.cState.mouseUp = {x: event.offsetX, y: event.offsetY};

    // only create new canvas object if actually dragged to new location
    if (this.cState.mouseUp.x !== this.cState.mouseDown.x
        || this.cState.mouseDown.y !== this.cState.mouseUp.y) {

      // create new object
      if (this.cState.clickedBare) {
        this.cState.createNewCanvasObject();
        this.cState.activeCommandType = "clickCreate";
      }

      // clone clicked object
      else if (this.cState.activeObj && this.cState.hotkeys[ALT])
        this.cState.activeCommandType = "clone";
    }

    // mouse release happens same place as press
    else if (this.cState.mouseUp.x == this.cState.mouseDown.x
        && this.cState.mouseUp.y == this.cState.mouseDown.y) {

      // get clicked object from colorHash map
      var canvasObj = this.cState.getClickedObject(this.cState.mouseUp.x, this.cState.mouseUp.y);
      if (canvasObj) 
        canvasObj.click(event);
    }

    // release active object
    if (this.cState.activeObj) {
      this.cState.activeObj.release();

      // show toolbar on object creation
      this.cState.showToolbar();
    }

    // create DrawCommand object and push onto undo stack
    this.cState.addDrawCommand();
    this.cState.activeCommandType = "";

    if (this.cState.selectGroup.size)
      this.cState.showToolbar();

    this.cState.mouseDown = null;

  }

}
