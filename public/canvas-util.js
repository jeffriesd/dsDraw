// for custom static outline methods
canvasObjectClasses = {
  "RoundBox": RoundBox,
  "DiamondBox": DiamondBox,
  "ParallelogramBox": ParallelogramBox,
  "CurvedArrow": CurvedArrow,
  "Connector": Connector,
};

canvasObjectConstructors = {
  "RectBox": RectBoxConstructor,
  "RoundBox": RoundBoxConstructor,
  "DiamondBox": DiamondBoxConstructor,
  "ParallelogramBox": ParallelogramBoxConstructor,
  "TextBox": TextBoxConstructor,
  "MathBox": MathBoxConstructor,
  "CurvedArrow": CurvedArrowConstructor,
  "Connector": ConnectorConstructor,
  "TextBox": TextBoxConstructor,
  "Array1D": Array1DConstructor,
  "LinkedList": LinkedListConstructor,
  "TextBox": TextBoxConstructor,
  "MathBox": MathBoxConstructor,
  "BST": BSTConstructor,
  "BinaryHeap": BinaryHeapConstructor,
  "UDGraph": UDGraphConstructor,
  "DiGraph": DiGraphConstructor,
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

class CtxProxy {
  constructor(cState, recCtx, editCtx) {
    this.cState = cState;
    this.recCtx = recCtx;
    this.editCtx = editCtx;
    return new Proxy({}, this);
  }

  /** CtxProxy.set
   *    set property for both targets
   */
  set(target, prop, value) {
    this.recCtx[prop] = value;
    this.editCtx[prop] = value;

    return true;
  }

  /** CtxProxy.get
   *    apply function to both targets or get property
   *    from both targets. Property value must be same,
   *    otherwise proxy.recCtx/proxy.editCtx should be used
   */
  get(target, prop) {
    // if recCtx or editCtx (accessing one or the other)
    if (this[prop])
      return this[prop];

    // if function, apply to both
    if (typeof this.recCtx[prop] == "function"
        && typeof this.editCtx[prop] == "function") {
      return (...args) => {
        var recret = this.recCtx[prop](...args);
        var editret = this.editCtx[prop](...args);
        if (! equivalent(recret, editret))
          throw "Return values of ctx methods are different for " + prop;
        return recret;
      };
    }

    // check properties of both (if accessed this way, they should be equal)
    if (this.recCtx[prop] && this.editCtx[prop]) {
      if (! equivalent(this.recCtx[prop], this.editCtx[prop]))
        throw "Return values of ctx properties are different for " + prop;
      return this.recCtx[prop];
    }
  }
}

/**
 * CanvasState
 *  - maintains state of canvas,
 *    ie keeps track of drawn objects,
 *    handles hit detection and redrawing
 */
class CanvasState {
  constructor(recCanvas, editCanvas, hitCanvas) {
    if (CanvasState.instance) return CanvasState.instance;
    this.recCanvas = recCanvas;
    this.editCanvas = editCanvas;
    this.ctx = new CtxProxy(this, recCanvas.getContext("2d"), editCanvas.getContext("2d"));

    // event handling and event state
    this.eventHandler = new CanvasEventHandler(this);
    this.mouseDown = null;
    this.mouseUp = null;
    this.mouseMove = null;

    // keeping track of canvas objects
    this.drawMode = "SelectTool";
    this.objects = [];
    this.objectFactory = new CanvasObjectFactory(this);

    this.activeCommandType = null;

    // keeping track of active objects
    this.selectGroup = new Set();
    this.activeBorder = "blue";
    this.clickedBare = true;
    this._activeObj = null;

    // hit detection with hidden canvas
    this.hitCanvas = hitCanvas;
    this.hitCtx = hitCanvas.getContext("2d");
    this.uniqueColors = new Set();
    this.colorHash = {};

    CanvasState.instance = this;
  }

  static getInstance() {
    if (CanvasState.instance == null)
      throw "Eager instantiation failed for CanvasState";
    return CanvasState.instance;
  }

  get recCtx() {
    return this.ctx.recCtx;  
  }

  get editCtx() {
    return this.ctx.editCtx;
  }

  get width() {
    return this.recCanvas.width;
  }

  get height() {
    return this.recCanvas.height;
  }

  clearCanvas() {
    this.objects.forEach(obj => obj.destroy());
  }

  /** CanvasState.setMode
   *    sets drawMode and updates label on toolbar
   */
  setMode(mode) {
    this.reactEditor.setState({ drawMode : mode });
    this.drawMode = mode;
  }

  get activeObj() {
    return this._activeObj;
  }

  set activeObj(obj) {
    this.reactEditor.setState( { activeObj: obj || this.selectGroup.size });
    this._activeObj = obj;
  }

  updateOptions(object, name, value) {
    executeCommand(new MenuConfigCommand(object, name, value));
  }

  /** CanvasState.activeParent
   *    returns selected parent object 
   */
  activeParent() {
    if (this.activeObj)
      return this.activeObj.getParent();
  }

  textHeight() {
    return this.ctx.measureText("_").width * 2;
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
   * 
   *   only called for (macro) CanvasObject in CanvasObject.restore()
   */
  addCanvasObj(canvasObj) {
    if (canvasObj.hashColor == null)
      this.registerCanvasObj(canvasObj);
    // add to list of redrawable objects
    this.objects.push(canvasObj);
  }

  updateLabels() {
    this.objects.forEach(obj => VariableEnvironment.setVar(obj.label, obj));
  } 

  /** CanvasState.remove
   *    remove this object from list
   *    to be repainted and clear labeling
   */
  remove(removeObj) {
    this.objects = this.objects.filter(function(item) {
      return (item !== removeObj);
    });

    if (VariableEnvironment.hasVar(removeObj.label))
      VariableEnvironment.deleteVar(removeObj.label);
    removeObj.deactivate();
  }

  /** CanvasState.setCommandStartState
   *    set start state for DrawCommand
   *    whenever mouse press happens
   */
  setCommandStartState() {
    this.hotkeyStartState = Object.assign({}, hotkeys);
    this.startPoint = this.mouseDown;
  }

  /** CanvasState.executeDrawCommand
   *    call createDrawCommand and push it 
   *    onto undoStack
   */
  executeDrawCommand() {
    var drawCommand = createDrawCommand(this);
    if (drawCommand) executeCommand(drawCommand);
  }

  /** CanvasState.getCenter
   *    return coordinates of canvas center
   */
  getCenter() {
    var w = this.width;
    var h = this.height;
    
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
    this.ctx.fillStyle = this.editCanvas.style.backgroundColor;
    this.ctx.fillRect(0, 0, this.width, this.height);
    this.hitCtx.clearRect(0, 0, this.width, this.height);

    // draw box for creating text/array/etc 
    if (this.clickedBare && this.mouseDown && this.mouseMove
        && !this.activeObj) {

      // reset lineWidth for outline
      this.ctx.lineWidth = 1;


      // use tool or outline object creation
      var toolClass = null;
      if (this.drawMode in canvasObjectClasses)
        toolClass = canvasObjectClasses[this.drawMode];
      else 
        toolClass = CanvasObject; // default for outline method

      var x1 = this.mouseDown.x;
      var y1 = this.mouseDown.y;
      var x2 = this.mouseMove.x;
      var y2 = this.mouseMove.y;
      toolClass.outline(this.ctx, x1, y1, x2, y2);
    }

    this.objects.forEach((obj) => obj.configAndDraw());

    // dispatch mouseMove event even when mouse is stationary 
    // for hover actions
    if (this.mouseMove) {
      var mouseMove = new Event("mousemove");
      mouseMove.offsetX = this.mouseMove.x;
      mouseMove.offsetY = this.mouseMove.y;
      this.editCanvas.dispatchEvent(mouseMove);
    }
  }

  /** CanvasState.isActive
   *    returns boolean indicating
   *    whether this object has been selected
   *    by the user
   */
  isActive(canvasObj) {
    return (this.activeParent() === canvasObj && !this.selectGroup.size)
            || this.selectGroup.has(canvasObj);
  }

  deleteActive() {
    var activeP = this.activeParent();
    var toDestroy = this.selectGroup.size ? this.selectGroup : [activeP];

    // remove from canvas, hide options, and set activeObj to null
    executeCommand(new ClickDestroyCommand(this, ...toDestroy));
    this.selectGroup.clear();
    this.activeObj = null;
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

    var constrClass = canvasObjectConstructors[this.cState.drawMode];
    if (constrClass == undefined) return null;
    var constr = new constrClass(this.cState);
    // set coordinates of constructor 
    Object.assign(constr, { coords : { x1: x1, y1: y1, x2: x2, y2: y2 } });
    var newObj = executeCommand(constr);

    return newObj;
  }
} 


/**
 * event handler constants
 */
const doubleClickTime = 250; // ms

class CanvasEventHandler {
  constructor(canvasState) {
    this.cState = canvasState;

    // starting coordinates of drag event
    this.dragOffsetX = 0;
    this.dragOffsetY = 0;
  }
  
  mouseDown(event) {
    this.cState.mouseDown = {x: event.clientX, y: event.clientY};
    // update react state
    this.cState.reactEditor.setState({ mouseDown: this.cState.mouseDown });

    this.cState.mouseUp = null;

    var canvasObj = cState.getClickedObject(event.clientX, event.clientY);

    if (canvasObj) {
      // don't try to create new object/textbox/etc
      // if click starts on another object
      this.cState.clickedBare = false;


      // set offset for dragging
      this.dragOffsetX = event.clientX;
      this.dragOffsetY = event.clientY;


      // set start state (hotkeys and click coordinates)
      // for whatever DrawCommand 
      // is about to occur 
      this.cState.setCommandStartState();

      //  deactivate previously active object 
      //  (e.g. end editing of textbox if another box is clicked)
      if (this.cState.activeObj && this.cState.activeObj !== canvasObj)
        this.cState.activeObj.deactivate();

      this.cState.activeObj = canvasObj;

      // mouse down event for some objects
      canvasObj.mouseDown();
      
      // set doubleclick timeout
      if (canvasObj.dcTimer) { 
        clearTimeout(canvasObj.dcTimer);
        canvasObj.doubleClick();
      }
      canvasObj.dcTimer = setTimeout(() => {
        canvasObj.dcTimer = null;
      }, doubleClickTime);

    } 
    else {
      // end editing for textboxes or other updates
      if (this.cState.activeObj) {
        this.cState.activeParent().deactivate();
      }
      // hide generic options
      // ToolOptions.getInstance(this.cState).hide();
  
      this.cState.clickedBare = true;
      this.cState.activeObj = null;
      this.cState.selectGroup.clear();
    }
  }

  mouseMove(event) {
    this.cState.mouseMove = {x: event.clientX, y: event.clientY};

    // dragging mouse and haven't released yet
    if (this.cState.mouseDown && !this.cState.mouseUp) {
      var deltaX = event.clientX - this.dragOffsetX;
      var deltaY = event.clientY - this.dragOffsetY;


      // draw commands happen here
      if (this.cState.activeObj) {
        if (hotkeys[CTRL] && hotkeys[SHIFT]) {
          this.cState.activeObj.shiftMove(deltaX, deltaY);
        }
        else if (hotkeys[CTRL]) {
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
        else if (hotkeys[SHIFT]) {
          this.cState.activeObj.shiftDrag(deltaX, deltaY);
          this.cState.activeCommandType = "shiftDrag";
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
    this.cState.mouseUp = {x: event.clientX, y: event.clientY};

    if (this.cState.mouseDown == null) return;

    // only create new canvas object if actually dragged to new location
    if (this.cState.mouseUp.x !== this.cState.mouseDown.x
        || this.cState.mouseDown.y !== this.cState.mouseUp.y) {

      // create new object
      if (this.cState.clickedBare) {
        this.cState.activeObj = this.cState.objectFactory.createCanvasObject();
      }

      // clone clicked object
      else if (this.cState.activeObj && hotkeys[ALT])
        this.cState.activeCommandType = "clone";


      // create DrawCommand object and push onto undo stack
      // -- only happens when mouseUp != mouseDown
      this.cState.executeDrawCommand();
    }
    // mouse release happens same place as press
    else if (this.cState.mouseUp.x == this.cState.mouseDown.x
        && this.cState.mouseUp.y == this.cState.mouseDown.y) {
      // get clicked object from colorHash map
      var canvasObj = this.cState.getClickedObject(this.cState.mouseUp.x, this.cState.mouseUp.y);
      if (canvasObj) {
        if (noHotkeys())  // clicked with no modifiers
          canvasObj.click(event);
        // if ctrl-click, add canvas object to 
        // select group (and previous activeObject if it exists)
        if (hotkeys[CTRL]) {
          if (! this.cState.selectGroup.has(canvasObj))
            this.cState.selectGroup.add(canvasObj.getParent());
          if (this.cState.activeObj != undefined 
            && ! this.cState.selectGroup.has(this.cState.activeObj.getParent())) 
            this.cState.selectGroup.add(this.cState.activeObj.getParent());
          return;
        }
        else { 
          // only clear selection if clicking on unselected element
          if (! this.cState.selectGroup.has(canvasObj.getParent()))
            this.cState.selectGroup.clear();
        }
      }
    }

    this.cState.activeCommandType = "";

    // send update to show X for group selection
    if (this.cState.selectGroup.size)
      window.reactEditor.setState({ activeObj: this.cState.selectGroup });

    this.cState.mouseDown = null;
  }

}
