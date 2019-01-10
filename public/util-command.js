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
