/** randInt
 *  - return a random integer in range [lo, hi)
 */
function randInt(lo, hi) {
  return Math.floor(Math.random() * (hi - lo + 1)) + lo;
}

/*  newColor
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
 *  keycodes for hotkeys
 */
CTRL = 17;
SHIFT = 16;

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
    this.drawMode = "carrow";
    this.objects = [];
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
    };

    this.bindKeys();
    this.toolbars = {};
    this.initToolbars();
  }

  setMode(mode) {
    var dmLabel = document.getElementById("drawMode");
    console.log(dmLabel);

    dmLabel.innerHTML = "Draw mode: " + mode;
    this.drawMode = mode;
  }

  undo () {
    var removed = this.objects.pop();
    console.log("removing: ", removed);
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

  registerCanvasObj(canvasObj) {
    // get unique color for hashing 
    // (newColor function adds to set for us)
    var rgbArr = newColor(this.uniqueColors);
    var rgbStr = rgbArr.join(" ");

    // map from rgbStr to object
    this.colorHash[rgbStr] = canvasObj;     
    canvasObj.hashColor = "rgb(" + rgbArr.join(", ") + ")";
  }

  /* addCanvasObj(str: objType, object: canvasObj)
   *   add new canvas object to array for repainting, etc.
   */
  addCanvasObj(objType, canvasObj) {
    this.registerCanvasObj(canvasObj);
    // add to list of redrawable objects
    this.objects.push({type: objType, canvasObj: canvasObj});
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
      
      switch (this.drawMode) {
        case "array":
          MyArray.outline(this);
          break;
        case "rectBox":
        case "roundBox":
          RectBox.outline(this);
          break;
        case "diamondBox":
          DiamondBox.outline(this);
          break;
        case "arrow":
          RightAngleArrow.outline(this);
          break;
        case "carrow":
          CurvedArrow.outline(this);
          break;
      }
    }

    // TODO:
    //  add some bbox or highlighting to show active object
    this.objects.forEach(function(obj) {
        obj.canvasObj.draw();
    });
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

