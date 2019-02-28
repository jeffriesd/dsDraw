class HistoryLine {
  /**
   *  Light wrapper class for entered commands
   *  and results. Type may be result or command.
   */
  constructor(string, type) {
    this.string = string;
    this.type = type;
  }

  isCommand() {
    return this.type == "command";
  }

  toString() {
    return this.string;
  }
}

class CommandConsole {
  constructor(canvasState) {
    if (CommandConsole.instance != null) return CommandConsole.instance;
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

    // amount of space between text and edge of console
    // when overflowing horizontally
    this.textBuffer = 100;


    // start off hidden
    this.cmdConsole.hidden = true;

    this.cycleIndex = 0;

    this.width = 150;
    this.height = 250;

    this.clHeight = 20;

    this.initStyle();
    this.bindKeys();
    this.bindActions();

    CommandConsole.instance = this;
  }

  initStyle() {
    // style/position cmdConsole window
    this.cmdConsole.style.left = "400px";
    this.cmdConsole.style.top = "100px";
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
      if (hotkeys[CTRL]) {
        if (event.keyCode == Z) {
          event.preventDefault(); // dont undo typing
          var mc = MediaController.getInstance(this.cState);
          mc.hotkeyUndo();
        }
        if (event.keyCode == Y) {
          var mc = MediaController.getInstance(this.cState);
          mc.hotkeyRedo();
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
      else if (event.keyCode == C && hotkeys[CTRL]) {
        this.commandLine.value = "";
        this.historyStack = [];
        this.showHistory();
      }

      // automatically expand console
      this.expandConsole();
    }
  }

  expandConsole() {
    this.testCanvas = this.testCanvas || (this.testCanvas = document.createElement("canvas"));
    var ctx = this.testCanvas.getContext("2d");
    ctx.font = this.commandLine.style.font;
    var consWidth = this.cmdConsole.clientWidth;
    var textWidth = ctx.measureText(this.commandLine.value).width;
    var buf = this.textBuffer + textWidth;
    this.cmdConsole.style.width = Math.max(buf, consWidth) + "px";
  }

  /** CommandConsole.cycleCommands
   *    display previous commands in console
   *    input, controlled by arrow keys
   */
  cycleCommands(direction) {
    var newIdx = this.cycleIndex + direction;
    this.cycleIndex = newIdx <= this.historyStack.length &&
                    newIdx >= 0 ? newIdx : this.cycleIndex;

    var fromEnd = this.historyStack.length - this.cycleIndex;
    
    if (this.cycleIndex > 0) {
      var cycledCmd = this.historyStack[fromEnd];
      // skip over errors and printed results
      if (! cycledCmd.isCommand()) 
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
      if (cmdObj instanceof UtilCommand) return;
      return ret;
    }
    catch (error) {
      console.log("EXEC ERROR: " + error.stack);
      return "[EXEC ERROR]: " + error.toString() 
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

    var cmdObj;
    var parseFunc;
    var rawCommand;

    // multiline command has ended, 
    // parse it and clear the buffer
    // if (line.includes("}")) {
    //   this.multiLine = false;

    //   parseFunc = this.parser.parseMultiLine.bind(this.parser);
    //   rawCommand = this.multiCommand.slice();
    //   this.multiCommand = []; // clear multiline buffer
    // }
    // // multiline command starting
    // else if (line.includes("{")) {
    //   this.multiLine = true;

    //   // push starting line so it can be included
    //   // in final parsing step
    //   var stripped = line.replace("{", "").trim();
    //   this.multiCommand.push(stripped);
    // }
    //else 
    if (line.trim()) {
      parseFunc = this.parser.parseLine.bind(this.parser);
      rawCommand = line;
    }

    var parseErr, execErr, commandRet;

    // try to parse line
    if (parseFunc && rawCommand) {
      try {
        cmdObj = parseFunc(rawCommand);
      }
      catch (error) {
        parseErr = "[PARSE ERROR]: " + error.toString();
      }
    }

    // add entered line to command history 
    if (line && line.trim()) 
      this.historyStack.push(new HistoryLine(line, "command"));

    if (parseErr)
      this.historyStack.push(new HistoryLine(parseErr, "error"));
    else if (cmdObj)
      commandRet = this.executeCommand(cmdObj);

    // print error or literal result
    // TODO check for unexpected types like methods 
    if (commandRet !== undefined)  
      this.historyStack.push(new HistoryLine(this.stringify(commandRet), "result"));

    // redraw command history
    this.showHistory();

    // keep history scrolled to bottom
    this.history.scrollTop = this.history.scrollHeight; 
  }

  /** CommandConsole.stringify
   *    helper method because Array.toString strips brackets
   *    and JSON.stringify will expose objects
   */
  stringify(object) {
    if (object instanceof Array) 
      return "[" + object.map(x => this.stringify(x)) + "]";
    if (object instanceof Function)
      return "function";
    return String(object);
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
   *    helper method for multi-line commands.
   *    currently supporting 'create' and 'macro'
   *
   *    returns MacroCommand composed of 
   *    individual config command objects
   */
  parseMultiLine(cmds) {
    var firstLine = cmds[0];
    if (firstLine.startsWith("create"))
      return this.parseConstructor(cmds); 
    else if (firstLine.startsWith("macro"))
      return this.parseMacro(cmds); 
  }

  /** CommandInterpreter.parseMacro
   *    syntax is
   *    'macro macroName arg1 arg2 {
   *      cmd1
   *      cmd2 $arg1 $arg2
   *      cmd3 $arg1 4 5
   *      $arg1.resize 4 3
   *    }'
   *
   *    TODO: need to differentiate between
   *    macro def/declaration and macro call
   */
  parseMacro(cmds) {
    var args = cmds[0].split(" ");
    var macroName = args[1];
    args = args.slice(1);
    if (macroName == null) throw "Usage: 'macro macroName'";
    cmds = cmds.slice(1);
    if (cmds.length == 0) throw "Empty macro";
    
  }

  /** CommandInterpreter.parseConstructor
   *    helper method for constructor-type
   *    commands, e.g. 
   *
   *    create [objType] [[objName]] {
   *      prop1: value1
   *      prop2: value2
   *    }
   */
  parseConstructor(cmds) {
    var firstLine = cmds[0];
    // create actual object so it can be configured
    // by following lines
    var creator = this.parseLine(firstLine);
    if (creator) 
      var newObj = this.commandConsole.executeCommand(creator);
    else
      throw "Invalid command: " + firstLine;

    // all following lines are config commands
    var lines = cmds.slice(1);
    console.log("lines = ", lines);

    // convert lines to one-liner equivalents
    var commands = [];
    lines.forEach((line) => {
      var oneliner = newObj.label + " " + line.replace(":", " ");
      var lineCmd = this.parseLine(oneliner);
      commands.push(lineCmd);
    });

    return new MacroCommand(commands);
  }

  /** CommandInterpreter.parseLine
   *    parsing method for single line commands
   *    with some basic syntax checking
   */
  parseLine(cmdStr) {
    this.nearleyParser = new nearley.Parser(nearley.Grammar.fromCompiled(grammar), {});
    var parseTree = this.nearleyParser.feed(cmdStr);
    if (parseTree.results.length > 1)
      throw "Ambiguous grammar";
    this.nearleyParser.finish();

    return parseTree.results[0].command;
    // if (! cmdStr.match(expressionChars))
    //   throw `Unexpected characters in '${cmdStr}'.`;
    // // check for balanced parens
    // if (! parenBalanced(cmdStr))
    //   throw `Unbalanced parentheses in '${cmdStr}'.`;
    //  
    // return new CommandExpression(this.cState, cmdStr);
  }

  // parseLine(cmdStr) {
  //   var spl = cmdStr.split(/(\s)/).filter((s) => s.trim().length);
  //   var mainCmd = "";
  //   var args =  [];

  //   var mainCmd = spl[0];
  //   if (spl.length > 1)
  //     args = spl.slice(1);

  //   // check if 'mainCmd' is 
  //   // 1. labeled object with subcommand
  //   // 2. labeled object with config command
  //   // 3. a command type 
  //   //  e.g
  //   // 1. '$myarr123.swap(0,5)'
  //   // 2. '$myarr123[1:3] bg #ff0' or 'myarr123 fs 12'
  //   // 3. '$create array myarr123'
  //   
  //   if (mainCmd.includes(".")) {
  //     var name = mainCmd.split(".")[0];
  //     // if (this.cState.labeled.get(name))
  //     //   return this.createObjectCommand(mainCmd, args);
  //     // throw `No object named ${name}`;
  //   }

  //   // name is first word up to [ symbol
  //   var name = mainCmd.match(/[^\[]*/).toString();
  //   if (this.cState.labeled.get(name)) 
  //     return this.createConfigCommand(mainCmd, args);
  //   else
  //     return this.createMainCommand(mainCmd, args);
  // }

  /** CommandInterpreter.createObjectCommand
   *    parses command with an object label and a '.'
   *    and returns command object -- may throw exception
   *    if parsing errors or bad arguments
   */
  // createObjectCommand(mainCmd, args) {
  //   var cmdSpl = mainCmd.split(".");
  //   var receiverName = cmdSpl[0];
  //   var commandName = cmdSpl[1];

  //   var receiverObj = this.cState.labeled.get(receiverName); 

  //   // keys of command map are ClassnameCommandName
  //   var cmdKey = receiverObj.constructor.name + commandName;

  //   var commandClass = objectCommands[cmdKey];
  //   
  //   if (commandClass == null)
  //     throw `No command '${commandName}' for class '${receiverObj.constructor.name}'`;

  //   return new commandClass(receiverObj, ...args);
  // }

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
    var receiverObj = VariableEnvironment.getCanvasObj(receiverName);

    var configCommand;
    if (mainCmd.includes("[")) {
      var range = mainCmd.match(/\[.*\]/).toString();
      configCommand = new RangeConfigCommand(receiverObj, range, ...args);
    }        
    else 
      configCommand = new ConfigCommand(receiverObj, ...args);

    return configCommand;
  }
   
  /** CommandInterpreter.createMainCommand
   *    parse command with mainCmd as the commandType and
   *    returns a new command object 
   */
  createMainCommand(mainCmd, args) {  
    var commandObj = mainCommands[mainCmd];
    if (commandObj)
      return new commandObj(this.cState, ...args);
    else
      throw `Invalid command '${mainCmd}'.`;
  }
}
