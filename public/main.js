// get websocket server instance for server side video edits
const websock = new WebSocket("ws://localhost:3000");

// initialize canvas, canvasState, bind actions,
// and start main event loop
const canvas = document.getElementById("drawCanvas");

const editCanvas = document.getElementById("editCanvas");

const hitCanvas = document.getElementById("hitCanvas");

const screenWidth = window.innerWidth | 0;
const screenHeight = window.innerHeight | 0;

canvas.width = screenWidth;
editCanvas.width = canvas.width;
hitCanvas.width = canvas.width;
                            
canvas.height = screenHeight;
editCanvas.height = canvas.height;
hitCanvas.height = canvas.height;

// initialize controller objects
const cState = new CanvasState(canvas, editCanvas, hitCanvas);

// eager instantiation for singletons
const mc = new MediaController(cState);
const clientSocket = new ClientSocket(websock, mc, cState);
const varenv = new VariableEnvironment();

// start animation loop
function main() {
  requestAnimationFrame(main);

  if (mc.getState() !== mc.playState)
    cState.repaint();
}
main();

const commandConsole = new CommandConsole(cState);    

/**
 *  MOUSE CLICK PRESSED
 *  listen for mousedown only from canvas (clicking
 *  on console won't invoke canvas events)
 */
editCanvas.onmousedown = (event) => cState.eventHandler.mouseDown(event);

/**
 *  MOUSE MOVED
 *  listen for mousemove on entire document
 *  (if mouse is dragged over canvas, continue to 
 *  invoke canvas events)
 */
document.onmousemove = (event) => cState.eventHandler.mouseMove(event);

// drag console even if mouse moves away from it 
window.onmousemove = (event) => commandConsole.dragConsole(event);

/**
 *  MOUSE CLICK RELEASED
 *  listen for mouseup events on entire document (if mouse
 *  is released over console, still invoke canvas event)
 */
document.onmouseup = (event) => cState.eventHandler.mouseUp(event);

// global key bindings
Mousetrap.bind("t", (event) => {
  commandConsole.toggleVisible(); 
});

Mousetrap.bind("r", (event) => {
  mc.record();
});

Mousetrap.bind("p", (event) => {
  mc.togglePlayback();
});

Mousetrap.bind("spacebar", (event) => {
  mc.togglePlayback();
});

Mousetrap.bind("esc", (event) => {
  commandConsole.toggleVisible("off");
});

Mousetrap.bind("ctrl+z", (event) => {
  mc.hotkeyUndo();
});

Mousetrap.bind("ctrl+y", (event) => {
  mc.hotkeyRedo();
});

// do DOM event bindings
initDOM();

// warn on refresh
window.onbeforeunload = (event) => {
  event.preventDefault();
  alert("Are you sure you want to leave the page?");
};
