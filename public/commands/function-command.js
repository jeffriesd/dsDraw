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
    this.funcDef = funcDef;
    this.funcName = funcDef.funcName;
    this.statements = funcDef.statements.map(x => x.clone());
    this.argNames = funcDef.argNames;
    // flag to ensure command stack is only created once
    this.storedStack = false; 
    this.executed = [];
  }

  numStatements() {
    return this.statements.length;
  }

  precheckArguments() {
    if (this.argNames.length != this.numArguments())  {
      throw `${this.funcName} requires ${this.argNames.length} arguments. Argnames = '${this.argNames}'`;
    }
  }

  /** UserFunctionCommand.setArguments
   *    evaluate arguments and map to local names
   */
  setArguments() {
    this.precheckArguments();

    if (this.namespace == undefined) {
      var namespace = new Map(VariableEnvironment.getInstance().variables);
      // this.argNames.forEach((argname, i) => {
      //   namespace.set(argname, this.argNodes[i].command.execute());
      // });
      return this.argNames.reduce((prev, curName, i) => {
        return prev.then(_ => {
          return liftCommand(this.argNodes[i].command)
            .then(cmdRet => namespace.set(curName, cmdRet));
        });
      }, new Promise(resolve => resolve()))
      .then(() => {
        this.namespace = namespace;
      })
    }
    else 
      return new Promise(resolve => resolve());
  }

  pushCmd(command) {
    if (! this.storedStack) this.executed.push(command);
  }

  executeSelf() {
    return this.statements.reduce((prev, cur) => { 
      return prev.then(() => {
        this.pushCmd(cur.command);
        return liftCommand(cur.command);
      })
    }, new Promise(resolve => resolve()));
  }

  executeSelfPromise() {
    // no need to call getChildren, checkArgs, etc. 
    return this.executeSelf();
  }

  execute() {
    return this.setArguments()
    .then(() => {
      VariableEnvironment.pushNamespace(this.namespace);
      return this.executeSelf()
        .then(() => { 
          VariableEnvironment.popNamespace(this.namespace);

          // indicate that further calls to execute
          // should no longer update stack
          this.storedStack = true;
        })
        .catch(e => {
          VariableEnvironment.popNamespace(this.namespace);
          this.storedStack = true;

          // quick easy way to return value from any nested call
          if (e instanceof FunctionReturn) {
            return e.value; 
          }
          else // some other error
            throw e;
        })
    });
  }

  /** UserFunctionCommand.saveState
   *    what gets mutated? well,
   *    all of the commands in this function
   *    need to restore their own state
   *    and the namespace needs to be restored as well
   */
  // saveState() {
  //   return {
  //     venvStack : VariableEnvironment.getInstance().stack.slice(),
  //     stateMap : this.executed.slice().reverse().map(cmd => [cmd, cmd.saveState()]),
  //   }
  // }

  // restoreState(state) {
  //   var venv = VariableEnvironment.getInstance();
  //   venv.stack = state.venvStack.slice();
  //   state.stateMap.forEach(([cmd, state]) => {
  //     cmd.restoreState(state);
  //   });
  // }

  /** UserFunctionCommand.undoSelf
   *    this should work -- just undo the commands
   *    that got executed
   */
  undoSelf() {
    VariableEnvironment.pushNamespace(this.namespace);
    try {
      this.executed.slice().reverse().forEach(cmd => { 
        cmd.undo();
      });
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
