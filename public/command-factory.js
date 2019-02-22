const mainCommands = {
  "delete": ConsoleDestroyCommand, // maybe turn into inherited method
  // "relabel": RelabelCommand,
  "snap": ExportToImageCommand,
  "sleep": SleepCommand,
  "truncate": TruncateVideoCommand,
  "export": ExportVideoCommand,
};

const mathCommands = {
  "add": AddCommand,
  "mult": MultCommand,
  "sub": SubCommand,
  "div": DivCommand,
  "exp": ExponentCommand,
  "negateNum": NegateNumberCommand,
};

const constructors = {
  "array":    Array1DConstructor,
  "linked":   LinkedListConstructor,
  "text":     TextBoxConstructor,
  "math":     MathBoxConstructor,
  "rectbox":  RectBoxConstructor,
  "rbox":     RectBoxConstructor,
  "roundbox": RoundBoxConstructor,
  "rdbox":    RoundBoxConstructor,
  "dbox":     DiamondBoxConstructor,
  "pbox":     ParallelogramBoxConstructor,
  "conn":     ConnectorConstructor,
  "arrow":    CurvedArrowConstructor,
  "bst":      BSTConstructor,
};

/** createFunctionCommand 
 *    check properties of provided opNode
 *    object and create method or function
 *    from result
 */   
function createFunctionCommand(functionNode, args) {
  if (functionNode == null)
    throw "Cannot invoke function on null";

  var functionClass = functionNode.command.execute();
  console.log("functionClass = ", functionClass, functionNode.command.constructor.name);
  if (functionClass.methodClass !== undefined)
    return createMethodCommand(functionClass, args);

  if (Object.values(mainCommands).includes(functionClass)
      || Object.values(constructors).includes(functionClass))
    return new functionClass(CanvasState.getInstance(), ...args);

  throw `Invalid function name: '${functionClass}'.`;
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
    case "clickCreate":
      return new ClickCreateCommand(cState, cState.activeObj);
    case "move":
      return new MoveCommand(cState, cState.activeObj);
    case "drag":
      return new DragCommand(cState, cState.activeObj);
    case "shiftDrag":
      return new ShiftDragCommand(cState, cState.activeObj);
    case "clone":
      return new CloneCommand(cState, cState.activeParent());
  }
  throw `Invalid draw command type: '${cState.activeCommandType}'.`;
}
