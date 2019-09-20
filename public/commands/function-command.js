class SyncCommand extends ConsoleCommand {

}

class WaitCommand extends ConsoleCommand {
  executeSelf() {
    return new Promise(resolve => { 
      setTimeout(() => {
        resolve();
      }, 1000);
    });
  }
}

function executePromise(cmd) {
  if (cmd instanceof WaitCommand)
    return cmd.execute();

  return new Promise((resolve, reject) => {
    cmd.execute();
    resolve();
  });
}

/**
 *  User defined functions are created
 *  using the 'define' keyword. Example:
 *    
 *  define printArr(arr) {
 *    for (i = 0; i < arr.length; i = i + 1) {
 *      print(arr[i].value);   
 *    } 
 *  }   
 * 
 *  User functions maintain their own namespace
 *  (map of variable names) and force child
 *  statements to use the same namespace by pushing
 *  it onto a stack used by the VariableEnvironment class.
 *  When a variable value is requested, the top of the stack
 *  is looked at first. The local namespace gets popped off 
 *  when execution ends.
 * 
 *  Statement nodes are cloned so each call runs
 *  with fresh command objects.
 */
class UserFunctionCommand extends ConsoleCommand {
  constructor(funcDef, ...args) {
    super(...args);
    this.funcName = funcDef.funcName;
    this.statements = funcDef.statements.map(x => x.clone());
    this.argNames = funcDef.argNames;
    this.namespace = this.setArguments();
    // flag to ensure command stack is only created once
    this.storedStack = false; 
    this.executed = [];
  }

  execPush(command) {
    if (! this.storedStack) this.executed.push(command);
    return command.execute();
  }

  /** UserFunctionCommand.setArguments
   *    evaluate arguments and map to local names
   */
  setArguments() {
    if (this.argNames.length != this.argNodes.length)  {
      console.log(this.argNames, this.argNodes);
      throw `${this.funcName} requires ${this.argNames.length} arguments. Argnames = '${this.argNames}'`;
    }
    var namespace = new Map();
    this.argNames.forEach((argname, i) => {
      namespace.set(argname, this.argNodes[i].command.execute());
    });
    return namespace;
  }

  nextPromise(n) {
    if (n == this.statements.length) 
      return new Promise(resolve => resolve());
    // return new Promise(resolve => {
    //   if (! this.storedStack) this.executed.push(this.statements[n].command);
    //   executePromise(this.statements[n].command)
    //       // .then(() => resolve())

    // })
    if (! this.storedStack) this.executed.push(this.statements[n].command);
    return executePromise(this.statements[n].command)
      .then(() => this.nextPromise(n+1)())
  }

  execute() {
    var ret = null;
    VariableEnvironment.pushNamespace(this.namespace);
    console.log("pushing");


    this.nextPromise(0)
    .then(() => { 
      VariableEnvironment.popNamespace(this.namespace);
    })
    .catch(e => {
      VariableEnvironment.popNamespace(this.namespace);
      // quick easy way to return value from any nested call
      console.log(e.value);
      if (e instanceof FunctionReturn)
        ret = e.value; 
      else // some other error
        throw e;
    })

    // indicate that further calls to execute
    // should no longer update stack
    this.storedStack = true;
    return ret;
  }

  undo() {
    VariableEnvironment.pushNamespace(this.namespace);
    try {
      this.executed.slice().reverse().forEach(cmd => cmd.undo());
      VariableEnvironment.popNamespace(this.namespace);
    }
    catch (e) {
      VariableEnvironment.popNamespace(this.namespace);
      throw e;
    }
  }
}

class ReturnCommand extends ConsoleCommand {
  executeSelf() {
    throw new FunctionReturn("Return called outside function", this.args[0]);
  }
}

class FunctionReturn extends Error {
  constructor(message, retValue) {
    super(message);
    this.value = retValue;
    this.name = "";
  }
}
