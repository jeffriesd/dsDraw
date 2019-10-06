
class GeomCommand extends ConsoleCommand {

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

  checkArguments() {
    if (! (this.receiver instanceof CanvasObject))
      throw "Only canvas objects can be translated";
    if (! (typeof this.dx) === "number" 
        && (typeof this.dy) === "number")
      this.argsError("Please user integer dx, dy")
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

  checkArguments() {
    if (! (this.receiver instanceof CanvasObject))
      throw "Only canvas objects can be translated";
    if (! (typeof this.dx) === "number" 
        && (typeof this.dy) === "number")
      this.argsError("Please user integer dx, dy")
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