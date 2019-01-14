mainCommands = {
  "create": ConsoleCreateCommand,
  "delete": ConsoleDestroyCommand,
  "snap": ExportToImageCommand,
  "play": PlayVideoCommand,
  "pause": PauseVideoCommand,
  "record": RecordCommand,
  "truncate": TruncateVideoCommand,
};

objectCommands = {
  "Array1Dresize": Array1DResizeCommand,
  "Array1Dswap": Array1DSwapCommand,
  "Array1Darc": Array1DArrowCommand,
  "LinkedListinsert": LinkedListInsertCommand,
  "LinkedListlink": LinkedListLinkCommand,
  "LinkedListcut": LinkedListCutCommand,
}


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
      // allow user to CTRL-Z/CTRL-Y from console
      if (this.cState.hotkeys[CTRL]) {
        if (event.keyCode == Z) {
          event.preventDefault(); // dont undo typing
          this.cState.undo();
        }
        if (event.keyCode == Y) {
          this.cState.redo();
        }
      }

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
      else if (event.keyCode == C && this.cState.hotkeys[CTRL])
        this.commandLine.value = "";
    }
  }

  /** CommandConsole.cycleCommands
   *    display previous commands in console
   *    input, controlled by arrow keys
   */
  cycleCommands(direction) {
    var newIdx = this.cycleIndex + direction;
    this.cycleIndex = newIdx <= this.historyStack.length &&
                    newIdx >= 0 ? newIdx : this.cycleIndex;
    console.log("cycle idx = ", this.cycleIndex);

    var fromEnd = this.historyStack.length - this.cycleIndex;
    
    if (this.cycleIndex > 0) {
      var cycledCmd = this.historyStack[fromEnd];
      // skip over errors
      if (cycledCmd.startsWith("[ERROR]"))
        this.cycleCommands(direction);
      else
        this.commandLine.value = cycledCmd;
    }
    else
      this.commandLine.value = "";
  }

  /** ComamndConsole.executeCommand
   *    execute command using CommandRecorder
   *    and return value for Multiline config
   */
  executeCommand(cmdObj) {
    try {
      var ret = CommandRecorder.execute(cmdObj);
      this.cState.undoStack.push(cmdObj);

      this.cState.redoStack = [];
      // return ret;
    }
    catch (error) {
      throw error;
      return "[ERROR]: " + error.toString();
    }
  }

  /** CommandConsole.commandEntered()                       
   *    parse command (possibly spanning multiple lines)
   *    and execute it,
   *    checking for parsing and execution exceptions
   */     
  commandEntered() {
    this.cycleIndex = 0;

    var line = this.commandLine.value.trim();
    console.log("command was", line);

    var cmdObj;
    var parseFunc;
    var rawCommand;

    // multiline command has ended
    if (line.includes("}")) {
      this.multiLine = false;

      parseFunc = this.parser.parseMultiLine.bind(this.parser);
      rawCommand = this.multiCommand;
    }
    // multiline command starting
    else if (line.includes("{")) {
      this.multiLine = true;

      // push starting line so it can be included
      // in final parsing step
      var stripped = line.replace("{", "").trim();
      this.multiCommand.push(stripped);
    }
    else if (line.trim()) {
      // if in the middle of a multiline command,
      // simply append the following lines to history
      if (this.multiLine) {
        this.multiCommand.push(line);

        // indent in console
        line = "  " + line;
      }
      else {
        parseFunc = this.parser.parseLine.bind(this.parser);
        rawCommand = line;
      }
    }

    var err;

    // try to parse line
    if (parseFunc && rawCommand) {
      try {
        cmdObj = parseFunc(rawCommand);
      }
      catch (error) {
        err = "[ERROR]: " + error.toString();
      }
    }

    // if command obj instantiated
    if (cmdObj && ! err) 
      err = this.executeCommand(cmdObj);

    // add to command history 
    if (line && line.trim()) 
      this.historyStack.push(line);

    // print error (but ignore returned objects)
    if (err && String(err).includes("ERROR"))
      this.historyStack.push(err);

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
      var newObj = this.commandConsole.executeCommand(creator);
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
      newObj.label = "TEMP";
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

    // check if 'mainCmd' is 
    // 1. labeled object with subcommand
    // 2. labeled object with config command
    // 3. a command type 
    //  e.g
    // 1. 'myarr123.swap 0 5'
    // 2. 'myarr123[1:3] bg #ff0' or 'myarr123 fs 12'
    // 3. 'create array myarr123'
    
    if (mainCmd.includes(".")) {
      var name = mainCmd.split(".")[0];
      if (this.cState.labeled.get(name))
        return this.createObjectCommand(mainCmd, args);
      throw `No object named ${name}`;
    }

    // name is first word up to [ symbol
    var name = mainCmd.match(/[^\[]*/).toString();
    if (this.cState.labeled.get(name)) 
      return this.createConfigCommand(mainCmd, args);
    else
      return this.createMainCommand(mainCmd, args);
  }

  /** CommandInterpreter.createObjectCommand
   *    parses command with an object label and a '.'
   *    and returns command object
   */
  createObjectCommand(mainCmd, args) {
    var cmdSpl = mainCmd.split(".");
    var receiverName = cmdSpl[0];
    var commandName = cmdSpl[1];

    var receiverObj = this.cState.labeled.get(receiverName); 

    // keys of command map are ClassnameCommandName
    var cmdKey = receiverObj.constructor.name + commandName;

    var commandClass = objectCommands[cmdKey];
    
    if (commandClass == null)
      throw `No command '${commandName}' for class '${receiverObj.constructor.name}'`;

    return new commandClass(receiverObj, ...args);
  }

  /** CommandInterpreter.createConfigCommand
   *    parses commands with an object label and no '.'
   *    and returns command object
   *
   *    e.g. 
   *      myarr fontFamily purisa
   *    or
   *      myarr[0:5] fg blue
   */
  createConfigCommand(mainCmd, args) {
    // either configure single object or range of child objects
    // such as cells in an array
    var receiverName = mainCmd.match(/[^\[]*/).toString();
    var receiverObj = this.cState.labeled.get(receiverName);

    console.log("In cmdIntrp.createConfig, receiver", receiverName, " = ", receiverObj);

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
   
  /** CommandInterpreter.createMainCommand
   *    parse command with mainCmd as the commandType and
   *    returns a new command object 
   */
  createMainCommand(mainCmd, args, named=false) {  
    var commandObj = mainCommands[mainCmd];
    console.log("main cmd was ", mainCmd);
    if (commandObj)
      return new commandObj(this.cState, ...args);
    else
      throw `Invalid command '${mainCmd}'.`;
  }
}
