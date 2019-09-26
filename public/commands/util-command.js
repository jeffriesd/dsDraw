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
    link.setAttribute("download", "image.png");
    link.setAttribute("href", this.cState.editCanvas.toDataURL());
    link.click();
  }
}

class VideoCommand extends UtilCommand {
  constructor(cState, clipIds) {
    super();
    this.cState = cState;
    this.mc = MediaController.getInstance();

    // looks clunky but parseInt takes up to 3 args,
    // so regular map(parseInt) doesn't work
    this.clipIds = 
      clipIds.map(x => parseInt(x))
      .filter(x => this.mc.clips.has(x));
  }
}

class TruncateVideoCommand extends VideoCommand {
  // truncate video file as well as command recorder state
  execute() {
    if (this.mc.getState() !== this.mc.pauseState) return;
    var conn = ClientSocket.getInstance();
    var currTime = this.mc.player.video.currentTime;

    var clipId = parseInt(this.mc.activeClipId);

    this.mc.waiting = true;
    this.mc.cmdRecorder.truncate(currTime);

    // send message from client to server to truncate video at current time
    var body = { clipId : clipId, timeStamp: currTime };
    conn.sendServer("truncate", body);
  }
}

class RepaintCommand extends UtilCommand {
  constructor(cState) {
    super();
    this.cState = cState;
  }

  execute() {
    this.cState.repaint();
  }

  undo() {
  }
}
