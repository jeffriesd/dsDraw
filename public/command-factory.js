// construct function call AST nodes at runtime 
// to make recursion possible (for a function f 
// which calls itself, the binding for f is unknown
// at parse time)
function createFunctionAtRuntime(functionNode, args) {
  if (functionNode == null)
    throw "Cannot invoke function on null";

  // need to return a promise because callee 
  // may do async action before returning a 
  // reference to a function or method

  // e.g. 
  // define t() { wait(1000); return f; }
  // t()()

  return liftCommand(functionNode.command)
  .then(functionClass => createFunctionFromCallee(functionClass, args))
  .catch(e => {
    console.log("Unknown function");
    throw e;
  })
}

function createFunctionFromCallee(functionClass, args) {
  if (functionClass !== undefined) {
    // e.g. 
    // b = bst();
    // b.remove(5); -- b evaluates to BSTCanvasObject
    if (functionClass.methodClass !== undefined)
      return createMethodCommand(functionClass, args);

    // callee could still be a builtin structure that 
    // was wrapped in a variable that needed to be evaluated first
    // e.g. 
    // f = bst
    // f()
    if (builtinFunctionClasses.has(functionClass))
      return new functionClass(CanvasState.getInstance(), ...args);
        
    if (functionClass instanceof FunctionDefinition) 
      return new UserFunctionCommand(functionClass, ...args);
  }

  throw `Invalid function name: '${functionClass}'.`;
}



/** createFunctionCommand 
 */   
// function createFunctionCommand(functionName, functionNode, args) {
//   if (functionNode == null)
//     throw "Cannot invoke function on null";
// 
// 
//   // builtin functions can be defined at parse time -- 
//   // check name and interpret immediately
//   if (builtinFunctions.has(functionName)) {
//     var functionClass = mainCommands[functionName] || constructors[functionName];
//     return new functionClass(CanvasState.getInstance(), ...args);
//   }
//   else {
//     // otherwise callee is an object or a user defined function
//     // -- must evaluate this ast node to get reference
//     // -- to callee
//     return {
//       execute: function() {
//         if (this.command == undefined)
//           return createFunctionAtRuntime(functionNode, args)
//             .then(command => {
//               this.command = command;
//               return liftCommand(this.command);
//             });
//         return liftCommand(this.command);
//       },
//       undo: function() {
//         if (this.command)
//           return this.command.undo();
//       }
//     }  
//   }
// }

/*
 *    check properties of provided opNode
 *    object and create method or function
 *    from result
 * 
 *    if function is being called is built-in and 
 *    is being called by its built-in name, then 
 *    it can be interpreted immediately. otherwise
 *    it must be interpreted at runtime.
 *    
 *    examples:
 *      1: randn() -- fine because 'randn' is built-in
 *      2: x.method() -- cannot construct method node yet 
 *                       because 'x' is defined at runtime
 *      3: z = bst; z(); -- same reasoning as above
 */
class FunctionCallCommand {
  constructor(functionName, functionNode, args) {
    if (functionNode == null)
      throw "Cannot invoke function on null";

    // builtin functions can be defined at parse time -- 
    // check name and interpret immediately
    if (builtinFunctions.has(functionName)) {
      var functionClass = mainCommands[functionName] || constructors[functionName];
      return new functionClass(CanvasState.getInstance(), ...args);
    }

    this.functionNode = functionNode;
    this.args = args;

    // reference to function body command
    this.command = undefined;
  }

  execute() {
    if (this.command == undefined)
      return createFunctionAtRuntime(this.functionNode, this.args)
        .then(command => {
          this.command = command;
          return liftCommand(this.command);
        });
    return liftCommand(this.command);
  }

  undo() {
    if (this.command) return this.command.undo();
  }
}

/** createMethodCommand
 *    convert methodBuilder node and array of args to
 *    CanvasObjectCommand 
 *
 *    computes receiver at instantiation time
 *    so receiver state can be saved before 
 *    commands are executed
 *
 *    e.g.
 *    createMethodCommand({ receiver: myArr, methodClass: Array1D.swap }, ["0", "1"])
 */
function createMethodCommand(methodBuilder, args) {
  if (methodBuilder.receiver == undefined 
      || methodBuilder.methodClass == undefined)
    throw `Invalid method invocation '${methodBuilder.constructor.name}'.`;

  return new methodBuilder.methodClass(methodBuilder.receiver, ...args);
}

/** createDrawCommand
 *    create command object from mouse input
 */
function createDrawCommand(cState) {
  if (cState.activeObj == null) {
    switch (cState.drawMode) {
      case "SelectTool":
        return new SelectCommand(cState);
    }
    return;
  }
  if (! cState.activeCommandType) return;
  switch (cState.activeCommandType) {
    case "move":
      return new MouseMoveCommand(cState, cState.activeObj);
    case "drag":
      return new DragCommand(cState, cState.activeObj);
    case "clone":
      return new CloneCommand(cState, cState.activeParent());
  }
  throw `Invalid draw command type: '${cState.activeCommandType}'.`;
}

/** createFunctionDefinition
 *    factory method for creating a new user-defined function.
 *    creates new UserFunctionFactory object and binds it to the
 *    provided name
 * 
 *    @param funcName - name of function
 *    @param argNames - array of argument names
 *    @param funcStatements - array of opNodes 
 */
function createFunctionDefinition(funcName, argNames, funcStatements) {
  VariableEnvironment.defineFunction(funcName, 
    new FunctionDefinition(funcName, argNames, funcStatements));
}

/** undoFunctionDefinition
 *    undo method for function definition because
 *    otherwise error would be thrown if func def command
 *    was re-done because it seems like someone is trying
 *    to overwrite an existing function 
 */
function undoFunctionDefinition(funcName) {
  VariableEnvironment.deleteFunctionDefinition(funcName);
}

/** FunctionDefinition
 *    special type of variable used to store
 *    the argument names and array of lines to execute
 *    for a function
 */
class FunctionDefinition {
  constructor(funcName, argNames, statementNodes) {
    this.funcName = funcName;
    this.argNames = argNames;
    this.statements = statementNodes;
  }
}
