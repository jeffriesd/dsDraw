canvasClasses = {
  "RectBox": RectBox,
  "RoundBox": RoundBox,
  "DiamondBox": DiamondBox,
  "ParallelogramBox": ParallelogramBox,
  "RightAngleArrow": RightAngleArrow,
  "CurvedArrow": CurvedArrow,
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
    this.mouseDown = null;
    this.mouseUp = null;
    this.mouseMove = null;
    this.drawMode = "curvedArrow";
    this.objects = [];
    this.redoStack = [];
    this.undoStack = [];
    this.activeCommandType = null;

    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");

    this.clickedBare = true;
    this.activeObj = null;
    
    // starting coordinates of drag event
    this.dragOffsetX = 0;
    this.dragOffsetY = 0;

    this.hitCanvas = hitCanvas;
    this.hitCtx = hitCanvas.getContext("2d");
    this.uniqueColors = new Set();
    this.colorHash = {};

    this.hotkeys = {
      [CTRL]: false,
      [SHIFT]: false,
      [ALT]: false,
    };

    this.bindKeys();
    this.toolbars = {};
    this.initToolbars();
    this.initButtons();
  }

  setMode(mode) {
    var dmLabel = document.getElementById("drawMode");
    console.log(dmLabel);

    dmLabel.innerHTML = "Draw mode: " + mode;
    this.drawMode = mode;
  }

  bindKeys() {
    var self = this;
    document.onkeydown = function(event) {
      if (event.keyCode in self.hotkeys) {
        self.hotkeys[event.keyCode] = true;
      }
    };
    document.onkeyup = function(event) {
      if (event.keyCode in self.hotkeys) {
        self.hotkeys[event.keyCode] = false;
      }
    };
  }

  /** CanvasState.registerCanvasObj
   *    assign a unique rgb color to canvasObj 
   *    for event detection. 
   */
  registerCanvasObj(canvasObj) {
    // get unique color for hashing 
    // (newColor function adds to set for us)
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
  }


  /** CanvasState.remove
   *
   */
  remove(removeObj) {
    this.objects = this.objects.filter(function(item) {
      return (item !== removeObj);
    });

    removeObj.deactivate();
    if (removeObj.getOptions)
      removeObj.getOptions().hide();

  }


  /**  set start state for DrawCommand
   *  whenever mouse press happens
   */
  setCommandStartState() {
    this.hotkeyStartState = Object.assign({}, this.hotkeys);
    this.startPoint = this.activeObj.getStartCoordinates();
  }

  addDrawCommand() {
    if (this.activeObj) {
      var drawCommand = this.createDrawCommand();
      if (drawCommand)
        this.undoStack.push(drawCommand);
    }
    else
      console.log("Cannot create DrawCommand: no active canvas object");
  }

  createDrawCommand() {
    switch (this.activeCommandType) {
        case "create":
          return new CreateCommand(this, this.activeObj);
        case "move":
          return new MoveCommand(this, this.activeObj);
        case "drag":
          return new DragCommand(this, this.activeObj);
    }
    return null;
  }

  undo() {
    if (this.undoStack.length) {
      var lastCommand = this.undoStack.pop();
      lastCommand.undo();
      this.redoStack.push(lastCommand);
    }
    else
      console.log("Nothing left to undo");
  }

  redo() {
    // just redoing instantiation
    // this.objects.push(this.redoStack.pop());
    
    if (this.redoStack.length) {
      var lastCommand = this.redoStack.pop();
      lastCommand.execute();
      this.undoStack.push(lastCommand);
    }
    else 
      console.log("Nothing left to redo");
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
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.hitCtx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // draw box for creating text/array/etc 
    if (this.clickedBare && this.mouseDown && this.mouseMove
        && !this.activeObj) {

      // reset lineWidth for outline
      this.ctx.lineWidth = 1;

      var canvasClass = canvasClasses[this.drawMode];
      if (canvasClass) 
        canvasClass.outline(this);
    }

    // TODO:
    //  add some bbox or highlighting to show active object
    this.objects.forEach(function(obj) {
        obj.draw();
    });
  }

  initButtons() {
    this.buttons = [
      "rectBox",
      "roundBox",
      "diamondBox",
      "parallelogramBox",
      "rightAngleArrow",
      "curvedArrow"
    ];

    var self = this;
    this.buttons.forEach(function(buttonName) {
      var button = document.getElementById(buttonName);
      // make first character uppercase
      var first = buttonName.substr(0, 1).toUpperCase();
      var className = first + buttonName.substr(1);
      button.onclick = () => self.setMode(className);
    });

    // delete button
    var deleteButton = document.getElementById("deleteButton");
    deleteButton.onclick = () => {
      if (this.activeObj) {
        this.remove(this.activeObj);
        this.activeObj.getOptions().hide();
        this.activeObj.deactivate();
        this.activeObj = null;
      }
    }
  }

  initToolbars() {
    this.toolbars["flowchart"] = new FlowchartToolbar(this);
  }

  /*  showToolbars
   *    bring up toolbar for active object and set select options
   *    to appropriate values
   *
   *    TODO:
   */
  showToolbar() {
    if (this.activeObj.getToolbar) {
      var activeToolbar = this.activeObj.getToolbar();
      activeToolbar.show();
    }
  }

}

