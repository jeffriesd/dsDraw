
const scrollSpeed = 8;
const consolePromptStr = "> ";

class ReactConsole extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      historyStack: [],
      printStack: [],
      numLines: 15,
      hidden: true,
      cycleIdx: 0,
      lineHeight: 24,
      commandLineValue: "",
      showSettings: false,
    }
    this.size = { width: this.props.width, height: this.props.height };
    this.pos = { left: this.props.left, top: this.props.top };
  }

  // provide explicit state (t/f) or 
  // simply toggle
  toggleVisible(state) {
    if (state === undefined)
      state = this.state.hidden;
    this.setState({ hidden: !state });
  }

  componentDidUpdate(prevProps, prevState) {
    if (!this.state.hidden)
      this.commandLine.focus();
    this.scrollToBottom();
  }

  cycleCommands(direction) {
    var newIdx = this.state.cycleIdx + direction;
    var ci = newIdx <= this.state.historyStack.length &&
      newIdx >= 0 ? newIdx : this.state.cycleIdx;

    var fromEnd = this.state.historyStack.length - ci;

    if (ci > 0) {
      var cycledCmd = this.state.historyStack[fromEnd];
      this.setState({ commandLineValue: cycledCmd, cycleIdx: ci });
    }
    else
      this.setState({ commandLineValue: "" });
  }

  // history doesn't need non-commands for cycling
  push(line, lineType) {
    if (lineType == "command") {
      this.state.historyStack.push(line);
      this.state.printStack.push(consolePromptStr + line);
    }
    else
      this.state.printStack.push(line);
  }

  /** evaluate
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

  // reset cycle idx and parse/execute line
  commandEntered() {
    // CommandRecorder.execute will check anyways
    // but this way the console contents are unaffected
    if (consoleLocked()) return lockedAlert();

    var line = this.state.commandLineValue;
    this.setState({ cycleIdx: 0 });
    var cmdObj;
    var parseErr, commandRet;

    // try to parse line
    if (line) {
      try {
        cmdObj = parseLine(line);
      }
      catch (error) {
        parseErr = "[PARSE ERROR]: " + error.toString();
      }
    }

    // add entered line to command history 
    if (line && line.trim())
      this.push(line, "command");
    if (parseErr)
      this.push(parseErr, "error");
    else if (cmdObj)
      commandRet = this.evaluate(cmdObj);

    // print error or literal result
    // TODO check for unexpected types like method objects
    if (commandRet !== undefined && stringify(commandRet) != line)
      this.push(stringify(commandRet), "result");

    // keep history scrolled to bottom
    this.setState({ commandLineValue: "" });
  }

  scrollToBottom() {
    if (this.history)
      this.history.scrollTop = this.history.scrollHeight;
  }

  // toggle css grid property
  toggleSettingsPane() {
    this.setState({ showSettings: ! this.state.showSettings });
  }

  renderSettingsPane() {
    // TODO implement settings
    return null;

    if (! this.state.showSettings) return null;
    return create(
      "div",
      { 
        id: "commandSettingsPane",
        style: {
          left: this.size.width,
        },
      },
      create(
        "div",
        { 
          id: "commandSettingsClose",
          onClick: e => { 
            this.setState({ showSettings: false });
          },
        },
      ),
      create(
        CommandSettings,
        { 
          updateSettingsCallback: state => this.setState(state),
        },
      )
    );
  }

  // ReactConsole.render
  render() {
    if (this.state.hidden) return null;

    return create(
      "div",
      {
        id: "commandConsole",
        ref: r => {
          $(r).resizable({ handles: "se" });
          $(r).on("resize", (e, ui) => { 
            this.scrollToBottom(); 
            this.size = (ui.size) // set { width, height }
            this.resized = true;

            if (this.state.showSettings) 
              this.toggleSettingsPane();
          }); 
          $(r).draggable();
          $(r).on("drag", (e, ui) => this.pos = (ui.position)); // set { top, left }
          this.commandConsole = r;
        },
        onMouseUp: e => {
          // re-render text in resized container on mouseup
          // (doing setState on every resize event is too expensive)
          if (this.resized) {
            this.forceUpdate();
            this.resized = false;
          }
        },
        onWheel: e => {
          var newScrollTop = this.history.scrollTop + (scrollSpeed * e.deltaY);
          this.history.scrollTo(0, newScrollTop);
        },
        onClick: e => this.commandLine.focus(),
        style: {
          left: this.pos.left,
          top: this.pos.top,
          width: this.size.width,
          height: this.size.height,
        },
      },
      create(
        CommandTopBar,
        { 
          showSettingsCallback: () => this.toggleSettingsPane(),
        },
      ),
      create(
        CommandLine,
        {
          commandEnteredCallback: () => this.commandEntered(),
          valueCallback: v => this.setState({ commandLineValue: v }),
          clearConsole: () => this.setState({ printStack: [] }),
          cycleCommands: d => this.cycleCommands(d),
          toggleVisible: v => this.toggleVisible(v),
          getRef: r => this.commandLine = r,
          commandLineValue: this.state.commandLineValue,
        },
      ),
      create(
        "div",
        { id: "commandBg" }, 
        consolePromptStr
      ),
      create(
        CommandHistory,
        {
          getRef: r => this.history = r,
          lineHeight: this.state.lineHeight,
          printStack: this.state.printStack,
          consoleHeight: this.size.height - this.state.lineHeight,
        },
      ),
      this.renderSettingsPane(),
    )
  }
}

class CommandTopBar extends React.Component {
  render() {
    return create(
      "div",
      { id: "commandTopBar" },
      create(
        "button",
        { 
          id: "commandConsoleSettingsButton",
          onClick: e => {
            this.props.showSettingsCallback();
          },
        },
      )
    )
  }
}

class CommandLine extends React.Component {
  //  props:
  //  valueCallback  
  //  clearConsole
  //  commandEnteredCallback
  //  cycleCommands
  //  commandLineValue
  //  toggleVisible

  handleKey(e) {
    var kc = e.keyCode;
    if (hotkeys[CTRL]) {
      if (kc == Z) {
        e.preventDefault(); // dont undo typing
        hotkeyUndo();
      }
      if (kc == Y)
        hotkeyRedo();
      if (kc == C)
        this.props.clearConsole();
    }

    // lift state up
    if (kc == ENTER)
      this.props.commandEnteredCallback();
    if (kc == ESC)
      this.props.toggleVisible(false);
    if (kc == UP)
      this.props.cycleCommands(1);
    if (kc == DOWN)
      this.props.cycleCommands(-1);
  }

  render() {
    return create(
      "input",
      {
        id: "commandLine",
        ref: r => this.props.getRef(r),
        onChange: e => this.props.valueCallback(e.target.value),
        onKeyDown: e => this.handleKey(e),
        value: this.props.commandLineValue,
      },
    )
  }
}

class CommandHistory extends React.Component {
  // props;
  // lineHeight, printStack, 

  // convert stack of lines to text block
  // with top padding of newlines
  renderText() {
    var text = "";
    var numLines =
      Math.floor(this.props.consoleHeight / this.props.lineHeight);
    var filledLines = this.props.printStack.length;

    for (var l = filledLines; l <= numLines; l++)
      text += "\n";
    return text + this.props.printStack.join("\n");
  }

  render() {
    return create(
      "textarea",
      {
        onChange: () => { },
        id: "commandHistory",
        value: this.renderText(),
        style: { lineHeight: this.props.lineHeight + "px" },
        ref: r => this.props.getRef(r),
      },
    )
  }
}


// TODO implement settings tab
class CommandSettings extends React.Component {
  render() {
    return create(
      "div",
      { 
        id: "commandSettings"
      },
      // change font size
      create(),
      // change font 
      create(),
      // change colors
      create(),
    )
  }
}
