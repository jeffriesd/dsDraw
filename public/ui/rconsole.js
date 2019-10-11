
const scrollSpeed = 8;
const consolePromptStr = "> ";

const CLINE_MODE = "commandLineMode";
const TEXT_MODE = "textMode";

class ReactConsole extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      text: "",
      consoleOutput: "", // used only in text-editor mode
      historyStack: [],
      printStack: [],
      numLines: 15,
      hidden: true,
      cycleIdx: 0,
      fontSize: this.props.style.fontSize,
      fontFamily: this.props.style.fontFamily,
      commandLineValue: "",
      showSettings: false,
      consoleMode: CLINE_MODE,
      bgColor: "rgba(0, 0, 0, .7)",
      fgColor: "white",
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
    if (!this.state.hidden && this.commandLine)
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
    else {
      // just a result or error
      this.state.printStack.push(line);
      // also print to text-edit output
      this.setState({ consoleOutput : line });
    }
  }

  /** evaluate
   *    execute command using CommandRecorder
   *    and return value for Multiline config
   */
  // evaluate(cmdObj) {
  //   try {
  //     var ret = executeCommand(cmdObj);
  //     if (cmdObj instanceof UtilCommand) return;
  //     return ret;
  //   }
  //   catch (error) {
  //     console.log("EXEC ERROR: " + error.stack);
  //     return "[EXEC ERROR]: " + error.toString()
  //   }
  // }

  // reset cycle idx and parse/execute line
  commandEntered(line) {
    // CommandRecorder.execute will check anyways
    // but this way the console contents are unaffected
    if (canvasLocked()) return canvasLockedAlert();

    this.setState({ cycleIdx: 0 });
    this.setState({ consoleOutput: "" });
    var cmdObj;
    var parseErr;

    // try to parse line
    if (line) {
      try {
        cmdObj = parseLine(line);
      }
      catch (error) {
        parseErr = "[PARSE ERROR]: " + error.toString();
        console.log(error)
      }
    }

    // clear input line 
    this.setState({ commandLineValue: "" });

    // add entered line to command history 
    if (line && line.trim())
      this.push(line, "command");
    if (parseErr)
      this.push(parseErr, "error");
    else if (cmdObj) {
      lockContext();
      executeCommand(cmdObj, false, true) // redo = false, overrideLock = true
      .then(cmdRet => {
        if (cmdObj instanceof UtilCommand) return;
        var cmdRetStr = stringify(cmdRet);
        if (cmdRet !== undefined && cmdRetStr != line)
          this.push(cmdRetStr, "result");
      })
      .catch(error => {
        console.log("EXEC ERROR: " + error.stack);
        this.push("[EXEC ERROR]: " + error.toString(), "error");
      })
      .finally(() => {
        unlockContext();

        repaint();
        // update console state again to show results
        updateInspectPane();
      });
    }
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
    if (! this.state.showSettings) return null;
    return create(
      "div",
      { 
        id: "commandSettingsPane",
        style: { 
          backgroundColor: this.state.bgColor,
          color: this.state.fgColor,
          left: this.size.width,
        },
      },
      // create(
      //   "div",
      //   { 
      //     id: "commandSettingsClose",
      //     onClick: e => { 
      //       this.setState({ showSettings: false });
      //     },
      //   },
      //   create("div", { id: "commandSettingsCloseButton" }),
      // ),
      create(
        CommandSettings,
        { 
          updateSettingsCallback: state => { 
            console.log("upd", state)
            this.setState(state);
          },
          fgColor: this.state.fgColor,
          bgColor: this.state.bgColor,
          consoleMode: this.state.consoleMode,
          fontFamily: this.state.fontFamily,
          fontSize: this.state.fontSize,
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
          if (this.history) {
            var newScrollTop = this.history.scrollTop + (scrollSpeed * e.deltaY);
            this.history.scrollTo(0, newScrollTop);
          }
        },
        onClick: e => { 
          // don't steal focus from something else such as 
          // settings input
          if ((e.target.id == "commandConsole" || e.target.id == "commandBg")
              && this.commandLine != null)
            this.commandLine.focus() 
        },
        style: { // styling commandConsole
          backgroundColor: this.state.bgColor, 
          color: this.state.fgColor,
          left: this.pos.left,
          top: this.pos.top,
          width: this.size.width,
          height: this.size.height,
        },
      },
      ...this.renderConsole(),
      this.renderSettingsPane(),
      );
    }

    renderConsole() {
      if (this.state.consoleMode == CLINE_MODE)
        return [
          create(
            CommandTopBar,
            { 
              consoleMode: this.state.consoleMode,
              showSettingsCallback: () => this.toggleSettingsPane(),
            },
          ),
          create(
            CommandLine,
            {
              fgColor: this.state.fgColor,
              commandEnteredCallback: (cmdText) => this.commandEntered(cmdText),
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
              style: { color: this.state.fgColor, fontSize: this.state.fontSize, fontFamily: this.state.fontFamily },
              getRef: r => this.history = r,
              lineHeight: 1.25 * this.state.fontSize, // give a little extra space
              printStack: this.state.printStack,
              consoleHeight: this.size.height - this.state.fontSize,
            },
          )
        ];

      // otherwise in text mode
      const runCodeCallback = () => this.commandEntered(this.commandTextBox.value);

      return [
        create(
          CommandTopBar,
          { 
            showSettingsCallback: () => this.toggleSettingsPane(),
            consoleMode: this.state.consoleMode,
            runCodeCallback: runCodeCallback,
          },
        ),

        // text editor
        create(
          "textarea",
          {
            spellCheck: false,
            ref: r => this.commandTextBox = r,
            id: "commandTextBox",
            onKeyDown: e => { 
              // CTRL+Enter executes code
              var kc = e.keyCode;
              if (hotkeys[CTRL]) {
                if (kc == Z) {
                  e.preventDefault(); // dont undo typing
                  hotkeyUndo();
                }
                if (kc == Y) {
                  if (hotkeys[ALT])
                    hotkeyRedoAtomic();
                  else
                    hotkeyRedo();
                }
                if (kc == ENTER)
                  runCodeCallback();
              }

              // lift state up
              if (kc == ESC)
                this.toggleVisible(false);
            },
            // save text if going back and forth between modes
            onChange: e => { this.setState({ text: e.target.value }) },
            style: { color: this.state.fgColor, fontSize: this.state.fontSize, fontFamily : this.state.fontFamily },
            defaultValue: this.state.text,
          }
        ),

        // console output
        (this.state.consoleOutput !== "" 
          ? 
          create(
            "textarea",
            {
              spellCheck: false,
              id: "commandTextBoxOutput",
              disabled: true,
              defaultValue: "> " + this.state.consoleOutput,
              style: { color: this.state.fgColor },
            },
          )
          : null),


      ]
  }
}

class CommandTopBar extends React.Component {
  runButton() {
    if (this.props.consoleMode === TEXT_MODE)
      return create(
        "button",
        {
          id: "commandConsoleRunButton",
          onClick: e => this.props.runCodeCallback(),
        },
      )
  }

  render() {
    return create(
      "div",
      { id: "commandTopBar" },
      this.runButton(),
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
      if (kc == Y) {
        if (hotkeys[ALT])
          hotkeyRedoAtomic();
        else
          hotkeyRedo();
      }
      if (kc == C)
        this.props.clearConsole();
    }

    // lift state up
    if (kc == ENTER)
      this.props.commandEnteredCallback(this.props.commandLineValue);
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
        style: { color: this.props.fgColor },
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
        spellCheck: false,
        onChange: () => { },
        id: "commandHistory",
        value: this.renderText(),
        style: { ...this.props.style, lineHeight: this.props.lineHeight + "px" },
        ref: r => this.props.getRef(r),
      },
    )
  }
}

class CommandSettings extends React.Component {
  settingsInput(text, propName, wrapper, defaultValue) {
    return create(
      "div", {},
      text,
      create("input", {
        onKeyDown: e => {
          if (e.keyCode === ENTER) 
            this.props.updateSettingsCallback({ [propName] : wrapper(e.target.value)});
        },
        defaultValue: defaultValue,
        style: { color: this.props.fgColor },
      })
    );
  }

  fontSize() {
    return this.settingsInput("Font size", "fontSize", x => x, this.props.fontSize);
  }

  fontFamily() {
    return this.settingsInput("Font family", "fontFamily", x => x, this.props.fontFamily);
  }

  bgColor() {
    return this.settingsInput("Background color", "bgColor", x => x, this.props.bgColor);
  }
  fgColor() {
    return this.settingsInput("Foreground color", "fgColor", x => x, this.props.fgColor);
  }

  render() {
    return create(
      "div",
      { 
        id: "commandSettings"
      },
      // change font size
      this.fontSize(),
      // change font family
      this.fontFamily(),
      // adjust colors
      this.bgColor(),
      this.fgColor(),
      // switch modes
      create(
        "div", {},
        create("button",
          {
            style: { color: this.props.fgColor },
            // switch modes
            onClick: e => {
              var newMode = this.props.consoleMode == CLINE_MODE ? TEXT_MODE : CLINE_MODE;
              this.props.updateSettingsCallback({ consoleMode : newMode });
            }
          },
          "Switch to " + (this.props.consoleMode == CLINE_MODE ? "text editor" : "command line"),
        )
      )
    )
  }
}
