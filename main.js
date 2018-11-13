/**
 * initialize canvas, canvasState, bind actions,
 * and start main event loop
 */
var canvas = document.getElementById("myCanvas");
const ctx = canvas.getContext("2d");
ctx.font = "10pt Calibri";

var hitCanvas = document.getElementById("hitCanvas");
const hitCtx = hitCanvas.getContext("2d");

console.log(canvas);

// initialize
const cState = new CanvasState(canvas);

// start animation loop
function main() {
  requestAnimationFrame(main);

  cState.repaint();
}
main();

const commandConsole = new CommandConsole(cState);    

/**
 *  MOUSE CLICK PRESSED
 */
canvas.addEventListener("mousedown", function(event) {
  cState.mouseDown = {x: event.offsetX, y: event.offsetY};
  cState.mouseUp = null;

  var canvasObj = cState.getClickedObject(event.offsetX, event.offsetY);
  console.log("clicked on:", canvasObj);

  if (canvasObj) {
    // don't try to create new
    // object/textbox/etc
    // if click starts on another object
    cState.clickedBare = false;   

    //  deactivate previously active object 
    //  (e.g. end editing of textbox if another box is clicked)
    if (cState.activeObj && cState.activeObj !== canvasObj) {
      if (cState.activeObj.deactivate)
        cState.activeObj.deactivate();
    }

    cState.activeObj = canvasObj;

    // mouse down event for some objects
    if (canvasObj.mouseDown) 
      canvasObj.mouseDown();
    
    // set offset for dragging
    cState.dragOffsetX = event.offsetX;
    cState.dragOffsetY = event.offsetY;

    // show toolbar
    cState.showToolbar();

    // set start state for whatever DrawCommand 
    // is about to occur 
    cState.setCommandStartState();

  } else {

    // end editing for textboxes or other updates
    if (cState.activeObj) {
      if (cState.activeObj.deactivate)
        cState.activeObj.deactivate();
      if (cState.activeObj.getOptions)
        cState.activeObj.getOptions().hide();
    }

    cState.clickedBare = true;   
    cState.activeObj = null;
  }   
});


/**
 *  MOUSE MOVED
 */

canvas.addEventListener("mousemove", function(event) {
  cState.mouseMove = {x: event.offsetX, y: event.offsetY};

  // dragging mouse and haven't released yet
  if (cState.mouseDown && !cState.mouseUp) {

    var deltaX = event.offsetX - cState.dragOffsetX;
    var deltaY = event.offsetY - cState.dragOffsetY;
    
    // draw commands happen here
    if (cState.activeObj) {
      if (cState.hotkeys[CTRL]) {
        cState.activeObj.move(deltaX, deltaY); 
        cState.activeCommandType = "move";
      }
      else if (cState.hotkeys[ALT]) {
        // do cloning
      }
      else {
        cState.activeObj.drag(deltaX, deltaY);
        cState.activeCommandType = "drag";
      }

      // reset dragOffset
      cState.dragOffsetX += deltaX;
      cState.dragOffsetY += deltaY;
    }
  } 
  // just moving mouse (not during click)
  else if (!cState.mouseDown) {
    // hover actions
    var hoverObj = cState.getClickedObject(cState.mouseMove.x, cState.mouseMove.y);
    if (hoverObj) {
      if (hoverObj.hover)
        hoverObj.hover();
      else
        document.body.style.cursor = "default";    
    }
    else {
      // make sure mouse pointer goes back to default
      document.body.style.cursor = "default";    
    }
  }
});


/**
 *  MOUSE CLICK RELEASED
 */

canvas.addEventListener("mouseup", function(event) {
  cState.mouseUp = {x: event.offsetX, y: event.offsetY};
  
  // only create new canvas object if actually dragged to new location
  if (cState.mouseUp.x !== cState.mouseDown.x 
      && cState.mouseDown.y !== cState.mouseUp.y) {

    // create new object
    if (cState.clickedBare) {
      cState.activeCommandType = "create";
      var x1 = cState.mouseDown.x;
      var y1 = cState.mouseDown.y;
      var x2 = cState.mouseUp.x;
      var y2 = cState.mouseUp.y;

      // instantiate new object
      var canvasClass = canvasClasses[cState.drawMode];
      if (canvasClass) {
        cState.activeObj = 
            new canvasClass(cState, x1, y1, x2, y2);
      }
    }

    // clone clicked object
    if (cState.activeObj && cState.hotkeys[ALT]) {
      cState.activeCommandType = "create";
      console.log("cloning:", cState.activeObj);

      cState.activeObj = cState.activeObj.getParent().clone();
      // move it to new location
      var deltaX = cState.mouseUp.x - cState.mouseDown.x;
      var deltaY = cState.mouseUp.y - cState.mouseDown.y;
      cState.activeObj.move(deltaX, deltaY);
    }
  }

  // mouse release happens same place as press
  else if (cState.mouseUp.x == cState.mouseDown.x 
            && cState.mouseUp.y == cState.mouseDown.y) {

    // get clicked object from colorHash map
    var canvasObj = cState.getClickedObject(cState.mouseUp.x, cState.mouseUp.y);
    if (canvasObj) {
      canvasObj.click(event);
    } 
  }


  // release active object
  if (cState.activeObj) {
    if (cState.activeObj.release)
      cState.activeObj.release();
    if (cState.activeObj.getToolbar)
      cState.showToolbar();

    // create DrawCommand object and push onto undo stack
    cState.addDrawCommand();
  } 

  cState.mouseDown = null;
});

// global key bindings
Mousetrap.bind("t", function(event) {
  commandConsole.toggleVisible(); 
});

Mousetrap.bind("esc", function(event) {
  commandConsole.toggleVisible("off");
});

Mousetrap.bind("ctrl+z", function(event) {
  cState.undo();
});

Mousetrap.bind("ctrl+y", function(event) {
  cState.redo();
});
