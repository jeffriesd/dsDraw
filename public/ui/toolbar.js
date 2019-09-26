const create = React.createElement;

class ReactToolbar extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      toolbarType: this.props.toolbarType,
    }
  }

  // callback to lift state
  setToolbarType(toolbarType) {
    this.setState({ toolbarType: toolbarType });
  }

  render() {
    return create(
      "div",
      { className: "ToolbarContainer" },
      create(
        ToolbarSettings,
        {
          selected: this.props.selectedSettings, 
          updateInspectPane: (...x) => this.props.updateInspectPane(...x),
        },
        null
      ),
      create(
        ToolbarDropdown,
        {
          className: "ToolbarDropdown",
          setToolbarType: val => this.setToolbarType(val),
          toolbarType: this.state.toolbarType,
        },
        null
      ),
      create(
        ToolbarButtons,
        { toolbarType: this.state.toolbarType,
          activeObj: this.props.activeObj,
          groupSelected: this.props.groupSelected,
          drawMode: this.props.drawMode,
        },
        null
      ),
      create(
        "button",
        { className: "toolbarButton", id: "recording",
          style: { backgroundImage: `url('../images/${this.props.recording ? "redcirc.png" : "graycirc.png"}')` },
        },
      ),
      create(
        "label",
        { 
          className: "ToolbarLabel", id: "drawMode",
        },
        this.props.drawMode,
      ),
    )
  }
}

class ToolbarButtons extends React.Component {

  deleteButton() {
    if ((this.props.activeObj || this.props.groupSelected) && ! canvasLocked())
      return [deleteButton];
    return [];
  }

  render() {
    return create(
      "div",
      { className: "ToolbarButtons" },
      ...mainButtons,
      ...buttons[this.props.toolbarType],
      ...this.deleteButton(),
    );
  }
}

/** by default toolbar buttons just set the drawing mode 
 *  to whatever their id is (capitalizing the first character)
 *  
 *  additional callbacks can be passed in as an object
*/
const tbb = (id, callbacks) => create(
  "button",
  { 
    className: "toolbarButton", 
    id: id,
    onClick: () => { // set canvas draw mode
      var drawMode = id.substr(0,1).toUpperCase() + id.substr(1);
      CanvasState.getInstance().setMode(drawMode);
    },
    ...callbacks,
  }
);

const arrowButton = tbb("curvedArrow");
const rectBoxButton = tbb("rectBox");
const roundBoxButton = tbb("roundBox");
const diamondBoxButton = tbb("diamondBox");
const plBoxButton = tbb("parallelogramBox");
const connectorButton = tbb("connector");
const array1dButton = tbb("array1D");
const linkedListButton = tbb("linkedList");
const textBoxButton = tbb("textBox");
const mathBoxButton = tbb("mathBox");
const imageBoxButton = tbb("imageBox");
const bstButton = tbb("bST");
const binaryHeapButton = tbb("binaryHeap");
const udgraphButton = tbb("uDGraph");
const digraphButton = tbb("diGraph");

const deleteButton = create(
  "button",
  { 
    className: "toolbarButton", 
    id: "deleteButton",
    onClick: () => { 
      CanvasState.getInstance().deleteActive();
    },
  }
);


const toolbarSettingsStrings = [
  "Show environment",
  "Show command history"
];


/** By default, toolbar settings options are just 
 *  active/inactive like checkboxes
 * 
 *  props: 
 *    text - text to display in settings dropdown
 *    settingsCallback - function to call when dropdown item clicked
 *    selected - whether this option is currently selected
 *    selectCallback - set select state in parent component
 */
class ToolbarSettingsOption extends React.Component {

  settingsString() {
    return create (
      "div",
      { className: "ToolbarSettingsOptionContainer" },
      // check mark 
      (this.props.selected ? "⠀✔⠀" : "⠀⠀") + this.props.text,
    );
  }

  /** ToolbarSettingsOption.render
   *    just draw the settings text with or
   *    without a checkmark
   */
  render() {
    return create(
      "div",
      { onClick: (_e) => { 
          this.props.selectCallback(this);
        },
        className: "ToolbarSettingsOption" 
      },
      this.settingsString(),
    )
  }
}

/** ToolbarSettings
 *    dropdown settings menu for 
 *    showing/hiding environment, 
 *    command history, etc.
 * 
 *    single button used to show dropdown on hover
 */
const settingsButton = create(
  "button",
  {
    id: "settingsButton",
  }
)

// quarter second timeout to make 
// settings menu disappear
const settingsHoverTimeout = 100;

const tbSettingsOption = (text, onclickCb) => {
  return create(
    ToolbarSettingsOption,
    {
      className: "ToolbarSettingsOption",
      text: text,
      // selectCallback updates select state
      // and calls onclickCb
      selectCallback: toolbarSettingsOpt => {

        onclickCb();
      }
    }
  )
};


// setting names used to select inspect pane 
// elements
const ENVIRONMENT_PANE = "ENVIRONMENT";
const COMMAND_HISTORY_PANE = "COMMAND_HISTORY";

const texts = {
  [ ENVIRONMENT_PANE ] : "Show environment",
  [ COMMAND_HISTORY_PANE ] : "Show command history",
}


class ToolbarSettings extends React.Component {

  constructor(props) {
    super(props);

    this.state = {
      hidden: true,
      // map from option text -> Bool
    };

    this.timeout = null;
  }


  /** create a ToolbarSettingsOption 
   *  with onclick callback    
  */
  tbSettingsOption(paneType) {

    return create(
      ToolbarSettingsOption,
      {
        selected: this.props.selected[paneType],                           
        className: "ToolbarSettingsOption",
        text: texts[paneType],
        // toggle setting
        selectCallback: () => { 
          var oldState = this.props.selected[paneType];
          this.props.updateInspectPane(paneType, ! oldState);
        },
      }
    )
  }

  /** ToolbarSettings.maybeRenderOptions
   *    only render dropdown options when 
   *    hovered over 
   */
  maybeRenderOptions() {
    if (this.state.hidden) return null;

    return create(
      "div",
      {
        id: "toolbarSettingsContainer"
      },

      /** instantiate each settings option with its text and onclick callback */
      this.tbSettingsOption(ENVIRONMENT_PANE),
      this.tbSettingsOption(COMMAND_HISTORY_PANE),
    )
  }

  render() {
    return create(
      "div",
      { id: "toolbarSettings",
        className: "ToolbarSettings" ,
        onMouseEnter: () => { 
          this.setState({ hidden: false });
          if (this.timeout) clearTimeout(this.timeout);
        },
        onMouseLeave: () => { 
          this.timeout = setTimeout(() => {
            this.setState({ hidden: true  });
          }, settingsHoverTimeout)
        },
      },

      // settings button is always drawn.
      // whether its hidden is managed by css
      settingsButton,
      this.maybeRenderOptions(),

    );
  }
}


const selectButton = tbb("selectTool");


const mainButtons = [selectButton, textBoxButton, mathBoxButton, imageBoxButton, arrowButton];

const buttons = {
  "flowchart": [
                rectBoxButton, roundBoxButton, 
                diamondBoxButton, plBoxButton, connectorButton,
              ],
  "data structures": [array1dButton, linkedListButton, bstButton, binaryHeapButton, udgraphButton, digraphButton],
}
/* */



class ToolbarDropdown extends React.Component {
  constructor(props) {
    super(props);
    this.optionNames = Object.keys(buttons);
    this.options = this.dropDownOptions();
  }

  dropDownOptions() {
    var opMap = new Map();
    this.optionNames.forEach(op => {
      opMap.set(
        op,
        create("div",
          { onClick: () => this.props.setToolbarType(op) },
          create("p", {}, op)),
      );
    });
    return opMap;
  }

  // put selected option first
  sortedOptions() {
    var sorted = [this.options.get(this.props.toolbarType)];

    this.options.forEach((v, k) => {
      if (k == this.props.toolbarType) return;
      sorted.push(v);
    });
    return sorted;
  }

  render() {
    return create(
      "div",
      { className: "ToolbarDropdown" },
      this.props.toolbarType, 
      ...this.sortedOptions(),
    );
  }
}

// NB -- never used this. Was trying to resolve some exception 
//      but must have found the actual cause
// 
// class ErrorBoundary extends React.Component {
//   constructor(props) {
//     super(props);
//     this.state = { hasError: false };
//   }
// 
//   static getDerivedStateFromError(error) {
//     // Update state so the next render will show the fallback UI.
//     return { hasError: true };
//   }
// 
//   componentDidCatch(error, info) {
//     // You can also log the error to an error reporting service
//     logErrorToMyService(error, info);
//   }
// 
//   render() {
//     if (this.state.hasError) {
//       // You can render any custom fallback UI
//       return "Something went wrong.";
//     }
// 
//     return this.props.children;
//   }
// }