// get websocket server instance for server side video edits
const websock = new WebSocket("ws://127.0.0.1:3001");


// initialize canvas, canvasState, bind actions,
// and start main event loop
const canvas = document.getElementById("myCanvas");
const ctx = canvas.getContext("2d");
ctx.font = "10pt Calibri";

const hitCanvas = document.getElementById("hitCanvas");

const screenWidth = window.innerWidth | 0;
const screenHeight = window.innerHeight | 0;

canvas.width = screenWidth;
hitCanvas.width = canvas.width;
                            
canvas.height = screenHeight;
hitCanvas.height = canvas.height;

// initialize controller objects
const cState = new CanvasState(canvas);
const mc = MediaController.getInstance(cState);
// bind websock events
websock.onopen = (event) => console.log("websocket connection open");
websock.onclose = () => console.log("websocket connection closed");
websock.onerror = (err) => console.log("[WS ERROR]:" + err);
websock.onmessage = (event) => {
  console.log("[WS MESSAGE]:" + event.data);
  mc.processWSMessage(event.data);
};
mc.websock = websock;


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
Mousetrap.bind("t", (event) => {
  commandConsole.toggleVisible(); 
});

Mousetrap.bind("r", (event) => {
  mc.record();
});

Mousetrap.bind("spacebar", (event) => {
  mc.togglePlayback();
});

Mousetrap.bind("esc", (event) => {
  commandConsole.toggleVisible("off");
});

Mousetrap.bind("ctrl+z", (event) => {
  cState.undo();
});

Mousetrap.bind("ctrl+y", function(event) {
  cState.redo();
});

