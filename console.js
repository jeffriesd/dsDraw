ENTER = 13;
ESC = 27;

class CommandConsole {

  constructor(canvasState) {
    this.cState = canvasState;
    this.cmdConsole = document.getElementById("commandConsole");
    this.commandLine = document.getElementById("commandLine");
    this.history = document.getElementById("commandHistory");
    this.cmdConsole.appendChild(commandLine);

    this.history.value = "";
    this.commandLine.value = "";
  
    this.historyStack = [];
    this.numLines = 15;

    // start off hidden
    this.cmdConsole.hidden = true;

    this.width = 150;
    this.height = 250;

    this.clHeight = 20;

    this.initStyle();
    this.bindKeys();
  }

  initStyle() {
    // style/position cmdConsole window
    this.cmdConsole.style.left = "20px";
    this.cmdConsole.style.top = "20px";
    this.cmdConsole.style.width = this.width + "px";
    this.cmdConsole.style.height= this.height + "px";
    this.cmdConsole.style.background = "rgba(0, 0, 0, .1)";

    this.history.style.lineHeight = "16px";
  }

  toggleVisible(toggle="") {
    var hidden = !this.cmdConsole.hidden;
    if (toggle == "on")
      hidden = false;
    else if (toggle == "off")
      hidden = true;
    
    this.cmdConsole.hidden = hidden;
    this.commandLine.focus();
  }

  bindKeys() {
    var self = this;
    this.commandLine.onkeydown = function(event) {
      if (event.keyCode == ENTER) {
        self.commandEntered(event);
        this.value = ""; 
      }
      else if (event.keyCode == ESC) {
        self.toggleVisible("off");
      }
    };
  }


  /*  commandEntered(event)
   *    parse command and update canvasState
   *    accordingly
   *
   *  TODO:
   *    - create command parsing class and
   *    command objects
   */
  commandEntered(event) {
    console.log("enter key pressed"); 
    console.log("command was", this.commandLine.value);

    var splitCmd = this.commandLine.value.split(" ");

    // simple set mode command
    if (splitCmd[0] == "mode") {
      if (splitCmd.length > 1)
        this.cState.setMode(splitCmd[1]);
    }

    // add to command history
    this.historyStack.push(this.commandLine.value);

    // redraw command history
    this.showHistory();
  }

  showHistory() {
    var lineHeight = 
        parseInt(this.history.style.lineHeight.substr(0, 2));
    
    this.numLines = 
        Math.floor(this.history.offsetHeight / lineHeight);

    var filledLines = this.historyStack.length;
    this.history.value = "";

    // fill in empty lines for bottom-up look
    for (var l = filledLines; l < this.numLines; l++)
      this.history.value += "\n";
    this.history.value += this.historyStack.join("\n");
  }

}

