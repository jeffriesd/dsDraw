
const keywords = {
  "TEMP": null,
  "delete": null, 
  "relabel": null,
  "snap": null,
  "truncate": null,
  "show": null,
  "export": null,
  "add": null, // math ops
  "sub": null,
  "mult": null,
  "div": null,
  "exp": null,
  "array": null,
  "array1d": null, 
  "linked": null,
  "tb": null,
  "tbox": null,
  "text": null,
  "math": null,
  "rectbox": null,
  "rbox": null,
  "roundbox": null,
  "rdbox": null,
  "dbox": null,
  "pbox": null,
  "conn": null,
  "arrow": null,
};

const MAX_CAPACITY = 1000;
const STACK_MAX = 1000;

class VariableEnvironment {
  constructor() {
    if (VariableEnvironment.instance) return VariableEnvironment.instance;

    this.functions = new Map();
    this.mainVariables = new Map();
    this.stack = [];

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

  static setVar(varName, value) {
    return VariableEnvironment.getInstance().setVar(varName, value);
  }

  /** VariableEnvironment.setVar
   *    check if varName is keyword and whether
   *    adding this will put map over capacity. if not,
   *    add (or update) it to map
   */
  setVar(varName, value) {
    if (varName in keywords)
      throw `Cannot use keyword '${varName}'.`;

    if (this.variables.size > MAX_CAPACITY)
      throw "Cannot create any new variables, already at capacity";

    if (this.hasVar(varName) && this.getVar(varName) instanceof FunctionDefinition)
      throw "Cannot reassign function name";
  
    this.variables.set(varName, value);
  }

  static getVar(varName) {
    return VariableEnvironment.getInstance().getVar(varName);
  }

  /** VariableEnvironment.getVar
   *    Always check for function because they 
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
    if (this.functions.has(funcName) || this.variables.has(funcName))
      throw `Function definition error: ${funcName} already in use.`;
    this.functions.set(funcName, funcDef);
  }

  static getCanvasObj(objLabel) {
    return VariableEnvironment.getInstance().getCanvasObj(objLabel);
  }

  getCanvasObj(objLabel) {
    var canvasObj = this.getVar(objLabel);    
    
    if (! (canvasObj instanceof CanvasObject)) 
      throw `Variable '${objLabel}' does not refer to a canvas object.`;

    return canvasObj;
  }

  static deleteVar(varName) {
    VariableEnvironment.getInstance().deleteVar(varName);
  }

  deleteVar(varName) {
    if (! this.hasVar(varName))
      throw `Cannot delete undefined variable '${varName}'.`;
    this.variables.delete(varName);
  }

  static hasVar(varName) {
    return VariableEnvironment.getInstance().hasVar(varName);
  }

  hasVar(varName) {
    return this.variables.has(varName);
  }
}

