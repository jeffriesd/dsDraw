

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
    this.genericInstance = null;
  }

  static getInstance(cState) {
    if (this.genericInstance == null) 
      this.genericInstance = new Toolbar(cState);
    return this.genericInstance;
  }

  /** Toolbar.show
   *    show specific toolbar element (<div>) if it exists
   *    otherwise just show options
   */ 
  show() {
    if (this.element)
      this.element.attr("hidden", false);
    this.showSelectOptions();

    console.log("showing ", this.constructor.name);
  }

  showSelectOptions() {
    if (this.activeOptions) 
      this.activeOptions.hide();

    this.activeOptions = this.cState.activeParent().getOptions();

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

  static getInstance(cState) {
    if (this.genericInstance == null) 
      this.genericInstance = new ToolOptions(cState, Toolbar.getInstance(cState));
    return this.genericInstance;
  }

  /** ToolOptions.show
   *    if there is a specific div element with options
   *    for the active object, show it
   */
  show() {
    // show delete button
    $("#deleteButton").css("visibility", "visible");
      
    if (this.element)
      this.element.attr("hidden", false);
    console.log("optios element = ", this.element);
    this.setSelectOptions();
  }

  /** ToolOptions.hide
   *    if there is a specific div element with options
   *    for the active object, hide it
   */
  hide() {
    $("#deleteButton").css("visibility", "hidden");

    if (this.element)
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
    var arrowWidth = $("#arrowWidth");
    arrowWidth.on("change", (event) => {
      var arrow = this.cState.activeParent();
      arrow.thickness = arrowWidth.val();
    });

    var arrowHeadFill = $("#arrowHeadFill");
    arrowHeadFill.on("change", (event) => {
      var arrow = this.cState.activeParent();
      arrow.head.hollow = arrowHeadFill.val() == "hollow";
      if (arrowHeadFill.val().includes("white")) 
        arrow.head.fill = "#fff";
      else
        arrow.head.fill = "#000";
    });

    var arrowDash = $("#arrowDash");
    arrowDash.on("change", (event) => {
      var arrow = this.cState.activeParent();
      arrow.dashed = arrowDash.val() == "dashed";
    });
  }

  setSelectOptions() {
    var active = this.cState.activeObj;
    var arrow = active.getParent();
    $("#arrowWidth").val(arrow.thickness);
    
    var headFill;
    if (arrow.head.hollow)
      headFill = "hollow";
    else {
      headFill = arrow.head.fill == "#fff" ? "filled (white)" : "filled (black)";
    }
    $("#arrowHeadFill").val(headFill);
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
    var topVAlign = $("#topVAlign");
    var centerVAlign = $("#centerVAlign");

    fontSize.on("change", (event) => {
      var textbox = this.cState.activeParent();
      textbox.fontSize = fontSize.val();

      // re-render text with new size
      textbox.textEntered();
    });

    fontFamily.on("change", (event) => {
      var textbox = this.cState.activeParent();
      textbox.fontFamily = fontFamily.val();
    });

    leftAlign.on("click", (event) => {
      var textbox = this.cState.activeParent();
      textbox.horizontalAlign = "left";
      textbox.editor.style.textAlign = "left";
    });
    rightAlign.on("click", (event) => {
      var textbox = this.cState.activeParent();
      textbox.horizontalAlign = "right";
      textbox.editor.style.textAlign = "right";
    });
    centerAlign.on("click", (event) => {
      var textbox = this.cState.activeParent();
      textbox.horizontalAlign = "center";
      textbox.editor.style.textAlign = "center";
    });

    centerVAlign.on("click", (event) => {
      var textbox = this.cState.activeParent();
      textbox.verticalAlign = "center";
    });

    topVAlign.on("click", (event) => {
      var textbox = this.cState.activeParent();
      textbox.verticalAlign = "top";
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

  show() {
    super.show();
    console.log("showing from :", this.constructor.name);
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
