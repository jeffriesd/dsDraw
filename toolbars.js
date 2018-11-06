

/*  The Toolbar class maintains a reference to a toolbar element
 *  and some state regarding what parts of it are hidden
 *  and what options are set. Composed with ToolOption
 *  objects which handle option setting and are indexed by type
 *
 *  Uses singleton so canvas objects can use getToolbar method
 */
class Toolbar {
  constructor(cState) {
    this.hidden = true;
    this.cState = cState;
    this.instance = null;
  }

  show() {
    this.element.attr("hidden", false);
    this.showSelectOptions();
  }

  showSelectOptions() {
    if (this.activeOptions) 
      this.activeOptions.hide();

    this.activeOptions = this.cState.activeObj.getOptions();

    if (this.activeOptions) {
      this.activeOptions.show();
    }
  }
}

/*  Handle hiding/showing/setting specific options
 *  for active canvas object. Needs cState for active object.
 */
class ToolOptions {

  constructor(cState, parentToolbar) {
    this.cState = cState;
    this.parentToolbar = toolbar;
    this.element = null;
    this.bindActions();
  }

  show() {
    this.element.attr("hidden", false);
    this.setSelectOptions();
  }

  hide() {
    this.element.attr("hidden", true);
  }

  setSelectOptions() {

  }

  bindActions() {

  }
  
}

class ArrowOptions extends ToolOptions {

  constructor(cState, parentToolbar) {
    super(cState, parentToolbar);
    this.element = $("#arrowOptions");
  }

  static getInstance(cState) {
    if (this.instance == null) 
      this.instance = new ArrowOptions(cState, FlowchartToolbar.getInstance(cState));
    return this.instance;
  }

  bindActions() {
    var self = this;
    var arrowWidth = $("#arrowWidth");
    arrowWidth.on("change", function(event) {
      var active = self.cState.activeObj;
      var arrow = active.getParent();
      arrow.thickness = arrowWidth.val();
    });

    var arrowHeadFill = $("#arrowHeadFill");
    arrowHeadFill.on("change", function(event) {
      var active = self.cState.activeObj;
      var arrow = active.getParent();

      arrow.head.hollow = arrowHeadFill.val() == "hollow";
    });

    var arrowDash = $("#arrowDash");
    arrowDash.on("change", function(event) {
      var active = self.cState.activeObj;
      var arrow = active.getParent();
      arrow.dashed = arrowDash.val() == "dashed";
    });
  }

  setSelectOptions() {
    var active = this.cState.activeObj;
    var arrow = active.getParent();
    $("#arrowWidth").val(arrow.thickness);
    $("#arrowHeadFill").val(arrow.head.hollow ? "hollow" : "filled");
    $("#arrowDash").val(arrow.dashed ? "dashed" : "solid");
  }
}

class FlowchartBoxOptions extends ToolOptions {

  constructor(cState, parentToolbar) {
    super(cState, parentToolbar);
    this.element = $("#textOptions");
  }

  static getInstance(cState) {
    if (this.instance == null) 
      this.instance = new FlowchartBoxOptions(cState, FlowchartToolbar.getInstance(cState));
    return this.instance;
  }
  
  bindActions() {
    var fontSize = $("#fontSize");
    var fontFamily = $("#fontFamily");
    var leftAlign = $("#leftAlign");
    var rightAlign = $("#rightAlign");
    var centerAlign = $("#centerAlign");

    var self = this;

    fontSize.on("change", function(event) {
      var active = self.cState.activeObj;
      var textbox = active.getParent();
      textbox.fontSize = fontSize.val();

      // re-render text with new size
      textbox.textEntered();
    });

    fontFamily.on("change", function(event) {
      var active = self.cState.activeObj;
      var textbox = active.getParent();
      textbox.fontFamily = fontFamily.val();
    });

    leftAlign.on("click", function(event) {
      var active = self.cState.activeObj;
      var textbox = active.getParent();
      textbox.textAlign = "left";
      textbox.editor.style.textAlign = "left";
    });
    rightAlign.on("click", function(event) {
      var active = self.cState.activeObj;
      var textbox = active.getParent();
      textbox.textAlign = "right";
      textbox.editor.style.textAlign = "right";
    });
    centerAlign.on("click", function(event) {
      var active = self.cState.activeObj;
      var textbox = active.getParent();
      textbox.textAlign = "center";
      textbox.editor.style.textAlign = "center";
    });
  }

  setSelectOptions() {
    $("#fontSize").val(this.cState.activeObj.getParent().fontSize);
    $("#fontFamily").val(this.cState.activeObj.getParent().fontFamily);
  }

}

class FlowchartToolbar extends Toolbar {

  constructor(cState) {
    super(cState);
    this.element = $("#flowchartToolbar");

    this.activeOptions = null;

    // initialize references to buttons
    this.initButtons();
  }

  static getInstance(cState) {
    if (this.instance == null) 
      this.instance = new FlowchartToolbar(cState);
    return this.instance;
  }

  initButtons() {
    this.arrowOptions = new ArrowOptions(this.cState, this);
    this.flowchartBoxOptions = new FlowchartBoxOptions(this.cState, this);
  }
}
