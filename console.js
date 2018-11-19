mainCommands = {
  "create": ConsoleCreateCommand,
};

class CommandConsole {

  constructor(canvasState) {
    this.cState = canvasState;
    this.cmdConsole = document.getElementById("commandConsole");
    this.commandLine = document.getElementById("commandLine");
    this.history = document.getElementById("commandHistory");

    this.cmdConsole.appendChild(commandLine);

    // command parsing class
    this.parser = new CommandInterpreter(this.cState, this);

    this.history.value = "";
    this.commandLine.value = "";
  
    this.historyStack = [];
    this.numLines = 15;

    /*  used for multi line commands, e.g.
     *  create array {
     *     label: arr123,
     *     length: 8,
     *     values: rand,
     *   }
     */ 
    this.multiCommand = [];
    this.multiLine = false;

    // start off hidden
    this.cmdConsole.hidden = true;

    this.cycleIndex = 0;

    this.width = 150;
    this.height = 250;

    this.clHeight = 20;

    this.initStyle();
    this.bindKeys();
    this.bindActions();
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

  bindActions() {
    this.cmdConsole.onmousedown = (event) => {
      // dont drag if clicking input (prevents drag/resize happening simultaneously)
      if (!this.clickingInput(event))  {
        this.dragStart = {x: event.clientX, y: event.clientY};

        // pass focus to input
        event.preventDefault();
        this.commandLine.select();
      }
      else {
        // update display on resize
        this.showHistory();
      }

    };
    this.cmdConsole.onmouseup = (event) => this.dragStart = null;
    this.cmdConsole.onmousemove = (event) => {
      if (this.clickingInput(event)) {
        // update display on resize
        this.showHistory();
      }
      else
        this.dragConsole(event);
    };

    // do scrolling action on history
    var scrollSpeed = 6;
    this.cmdConsole.onwheel = (event) => {
      var newScrollTop = this.history.scrollTop + (scrollSpeed * event.deltaY);
      this.history.scrollTo(0, newScrollTop);
    };
  }


  /*  CommandConsole.clickingInput
   *    helper method for determining when to allow dragging of console.
   *    Resize corner doesn't register clicks with the input element (commandLine)
   *    so some math is needed.
   */
  clickingInput(event) {
    // if y coordinate is beyond textarea (history) element, then 
    // input is being clicked
    var consoleY = parseInt(this.cmdConsole.style.top.split("px")[0]);

    var consoleHeight = parseInt(this.cmdConsole.style.height.split("px")[0]);
    // input takes up last 10% of console
    var inputY = consoleY + (.9 * consoleHeight);

    return event.clientY > inputY;
  }

  dragConsole(event) {
    if (this.dragStart) {
      var deltaX = event.clientX - this.dragStart.x;
      var deltaY = event.clientY - this.dragStart.y;

      // convert "..px" string to int
      var left = parseInt(this.cmdConsole.style.left.split("px")[0]);
      var top = parseInt(this.cmdConsole.style.top.split("px")[0]);

      this.cmdConsole.style.left = (left + deltaX) + "px";
      this.cmdConsole.style.top = (top + deltaY) + "px";

      this.dragStart = {x: event.clientX, y: event.clientY};
    }
  }

  bindKeys() {
    this.commandLine.onkeydown = (event) => {
      if (event.keyCode == ENTER) {
        this.commandEntered();
        this.commandLine.value = ""; 
      }
      else if (event.keyCode == ESC) 
        this.toggleVisible("off");
      else if (event.keyCode == UP) 
        this.cycleCommands(1);
      else if (event.keyCode == DOWN)
        this.cycleCommands(-1);
    }
  }

  cycleCommands(direction) {
    var newIdx = this.cycleIndex + direction;
    console.log("ni = ", newIdx);
    this.cycleIndex = newIdx <= this.historyStack.length &&
                    newIdx >= 0 ? newIdx : this.cycleIndex;

    var fromEnd = this.historyStack.length - this.cycleIndex;
    
    if (this.cycleIndex > 0)
      this.commandLine.value = this.historyStack[fromEnd];
    else
      this.commandLine.value = "";
  }

  /*  commandEntered()
   *    parse command and update canvasState
   *    accordingly
   *
   *    TODO:
   *    add try/catch for execute and
   *    push new commands to undo stack
   */
  commandEntered() {
    this.cycleIndex = 0;

    var line = this.commandLine.value.trim();
    console.log("command was", line);

    // ending brace shouldnt be indented,
    // so check before indentation is added
    // and parse the multiline command
    if (line.includes("}")) {
      this.multiLine = false;
      console.log("new multiline command:", this.multiCommand);

      // TODO 
      // make this return a MacroCommand
      // and then handle execution in
      // try/catch here
      var cmdObj = this.parser.parseMultiLine(this.multiCommand);
      cmdObj.execute();
      this.cState.undoStack.push(cmdObj);
    }
    else if (line.includes("{")) {
      this.multiLine = true;

      // push starting line so it can be included
      // in final parsing step
      var stripped = line.replace("{", "").trim();
      this.multiCommand.push(stripped);
    }
    else if (line.trim()) {
      // if in the middle of a multiline command,
      // simply append the following lines
      if (this.multiLine) {
        this.multiCommand.push(line);
        // indent in console
        line = "  " + line;
      }
      else {
        // one line command entered
           
        // split on whitespace and remove any remaining whitespace
        var cmdObj = this.parser.parseLine(line);
        this.cState.undoStack.push(cmdObj);
        cmdObj.execute();
      }
    }

    // add to command history 
    if (line.trim()) 
      this.historyStack.push(line);

    // redraw command history
    this.showHistory();

    // keep history scrolled to bottom
    this.history.scrollTop = this.history.scrollHeight; 

  }


  /** CommandConsole.showHistory
   *    display contents of history to command console,
   *    padding from top
   */
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

class CommandInterpreter {
  constructor(canvasState, commandConsole) {
    this.cState = canvasState;
    this.commandConsole = commandConsole; 
  }

  /** CommandInterpreter.parseMultiLine
   *    helper method for constructor-type
   *    commands, e.g. 
   *
   *    create ____ {
   *      prop1: value1
   *      prop2: value2
   *    }
   *
   *  returns MacroCommand composed of 
   *  individual config command objects
   */
  parseMultiLine(cmds) {
    var commands = [];

    var firstLine = cmds[0];
    // create actual object so it can be configured
    // by following lines
    console.log("firstLine = ", firstLine);
    var creator = this.parseLine(firstLine);
    if (creator)
      var newObj = creator.execute();
    else
      throw "Invalid command: " + firstLine;

    // can't include create with macro command
    // because it would create two copies, but
    // still need undo functionality
    this.cState.undoStack.push(creator);

    // need temp name to do config commands
    // if no name was provided
    var label;
    if (newObj.label == "") {
      label = "TEMP";
      newObj.setProperty("label", label);
    }
    else
      label = newObj.label;

    // all following lines are config commands
    var lines = cmds.slice(1);

    // convert lines to one-liner equivalents
    lines.forEach((line) => {
      var oneliner = label + " " + line.replace(":", " ");
      var lineCmd = this.parseLine(oneliner);
      commands.push(lineCmd);
    });

    // undo TEMP labeling
    if (label == "TEMP") {
      this.cState.labeled.clear("TEMP");
      newObj.label = "";
    }

    return new MacroCommand(commands);
  }

  /** CommandInterpreter.parseLine
   *    parsing method for single line commands
   */
  parseLine(cmdStr) {
    var spl = cmdStr.split(/(\s)/).filter((s) => s.trim().length);
    console.log("in interpreter.parseLine, split command = ", spl);
    var mainCmd = "";
    var args =  [];

    var mainCmd = spl[0];
    if (spl.length > 1)
      args = spl.slice(1);

    console.log("in interpreter.parseLine, args = ", args);

    // check if 'mainCmd' is 1. labeled object
    // or 2. a command type 
    //  e.g
    // 1. myarr12[1:3] bg #ff0
    // 2. create array  {
    
    // name is first word up to [ symbol
    var name = mainCmd.match(/[^\[]*/).toString();
    var namedObj = this.cState.labeled.get(name);

    if (namedObj) 
      return this.createCommandObject(mainCmd, args, true);
    else
      return this.createCommandObject(mainCmd, args);
  }
   
  /** CommandInterpreter.createCommandObject
   *    if command is working on named object, 
   *    determine whether it's a parent object config
   *    or a range of child objects. ConfigCommand takes
   *    an actual object as its receiver whereas 
   *    RangeConfigCommand takes in a string e.g. "arr1[5:8]"
   *    and determines the receiver from that.
   *
   *    otherwise, use mainCmd as the commandType and
   *    create a new command using that as a key (checking
   *    first that such a command exists)
   */
  createCommandObject(mainCmd, args, named=false) {  
    console.log("in interpreter.createCommandObject, args = ", args);
    if (named) {
      // either configure single object or range of child objects
      // such as cells in an array
  
      var receiverName = mainCmd.match(/[^\[]*/).toString();
      var receiverObj = this.cState.labeled.get(receiverName);

      var configCommand;
      if (mainCmd.includes("[")) {
        var range = mainCmd.match(/\[.*\]/).toString();
        configCommand = new RangeConfigCommand(receiverObj, range, ...args);
      }        
      else {
        configCommand = new ConfigCommand(receiverObj, ...args);
        console.log("new config command for ", receiverObj);
      }

      return configCommand;
    }
    else {
      var commandObj = mainCommands[mainCmd];
      console.log("main cmd was ", mainCmd);
      if (commandObj)
        return new commandObj(this.cState, ...args);
      else
        throw `Invalid command '${mainCmd}'.`;
    }
  }
}
