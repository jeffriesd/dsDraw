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
