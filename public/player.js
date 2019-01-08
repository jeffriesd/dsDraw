class MediaController {
  constructor(canvasState) {
    this.cState = canvasState;
    // capture and replay at 100ms framerate
    this.framerate = 20;

    this.player = new VideoPlayer(canvasState.canvas, this.framerate);
    this.cStream = canvasState.canvas.captureStream(this.framerate);
    this.recorder = new MediaRecorder(this.cStream, { mimeType: "video/webm;codecs=vp8"});
    this.init();

    this.websock = null;

    this.playState = new PlayState();
    this.pauseState = new PauseState();
    this.recordState = new RecordState();

    this.state = this.pauseState;
    
    this.chunks = [];

    this.instance = null;
  }

  /** MediaController.init
   *    bind events to recorder and video 
   */
  init() {
    this.recorder.ondataavailable = (event) => {
      console.log("data available");
      this.chunks.push(event.data);
      console.log("chunks = ", this.chunks);
    };

    this.recorder.onstop = (event) => {
      var blob = new Blob(this.chunks, { "type" : "video/webm; codecs=vp9"});
      this.websock.send(blob);
      this.chunks = [];

      // fast forward editor to current time (to end)
    };

    this.player.video.onended = (event) => {
      this.togglePlayback();
    }
  }

  processWSMessage(msg) {
    // default
    this.setVideoURL(msg);
  }

  setVideoURL(url) {
    console.log("setting video url to", url);
    url = url.replace(/^public\//, "");
    this.player.video.src = url;
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


  /** MediaController.getInstance
   */
  static getInstance(cState) {
    if (this.instance == null)
      this.instance = new MediaController(cState);
    return this.instance;
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
    this.framerate = framerate;
  }

  play() {
    this.video.play();
    this.drawToCanvas();
  }

  pause() {
    this.video.pause();
  }

  drawToCanvas() {
    // stop playing when video does 
    if (this.video.paused || this.video.ended) 
      return;
    console.log("drawing");
    this.ctx.drawImage(this.video,0,0,
      this.canvas.width, this.canvas.height);

    setTimeout(() => this.drawToCanvas(), this.framerate);
  }

  ended() {
    console.log("ct = ", this.video.currentTime, "; dur=", this.video.duration);
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
   */
  record(context) {

    // if (context.player.ended()) {
      context.recorder.start(); 
      context.setState(context.recordState);

      console.log("recording");
    // }
    // else {
    //   console.log("cannot record, not at end of video");
    // }
  }

  togglePlayback(context) {
    context.player.play();
    context.setState(context.playState);
  }
}

class PlayState extends MediaState {
  togglePlayback(context) {
    context.player.pause();
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
  constructor() {
    this.instance = null;
    this.executed = [];
    this.undone = [];
  }

  static getInstance() {
    if (this.instance == null)
      this.instance = new CommandRecorder();
    return this.instance;
  }

  /** CommandRecorder.execute
   *    execute command and add it to commandList
   */
  execute(cmdObj) {
    cmdObj.execute();

  }
}
