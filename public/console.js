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

    this.history.value = "";
    this.commandLine.value = "";
  
    // use two buffer so contents can be cleared but
    // history is always retained for arrows
    this.historyStack = [];
    this.printStack = [];
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

    $("#commandConsole" ).resizable({ handles: "se"});

    this.history.style.lineHeight = "18px";
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

  push(line) {
    this.historyStack.push(line);
    this.printStack.push(line);
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
          hotkeyUndo();
        }
        if (event.keyCode == Y) {
          hotkeyRedo();
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
        this.printStack = [];
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

  /** ComamndConsole.evaluate
   *    execute command using CommandRecorder
   *    and return value for Multiline config
   */
  evaluate(cmdObj) {
    try {
      var ret = executeCommand(cmdObj);
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

    // this.commandLine.value.trim()
    //   .split(";").map(x => x.trim())
    //   .forEach(x => this.processLine(x));
    this.processLine(this.commandLine.value.trim());
  }

  processLine(line) {
    var cmdObj;

    var parseErr, commandRet;

    // try to parse line
    if (line) {
      try {
        cmdObj = this.parseLine(line);
      }
      catch (error) {
        parseErr = "[PARSE ERROR]: " + error.toString();
      }
    }

    // add entered line to command history 
    if (line && line.trim()) 
      this.push(new HistoryLine(line, "command"));

    if (parseErr)
      this.push(new HistoryLine(parseErr, "error"));
    else if (cmdObj) 
      commandRet = this.evaluate(cmdObj);

    // print error or literal result
    // TODO check for unexpected types like method objects
    if (commandRet !== undefined)
      this.push(new HistoryLine(stringify(commandRet), "result"));

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

    var filledLines = this.printStack.length;
    this.history.value = "";

    // fill in empty lines for bottom-up look
    for (var l = filledLines; l <= this.numLines; l++)
      this.history.value += "\n";
    this.history.value += this.printStack.join("\n");
  }

  parseLine(cmdStr) {
    this.nearleyParser = new nearley.Parser(nearley.Grammar.fromCompiled(grammar), {});
    var parseTree = this.nearleyParser.feed(cmdStr);
    if (parseTree.results.length > 1)
      throw "Ambiguous grammar";
    this.nearleyParser.finish();

    if (parseTree.results.length == 0)
      throw "Incomplete parse error";

    return parseTree.results[0].command;
  }
}
