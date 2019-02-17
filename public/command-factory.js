const objectCommands = {
  "Array1Dlength": Array1DLengthCommand,
  "Array1Dresize": Array1DResizeCommand,
  "Array1Dswap": Array1DSwapCommand,
  "Array1Darc": Array1DArrowCommand,
  "Array1Dcopy": Array1DCopyCommand,
  "Array1Dsort": Array1DSortCommand,
  "LinkedListinsert": LinkedListInsertCommand,
  "LinkedListlink": LinkedListLinkCommand,
  "LinkedListcut": LinkedListCutCommand,
  "BSTinsert": BSTInsertCommand,
};

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
  "array1d":  Array1DConstructor,
  "linked":     LinkedListConstructor,
  "tb":       CanvasObjectConstructor, // rest use default
  "tbox":     CanvasObjectConstructor,
  "text":     CanvasObjectConstructor,
  "math":     CanvasObjectConstructor,
  "rectbox":  CanvasObjectConstructor,
  "rbox":     CanvasObjectConstructor,
  "roundbox": CanvasObjectConstructor,
  "rdbox":    CanvasObjectConstructor,
  "dbox":     CanvasObjectConstructor,
  "pbox":     CanvasObjectConstructor,
  "conn":     CanvasObjectConstructor,
  "arrow":    CanvasObjectConstructor,
  "bst":      CanvasObjectConstructor,
}

const canvasClasses = {
  "array":    Array1D,
  "array1d":  Array1D,
  "linked":     LinkedList,
  "tb":       TextBox, 
  "tbox":     TextBox,
  "text":     TextBox,
  "math":     MathBox,
  "rectbox":  RectBox,
  "rbox":     RectBox,
  "roundbox": RoundBox,
  "rdbox":    RoundBox,
  "dbox":     DiamondBox,
  "pbox":     ParallelogramBox,
  "conn":     Connector,
  "arrow":    CurvedArrow,
  "bst":      BST,
}

/** 
 *  soon to deprecate "main commands"
 *
 *  functions ("chars(args)") as
 *  opposed to methods ("chars.method(args)")
 *  will soon only be used for constructors
 *  and user defined functions
 *
 *  maybe some more built in ones will come
 *  for drag, move, clone, etc.
 */
function createFunctionCommand(functionName, args) {
  if (functionName in mainCommands)
    return new mainCommands[functionName](CanvasState.getInstance(), ...args);
  if (functionName in constructors) {
    var className = canvasClasses[functionName];
    return new constructors[functionName](CanvasState.getInstance(), className, ...args);
  }

  throw `Invalid command '${functionName}'.`;
}

/** createMethodCommand
 *    convert method string and array of args to
 *    CanvasObjectCommand 
 *    e.g.
 *    createMethodCommand("arr1", "swap()", ["0", "1"])
 */
function createMethodCommand(methodName, args) {
  var spl = methodName.split(".");
  var receiverName = spl[0];
  methodName = spl[1];
  var receiverObj = VariableEnvironment.getCanvasObj(receiverName); 

  // keys of command map are ClassnameMethodname
  var cmdKey = receiverObj.constructor.name + methodName;

  var commandClass = objectCommands[cmdKey];
  
  if (commandClass == null)
    throw `No command '${methodName}' for class '${receiverObj.constructor.name}'`;

  return new commandClass(receiverObj, ...args);
}
