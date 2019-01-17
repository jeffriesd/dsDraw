class MediaController {
  constructor(canvasState) {
    this.cState = canvasState;

    // update every 50ms (20fps)
    this.framerate = 50;

    // id of active clip
    this.activeClipId = -1;
    this.commandRecorders = new Map();
      
    this.player = new VideoPlayer(canvasState.canvas, this.framerate);
    this.cStream = canvasState.canvas.captureStream(this.framerate);
    // this.requestAudio();

    this.recorder = new MediaRecorder(this.cStream, 
      { mimeType: "video/webm;codecs=vp8,opus"});
    this.init();

    this.playState = new PlayState();
    this.pauseState = new PauseState();
    this.recordState = new RecordState();

    this.state = this.pauseState;
    
    this.chunks = [];

    this.instance = null;
  }

  /** MediaController.getInstance
   */
  static getInstance(cState) {
    if (this.instance == null)
      this.instance = new MediaController(cState);
    return this.instance;
  }

  /** MediaController.cmdRecorder
   *    getter method to fetch the
   *    command recorder for current active clip
   */
  get cmdRecorder() {
    if (this.commandRecorders.get(this.activeClipId) == null) {
      this.commandRecorders.set(this.activeClipId, 
        new CommandRecorder(this.player, this.framerate));
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
      WebSocketConnection.getInstance().sendBlob(blob);
      this.chunks = [];

      // wait for merge/write to complete before updating 
      // video src url
      this.waiting = true;

      // stop rec timer
      this.cmdRecorder.stopTimer();
    };

    this.recorder.onstart = (event) => {
      var startTime = this.player.video.duration;
      if (isNaN(this.player.video.duration))
        startTime = 0;
      console.log("rec start time = ", startTime);

      // this.cmdRecorder.startTimer(startTime);
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

  setVideoURL(id, url) {
    console.log("setting video url to", url);
    url = url.replace(/^public\//, "");
    this.player.video.src = url;

    this.player.seeker.value = 0;
    this.player.updateTime();
    this.waiting = false;
  }

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
}


/** VideoPlayer
 *    displays video to some canvas 
 */
class VideoPlayer {
  constructor(canvas, framerate) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.video = document.getElementById("video");
    this.seeker = document.getElementById("seeker");
    this.currentTimeLabel = document.getElementById("currentTime");
    this.durationLabel = document.getElementById("duration");
    this.playButton = document.getElementById("playPause");
    this.volume = document.getElementById("volume");

    this.init();

    this.framerate = framerate;
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
   *    query video readystate until duration is valid,
   *    then update time 
   */
  queryDuration() {
    this.video.currentTime = 1000; // hack to avoid Chrome bug
    var query = setInterval(() => {
      if (isFinite(this.video.duration)) {
        clearInterval(query);
        this.video.currentTime = 0;
        this.updateTime();
      }
    }, 100);
  }

  /** VideoPlayer.updateTime
   *    set current time and update duration for control bar
   *    based on current time of video. 
   *    
   *    If video duratio is NaN, query it until 
   *    it is a valid number.
   */
  updateTime() {
    if (! isFinite(this.video.duration))
      return this.queryDuration();

    var time = this.video.currentTime;
    var mins = Math.floor(time / 60);
    var secs = Math.floor(time - (mins * 60));
    var hs = Math.round(time * 100) % 100;
    secs = String(secs).padStart(2, "0");
    hs = String(hs).padStart(2, "0");
    this.currentTimeLabel.innerHTML = `${mins}:${secs}.${hs}`;

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
    if (this.video.src) {
      this.video.play();
      this.drawToCanvas();
    }

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

    console.log("drawing vsrc", this.video.src);
    this.ctx.drawImage(this.video, 0, 0,
      this.canvas.width, this.canvas.height);

    setTimeout(() => this.drawToCanvas(), this.framerate);
  }

  ended() {
    console.log("cur time = ", this.video.currentTime, ", dur = ", this.video.duration);
    return isNaN(this.video.duration) || this.video.currentTime == this.video.duration;
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
   *    only record if player is seeked to end
   *    and clips are no longer being merged
   */
  record(context) {
    if (context.player.ended() && ! context.waiting) {
      // if starting new
      context.cmdRecorder.seekTo(-1);

      // start using next CommandRecorder
      context.activeClipId++;

      // wait 2 frames to avoid drawing
      // previous contents
      setTimeout(() => {
        context.recorder.start(); 
        context.setState(context.recordState);
      }, context.framerate * 2);

      console.log("recording");
    }
    else 
      alert("cannot record, not at end of video");
  }

  togglePlayback(context) {
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
  constructor(player, framerate) {
    this.pastCmds = [];
    this.futureCmds = [];
    this.player = player;
    this.framerate = framerate;

    this.instance = null;

    this.secs = 0;
    this.recording = false;
  }

  /** CommandRecorder.getTime
   *    if video is paused, allow commands to be recorded
   *    still but video has already been written, so it 
   *    only makes sense to record as occurring at the
   *    end of the current clip
   */
  getTime() {
    if (this.recording) return this.secs;
    console.log("getting time from video");
    return this.player.video.duration;
  }

  stopTimer() {
    this.recording = false;
  }

  startTimer(startTime) {
    this.recording = true;
    this.secs = startTime;
    this.tick();
  }

  tick() {
    if (! this.recording) return;
    
    // convert 50ms to 0.05s
    this.secs += this.framerate / 1000;
    setTimeout(() => this.tick(), this.framerate);
  }

  /** static wrapper -- grabs and dispatches call to
   *  active CommandRecorder instance
   */
  static execute(cmdObj) {
    var activeRec = MediaController.getInstance().cmdRecorder;
    activeRec.execute(cmdObj);
  }

  /** CommandRecorder.execute
   *    execute command and add it to pastCmds
   */
  execute(cmdObj) {
    var ret = cmdObj.execute();
    if (cmdObj instanceof UtilCommand) return;
    this.recordCommand(cmdObj, "execute");
    return ret;
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
    this.recordCommand(cmdObj, "undo");
  }

  static recordCommand(cmdObj, type) {
    var activeRec = MediaController.getInstance().cmdRecorder;
    activeRec.recordCommand(cmdObj, type);
  }

  recordCommand(cmdObj, type) {
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

    // console.log("seeking commands to ", secs);

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

    console.log("pastCmds = ", this.pastCmds);
  }
}
