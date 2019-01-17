/** Util commands
 *  - not recorded when passed to CommandRecorder.execute
 */

class UtilCommand {
  execute() {
    throw "Execute not implemented for " + this.constructor.name;
  }

  undo() {
  }
}

class ExportToImageCommand extends UtilCommand {
  constructor(cState) {
    super();
    this.cState = cState;
  }

  execute() {
    var link = document.getElementById("downloadLink");
    link.setAttribute("download", "image.jpg");
    link.setAttribute("href", this.cState.canvas.toDataURL());
    link.click();
  }
}

class VideoCommand extends UtilCommand {
  constructor(cState) {
    super();
    this.mc = MediaController.getInstance(cState);
  }
}

class PlayVideoCommand extends VideoCommand {
  execute() {
    if (this.mc.getState() !== this.mc.playState)
      this.mc.togglePlayback();
  }
}

class PauseVideoCommand extends VideoCommand {
  execute() {
    if (this.mc.getState() !== this.mc.pauseState)
      this.mc.togglePlayback();
  }
}

class RecordCommand extends VideoCommand {
  execute() {
    this.mc.record();
  }
}

class StopCommand extends VideoCommand {
  execute() {
    if (this.mc.getState === this.mc.recordState)
      this.mc.record();
  }
}

class TruncateVideoCommand extends VideoCommand {
  // truncate video file as well as command recorder state
  execute() {
    var conn = WebSocketConnection.getInstance();
    var mc = MediaController.getInstance();
    var currTime = mc.player.video.currentTime;

    var clipId = mc.activeClipId;

    mc.waiting = true;
    mc.cmdRecorder.truncate(currTime);

    // send message from client to server to truncate video at current time
    var body = { clipId : clipId, timeStamp: currTime };
    conn.sendServer("truncate", body);
  }
}

class SelectVideoCommand extends VideoCommand {
  constructor(cState, clipId) {
    super(cState);
    this.clipId = parseInt(clipId);
  }

  /** SelectVideoCommand.execute
   *    send message to ws server to request different clip
   *    and switch command recorder to correct one
   */
  execute() {
    var conn = WebSocketConnection.getInstance();
   
    var mc = MediaController.getInstance();
    // before changing clips, clear canvas
    mc.cmdRecorder.seekTo(-1);

    mc.activeClipId = this.clipId;

    var body = { clipId: this.clipId};
    conn.sendServer("select", body);
  }
}
