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


const updateInspectPane = () => {
  updateCommandStack();
  VariableEnvironment.getInstance().updateEnvironmentDisplay();
};

// update command stack in side pane
const updateCommandStack = () => {
  var stack;
  // use past/future if already recorded
  if (mc.hasRecorded()) {
    var past = mc.cmdRecorder.pastCmds;
    // filter out CloneCanvas and CloneEnv
    var init = mc.cmdRecorder.initCmds
      .filter(ct => ! (ct.command instanceof CloneCanvasCommand || ct.command instanceof CloneEnvCommand))
    stack = init.concat(past);
  }
  else {
    // otherwise use undo/redo
    stack = mc.cmdRecorder.undoStack.map(cmd => { return { command: cmd, time: 0 }; } );
  }
  window.reactEditor.setState({ commandStack: stack });
};

// global wrapper to record command execution and repaint
// CommandRecorder.execute just calls execute
// on the command object manages undo/redo stacks
// and records command if actively recording
const executeCommand = (cmd, isRedo, overrideLock) => {
  if (contextLocked && ! overrideLock) return alert("Oops, context is locked")

  return CommandRecorder.execute(cmd, isRedo, overrideLock)
    .then(cmdRet => {
      return cmdRet;
    })
    .catch(err => {
      console.log("caught cancel err")
      cmd.undo();
      throw err;
    })
    .finally(() => {
      repaint();
      updateInspectPane();
    });
};


/** liftCommand
 *    lift commands to Promises 
 *    
 *    two versions:
 *      default lifting lets animations/async commands
 *      play out in real time by just returning their 
 *      execute() (a Promise)
 * 
 *      second version is used for canvas state
 *      fast-forward when we shouldn't see (wait for) 
 *      the animatinon, but just see the results as
 *      an atomic step
 */
const LIFT_ATOMIC = true;
const LIFT_ASYNC = false;
var liftingAtomically = LIFT_ASYNC;
/** global entry point for setting liftingAtomically
 *  
 *  called in the following places:
 *    - main.hotkeyRedoAtomic
 *    - CommandRecorder.seekTo
 *    - CommandRecorder.fullRewind
 *    - CommandRecorder.init
 *      
 *    TODO 
 *    - PauseState.record() and RecordState.record()
 * 
 *      effect: Async commands executed while paused
 *            between recordings will execute atomically
 */
const setCommandLifting = (level) => { 
  return new Promise(resolve => { liftingAtomically = level; resolve(); });
}
const getCommandLifting = () => liftingAtomically;

const liftCommand = (cmd) => {
  if (cmd instanceof ConsoleCommand) {
    if (liftingAtomically && cmd instanceof AsyncCommand)
      return new Promise(resolve => resolve(cmd.atomicExecute()));
    return cmd.execute();
  }

  return new Promise(resolve => resolve(cmd.execute()));
}

const liftUndo = (cmd) => { 
  return new Promise(resolve => { 
    cmd.undo();
    resolve();
  });
}

const liftFunction = (f) => {
  return new Promise(resolve => resolve(f()));
}

const hotkeyUndo = () => { 
  if (canvasLocked()) return canvasLockedAlert();

  mc.hotkeyUndo();
  repaint();
  updateInspectPane();

};


// redo a command but fast forward 
// through animations
const hotkeyRedoAtomic = () => {
  if (canvasLocked()) return canvasLockedAlert();

  var prevState = getCommandLifting();
  setCommandLifting(LIFT_ATOMIC)
  .then(() => hotkeyRedo())
  .then(() => setCommandLifting(prevState));
};

// also lock context on hotkey 
// redo for async commands
const hotkeyRedo = () => { 
  if (canvasLocked()) return canvasLockedAlert();

  return mc.hotkeyRedo()
  .finally(() => {
    repaint();
    updateInspectPane();
  });

};

const repaint = () => { 
  cState.repaint();
}

// async commands can be canceled by the click of a button
var commandCanceled = false;
const cancelAsync = () => { 
   commandCanceled = true;
};
const asyncCanceled = () => commandCanceled;


/** lockContext
 *    prevent any interaction with canvas/editor state
 *    while asynchronous commands execute. The only 
 *    action possible is to cancel the command (animation)
 *    or wait.
 * 
 *    bits of state to lock:
 *      canvas -- no clicking (also disable delete button on toolbar)
 *      console -- no entering code
 *      clip menu -- no switching/deleting clips
 * 
 *    async commands can also be canceled
 */

var contextLocked = false;
const lockContext = () => {
  window.reactEditor.setState({ contextLocked : true });
  contextLocked = true;
};

const unlockContext = () => {
  window.reactEditor.setState({ contextLocked : false });
  contextLocked = false;
  commandCanceled = false;
};

/** When is the canvas disabled? 
 * 
 *    Well, the canvas can only be edited while recording
 *    or while paused between recordings in the final 
 *    frame of the most recent recording (i.e., you can't
 *    rewind to an arbitrary point and make edits. Changes can
 *    only appear after previously recorded content.)
 */
const canvasLocked = () => {
  return contextLocked 
    || (mc.isPlaying())
    || (mc.hasRecorded() && mc.isPaused() && ! mc.atEndOfClip());
};

const clipMenuLocked = () => {
  return contextLocked || mc.isRecording() || mc.isPlaying();
};

// if canvas is locked 
const canvasLockedAlert = () => alert("The canvas can not currently be edited.")

// if clip menu is locked return this alert
const cmLockedAlert = () => alert("Clip can not be changed currently.")

const parseLine = cmdStr => {
  this.nearleyParser = new nearley.Parser(nearley.Grammar.fromCompiled(grammar), {});

  var parseTree = this.nearleyParser.feed(cmdStr.trim());
  if (parseTree.results.length > 1)
    throw "Ambiguous grammar";
  this.nearleyParser.finish();

  if (parseTree.results.length == 0)
    throw "Incomplete parse error";

  var cmdObj = parseTree.results[0].command;

  // hold onto AST node for later
  cmdObj._astNode = parseTree.results[0];
  cmdObj._cmdStr = cmdStr;

  return cmdObj;
}
/**
 *  MOUSE CLICK PRESSED
 *  listen for mousedown only from canvas (so clicking
 *  on console won't invoke canvas events)
 */
editCanvas.onmousedown = (event) => { 
  if (canvasLocked()) return canvasLockedAlert();
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
  // forward event to canvas so it still gets input
  // when dragging over console
  var mouseMove = new Event("mousemove");
  mouseMove.offsetX = event.offsetX;
  mouseMove.offsetY = event.offsetY;
  editCanvas.dispatchEvent(mouseMove);

  if (canvasLocked()) return;
  cState.eventHandler.mouseMove(event);
};

// add handler to (not overwrite) canvas.mousemove
editCanvas.addEventListener("mousemove", () => {
  repaint();
});


// drag console even if mouse moves away from it 
// window.onmousemove = (event) => commandConsole.dragConsole(event);

/**
 *  MOUSE CLICK RELEASED
 *  listen for mouseup events on entire document (if mouse
 *  is released over console, still invoke canvas event)
 */
document.onmouseup = (event) => { 
  if (canvasLocked()) return;
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