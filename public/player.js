class MediaController {
  constructor(canvasState) {
    if (MediaController.instance) return MediaController.instance;
    this.cState = canvasState;

    // update at 60fps
    this.framerate = 60;

    this.clips = new Map();
    this.commandRecorders = new Map();

    // keep track of currently selected clip
    this.activeClipId = 0;
    this.clipMenu = document.getElementById("clipMenu");
    this.newClipBlank();
    // set initial clip class for css
    $("#thumbnail0").toggleClass("activeClip", true);
      
    this.player = new VideoPlayer(canvasState);
    this.cStream = canvasState.recCanvas.captureStream(this.framerate);
    this.requestAudio();

    this.recorder = new MediaRecorder(this.cStream, 
      { mimeType: "video/webm;codecs=vp8,opus"});
    this.init();

    this.playState = new PlayState();
    this.pauseState = new PauseState();
    this.recordState = new RecordState();

    this.state = this.pauseState;
    
    this.chunks = [];
    this.chunks2 = [];

    // send a blob every 2 seconds
    this.timeSlice = 2000;

    MediaController.instance = this;
  }

  /** MediaController.ms
   *    return framerate in ms per frame
   */
  get ms() {
    return 1000 / this.framerate;
  }

  /** MediaController.getInstance
   */
  static getInstance() {
    if (MediaController.instance == null)
      throw "Eager instantiation failed for MediaController";
    return MediaController.instance;
  }

  newClipId() {
    return Array.from(this.clips.keys()).reduce(
      (acc, val) => Math.max(acc, val), -1) + 1;
  }

  // is recording done yet
  get postRecording() {
    if (this.cmdRecorder) return this.cmdRecorder.postRecording;
  }

  /** MediaController.cmdRecorder
   *    getter method to fetch the
   *    command recorder for current active clip
   */
  get cmdRecorder() {
    if (this.commandRecorders.get(this.activeClipId) == null) {
      this.commandRecorders.set(this.activeClipId, 
        new CommandRecorder(this));
    }

    return this.commandRecorders.get(this.activeClipId);
  }

  requestAudio() {
    navigator.mediaDevices.getUserMedia({ audio : true })
      .then((stream) => {
        this.cStream.addTrack(stream.getAudioTracks()[0]);
      })
      .catch((err) => console.log("[AUDIO ERROR]:", err));
  }

  /** MediaController.init
   *    bind events to recorder and video 
   */
  init() {
    /** 
     *  MediaRecorder bindings
     */
    this.recorder.ondataavailable = (event) => {
      this.chunks.push(event.data);
    };

    this.recorder.onstop = (event) => {
      var blob = new Blob(this.chunks, { "type" : "video/webm; codecs=vp8" });

      ClientSocket.sendServer("setClipId", { id: this.activeClipId } );
      ClientSocket.sendBlob(blob);
      this.chunks = [];

      // wait for merge/write to complete before updating 
      // video src url
      this.waiting = true;

      // stop command recorder
      this.cmdRecorder.stopRecording();
    };

    this.recorder.onstart = (event) => {
      // moved this to MediaState because
      // there was a delay in the event firing

      // this.cmdRecorder.startRecording();
    };

    /** 
     *  Video bindings
     */

    // go back to pause/edit state when video ends
    this.player.video.onended = (event) => {
      if (this.getState() === this.playState)
        this.togglePlayback();
      this.cmdRecorder.seekTo(this.player.video.currentTime); 
    };

    // update controls while video plays
    this.player.video.ontimeupdate = (event) => {
      this.player.updateTime();

      // seeker controls time when paused
      if (this.getState() === this.playState) 
        this.player.updateSeeker();
    };

    /** 
     *  Control bar and seek input bindings
     */

    this.player.playButton.onclick = (event) => {
      this.togglePlayback();
    };

    this.player.volume.onchange = (event) => {
      // volume range is 0-100
      this.player.video.volume = this.player.volume.value / 100;
    };

    // when user drags seek bar
    // seek video and set video time
    this.player.seeker.onchange = (event) => {
      if (! this.cmdRecorder.postRecording) return;

      // seeker bar has range of 100
      var frac = this.player.seeker.value / this.player.seeker.max;
      var dur = this.player.video.duration;
      // round to hundreths of a sec 
      var secs = Math.min(dur, Math.round(frac * dur * 100) / 100);
      if (frac == 1) secs = dur;

      // suppress firefox AbortError bug
      // if (this.player.video.readyState > 1)
      this.player.video.currentTime = secs;

      // seek commands
      this.cmdRecorder.seekTo(secs);
    };
  }

  /** MediaController.setVideoDownload
   *    update download link for merged video
   *    and prompt user
   *
   *    TODO: perform in background and 
   *    notify user once ready
   */
  setVideoDownload(url) {
    var link = document.getElementById("downloadLink");
    link.setAttribute("download", "video.webm");
    link.setAttribute("href", url);
    link.click();

    this.waiting = false;
  }

  /** MediaController.setVideoURL
   *    set video source, select the new clip,
   *    add url to clip map,
   *    and set waiting flag to false
   *    so playing/recording can occur
   */
  setVideoURL(id, url) {
    this.player.video.src = url;

    // set url in map (used by thumbnail.onclick)
    this.clips.get(id).url = url;

    this.waiting = false;
    this.setEditorState(id);
  }

  /** MediaController.setEditorState
   *    clear current canvas contents,
   *    update activeClipId, update time,
   *    for newly selected clip, and 
   *    add 'activeClip' class for css
   */
  setEditorState(id) {
    // clear canvas contents
    return this.cmdRecorder.fullRewind()
      .then(() => {
        this.activeClipId = id;
        this.player.updateTime();

        // apply any initialization commands
        return this.cmdRecorder.init()
          .then(() => repaint())
          .catch(err => console.log("ERROR initializing canvas:", err))
          .then(() => updateInspectPane());
      });
  }

  /** MediaController.setCurrentClip
   *    set editor state and video source
   *    if clip has been recorded over yet
   */
  setCurrentClip(id) {
    if (this.getState() !== this.pauseState) return;
    if (this.clips.get(id) == null) return;
    if (this.activeClipId == id) return;

    if (this.clips.get(id).url) 
      this.setVideoURL(id, this.clips.get(id).url);
    else {
      this.setEditorState(id)
        .then(() => this.player.video.src = null);
    }
  }

  /** MediaController.addThumbnail
   *    add thumbnail to clip menu
   */
  addThumbnail(id) {
    var thumbnail = document.createElement("img");
    thumbnail.src = DEFAULT_THUMBNAIL;
    thumbnail.id = "thumbnail" + id;

    // add thumbnail to map
    this.clips.get(id).thumbnail = thumbnail;

    // switch to clicked clip and show selection with border
    // TODO (ctrl + click for multi-select)
    thumbnail.onclick = (event) => {
      if (clipMenuLocked()) return cmLockedAlert();

      this.setCurrentClip(id);

      // set active class for css 

      // unless ctrl is held, toggle others to inactive
      if (! hotkeys[CTRL])
        $(".activeClip").toggleClass("activeClip", false);
      $("#thumbnail" + id).toggleClass("activeClip", true);
    }

    this.clipMenu.appendChild(thumbnail);
  }

  updateThumbnail(id) {
    if (id == null) id = this.activeClipId;
    if (this.clips.get(id)) 
      this.clips.get(id).thumbnail.src = this.cState.editCanvas.toDataURL(); 
  }

  newClipBlank() {
    // set thumbnail of previous clip
    this.updateThumbnail(this.activeClipId);

    var clipId = this.newClipId();
    this.clips.set(clipId, { recorded: false });
    this.addThumbnail(clipId);

    return clipId;
  }

  /** MediaController.newClipFromCurrent
   *   Copy contents of current clip to 
   *   next clip
   */
  newClipFromCurrent() {
    var clipId = this.newClipBlank();

    // set thumbnail of new clip
    this.updateThumbnail(clipId);

    // get array of objects
    var cloneCommand = new CloneCanvasCommand(this.cState); 
    var cloneEnvCommand = new CloneEnvCommand(this.cState);

    // clear the canvas
    // and clone the objects
    this.cState.clearCanvas();
    cloneCommand.cloneObjects(); // clone after clearing so labels can persist

    // then clone env so variables refer to cloned objects
    cloneEnvCommand.cloneEnv();

    var cmdRec = new CommandRecorder(this);
    this.commandRecorders.set(clipId, cmdRec);

    cmdRec.initCmds.push({ type: "execute", command: cloneCommand });
    cmdRec.initCmds.push({ type: "execute", command: cloneEnvCommand });

    // restore contents of current canvas
    // so 'continue' button can be clicked more than once in a row
    this.setEditorState(this.activeClipId);
  }

  /** MediaController.removeClips
   *    remove selected clips from 
   *    the editor state and delete the video
   *    segments on the server
   * 
   *    if current clip was deleted, switch to another
   * 
   * @param {*} clipIds - array of clip ids
   */
  removeClips(clipIds) {
    clipIds.forEach(cid => {
      this.commandRecorders.delete(cid);
      this.clips.delete(cid);

      var thumbnail = document.getElementById("thumbnail" + cid);
      this.clipMenu.removeChild(thumbnail);
    });

    // send signal to delete on backend 

    var conn = ClientSocket.getInstance();
    var body = { clipIds: clipIds };
    conn.sendServer("deleteClip", body);

    // if current clip deleted, switch to another
    if (clipIds.includes(this.activeClipId)) {
      this.cState.clearCanvas();

      // switch to the oldest clip
      if (this.clips.size) {
        var minId = Array.from(this.clips.keys())
          .reduce((acc, val) => Math.min(acc, val)); 
        this.setCurrentClip(minId);
      }
      else {
        // switch to a new blank clip
        this.newClipBlank();
      }
    }
  }

  // /** MediaController.getMergedCommandRec
  //  *    Merge command performs merging of command recorders
  //  *    before server assigns a clip id and does ffmpeg work,
  //  *    so the merged command recorder must be stored until
  //  *    the new clip id is delivered to the client. It is
  //  *    stored in the map with key -1
  //  */
  // getMergedCommandRec(clipId) {
  //   var merged = this.commandRecorders.get(-1);
  //   if (merged == null)
  //     throw "Cannot retrieve merged command recorder";
  //   this.commandRecorders.set(clipId, merged);
  //   this.commandRecorders.delete(-1);
  // }
  
  

  /** MediaController.getState
   */
  getState() {
    return this.state; 
  }

  /** MediaController.setState
   *    change state variable and update controls
   */
  setState(newState) {
    this.state = newState;

    // update react
    window.reactEditor.setState(
      { playState : this.state,
        postRecording: this.cmdRecorder.postRecording,
      });
  }

  record() {
    if (canvasLocked()) return canvasLockedAlert();
    this.state.record(this);
  }

  togglePlayback() {
    this.state.togglePlayback(this);
  } 

  /** MediaController.hotkeyUndo
   *    grabs current command recorder and undoes
   *    most recent command
   * 
   *    doesn't use past/futureCmds because those
   *    stacks are used for seeking in time
   *    after recording has occurred. 
   */
  hotkeyUndo() {
    if (this.getState() !== this.recordState 
      && this.clips.get(this.activeClipId).recorded)
      throw "Can't undo; clip has already been recorded.";
    if (this.getState() === this.playState)
      throw "Can't undo while playing.";

    var undoStack = this.cmdRecorder.undoStack;
    if (undoStack.length) {
      var lastCommand = undoStack.pop();
      CommandRecorder.undo(lastCommand);
    }
  }

  /** MediaController.hotkeyRedo
   *   grabs current command recorder and redoes 
   *   most recently undone command
   * 
   *   lock context before redoing for async commands
   */
  hotkeyRedo() {
    if (this.getState() !== this.recordState 
      && this.clips.get(this.activeClipId).recorded)
      throw "Can't redo; clip has already been recorded.";
    if (this.getState() === this.playState)
      throw "Can't redo while playing.";

    var redoStack = this.cmdRecorder.redoStack;
    if (redoStack.length) {
      var nextCommand = redoStack.pop();
      lockContext();
      return executeCommand(nextCommand, true, true) // redo = true, overrideLock = true
        .catch(err => {
          // errors get handled by executeCommand
          console.warn("uncaught err in redo: ", err);
        })
        .finally(() => unlockContext());
    }
    return new Promise(resolve => resolve());
  }
}


/** VideoPlayer
 *    displays video to some canvas 
 */
class VideoPlayer {
  constructor(cState) {
    this.cState = cState;
    this.ctx = cState.ctx.editCtx;
    this.video = document.getElementById("video");
    this.video.src = null;

    this.seeker = document.getElementById("seeker");
    this.currentTimeLabel = document.getElementById("currentTime");
    this.durationLabel = document.getElementById("duration");
    this.playButton = document.getElementById("playPause");
    this.volume = document.getElementById("volume");

    this.init();
  }

  /** VideoPlayer.init
   *    bind action to volume input 
   */
  init() {
    this.volume.oninput = (event) => {
      var scaled = this.volume.value / this.volume.max;
      this.video.volume = scaled;
    };
  }

  /** VideoPlayer.queryDuration
   *    query video duration until 
   *    it is a valid number
   */
  queryDuration() {
    return new Promise((resolve, reject) => {
      this.video.currentTime = 1000; // hack to avoid Chrome bug
      var query = setInterval(() => {
        if (this.video.readyState && isFinite(this.video.duration)) {
          clearInterval(query);
          resolve(this.video.duration);
        }
      }, 100);
    });
  }

  /** VideoPlayer.updateTime
   *    set current time and update duration for control bar
   *    based on current time of video. 
   *    
   *    If video duratio is NaN, query it until 
   *    it is a valid number.
   */
  updateTime() {
    if (this.video.src.endsWith("null")) {
      this.currentTimeLabel.innerHTML=  "0:00";
      this.durationLabel.innerHTML = "0:00";
      return;
    }

    if (! isFinite(this.video.duration))
      return this.queryDuration();

    var time = this.video.currentTime;
    var mins = Math.floor(time / 60);
    var secs = Math.floor(time - (mins * 60));
    var hs = Math.round(time * 100) % 100;
    secs = String(secs).padStart(2, "0");
    hs = String(hs).padStart(2, "0");
    this.currentTimeLabel.innerHTML = `${mins}:${secs}.${hs}`;

    if (! isFinite(this.video.duration)) return;

    var dtime = this.video.duration;
    var dmins = Math.floor(dtime / 60);
    var dsecs = Math.floor(dtime - (dmins * 60));
    var dhs = Math.round(dtime * 100) % 100;
    dsecs = String(dsecs).padStart(2, "0");
    dhs = String(dhs).padStart(2, "0");
    this.durationLabel.innerHTML = `${dmins}:${dsecs}.${dhs}`;
  }

  updateSeeker() {
    this.seeker.value = 
      Math.floor(this.video.currentTime / this.video.duration * this.seeker.max);
  }

  play() {
    if (this.video.src) 
      this.video.play();
    this.drawToCanvas();

    // set icon
    this.playButton.style.backgroundImage = PAUSEBTN;
  }

  pause() {
    this.video.pause();
    this.playButton.style.backgroundImage = PLAYBTN;
  }

  drawToCanvas() {
    // stop playing when video does 
    if (this.video.paused || this.video.ended) 
      return;

    this.ctx.drawImage(this.video, 0, 0,
      this.cState.width, this.cState.height);

    requestAnimationFrame(() => this.drawToCanvas());
  }

}

class MediaState {
  record(context) {
    console.log(`[WARNING]: Invalid transition 'record' from state ${this.constructor.name}.`);
  }

  togglePlayback(context) {
    console.log(`[WARNING]: Invalid transition 'togglePlayback' from state ${this.constructor.name}.`);
  }
}

class PauseState extends MediaState { 
  /** PauseState.record
   *    don't allow transition if video processing
   *    is still happening (context.waiting)
   *
   *    otherwise update activeClipId so new command
   *    recorder gets used
   *
   *    Clear contents of previous clip by rewinding its
   *    command recorder to 0
   *
   *    if next clip should start with final frame of 
   *    previous clip, then clone contents on first frame of 
   *    new clip
   */
  record(context) {
    if (! context.waiting) {
      if (context.clips.get(context.activeClipId).recorded)
        return alert("Already recorded this clip!");

      context.clips.get(context.activeClipId).recorded = true;

      context.recorder.start(context.timeSlice); 
      context.cmdRecorder.startRecording();
      context.setState(context.recordState);
    }
    else if (! context.clips.get(context.activeClipId).recorded) 
      context.waiting = false;
    else
      alert("waiting...");
  }

  togglePlayback(context) {
    if (context.player.video.src.endsWith("null"))
      return alert("No video to play");
    if (! context.waiting) {
      context.player.play();
      context.setState(context.playState);
    }
    else
      alert("Exporting clips...");
  }
}

class PlayState extends MediaState {
  togglePlayback(context) {
    context.player.pause();
    context.cmdRecorder.seekTo(context.player.video.currentTime)
      .then(() => context.setState(context.pauseState));
  }
} 

class RecordState extends MediaState {
  record(context) {
    context.recorder.stop();
    context.setState(context.pauseState);
  }

  togglePlayback(context) {
    context.recorder.stop();
    context.setState(context.pauseState);
  }
} 

/** CommandRecorder
 *    manage two stacks of (timestamp, command) tuples
 *    and handle rewind/forward of editor state
 *    by redoing/undoing commands 
 */
class CommandRecorder {
  constructor(mc) {
    this.mc = mc;
    this.player = mc.player;

    this.initCmds = [];
    this.pastCmds = [];
    this.futureCmds = [];

    this.undoStack = [];
    this.redoStack = [];

    this.recording = false;
    // using another field to indicate when recording stops,
    // becuase this.recording = false is ambiguous (pre or post recording)
    this.postRecording = false;

    // set recording state and startTime before recording
    // commands to avoid race conditions with getTime
    this.settingRecordPromise = new Promise(resolve => resolve());
  }

  /** CommandRecorder.getTime
   *    seconds since timer started
   */
  getTime() {
    if (this.recording) 
      return (new Date().getTime() - this.startTime) / 1000;
    // console.log("thisst = ", this.startTime)
    throw "bad time";
    return 0;
  }

  stopRecording() {
    this.recording = false;
    this.postRecording = true; // don't record any more commands
  }

  startRecording() {
    this.settingRecordPromise = new Promise(resolve => {
      this.startTime = new Date().getTime();
      this.recording = true;
      console.log("set record")
      // but only do this once
      resolve(this.settingRecordPromise = new Promise(resolve => resolve()));;
    });
  }

  /** static wrapper -- grabs and dispatches call to
   *  active CommandRecorder instance
   */
  static execute(cmdObj, redo) {
    var activeRec = MediaController.getInstance().cmdRecorder;
    return activeRec.execute(cmdObj, redo);
  }

  /** CommandRecorder.execute
   *    execute command and add it to pastCmds
   *    if clip hasn't been recorded yet.
   *    optional redo flag - if true, dont clear redo stack
   * 
   *    only called from one place -- global executeCommand
   */
  execute(cmdObj, redo) {
    if (this.postRecording) return canvasLockedAlert();
    if (cmdObj instanceof UtilCommand)
      return liftCommand(cmdObj);

    // may throw exec error
    // var ret = cmdObj.execute();

    // // only update undo stack and other state
    // // if execution succeeds      

    // this.mc.updateThumbnail();

    // // don't record state of pure expressions
    // if (! cmdObj._astNode || ! cmdObj._astNode.isLiteral) {
    //   this.undoStack.push(cmdObj);
    //   if (! redo) this.redoStack = [];

    //   // if clip hasn't been recorded yet
    //   if (this.mc.getState() !== this.mc.recordState)
    //     this.initCmds.push({ type: "execute", command: cmdObj });
    //   else
    //     this.recordCommand(cmdObj, "execute");
    // }

    // return ret;

    return this.settingRecordPromise
    .then(() => liftCommand(cmdObj))
    .then(cmdRet => {
      this.mc.updateThumbnail();
      if (! cmdObj._astNode || ! cmdObj._astNode.isLiteral) {
        this.undoStack.push(cmdObj);
        if (! redo) this.redoStack = [];

        // TODO maybe record when animation begins 

        // if clip hasn't been recorded yet
        if (this.mc.getState() !== this.mc.recordState)
          this.initCmds.push({ type: "execute", command: cmdObj });
        else
          this.recordCommand(cmdObj, "execute");
      }

      return cmdRet;
    })
  }

  /** static wrapper -- grabs and dispatches call to
   *  active CommandRecorder instance
   */
  static undo(cmdObj) {
    var activeRec = MediaController.getInstance().cmdRecorder;
    activeRec.undo(cmdObj);
  }

  /** CommandRecorder.undo
   *    undo command and add it to pastCmds
   *    if clip hasn't been recorded over yet
   */
  undo(cmdObj) {
    if (this.postRecording) return canvasLockedAlert();
    if (cmdObj instanceof UtilCommand)
      return cmdObj.undo();

    cmdObj.undo();
    this.mc.updateThumbnail();

    this.redoStack.push(cmdObj);

    // if clip hasn't been recorded yet
    if (this.mc.getState() !== this.mc.recordState)
      this.initCmds.push({ type: "undo", command: cmdObj });
    else
      this.recordCommand(cmdObj, "undo");
  }

  static recordCommand(cmdObj, type) {
    var activeRec = MediaController.getInstance().cmdRecorder;
    activeRec.recordCommand(cmdObj, type);
  }

  recordCommand(cmdObj, type) {
    console.log("recording ", cmdObj.constructor.name, " cmd at ", this.getTime());
    this.pastCmds.push(
      { command: cmdObj, 
        time: this.getTime(), 
        type: type });
  }

  /** CommandRecorder.seekTo
   *    update stacks and redo/undo commands
   *    
   *    async commands get converted to their atomic versions
   *    which instantly set the state to their final frame
   */
  seekTo(secs) {
    if (this.recording)
      throw "Cannot seek while recording";

    // use atomic command lifting so
    // animations happen instantly
    var prevLiftingMode = getCommandLifting();
    return setCommandLifting(LIFT_ATOMIC)
    .then(() => {
      return this.futureCmds.reduceRight((prevCT, curCT) => {
        return prevCT.then(() => {
          // pop from future and push to past
          if (curCT.time < secs) { 
            this.futureCmds.pop();
            var lift;
            if (curCT.type == "execute") lift = liftCommand;
            if (curCT.type == "undo") lift = liftUndo;
            return lift(curCT.command).then(() => this.pastCmds.push(curCT));
          }
          return new Promise(resolve => resolve());
        });
      }, new Promise(resolve => resolve()))
      .then(() => {
        return this.pastCmds.reduceRight((prevCT, curCT) => {
          return prevCT.then(() => {
            if (curCT.time > secs) {
              this.pastCmds.pop();
              var lift;
              if (curCT.type == "execute") lift = liftUndo;
              if (curCT.type == "undo") lift = liftCommand;
              return lift(curCT.command).then(() => this.futureCmds.push(curCT));
            }
            return new Promise(resolve => resolve());
          });
        }, new Promise(resolve => resolve()));
      })
      .then(() => setCommandLifting(prevLiftingMode))
      .then(() => {
        // call repaint manually here
        // since seeking isn't handled 
        // by the Command pattern
        repaint();

        updateInspectPane();
      });
    })

  }

  /** CommandRecorder.fullRewind
   *    first 
   *      call seekTo(-1) to undo all the commands that were
   *      recorded after the clock started ticking
   * 
   *    then clear the contents of the canvas
   */
  fullRewind() {
    return this.seekTo(-1)
      .then(() => {
        // new edition: just clear canvas and VEnv
        // this.mc.cState.clearCanvas();

        // VariableEnvironment.clearAll();
      })
      .then(() => {
        // also undo init commands (in reverse) to restore state
        // of altered data structures, etc.
        return this.initCmds.reduceRight((prevCT, curCT) => {
          return prevCT.then(() => {
            var lift;
            if (curCT.type == "execute") lift = liftUndo;
            if (curCT.type == "undo") lift = liftCommand;
            return lift(curCT.command);
          })
        }, new Promise(resolve => resolve()));
      });
  }

  printStacks() {
    console.log("pastCmds = ", this.pastCmds.map((x) => [x.time, x.command.constructor.name]));
    console.log("futureCmds = ", this.futureCmds.map((x) => [x.time, x.command.constructor.name]));
  }

  /** CommandRecorder.truncate
   *    go through both stacks get rid of any commands
   *    that exist beyond timeStamp
   */
  truncate(timeStamp) {
    while (this.futureCmds.peek() && this.futureCmds.peek().time > timeStamp)
      this.futureCmds.pop();
    while (this.pastCmds.peek() && this.pastCmds.peek().time > timeStamp)
      this.pastCmds.pop();
  }

  init() {
    // use atomic versions of async commands
    // for setting initial canvas state 
    var prevLiftingMode = getCommandLifting();
    return setCommandLifting(LIFT_ATOMIC)
    .then(() => {
      return this.initCmds.reduce((prev, cur) => {
        console.log("INIT CMD: ", cur.command.constructor.name); // cur.command);
        return prev.then(() => {
          if (cur.type == "execute") 
            return liftCommand(cur.command);
          else // undo is atomic
            return liftUndo(cur.command);
        });
      }, new Promise(resolve => resolve()))
      .then(() => setCommandLifting(prevLiftingMode));
    });
  } 
}
