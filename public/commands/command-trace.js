/** Program trace:
 *    users can create a block of code and 
 *    execute the statements in a debugger-like
 *    mode known as "program trace".
 * 
 *    While in program trace mode, the only
 *    possible actions are to step into,
 *    step over, step out of, continue, or cancel. 
 * 
 *    In other words, undo/redo/any other 
 *    interaction with the canvas is disabled (context is locked).
 *    Switching in and out of recording is also disabled. 
 *    This is to prevent weird behavior when in the middle of 
 *    a nested function call. 
 * 
 *    Other than these restrictions, commands are executed in 
 *    exactly the same way as usual. 
 * 
 *    The current statement will be highlighted in the editor. 
 * 
 * 
 *    Regarding command recorder:
 *      - only the top level command is recorded
 *      - each interior command is simply executed 
 *        by its parent like in non-debug mode
 * 
 * 
 *   FUTURE: 
 *    - implement breakpoints
 *      - probably easier to do with syntax like 
 *        wrapping exprs with {{ }} or similar
 */

function getCommandIterator(cmd, callback) {
  if (cmd instanceof CodeBlockCommand) return new CodeBlockIterator(cmd);
  if (cmd instanceof UserFunctionCommand) return new UserFunctionCommandIterator(cmd, callback);
  if (cmd instanceof ConsoleCommand) return new ConsoleCommandIterator(cmd, callback);
  if (cmd instanceof FunctionCallCommand) return new FunctionCallCommandIterator(cmd, callback);
  // TODO implement control flow

  return new BaseCommandIterator(cmd, callback);

}

class CommandIterator {
  constructor(command, callback) {
    this.command = command;
    this.callbackFunction = callback;

    // used to check what should happen
    // when stepInto(), etc. are called. 
    this.finishedExecuting = false;

    this.callbackInvoked = false;

    this.currentIter = null;
  }

  // wrapper to ensure callback is only
  // invoked once
  callback(cmd, ret) {
    if (! this.callbackInvoked) {
      this.callbackInvoked = true;
      this.finishedExecuting = true;
      if (this.callbackFunction)
        return this.callbackFunction(cmd, ret);
    }
    else
      throw "Callback should only be invoked once";
  }

  stepInto() {
    // if current child branch is untouched or completely finished 
    if (this.currentIter === null || this.currentIter.finishedExecuting) 
      return this.advance();
    else // eventually this will cause currentIter.finishedExecuting to be true
      return this.currentIter.stepInto()
  }

  stepOver() {
    // this subtree has not yet been entered
    if (this.currentIter === null) {
      return liftCommand(this.command)
        .then(ret => { 
          this.callback(this.command, ret);
          return ret; 
        });
    }

    // otherwise if the current branch is 
    // already complete, go to the next one
    if (this.currentIter.finishedExecuting) 
      return this.advance();


    // otherwise propagate to children
    return this.currentIter.stepOver()
  }
}

class BaseCommandIterator extends CommandIterator {
  stepOver() {
    return liftCommand(this.command)
      .then(ret => { 
        this.callback(this.command, ret);
        return ret;
      });
  }

  stepInto() {
    return this.stepOver();
  }
}

/** CodeBlockIterator
 *    just need to implement logic to 
 *    set storedStack = true after first execute 
 * 
 *    remember in control flow commands, the loop statements 
 *    get cloned each iteration to update their references,
 *    but subsequent redo's of the overall ctrl flow command
 *    should use the same command objects as the first time. 
 *    This is what storedStack is for.
 */
class CodeBlockIterator extends CommandIterator {
  // no callback because code block is a top-level construct
  // (no code can come after it)
  constructor(command, callback) {
    super(command);
    this.index = 0; 
  }

  numStatements() {
    return this.command.loopStatements.length;
  }

  callback(cmd, ret) { 
    this.storedStack = true; 
    return super.callback(cmd, ret);
  }

  advance() {
    if (this.index < this.numStatements()) 
      return new Promise(resolve => {
        // need to maintain stack of executed commands
        // in CodeBlockCommand object for undo/redo,
        // so each command is pushed to stack after it gets executed
        var cb = (cmd) => this.command.pushCmd(cmd);
        if (this.index + 1 === this.numStatements())
          cb = (cmd, ret) => { this.command.pushCmd(cmd); this.callback(cmd, ret); }

        this.currentIter = getCommandIterator(this.command.loopStatements[this.index].command, cb);
        this.index++;
        resolve();
      });

    throw "Error advancing codeblock";
  }
}


/**
 *  currentIter ranges over the child commands
 *  of this ConsoleCommand.
 * 
 *  stepInto - if child commands havent been executed yet, then start.
 *             if there is a current iter (child comand) and it 
 *             is finished, either advance to the next one 
 *             or do the body of this ConsoleCommand (executeSelf) 
 *             and mark this subtree as finished.
 * 
 *  stepOver - if this subtree has not been entered yet, execute the whole thing
 *             and mark it as finished. Otherwise call stepover on current iter.
 */
class ConsoleCommandIterator extends CommandIterator {
  constructor(command, callback) {
    super(command, callback);
    this.index = 0;
  }

  preCallback() {
    this.command.precheckArguments();
    this.command.args = [];
  }

  advance() {
    // move to next child command 
    if (this.index < this.command.numArguments()) {
      return new Promise(resolve => { 

        if (this.index == 0) { // first point of entry
          this.preCallback();
        }

        this.currentIter = getCommandIterator(
          this.command.argNodes[this.index].command,
          // push return value after child command finishes
          (_cmd, ret) => this.command.args.push(ret),
        );

        this.index++;
        resolve();
      });
    }

    // execute body of this ConsoleCommand 
    return this.command.executeSelfPromise()
      .then(commandRet => this.callback(this.command, commandRet));
  }

}

class UserFunctionCommandIterator extends CommandIterator {
  constructor(command, callback) {
    super(command, callback);
    this.argIndex = 0;
    this.stIndex = 0;
  }

  numStatements() {
    return this.command.statements.length;
  }

  preCallback() {
    this.command.precheckArguments();
    this.namespace = new Map(VariableEnvironment.getInstance().variables);
  }

  callback(cmd, ret) {
    this.command.storedStack = true;
    VariableEnvironment.popNamespace(this.namespace);
    return super.callback(cmd, ret);
  }

  advance() {
    // still executing function arguments
    if (this.argIndex < this.command.numArguments()) {
      return new Promise(resolve => {
        if (this.argIndex == 0) this.preCallback();

        this.currentIter = getCommandIterator(
          this.command.argNodes[this.argIndex].command,
          (cmd, ret) => this.namespace.set(this.argNames[this.argIndex], ret)
        );

        this.argIndex++;
        resolve();
      })
    }

    // just finished function arguments, haven't started body: 
    // need to set namespace
    var beforeBody = () => {};
    if (this.argIndex == this.command.numArguments() && this.stIndex == 0) {
      beforeBody = () => { this.command.namespace = this.namespace; VariableEnvironment.pushNamespace(this.namespace) };
    }

    if (this.stIndex < this.numStatements()) {
      return new Promise(resolve => {
        beforeBody();

        // is this the last statement in the function body?
        var cb = (cmd, _ret) => this.command.pushCmd(cmd);
        if (this.stIndex + 1 == this.numStatements()) {
          cb = (cmd, ret) => {
            this.command.pushCmd(cmd);
            this.callback(cmd, ret);
          }
        }

        this.currentIter = getCommandIterator(this.command.statements[this.stIndex].command, cb);

        this.stIndex++;
        resolve();
      });
    }

    throw "Error advancing function call";
  }


  /** override stepInto and stepOver for special case of function return  */
  stepInto() {
    // if current child branch is untouched or completely finished 
    if (this.currentIter === null || this.currentIter.finishedExecuting) { 
      return this.advance();
    }

    return this.currentIter.stepInto()
      .catch(e => {
        if (e instanceof FunctionReturn) {
          // end function early
          this.callback(this.currentIter.command, e.value);
          return e.value;
        }

        throw e;
      })
  }

  stepOver() {
    // this subtree has not yet been entered
    if (this.currentIter === null) {
      return liftCommand(this.command)
        .catch(e => {
          if (e instanceof FunctionReturn)
            return e.value;

          // some other exception
          throw e;
        })
        .finally(ret => { 
          this.callback(this.command, ret);
          return ret; 
        });
    }

    // otherwise if the current branch is 
    // already complete, go to the next one
    if (this.currentIter.finishedExecuting) 
      return this.advance();


    // otherwise propagate to children
    return this.currentIter.stepOver();
  }
}

class FunctionCallCommandIterator extends CommandIterator {
  constructor(command, callback) {
    super(command, callback);
    this.gotFunction = false;
  }

  advance() {
    if (! this.gotFunction) {
      return new Promise(resolve => {
        this.currentIter = getCommandIterator(
          this.command.functionNode.command,
          (_cmd, ret) => this.command.command = createFunctionFromCallee(ret, this.command.args),
        )

        this.gotFunction = true;
        resolve();
      });
    }

    // now we can invoke the actual function 
    return new Promise(resolve => {
      resolve(this.currentIter = getCommandIterator(this.command.command, 
          (cmd, ret) => this.callback(cmd, ret)));
    });
  }
}

/** TODO Control flow  */