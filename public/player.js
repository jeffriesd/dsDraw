class MediaController {
  constructor(canvasState) {
    if (MediaController.instance) return MediaController.instance;
    this.cState = canvasState;

    // update at 20fps
    this.framerate = 20;

    this.clips = new Map();
    this.commandRecorders = new Map();

    // keep track of currently selected clip
    this.activeClipId = 0;
    this.clipMenu = document.getElementById("clipMenu");
    this.newClipBlank(0);
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

    MediaController.instance = this;
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

  /** MediaController.cmdRecorder
   *    getter method to fetch the
   *    command recorder for current active clip
   */
  get cmdRecorder() {
    if (this.commandRecorders.get(this.activeClipId) == null) {
      this.commandRecorders.set(this.activeClipId, 
        new CommandRecorder(this, this.framerate));
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

      // stop rec timer
      this.cmdRecorder.stopTimer();
    };

    this.recorder.onstart = (event) => {
      this.cmdRecorder.startTimer(0);
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
    this.setCurrentClip(id);
  }

  /** MediaController.setCurrentClip
   *    clear current canvas contents,
   *    update activeClipId, update time,
   *    apply any initialization commands
   *    for newly selected clip, and 
   *    add 'activeClip' class for css
   */
  setCurrentClip(id) {
    // clear canvas contents
    this.cmdRecorder.fullRewind();

    this.activeClipId = id;
    this.player.updateTime();

    // apply any initialization commands
    this.cmdRecorder.init();

    // set active class for css
    $(".activeClip").toggleClass("activeClip", false);
    $("#thumbnail" + id).toggleClass("activeClip", true);
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

    thumbnail.onclick = (event) => {
      if (this.getState() === this.pauseState) {
        if (this.clips.get(id).url) 
          this.setVideoURL(id, this.clips.get(id).url);
        else {
          this.setCurrentClip(id);
          this.player.video.src = null;
        }
      }
    };

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
    this.cState.clearCanvas();
    cloneCommand.doClone(); // clone after clearing so labels can persist
    
    var cmdRec = new CommandRecorder(this, this.framerate);
    this.commandRecorders.set(clipId, cmdRec);

    cmdRec.initCmds.push({ type: "execute", command: cloneCommand });
  }

  /** MediaController.removeClip
   *    remove clip id from duration and 
   *    ComamndRecorder maps and thumbnail
   *    from clip menu
   */
  removeClip(clipId) {
    this.commandRecorders.delete(clipId);

    var thumbnail = document.getElementById("thumbnail" + clipId);
    this.clipMenu.removeChild(thumbnail);
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
    document.getElementById("recording").innerHTML = newState.constructor.name;
    this.state = newState;
  }

  record() {
    this.state.record(this);
  }

  togglePlayback() {
    this.state.togglePlayback(this);
  } 

  /** MediaController.hotkeyUndo
   *    grabs current command recorder and undoes
   *    most recent command
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
      CommandRecorder.execute(nextCommand, true);
    }
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

      // wait 2 frames to avoid drawing
      // previous contents
      // setTimeout(() => {
        context.recorder.start(); 
        context.setState(context.recordState);
      // }, context.framerate * 2);

    }
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
      alert("Merging clips...");
  }
}

class PlayState extends MediaState {
  togglePlayback(context) {
    context.player.pause();
    context.cmdRecorder.seekTo(context.player.video.currentTime);
    context.setState(context.pauseState);
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
  constructor(mc, framerate) {
    this.mc = mc;
    this.player = mc.player;
    this.framerate = framerate;

    this.initCmds = [];
    this.pastCmds = [];
    this.futureCmds = [];

    this.undoStack = [];
    this.redoStack = [];

    this.recording = false;
  }

  /** CommandRecorder.getTime
   *    if video is paused, allow commands to be recorded,
   *    but video has already been written, so it 
   *    only makes sense to record as occurring at the
   *    end of the current clip
   *
   *    otherwise calculate ms since timer started
   */
  getTime() {
    if (this.recording) 
      return (new Date().getTime() - this.startTime) / 1000;
    return this.player.video.duration;
  }

  stopTimer() {
    this.recording = false;
  }

  // TODO use system clock or something
  startTimer(startTime) {
    this.startTime = new Date().getTime();
    this.recording = true;
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
   *    optional redo flag - if true, dont clear redo stack
   */
  execute(cmdObj, redo) {
    if (! (cmdObj instanceof UtilCommand)) {
      this.mc.updateThumbnail();

      this.undoStack.push(cmdObj);
      if (! redo) this.redoStack = [];

      // if clip hasn't been recorded yet
      if (this.mc.getState() !== this.mc.recordState
        && this.player.video.src.endsWith("null"))
        this.initCmds.push({ type: "execute", command: cmdObj });
      else
        this.recordCommand(cmdObj, "execute");
    }
      
    return cmdObj.execute();
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
   */
  undo(cmdObj) {
    cmdObj.undo();
    if (cmdObj instanceof UtilCommand) return;
    this.mc.updateThumbnail();

    this.redoStack.push(cmdObj);

    // if clip hasn't been recorded yet
    if (this.mc.getState() !== this.mc.recordState
      && this.player.video.src.endsWith("null"))
      this.initCmds.push({ type: "undo", command: cmdObj });
    else
      this.recordCommand(cmdObj, "undo");
  }

  static recordCommand(cmdObj, type) {
    var activeRec = MediaController.getInstance().cmdRecorder;
    activeRec.recordCommand(cmdObj, type);
  }

  recordCommand(cmdObj, type) {
    console.log("recording cmd at ", this.getTime());
    this.pastCmds.push(
      { command: cmdObj, 
        time: this.getTime(), 
        type: type });
  }

  /** CommandRecorder.seekTo
   *    update stacks and redo/undo commands
   */
  seekTo(secs) {
    if (this.recording)
      throw "Cannot seek while recording";

    while (this.futureCmds.peek() && this.futureCmds.peek().time < secs) {
      var cmdTime = this.futureCmds.pop();
      if (cmdTime.type == "execute") cmdTime.command.execute();
      if (cmdTime.type == "undo") cmdTime.command.undo();
      this.pastCmds.push(cmdTime);
    }

    while (this.pastCmds.peek() && this.pastCmds.peek().time > secs) {
      var cmdTime = this.pastCmds.pop();
      if (cmdTime.type == "execute") cmdTime.command.undo();
      if (cmdTime.type == "undo") cmdTime.command.execute();
      this.futureCmds.push(cmdTime);
    }

    // this.printStacks();
  }

  fullRewind() {
    this.seekTo(-1);

    this.initCmds.forEach(ct => { 
      // if (ct.type == "execute") 
        ct.command.undo();
      // else ct.command.execute();
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
    return new Promise((resolve, reject) => {
      this.initCmds.forEach(ct => {
        if (ct.type == "execute") ct.command.execute();
        else ct.command.undo();
      });

      resolve();
    });
  } 
}
