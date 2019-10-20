/** AsyncCommand
 *    Some commands take time before resolving and
 *    can be used to create animations. However,
 *    when the CommandRecorder is fast-forwarding
 *    the canvas state on replays (due to seeking
 *    or real-time playback), these commands
 *    shouldn't take any time. 
 * 
 *    Instead, every AsynCommand will implement
 *    an atomicRedo method that sets the 
 *    final state of the animation. 
 * 
 *    Async commands can also be canceled
 *    mid-execution. 
 * 
 *      if running a code block and one
 *      statement causes some animation
 *      and gets canceled, the code
 *      should stop and undo previous statements.
 * 
 *      if running in debug mode, it should just stay
 *      paused on the current line
 *      
 *      if just running a single line, just cancel it
 */
class AsyncCommand extends ConsoleCommand {
  constructor(cState, ...args) {
    super(...args);
  }

  atomicExecute() {
    throw `Atomic redo not implemented for ${this.constructor.name}.`;
  }
}

class WaitCommand extends AsyncCommand {
  usage() {
    return "wait(ms) where ms is a number of milliseconds to suspend execution";
  }

  precheckArguments() {
    this.checkArgsLength(1);
  }

  getChildValues() {
    this.ms = this.args[0];
  }

  checkArguments() {
    if (typeof this.ms == "number") return;
    this.argsError("argument must be a number")
  }

  executeSelf() {
    return new Promise((resolve, reject) => {
      this.cancel = setInterval(() => {
        if (asyncCanceled()) {
          clearInterval(this.cancel);
          reject("Command canceled");
        }
      });

      setTimeout(() => resolve(), this.ms);
    })
    .then(() => clearInterval(this.cancel));
  }

  atomicExecute() {
    return;
  }
}


/**
 * 
 *    interpolate({
 *      obj1: { startPos: { x : x1, y: y1 }, endPos: { x : x2, y : y2 }, 
 *              ctrl1: { x : x3, y : y3 }, ctrl2 : { x : x4, y : y4 },
 *              startTime: t1, endTime: t2
 *            },
 *      ... 
 *    })
 * 
 *    TODO optional framerate argument
 */

// some helper data/functions that don't need to sit inside InterpolateCommand class
// avoid typos
const STARTP = "startPos";
const ENDP = "endPos";
const STIME = "startTime";
const ETIME = "endTime";
const CTRL1 = "ctrl1";
const CTRL2 = "ctrl2";

const INTERP_ARGS = new Set([STARTP, ENDP, CTRL1, CTRL2, STIME, ETIME]);
// startTime and startPos can be inferred
const INTERP_REQ_ARGS = new Set([ENDP, ETIME]);
const INTERP_DEFAULT_MS = 20;
const INTERP_MIN_MS = 20;  // don't refresh faster than every 20ms (50fps)


/// STILL TODO
// implement save/restore
// implement atomic redo 

class InterpolateCommand extends AsyncCommand {
  usage() {
    return "interpolate(pathDict, [ms]) where pathDict is a dictionary " +
    "and ms is an optional argument for milliseconds per frame (default ms = 100)";
  }

  precheckArguments() {
    // 1 or 2 arguments
    this.checkArgsLength(1, 2);
  }

  /** InterpolateCommand.getChildValues
   *    
   */
  getChildValues() {
    this.pathDict = this.args[0];
    this.receiverLabels = Array.from(this.pathDict.keys());

    if (this.numArguments() == 2)
      this.msPerFrame = this.args[1];
    else
      this.msPerFrame = INTERP_DEFAULT_MS;
  }

  /** Interpolatecommand.isPointDict
   *    check whether a dictionary
   *    is of the form { x : num, y : num}
   */
  isPointDict(d) {
    if (! (d instanceof Dictionary)) return false;
    // d is a dict and has numeric values for keys x, y
    return (Array.from(d.keys()).sort().equiv(["x", "y"])
      && (typeof d.get("x")) == "number"
      && (typeof d.get("y")) == "number");
  }

  /** InterpolateCommand.validPathDict
   *    check whether a dictionary has the form
   *    { 
   *       startPos: { x : x1, y: y1 }, endPos: { x : x2, y : y2 }, 
   *       ctrl1: { x : x3, y : y3 }, ctrl2 : { x : x4, y : y4 },
   *       startTime: t1, endTime: t2
   *    }
   *    required keys = startPos, endPos, startTime, endTime
   *    optional keys = ctrl1, ctrl2
   */
  validPathDict(d) {
    var keys = Array.from(d.keys());
    if (! keys.subsetOf(INTERP_ARGS)) // check for extra unwanted keys
      this.argsError(`Invalid arguments for interpolate: ${keys.filter(k => ! INTERP_ARGS.has(k))}`);
    if (! INTERP_REQ_ARGS.subsetOf(keys)) // check for missing keys
      this.argsError(`Missing some required arguments for interpolate: ${INTERP_REQ_ARGS}`);

    for (var k of keys) {
      switch(k) {
        case STARTP:
        case ENDP:
        case CTRL1: 
        case CTRL2: 
          if (! this.isPointDict(d.get(k))) return false;
          break;
        case STIME:
        case ETIME:
          if ((typeof d.get(k)) != "number") return false;
          break;
      }
    }
    return true;
  }

  /** InterpolateCommand.checkArguments
   *    Conditions to check:
   *      - top level object is dictionary
   *      - all keys refer to canvas objects
   *      - each (top level) value is a dictionary with 
   *        0 or more of the following values
   *        
   *        startPos (dict of x, y), endPos (dict of x, y), 
   *        ctrl1 (dict of x, y), ctrl2 (dict of x, y)
   *        startTime (number), endTime (number)
   *      - startTime <= endTime for all pathData
   *      - msPerFrame argument is in valid range
   */
  checkArguments() {
    if (! (this.pathDict instanceof Dictionary)) this.argsError("Interpolate argument must be a dictionary");

    if ((typeof this.msPerFrame) != "number") this.argsError("Ms argument must be a number");
    if (this.msPerFrame < INTERP_MIN_MS) this.argsError("Ms argument must be >= 20 ms per frame");

    // check that labels refer to real canvas objects
    this.receiverMap = new Map();
    try {
      this.receiverLabels.forEach(label => { 
        this.receiverMap.set(label, VariableEnvironment.getCanvasObj(label));
      });
    }
    catch(error) {
      this.argsError("Make sure all labels refer to existing canvas objects");
    }

    // check point data and infer startTime, startPos, ctrl1, ctrl2 if left out
    var pathData;
    for (var l of this.receiverLabels) {
      pathData = this.pathDict.get(l);
      if (! this.validPathDict(pathData)) this.argsError(`Invalid path data: ${pathData}`);

      // infer other values
      var cobj = this.receiverMap.get(l);
      if (! pathData.has(STIME)) pathData.set(STIME, 0);
      // user current position of object
      if (! pathData.has(STARTP)) {
        pathData.set(STARTP, new Dictionary([["x", cobj.x], ["y", cobj.y]]));
      }
      // set ctrl1 and ctrl2 to midpoint
      var sp = pathData.get(STARTP);
      var ep = pathData.get(ENDP);
      var x1 = sp.get("x");
      var y1 = sp.get("y");
      var x2 = ep.get("x");
      var y2 = ep.get("y");
      var midX = Math.floor((x1 + x2) / 2);
      var midY = Math.floor((y1 + y2) / 2);
      if (! pathData.has(CTRL1)) {
        pathData.set(CTRL1, new Dictionary([["x", midX], ["y", midY]]));
      }
      if (! pathData.has(CTRL2)) {
        pathData.set(CTRL2, new Dictionary([["x", midX], ["y", midY]]));
      }

      if (pathData.get(STIME) > pathData.get(ETIME))
        this.argsError("startTime must be <= endTime")
    }
  }

  /** InterpolateCommand.secondsToFrameNumber
   *    convert seconds to a frame number
   *    e.g. if msPerFrame = 100 and maximum endTime = 10s
   *    0s = 0th frame
   *    0.1s = 1st frame
   *    1.0s = 10th frame
   *    ...
   *    10.0s = 100th frame
   */
  secondsToFrameNumber(s) {
    return (s * 1000) / this.msPerFrame;
  }

  /** InterpolateCommand.interpolate
   *    - calculate max 
   *    - 
   */
  interpolate() {
    var finalEndTime = Number.NEGATIVE_INFINITY;
    var firstStartTime = Number.POSITIVE_INFINITY;

    this.pathDict.forEach((pathData, _label) => {
      var st = pathData.get(STIME);
      var et = pathData.get(ETIME);

      firstStartTime = Math.min(firstStartTime, st);
      finalEndTime = Math.max(finalEndTime, et);
    });

    var firstMovingFrame = this.secondsToFrameNumber(firstStartTime);
    var finalMovingFrame = this.secondsToFrameNumber(finalEndTime);

    // build future stack
    var futureLabels = this.receiverLabels;
    var currentLabels = [];
    // generalize sorting labels by their pathData
    const sortBy = (feature, dir) => {
      if (dir == undefined) dir = "incr";
      if (! (dir == "incr" || dir == "decr")) throw "Invalid direction for sorting";
      return (label1, label2) => {
        var pd1 = this.pathDict.get(label1);
        var pd2 = this.pathDict.get(label2);
        if (dir == "incr")
          return pd1.get(feature) > pd2.get(feature);
        if (dir == "decr")
          return pd1.get(feature) < pd2.get(feature);
      };
    }
    const sortDecSt = sortBy(STIME, "decr");
    const sortDecEt = sortBy(ETIME, "decr");

    // sort futureLabels in decreasing order
    // of startTime so earliest object
    // is on "top" (last element)
    futureLabels.sort(sortDecSt);

    var frameNum = firstMovingFrame;
    var nextFrame = new Promise(resolve => resolve(firstMovingFrame));

    while (frameNum <= finalMovingFrame) {

      // this frame number is just used to control while loop
      frameNum++;
      nextFrame = nextFrame.then(fn => {
        // get frame number from previous promise

        // for next object, check if starting frame number is less than current frame number
        // (i.e. this object should start moving)
        while (futureLabels.peek()) {
          var st = this.pathDict.get(futureLabels.peek()).get(STIME);
          var sf = this.secondsToFrameNumber(st)
          if (sf <= fn) currentLabels.push(futureLabels.pop());
          else break;
        }
        // sort current labels and check if any have ended their motion
        currentLabels.sort(sortDecEt);
        while (currentLabels.peek()) {
          var et = this.pathDict.get(currentLabels.peek()).get(ETIME);
          var ef = this.secondsToFrameNumber(et);
          if (ef < fn) currentLabels.pop();
          else break;
        }

        // move all objects in currentLabels by one step
        currentLabels.forEach(label => {
          // how far along in its journey is this object [0, 1]
          var pd = this.pathDict.get(label);
          var sf = this.secondsToFrameNumber(pd.get(STIME));
          var ef = this.secondsToFrameNumber(pd.get(ETIME));
          
          var t;
          // if only one frame to do animation, skip to end
          if (sf == ef) t = 1;
          else t = linMap(sf, ef, 0, 1, fn);

          this.oneStep(label, t);
        });

        repaint();
        return sleep(this.msPerFrame).then(() => fn + 1);
      });
    }
    
    return nextFrame;
  }

  oneStep(label, t) {
    var receiver = this.receiverMap.get(label);
    var pd = this.pathDict.get(label);
    var sp = pd.get(STARTP).toObject();
    var c1 = pd.get(CTRL1).toObject();
    var c2 = pd.get(CTRL2).toObject();
    var ep = pd.get(ENDP).toObject();
    
    // calculate new destination with bezier math
    var bezCoord = bezier(t, sp, c1, c2, ep);
    receiver.moveTo(bezCoord.x, bezCoord.y);
  }


  /** InterpolateCommand.saveState
   *    save x, y (x1, y1) coordinates of 
   *    every receiver object and 
   *    return it as a map from 
   *    label -> { x : _, y : _ } 
   */
  saveState() {
    var coordMap = new Map();

    this.receiverMap.forEach((receiver, label) => {
      coordMap.set(label, {
        x : receiver.x, 
        y : receiver.y,
      });
    });
    return { 
      coordMap: coordMap,
    };
  }

  /** InterpolateCommand.restoreState
   *    restore coordinates for all objects
   *    by calling moveTo (just setting x1, y1
   *    may not handle all the appropriate move
   *    logic for objects with child components)
   */
  restoreState(state) {
    state.coordMap.forEach((coords, label) => {
      var receiver = this.receiverMap.get(label);
      receiver.moveTo(coords.x, coords.y);
    });
  }

  /** InterpolateCommand.executeSelf
   *      
   */
  executeSelf() {
    return new Promise((resolve, reject) => {
      this.cancel = setInterval(() => {
        if (asyncCanceled()) {
          clearInterval(this.cancel);
          reject("Command canceled");
        }
      });

      this.interpolate().then(() => {
        if (this.newState == undefined) this.newState = this.saveState();
        resolve();
      });
    });
  }

  /** InterpolateCommand.atomicExecute
   *    just set the final coordinates for all objects
   */
  atomicExecute() {
    this.restoreState(this.newState);
  }

  // undoSelf() {
  //   this.restoreCoords(this.prevCoords);
  // }
}