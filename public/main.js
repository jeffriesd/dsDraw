// get websocket server instance for server side video edits
const websock = new WebSocket("ws://localhost:3000");

// initialize canvas, canvasState, and bind actions to DOM
const canvas = document.getElementById("recCanvas");

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
const varEnv = new VariableEnvironment();

// global wrapper to record command execution and repaint
const executeCommand = (...args) => {
  var ret = CommandRecorder.execute(...args);
  repaint();
  return ret;
}
const undoCommand = (...args) => { 
  CommandRecorder.undo(...args);
  repaint();
}
const hotkeyUndo = () => { 
  mc.hotkeyUndo();
  repaint();
};

const hotkeyRedo = () => { 
  mc.hotkeyRedo();
  repaint();
};

const repaint = () => cState.repaint();

const parseLine = cmdStr => {
  this.nearleyParser = new nearley.Parser(nearley.Grammar.fromCompiled(grammar), {});
  var parseTree = this.nearleyParser.feed(cmdStr);
  if (parseTree.results.length > 1)
    throw "Ambiguous grammar";
  this.nearleyParser.finish();

  if (parseTree.results.length == 0)
    throw "Incomplete parse error";

  return parseTree.results[0].command;
}
/**
 *  MOUSE CLICK PRESSED
 *  listen for mousedown only from canvas (so clicking
 *  on console won't invoke canvas events)
 */
editCanvas.onmousedown = (event) => { 
  cState.eventHandler.mouseDown(event);
  repaint();
};

/**
 *  MOUSE MOVED
 *  listen for mousemove on entire document
 *  (if mouse is dragged over canvas, continue to 
 *  invoke canvas events)
 */
document.onmousemove = (event) => { 
  cState.eventHandler.mouseMove(event);
  repaint();
};

// drag console even if mouse moves away from it 
// window.onmousemove = (event) => commandConsole.dragConsole(event);

/**
 *  MOUSE CLICK RELEASED
 *  listen for mouseup events on entire document (if mouse
 *  is released over console, still invoke canvas event)
 */
document.onmouseup = (event) => { 
  cState.eventHandler.mouseUp(event);
  repaint();
};

document.onkeypress = repaint;

// warn on refresh
window.onbeforeunload = (event) => {
  event.preventDefault();
  alert("Are you sure you want to leave the page?");
};



const reactEditor = create(
  ReactEditor,
  { cState: cState, ref: re => window.reactEditor = re },
);

ReactDOM.render(
  reactEditor,
  $("#reactroot")[0],
);

// hack while integrating react
cState.reactEditor = window.reactEditor;

// global key bindings
Mousetrap.bind("t", (event) => {
  window.reactConsole.toggleVisible(true);
});

Mousetrap.bind("esc", (event) => {
  window.reactConsole.setState({ hidden: true });
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
Mousetrap.bind("ctrl+z", (event) => {
  hotkeyUndo();
});

Mousetrap.bind("ctrl+y", (event) => {
  hotkeyRedo();
});
