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
    if (this.mc.getState() !== this.mc.pauseState) return;
    var conn = WebSocketConnection.getInstance();
    var currTime = this.mc.player.video.currentTime;

    var clipId = this.mc.activeClipId;

    this.mc.waiting = true;
    this.mc.cmdRecorder.truncate(currTime);

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
    if (this.mc.getState() !== this.mc.pauseState) return;
    var conn = WebSocketConnection.getInstance();

    var body = { clipId: this.clipId};
    conn.sendServer("select", body);
  }
}

class ExportVideoCommand extends VideoCommand {
  constructor(cState, ...clipIds) {
    super(cState);

    // looks clunky but parseInt takes up to 3 args,
    // so regular map(parseInt) doesn't work
    this.clipIds = clipIds.map(x => parseInt(x)); 
  }

  /** ExportVideoCommand.execute
   *   merge clips together and prompt user
   *   to download
   */
  execute() {
    if (this.mc.getState() !== this.mc.pauseState) return;

    var conn = WebSocketConnection.getInstance();

    // TODO set merging state -- disable clip menu and controls
    this.mc.waiting = true;
    
    var body = { clipIds: this.clipIds };
    conn.sendServer("merge", body);
  }
}

class ContinueClipCommand extends VideoCommand {
  
  /** ContinueClipCommand.execute
   *    create new clip (new thumbnail and id)
   */
  execute() {
    if (this.mc.getState() !== this.mc.pauseState) return;
    this.mc.newClipFromCurrent();
  }
}

class BlankClipCommand extends VideoCommand {
  execute() {
    if (this.mc.getState() !== this.mc.pauseState) return;
    this.mc.newClipBlank();
  }
}

