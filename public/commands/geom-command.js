
class GeomCommand extends ConsoleCommand {

  checkArguments() {
    if (! (this.receiver instanceof CanvasObject))
      throw "Only canvas objects can be translated";
    if (! (typeof this.dx) === "number" 
        && (typeof this.dy) === "number")
      this.argsError("Please user integer dx, dy")
  }

}

/** TranslateCommand
 *    syntax:
 *      translate(obj, dx, dy)
 *  or  tr(obj, dx, dy)
 */
class TranslateCommand extends GeomCommand {
  constructor(cState, ...args) {
    super(...args);
  }

  usage() {
    return "translate(canvasObj, dx, dy)";
  }

  precheckArguments() {
    this.checkArgsLength(3);
  }

  getChildValues() {
    this.receiver = this.args[0];
    this.dx = this.args[1];
    this.dy = this.args[2];
  }

  executeSelf() {
    this.receiver.move(this.dx, this.dy);
  }

  saveState() {
    return { 
      x : this.receiver.x, 
      y : this.receiver.y,
    };
  }

  restoreState(state) {
    this.receiver.moveTo(state.x, state.y);
  }
}


/** same as translate but absolute instead of relative */
class MoveToCommand extends GeomCommand {
  constructor(cState, ...args) {
    super(...args);
  }

  usage() {
    return "moveTo(canvasObj, dx, dy)";
  }

  precheckArguments() {
    this.checkArgsLength(3);
  }

  getChildValues() {
    this.receiver = this.args[0];
    this.dx = this.args[1];
    this.dy = this.args[2];
  }

  executeSelf() {
    this.receiver.moveTo(this.dx, this.dy);
  }

  saveState() {
    return { 
      x : this.receiver.x, 
      y : this.receiver.y,
    };
  }

  restoreState(state) {
    this.receiver.moveTo(state.x, state.y);
  }
}

class ResizeCommand extends GeomCommand {
  constructor(cState, ...args) {
    super(...args);
  }

  usage() {
    "resize(canvasObj, w, h)";
  }

  checkArguments() {
    super.checkArguments();

    // also check that width and height are non-negative
    if (this.newWidth < 0 || this.newHeight < 0) 
      this.argsError("Width and height must be > 0");
  }

  precheckArguments() {
    this.checkArgsLength(3);
  }

  getChildValues() {
    this.receiver = this.args[0];
    this.newWidth = this.args[1];
    this.newHeight = this.args[2];
  }

  executeSelf() {
    this.receiver.resizeTo(this.newWidth, this.newHeight);
  }

  saveState() {
    return {
      width: this.receiver.width,
      height: this.receiver.height,
    };
  }

  restoreState(state) {
    this.receiver.resizeTo(state.width, state.height);
  }
}