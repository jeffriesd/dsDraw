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
canvas.onmousedown = (event) => cState.eventHandler.mouseDown(event);

/**
 *  MOUSE MOVED
 */
canvas.onmousemove = (event) => cState.eventHandler.mouseMove(event);

// drag console even if mouse moves away from it 
window.onmousemove = (event) => commandConsole.dragConsole(event);

/**
 *  MOUSE CLICK RELEASED
 */
canvas.onmouseup = (event) => cState.eventHandler.mouseUp(event);

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
