const mainCommands = {
  // "relabel": RelabelCommand,
  // "snap": ExportToImageCommand, TODO move to button
  "dbg": DebugPrint,
  "translate": TranslateCommand,
  "tr": TranslateCommand,
  "mt": MoveToCommand,
  "moveTo": MoveToCommand,
  "resize": ResizeCommand,
  "repaint": RepaintCommand,
  "wait": WaitCommand,
  "help": HelpCommand,
  "show": ShowCommand,
  "hide": HideCommand, 
  "rand": RandomFloatCommand,
  "randn": RandomIntCommand,
  "range": RangeCommand,
  "interpolate": InterpolateCommand,
  "$": BuckCommand,
  "str": StringCommand,
};

const constructors = {
  "array":    Array1DConstructor,
  "linked":   LinkedListConstructor,
  "text":     TextBoxConstructor,
  "math":     MathBoxConstructor,
  "image":    ImageBoxConstructor,
  "rectbox":  RectBoxConstructor,
  "rbox":     RectBoxConstructor,
  "roundbox": RoundBoxConstructor,
  "rdbox":    RoundBoxConstructor,
  "dbox":     DiamondBoxConstructor,
  "pbox":     ParallelogramBoxConstructor,
  "conn":     ConnectorConstructor,
  "arrow":    CurvedArrowConstructor,
  "bst":      BSTConstructor,
  "bheap":    BinaryHeapConstructor,
  "plot":     PlotlyPlotConstructor,
  "ugraph":   UDGraphConstructor,
  "udgraph":  UDGraphConstructor,
  "dgraph":   DiGraphConstructor, 
  "digraph":  DiGraphConstructor,
};

// built in function include functions and constructors
const builtinFunctions = new Set(Object.keys(mainCommands).concat(Object.keys(constructors)));
const builtinFunctionClasses = new Set(Object.values(mainCommands).concat(Object.values(constructors)));

const keywords = new Set(
  [
    ...builtinFunctions,
    ...["TEMP", "for", "while", "if", "else", "elif", "define", "return", "null", "true", "false"],
  ]
);

const MAX_CAPACITY = 1000;
const STACK_MAX = 1000;

class VariableEnvironment {
  constructor() {
    if (VariableEnvironment.instance) return VariableEnvironment.instance;

    this.functions = new Map();
    this.mainVariables = new Map();
    this.canvasObjects = new Map(); // canvas object labels have global scope
    this.stack = [];


    // keep track of alises
    this.aliasOf = new Map(); // variable -> variable
    this.aliases = new Map(); // variable -> Set(variable)

    VariableEnvironment.instance = this;
  }

  /** VariableEnvironment.variables getter
   *    returns local (function call) namespace on
   *    top of stack or global (main) namespace
   */
  get variables() {
    if (this.stack.length) return this.stack.peek();
    return this.mainVariables;
  }

  static getInstance() {
    if (VariableEnvironment.instance == null)
      throw "Eager instantiation failed for VariableEnvironment";
    return VariableEnvironment.instance;
  }

  /** VariableEnvironment.pushNamespace
   *     push function call's local namespace onto stack
   */
  static pushNamespace(namespace) {
    var stack = VariableEnvironment.getInstance().stack;
    if (stack.length > STACK_MAX) 
      throw "Stack overflow";
    stack.push(namespace);
  }

  /** VariableEnvironment.popNamespace
   *     pop function call's local namespace 
   */
  static popNamespace(namespace) {
    var stack = VariableEnvironment.getInstance().stack;
    if (namespace !== stack.peek()) 
      throw "Call stack error -- cannot pop local namespace";
    stack.pop();
  }

  static clone() {
    return VariableEnvironment.getInstance().clone();
  }

  clone() {
    return {
      functions: new Map(this.functions),
      mainVariables: new Map(this.mainVariables),
      stack: this.stack.map(m => new Map(m)),
      canvasObjects: new Map(this.canvasObjects),
      // aliasOf: new Map(this.aliasOf),
      // aliases: new Map(this.aliases),
    }
  }

  static setState(state) {
    VariableEnvironment.getInstance().setState(state);
  }

  setState(state) {
    this.function = new Map(state["functions"]);
    this.mainVariables = new Map(state["mainVariables"]);
    this.stack = state["stack"].map(m => new Map(m));
    this.canvasObjects = new Map(state["canvasObjects"]);
    // this.aliasOf = new Map(state["aliasOf"]);
    // this.aliases = new Map(state["aliases"]);

    this.updateEnvironmentDisplay();
  }

  static clearAll() {
    VariableEnvironment.getInstance().clearAll();
  }

  /** VariableEnvironment.clearAll  
   *    clear all entries in current environment
   */
  clearAll() {
    this.functions = new Map();
    this.mainVariables = new Map();
    this.canvasObjects = new Map();
    this.stack = [];

    this.updateEnvironmentDisplay();
  }

  static setVar(varName, value) {
    return VariableEnvironment.getInstance().setVar(varName, value);
  }

  /** VariableEnvironment.setVar
   *    check if varName is keyword and whether
   *    adding this will put map over capacity. if not,
   *    add (or update) it to map
   */
  setVar(varName, value) {
    if (keywords.has(varName))
      throw `Cannot use keyword '${varName}'.`;

    if (this.variables.size > MAX_CAPACITY)
      throw "Cannot create any new variables, already at capacity";

    if (this.hasVar(varName) && this.functions.has(varName))
      throw "Cannot reassign function name";


    // if (value instanceof CanvasObject && value.label != varName) {
    //   // note that variableName is now an alias
    //   // for the canvas object (this.value)'s label
    //   this.addAlias(value.label, varName);
    // }

    // if (value instanceof CanvasObject) 
    //   this.canvasObjects.set(varName, value);
    // else
    this.variables.set(varName, value);

    // update environment display
    this.updateEnvironmentDisplay();
  }

  /** VariableEnvironment.addAlias
   *    keep track of aliases of canvas objects
   *    so they can be cleared when true label is cleared
   */
  // addAlias(canvasObjectName, newName) {
  //   if (canvasObjectName == "") return; // first assignment

  //   // if canvasObjectName deleted, delete alias bindings
  //   // as well 
  //   if (! this.aliases.has(canvasObjectName)) this.aliases.set(canvasObjectName, new Set());
  //   this.aliases.get(canvasObjectName).add(newName);

  //   // newName is an alias of canvasObjectName, 
  //   // so if newName is deleted, delete aliases also
  //   this.aliasOf.set(newName, canvasObjectName);
  // }

  getAllBindings() {
    return new Map(Array.from(this.variables.entries())
      .concat(Array.from(this.functions.entries()))
      .concat(
        // put a $ in front of canvas Object labels
        Array.from(this.canvasObjects.entries())
        .map(([k, v]) => ["$" + k, v])
      ));
  }

  static updateEnvironmentDisplay() {
    VariableEnvironment.getInstance().updateEnvironmentDisplay();
  }

  /** VariableEnvironment.updateEnvironmentDisplay
   *    pass variable and function bindings over to react
   *    component for display
   */
  updateEnvironmentDisplay() {
    if (window.environmentPane == undefined) return;
    window.environmentPane.setState({ variables: this.getAllBindings() });
  }

  static getVar(varName) {
    return VariableEnvironment.getInstance().getVar(varName);
  }

  /** VariableEnvironment.getVar
   *    Always check for canvas objects and then 
   *    functions because they 
   *    have global scope, but check local scope first
   */
  getVar(varName) {
    if (this.hasVar(varName)) return this.variables.get(varName);
    if (this.functions.has(varName)) return this.functions.get(varName); 
    throw `Undefined variable: '${varName}'.`;
  }

  static defineFunction(funcName, funcDef) {
    VariableEnvironment.getInstance().defineFunction(funcName, funcDef);
  }

  defineFunction(funcName, funcDef) {
    if ((this.canvasObjects.has(funcName) 
       || this.variables.has(funcName))
          || 
       this.functions.has(funcName) && this.functions.get(funcName) !== funcDef)
      throw `Function definition error: ${funcName} already in use.`;
    this.functions.set(funcName, funcDef);

    this.updateEnvironmentDisplay();
  }

  static deleteFunctionDefinition(funcName) {
    VariableEnvironment.getInstance().deleteFunctionDefinition(funcName);
  }

  deleteFunctionDefinition(funcName) {
    if (! this.functions.has(funcName)) 
      throw `Cannot undo definition of unknown function ${funcName}.`;
    this.functions.delete(funcName);

    this.updateEnvironmentDisplay();
  }

  static getCanvasObj(objLabel) {
    return VariableEnvironment.getInstance().getCanvasObj(objLabel);
  }

  getCanvasObj(objLabel) {
    var canvasObj = this.canvasObjects.get(objLabel);    
    
    if (! (canvasObj instanceof CanvasObject)) 
      throw `Variable '${objLabel}' does not refer to a canvas object.`;

    return canvasObj;
  }

  static hasCanvasObj(objLabel) { 
    return VariableEnvironment.getInstance().hasCanvasObj(objLabel);
  }

  hasCanvasObj(objLabel) {
    return this.canvasObjects.has(objLabel);
  }

  static setCanvasObj(objLabel, canvasObj) { 
    return VariableEnvironment.getInstance().setCanvasObj(objLabel, canvasObj);
  }

  setCanvasObj(objLabel, canvasObj) {
    if (this.canvasObjects.has(objLabel)) 
      throw `Label ${objLabel} already taken`;
    if (! (canvasObj instanceof CanvasObject))
      throw `Invalid canvas object ${canvasObj}`;
    this.canvasObjects.set(objLabel, canvasObj);
  }

  static deleteCanvasObj(objLabel, canvasObj) { 
    return VariableEnvironment.getInstance().deleteCanvasObj(objLabel, canvasObj);
  }

  deleteCanvasObj(objLabel) {
    if (! this.canvasObjects.has(objLabel))
      throw `Cannot delete undefined canvas object ${objLabel}`;
    this.canvasObjects.delete(objLabel);
  }

  static deleteVar(varName, deleteAliases) {
    return VariableEnvironment.getInstance().deleteVar(varName, deleteAliases);
  }

  /** VariableEnvironment.deleteVar
   *  delete some binding(s) and return a map of 
   *  what got deleted for undoing
   */
  deleteVar(varName, deleteAliases) {
    if (! this.hasVar(varName))
      throw `Cannot delete undefined variable '${varName}'.`;

    deleteAliases = false;
    // default to always deleting aliases
    if (deleteAliases == undefined) 
      deleteAliases = true;

    //  keep track of what got deleted
    var deleted = new Map();

    // determine where k is stored,
    // save it for undoing
    // and delete it. 
    const deleteBinding = k => {
      var hasK;
      if (this.variables.has(k)) 
        hasK = this.variables;
      else if (this.canvasObjects.has(k)) 
        hasK = this.canvasObjects;
      else return;

      deleted.set(k, hasK.get(k));
      hasK.delete(k);
    }

    deleteBinding(varName);
    // else {

    //   // varName is an alias of a canvas object
    //   // with another name
    //   if (this.aliasOf.has(varName)) {
    //     var trueLabel = this.aliasOf.get(varName);
    //     var otherNames = this.aliases.get(trueLabel);
    //     otherNames.forEach(o => deleteBinding(o));
    //     deleteBinding(trueLabel);
    //   } 
    //   else {
    //     // varName is not an alias but it 
    //     // has aliases
    //     if (this.aliases.has(varName)) {
    //       // delete aliases if they exist
    //       this.aliases.get(varName).forEach(other => deleteBinding(other));
    //     }
    //     deleteBinding(varName);
    //   }
    // }

    // update environment display
    this.updateEnvironmentDisplay();

    return deleted;
  }

  static hasVar(varName) {
    return VariableEnvironment.getInstance().hasVar(varName);
  }

  hasVar(varName) {
    return this.variables.has(varName);
  }

  static hasFunction(varName) {
    return VariableEnvironment.getInstance().hasFunction(varName);
  }

  hasFunction(varName) {
    return this.functions.has(varName);
  }
}

