
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

class VariableEnvironment {
  constructor() {
    if (VariableEnvironment.instance) return VariableEnvironment.instance;

    this.variables = new Map();

    VariableEnvironment.instance = this;
  }

  static getInstance() {
    if (VariableEnvironment.instance == null)
      throw "Eager instantiation failed for VariableEnvironment";
    return VariableEnvironment.instance;
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
  
    this.variables.set(varName, value);
  }

  static getVar(varName) {
    return VariableEnvironment.getInstance().getVar(varName);
  }

  getVar(varName) {
    if (! this.hasVar(varName)) throw `Undefined variable: '${varName}'.`;
    return this.variables.get(varName);
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

