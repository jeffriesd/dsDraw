class ReactInspectPane extends React.Component {
  constructor(props) {
    super(props);

    this.state = { 
      left: null,
    };
  }

  maybeEnv() {
    if (! this.props.showEnvironment) return null;
    return create(
        EnvironmentPane,
        {
          ref: r => window.environmentPane = r,
        }
    );
  }

  maybeCH() {
    if (! this.props.showCommandHistory) return null;
    return create(
        CommandHistoryPane,
        {
          // needed for timestamps
          postRecording: this.props.postRecording,
          commandStack: this.props.commandStack,
        }
    );
  }

  render() {
    return create(
      "div",
      {
        id: "inspectPane",
        ref: r => {
          $(r).resizable({ handles: "w" });
        },
      },
      this.maybeEnv(),
      this.maybeCH(),
    );
  }
}


class EnvironmentPane extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      variables : VariableEnvironment.getInstance().getAllBindings(),
    };
  }

  environmentTable() {
    // stringify may fail when trying to 
    // update mid-cloning
    const maybeStringify = x => {
      try {
        return stringify(x);
      }
      catch (e) {
        return "...";
      }
    }

    /**
      --pastel-red: #bf616a;
      --pastel-green: #a3be8c;
      --pastel-yellow: #ebcb8b;
      --pastel-blue: #97bade;
      --pastel-purple: #b48ead;
      --pastel-mint: #93e5cc;
     */
    const typeColor = obj => {
      if (obj instanceof CanvasObject) return "#bf616a";
      if (typeof obj == "number") return "#a3be8c";
      if (typeof obj == "string") return "#97bade";
      if (typeof obj == "boolean") return "#b48ead";
      else return "#93e5cc";
    };

    var rows = [];
    this.state.variables.forEach((v, k) => {
      rows.push(
        create(
          "tr", {},
          create("td", { className: "TdLeft" }, k + " : "),
          create("td", { className: "TdRight", style: {color: typeColor(v)} }, maybeStringify(v)),
        )
      );
    });

    return create(
      "table", 
      {
        id: "environmentTable",
      },
      create(
        "tbody", {},
        // create("tr", {}, 
        //   create("th", {}, "Name"),
        //   create("th", {}, "Value"),
        // ),
        ...rows,
      )
    )
  }

  render() {
    return create(
      "div", 
      {
        id: "environmentPane",
      },

      // title 
      create(
        "span", { id: "environmentTitle" },
        "Environment",
      ),


      // table of bindings
      this.environmentTable(),

    );
  }
}

/** CommandHistoryPane
 *    displays stack  of most recent commands
 */
class CommandHistoryPane extends React.Component {
  constructor(props) {
    super(props);
  }

  renderTable() {
    var rows = [];

    const getName = cmd => {
      if (cmd.command) cmd = cmd.command;
      if (cmd._astNode && cmd._astNode.isFunctionDef) 
        return "FunctionDefinition";
      return cmd.constructor.name;
    };

    // show timestamps if available
    const makeEntry = cmdTime => {
      var prefix = "";
      if (cmdTime.time != undefined) 
        prefix = cmdTime.time.toFixed(1) + "s ";
      else if (this.props.postRecording) 
        prefix = "0s ";
      return create("td", {}, prefix + getName(cmdTime.command));
    };

    this.props.commandStack.forEach(cmdTime => {
      rows.push(create(
        "tr", {}, 
        makeEntry(cmdTime),
      ));
    });

    return create(
      "table",
      { id: "commandHistoryStack" },
      create(
        "tbody", {},
        ...rows.reverse(),
      )
    )
  }

  render() {
    return create( 
      "div",
      {
        id: "commandHistoryPane",
      },

      // title
      create(
        "span",
        {
          id: "commandHistoryTitle",
        },
        "Command History",
      ),

      // contents
      this.renderTable(),
    );
  }
}