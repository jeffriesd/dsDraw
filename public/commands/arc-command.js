class ArrowCommand extends CanvasObjectMethod {
  saveState() {
    return {
      x1 : this.receiver.x1,
      y1 : this.receiver.y1,
      x2 : this.receiver.x2,
      y2 : this.receiver.y2,
      cp1 : { 
        x : this.receiver.cp1.x,
        y : this.receiver.cp1.y
      },
      cp2 : {
        x : this.receiver.cp2.x,
        y : this.receiver.cp2.y
      }
    };
  }

  restoreState(state) {
    this.receiver.x1 = state.x1;
    this.receiver.y1 = state.y1;
    this.receiver.x2 = state.x2;
    this.receiver.y2 = state.y2;
    this.receiver.cp1.x = state.cp1.x;
    this.receiver.cp1.y = state.cp1.y;
    this.receiver.cp2.x = state.cp2.x;
    this.receiver.cp2.y = state.cp2.y;
  }
}

class ArrowSetTailCommand extends ArrowCommand {
  constructor(receiver, toX, toY) {
    super(receiver, toX, toY);
  }

  precheckArguments() {
    this.checkArgsLength(2);
  }

  getChildValues() { 
    this.tailX = this.args[0];
    this.tailY = this.args[1];
  }

  checkArguments() {
    if (! (isNumber(this.tailX) && isNumber(this.tailY)))
      this.argsError("setTail requires numeric arguments");
  }

  saveState() {
    return {
      prevX : this.receiver.x1, 
      prevY : this.receiver.y1,
    };
  }

  restoreState(state) {
    this.receiver.x1 = state.prevX;
    this.receiver.y1 = state.prevY;
  }

  executeSelf() {
    this.receiver.x1 = this.tailX;
    this.receiver.y1 = this.tailY;
  }
}

class ArrowSetHeadCommand extends ArrowCommand {
  constructor(receiver, toX, toY) {
    super(receiver, toX, toY);
  }

  precheckArguments() {
    this.checkArgsLength(2);
  }

  getChildValues() { 
    this.headX = this.args[0];
    this.headY = this.args[1];
  }

  checkArguments() {
    if (! (isNumber(this.headX) && isNumber(this.headY)))
      this.argsError("setHead requires numeric arguments");
  }

  saveState() {
    return {
      prevX : this.receiver.x2, 
      prevY : this.receiver.y2,
    };
  }

  restoreState(state) {
    this.receiver.x2 = state.prevX;
    this.receiver.y2 = state.prevY;
  }

  executeSelf() {
    this.receiver.x2 = this.headX;
    this.receiver.y2 = this.headY;
  }
}

class ArrowStraightenCommand extends ArrowCommand {
  precheckArguments() {
    this.checkArgsLength(0);
  }
  executeSelf() {
    this.receiver.straighten();
  }
}

class ArrowSetCtrl1Command extends ArrowCommand {
  precheckArguments() {
    this.checkArgsLength(2);
  }
  getChildValues() {
    this.cp1x = this.args[0];
    this.cp1y = this.args[1];
  }
  checkArguments() {
    if (! (isNumber(this.cp1x) && isNumber(this.cp1y)))
      this.argsError("setCtrl1 requires numeric arguments");
  }
  saveState() {
    return {
      prevX : this.receiver.cp1.x,
      prevY : this.receiver.cp1.y,
    };
  }
  restoreState(state) {
    this.receiver.cp1.x = state.prevX;
    this.receiver.cp1.y = state.prevY;
  }
  executeSelf() {
    this.receiver.cp1.x = this.cp1x;
    this.receiver.cp1.y = this.cp1y;
  }
}

class ArrowSetCtrl2Command extends ArrowCommand {
  precheckArguments() {
    this.checkArgsLength(2);
  }
  getChildValues() {
    this.cp2x = this.args[0];
    this.cp2y = this.args[1];
  }
  checkArguments() {
    if (! (isNumber(this.cp2x) && isNumber(this.cp2y)))
      this.argsError("setCtrl2 requires numeric arguments");
  }
  saveState() {
    return {
      prevX : this.receiver.cp2.x,
      prevY : this.receiver.cp2.y,
    };
  }
  restoreState(state) {
    this.receiver.cp2.x = state.prevX;
    this.receiver.cp2.y = state.prevY;
  }
  executeSelf() {
    this.receiver.cp2.x = this.cp2x;
    this.receiver.cp2.y = this.cp2y;
  }
}