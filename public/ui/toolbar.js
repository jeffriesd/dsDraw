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
    if (this.props.activeObj)
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

/** buttons */
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
const bstButton = tbb("bST");
const binaryHeapButton = tbb("binaryHeap");
const graphButton = tbb("graph");

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

const selectButton = tbb("selectTool");


const mainButtons = [selectButton, textBoxButton, mathBoxButton, arrowButton];

const buttons = {
  "flowchart": [
                rectBoxButton, roundBoxButton, 
                diamondBoxButton, plBoxButton, connectorButton,
              ],
  "data structures": [array1dButton, linkedListButton, bstButton, binaryHeapButton, graphButton],
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

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI.
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    // You can also log the error to an error reporting service
    logErrorToMyService(error, info);
  }

  render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return "Something went wrong.";
    }

    return this.props.children;
  }
}
