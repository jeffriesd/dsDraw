
    // case "any": return true;
    // case "bool": 
    //   return (typeof value == "number") || (typeof value == "boolean");
    // case "color": return validColorString(value);
    // case "font": return validFontString(value);
    // case "int": return (typeof value == "number") && ((value | 0) == value);
    // case "float": return (typeof value == "number"); 
    // case "number": return (typeof vlaue == "number");

const makeOption = val => create(
  "option", { className: "OptionOption", value: val },
  val, 
);

class OptionInput extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      inputValue: "",
      clicked: false,
    }
  }

  render() {
    var value = this.state.inputValue;
    if (! this.state.clicked) 
      value = this.props.currentValue;

    return create(
      "input",
      { 
        className: "OptionInput",
        key: this.props.name, 
        onClick: () => this.setState({ clicked: true }), // stop providing default once clicked
        onChange: e => this.setState({ inputValue: e.target.value }),
        onKeyDown: e => { 
          if (e.keyCode == ENTER)
            this.props.onEnter(this.props.name, this.state.inputValue)
        },
        onBlur: e => { // fired when input loses focus
          this.props.onEnter(this.props.name, this.state.inputValue)
        },
        value: value,
      },
    )
  }

}


const menuBuffer = 10; // space between menu and active object

class OptionMenu extends React.Component {
  onEnter(name, value) {
    this.props.updateOptions(name, value);
  }

  currentValue(name) {
    return this.props.activeObj[name] // || "";
  }

  createInput(name, values) {
    if (values instanceof Array) {  
      return create("div", 
      { className: "OptionSelectWrapper" }, 
      create(
        "select",
        { 
          defaultValue: this.currentValue(name),
          className: "OptionSelect",
          key: name,
          onChange: e => { 
            this.props.updateOptions(name, e.target.value)
          },
        },
        ...values.map(makeOption),        
      ),
      // dummy div for color
      create(
        "div", { className: "OptionSelectCover" },
      ),
      );
    }
    return create(
      OptionInput,
      { 
        onEnter: (...args) => this.onEnter(...args),
        name: name,
        key: name,
        currentValue: this.currentValue(name),
      },
    )
  }

  createOptionPair(name, values) {
    return create(
      "div",
      { 
        className: "OptionPair",
        key: name,
      },
      create("label", { className: "OptionLabel" }, name ),
      this.createInput(name, values),
    );
  }

  menuStyle() {
    // place menu on canvas next to user mouse
    return {
      top: this.props.activeObj.y,
      left: this.props.mouseDown.x + menuBuffer,
      top: this.props.mouseDown.y + menuBuffer,
      zIndex: 1,
    };
  }

  render() {
    if (this.props.activeObj == null) return null;
    var optionMap = this.props.activeObj.propTypes();

    // if no options, don't show menu
    if (! Object.keys(optionMap).length) return null;

    // name at top of option menu should match
    // what is printed by console i.e. 'BST(4, 3, 5, ...)' 
    // but without the entries
    var menuLabel = this.props.activeObj.toString().match("[^\(]*")[0];

    return create(
      "div", 
      { 
        className: "OptionMenu",
        style: this.menuStyle(),
        ref: r => $(r).draggable(),
      },
      create("div", { className: "OptionMenuTypeLabel" }, menuLabel),
      create("div", {className: "OptionList"} ,
        Object.entries(optionMap).map(([k, v]) => this.createOptionPair(k, v)) // option labels + inputs
      ),
    )
  }
}

class ReactEditor extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      activeObj: null,
      groupSelected: false,
      drawMode: "SelectTool",
      playState: null, 
      mouseDown: { x: 0, y: 0},

      contextLocked: false,

      showOptionMenu: false,

      // for inspect pane
      showCommandHistory: true,
      showEnvironment: true,
      commandStack: [],
    };
  }

  /** ReactEditor.optionsMenu
   *    Option menu componenet for canvas object settings.
   *    Activated by double click (managed in canvas-util.js). 
   */
  optionsMenu() {
    if (! this.state.showOptionMenu) return;

    return create(
      OptionMenu,
      { 
        activeObj: this.state.activeObj,
        mouseDown: this.state.mouseDown,
        updateOptions: (name, val) => { 
          this.props.cState.updateOptions(this.state.activeObj, name, val)
        },
      },
    )
  }

  // show inspect pane if either
  // command history or environment should be shown
  maybeInspectPane() {
    // never show on playback
    if (this.state.playState instanceof PlayState) return; 
    if (! (this.state.showCommandHistory || this.state.showEnvironment)) return null;
    return create(
      ReactInspectPane,
      {
        commandStack: this.state.commandStack,
        showCommandHistory: this.state.showCommandHistory,
        showEnvironment: this.state.showEnvironment, 
      }
    );
  }

  render() {
    return create(
      "div", {}, // this.props.children[0], // canvas
      create(
        ReactToolbar, 
        { 
          contextLocked: this.state.contextLocked, // for cancel button
          groupSelected: this.state.groupSelected,
          activeObj: this.state.activeObj,
          toolbarType: "flowchart",
          drawMode: this.state.drawMode,
          recording: this.state.playState instanceof RecordState,

          // propagate update from settings toolbar 
          // to InspectPane
          // elementName : String, value : Bool
          updateInspectPane: (elementName, value)  => {
            if (elementName == COMMAND_HISTORY_PANE)
              this.setState({ showCommandHistory:  value });
            else if (elementName == ENVIRONMENT_PANE)
              this.setState({ showEnvironment: value });
          },
          selectedSettings: { 
            [ COMMAND_HISTORY_PANE ]  : this.state.showCommandHistory,
            [ ENVIRONMENT_PANE ] : this.state.showEnvironment,
          }
        }, 
        null
      ),
      create(
        ReactConsole, 
        { 
          ref: r => window.reactConsole = r ,
          left:   400,
          top:    100,
          width:  350,
          height: 300,
          style: { 
            fontSize: 16,
            fontFamily: "monospace"
          }
        },
      ),
      this.maybeInspectPane(),
      this.optionsMenu(),
      // 
      create(
        "div",
        { 
          id : "lockDiv", 
          hidden : ! this.state.contextLocked,
        }
      )
    );
  }
}