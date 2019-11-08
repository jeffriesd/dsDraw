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

/** TODO trace: 
 *    make all trace() functions return react <span>
 * 
 *    make formatTrace return span
 */




// use special characters that aren't allowed in dsDraw language (i.e. won't parse)
// that can be matched on to insert line breaks etc. in trace 
 
const TRACE_HIGHLIGHT_COLOR = "red";
const TRACE_FONT_FAMILY = "monospace";
const TRACE_FONT_SIZE = 22;

// suppress React warning 
var reactKey = 0;


const makeSpan = (text, highlight) => {
  var defaultStyle = { fontFamily : TRACE_FONT_FAMILY, fontSize : TRACE_FONT_SIZE };
  var style = defaultStyle;
  if (highlight) style.backgroundColor = TRACE_HIGHLIGHT_COLOR;

  return create("span", { key: reactKey++, style : style }, ...text);
};

const makeHighlightedSpan = (text) => makeSpan(text, true);


// join string like objects into an array
function joinStrings(lines, sep) {
  sep = sep || ""; // default sep is none
  var result = [];
  lines.forEach(l => {
    result.push(l);
    result.push(sep);
  });
  result.pop();

  return result;
}

function breakLines(...lines) {
  if (lines[0] && lines[0] instanceof Array) throw "Don't forget to use ...";

  var linesWithBreaks = [];
  lines.forEach(l => { 
    linesWithBreaks.push(l); 
    linesWithBreaks.push(create("br", { key : reactKey++}));
  });
  // pop last line break
  linesWithBreaks.pop();
  return linesWithBreaks;
}

function combineStrings(...lines) {
  return makeSpan(lines);
}

// takes n lines and returns highlighted span
function highlightText(...lines) {
  return makeHighlightedSpan(breakLines(...lines));
}


function getCommandIterator(astNode, callback) {
  var cmd = astNode.command;
  if (cmd instanceof CodeBlockCommand) return new CodeBlockIterator(astNode);
  if (cmd instanceof UserFunctionCommand) return new UserFunctionCommandIterator(astNode, callback);
  if (cmd instanceof ConsoleCommand) return new ConsoleCommandIterator(astNode, callback);
  if (cmd instanceof FunctionCallCommand) return new FunctionCallCommandIterator(astNode, callback);
  if (cmd instanceof WhileLoopCommand) return new WhileLoopCommandIterator(astNode, callback);
  if (cmd instanceof ForLoopCommand) return new ForLoopCommandIterator(astNode, callback);
  if (cmd instanceof IfBlockCommand) return new IfBlockCommandIterator(astNode, callback);

  return new BaseCommandIterator(astNode, callback);
}

/**
 *  Promise methods:
 *    advance
 *    stepOver 
 *    stepInto
 */
class CommandIterator {
  constructor(astNode, callback) {
    this.astNode = astNode;
    this.command = astNode.command;
    this.callbackFunction = callback;

    // used to check what should happen
    // when stepInto(), etc. are called. 
    this.finishedExecuting = false;

    this.callbackInvoked = false;

    this.currentIter = null;
  }

  formatTemplateTrace(childStrings) {
    // console.log("for ", this.command.constructor.name, " ast = ", this.astNode.toString(), " " , this.astNode.formatTrace)
    if (this.astNode.formatTrace) return this.astNode.formatTrace(...childStrings);

    return combineStrings(...childStrings);
  }

  /**     
   * default for print active subtree
   * returns a <span> react element
   */
  activeTrace() {
    // different behavior for function call command
    // (these ast nodes are constructed at runtime)
    if (this.astNode instanceof FunctionCallCommand)
      return highlightText(this.astNode.functionNode.text);

    return highlightText(this.astNode.text);
  }

  printHighlighted() {
    // get strings for child nodes 
    // var childPrint = 

    // put them into the template for this command type
    return this.printTemplate(childPrint);
  }

  // is this iterator representing the
  // currently selected expression in the program trace?
  currentlyActive() {
    return (this.currentIter == null || this.currentIter.finishedExecuting);
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

  setCommandIterator(astNode, cb) {
    this.currentIter = getCommandIterator(astNode, cb);
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

  trace() {
    if (this.currentlyActive()) return this.activeTrace();
    return combineStrings(this.astNode.text);
  }

  stepInto() {
    return this.stepOver();
  }
}

/** basically an interface for CommandIterator
 *  instances that need to save each command object before 
 *  executing it (loops, functions, etc.) 
 */
class SaveExecutedIterator extends CommandIterator {
  setCommandIterator(astNode, cb) {
    this.command.pushCmd(astNode.command);
    this.currentIter = getCommandIterator(astNode, cb);
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
class CodeBlockIterator extends SaveExecutedIterator {
  // no callback because code block is a top-level construct
  // (no code can come after it)
  constructor(astNode, callback) {
    super(astNode, callback);
    this.index = 0; 
  }

  // active trace but with newlines
  activeTrace() {
    return highlightText(...this.command.loopStatements.map(x => x.text));
  }

  /** 
   *  TODO  use spans DONE
   */
  trace() {
    if (this.currentlyActive()) return this.activeTrace();

    var childTrace = this.currentIter.trace();

    // if child trace is a function call, 
    // step into it
    if (childTrace instanceof UserFunctionTrace) 
      return childTrace.trace; // return unwrapped because CodeBlock is top-level

    var lines = [];
    for (var i = 0; i < this.command.numStatements(); i++) {
      if (i == this.currIndex)
        lines.push(childTrace);
      else 
        lines.push(this.command.loopStatements[i].text);
    }
    return combineStrings(...breakLines(...lines));
  }

  callback(cmd, ret) { 
    this.command.storedStack = true; 
    return super.callback(cmd, ret);
  }

  advance() {
    if (this.index < this.command.numStatements()) 
      return new Promise(resolve => {
        // need to maintain stack of executed commands
        // in CodeBlockCommand object for undo/redo,
        // so each command is pushed to stack after it gets executed
        var cb = (_cmd, _ret) => {};
        if (this.index + 1 === this.command.numStatements()) 
          cb = (cmd, ret) => this.callback(cmd, ret);

        // this.currentIter = getCommandIterator(this.command.loopStatements[this.index], cb);

        this.setCommandIterator(this.command.loopStatements[this.index], cb);

        this.currIndex = this.index;
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
  constructor(astNode, callback) {
    super(astNode, callback);
    this.index = 0;
  }

  /** ConsoleCommandIterator.trace
   *    The ConsoleCommand class has many subclasses
   *    with varying syntax for each instance. Its 
   *    (possibly highlighted) subexpressions need
   *    to be plugged in to whatever shape 
   *    is used by this command. 
   * 
   *    e.g.
   * 
   *    myArray.copy(arg1, arg2, arg3, arg4) 
   *    myArray = $(arrayLabel)
   * 
   * 
   *    This method simply produces the child arguments,
   *    and uses formatTemplateTrace to plug them
   *    into the correct shape.
   */
  trace() {
    if (this.currentlyActive()) return this.activeTrace();

    var childTrace = this.currentIter.trace();
    if (childTrace instanceof UserFunctionTrace) return childTrace;

    // get array of argument strings and then 
    // format using template depending on the 
    // function (different instances of ConsoleCommand 
    // use different syntax)
    var args = [];
    for (var i = 0; i < this.command.numArguments(); i++) {
      if (i == this.currIndex)
        args.push(childTrace);
      else 
        args.push(this.command.argNodes[i].text);
    }

    // function call ConsoleCommands also need to print
    // the function name 
    if (this.astNode.toString() == "buildFunctionCall") {
      args = [this.astNode.functionName].concat(args);
    }
    return this.formatTemplateTrace(args);
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
          this.command.argNodes[this.index],
          // push return value after child command finishes
          (_cmd, ret) => { this.command.args.push(ret); }
        );

        this.currIndex = this.index;
        this.index++;
        resolve();
      });
    }

    // execute body of this ConsoleCommand 
    return this.command.executeSelfPromise()
      .then(commandRet => this.callback(this.command, commandRet));
  }

}

/**
 * 
 *  inherits trace method from ConsoleCommandIterator
 */

class UserFunctionTrace { constructor(traceStr) { this.trace = traceStr; } }

class UserFunctionCommandIterator extends SaveExecutedIterator {
  constructor(astNode, callback) {
    super(astNode, callback);
    this.argIndex = 0;
    this.stIndex = 0;
    this.namespace = new Map(VariableEnvironment.getInstance().variables);

    this.tracingArguments = true;
  }

  /** UserFunctionCommandIterator.activeTrace
   *    just print function definition
   */
  activeTraceFunction() {
    return highlightText(
      "function " + this.command.funcName + "("
      + this.command.argNames.join(", ") + ") {",  // first line
      ...this.command.statements.map(x => x.text), // next n lines
      "}" // final line
    );
  }

  /** UserFunctionCommandIterator.trace
   *    Note: UserFunctionCommand <: ConsoleCommand
   * 
   *    if executing arguments still, just show function and its arguments.
   *    
   * 
   *    otherwise (in function body),
   *    trace through each line/statement 
   *    of this function one at a time
   */
  trace() {
    // in between arguments or in between statements
    if (this.currentlyActive()) {
      // in between arguments
      // if (this.argIndex - 1 < this.command.numArguments()) 
      if (this.tracingArguments)
        return highlightText(this.command.argNodes.map(x => x.text).join(", "));

      // in between body statements 
      return new UserFunctionTrace(this.activeTraceFunction());
    }

    var childTrace = this.currentIter.trace();
    if (childTrace instanceof UserFunctionTrace) return childTrace;

    // otherwise if currently tracing an argument
    if (this.tracingArguments) {
      var args = [];

      // return list of highlighted arguments
      for (var i = 0; i < this.command.numArguments(); i++) {
        // if (i == this.argIndex - 1) args.push(childTrace);
        if (i == this.currArgIndex) args.push(childTrace);
        else args.push(this.command.argNodes[i].text);
      }

      return combineStrings(...joinStrings(args, ","));
    }

    // print function name and arg names
    var lines = ["function " + this.command.funcName + "(" + this.command.argNames.join(", ") + ") {"];

    for (var i = 0; i < this.command.numStatements(); i++) {
      // if (i == this.stIndex - 1)  
      if (i == this.currStIndex)
        lines.push(childTrace);
      else
        lines.push(this.command.statements[i].text);
    }

    // final line
    lines.push("}");

    // wrap in UserFunctionTrace so parents can 
    // know to 'step into' me 
    return new UserFunctionTrace(combineStrings(...breakLines(...lines)));
  }

  preCallback() {
    this.command.precheckArguments();
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

        // get current value for use in closure 
        // (this.argIndex would not capture current/local value)
        var localArgIndex = this.argIndex;

        this.currentIter = getCommandIterator(
          this.command.argNodes[this.argIndex],
          (cmd, ret) => this.namespace.set(this.command.argNames[localArgIndex], ret),
        );

        this.currArgIndex = this.argIndex++;
        resolve();
      })
    }

    if (this.stIndex < this.command.numStatements()) {
      return new Promise(resolve => {
        this.tracingArguments = false;

        // just finished function arguments, haven't started body: 
        // need to set namespace
        if (this.stIndex == 0) {
          this.command.namespace = this.namespace; 
          VariableEnvironment.pushNamespace(this.namespace);
        }

        // is this the last statement in the function body?
        var cb = (_cmd, _ret) => {};
        if (this.stIndex + 1 == this.command.numStatements()) 
          cb = (cmd, ret) => this.callback(cmd, ret);

        // this.currentIter = getCommandIterator(this.command.statements[this.stIndex], cb);
        this.setCommandIterator(this.command.statements[this.stIndex], cb);

        this.currStIndex = this.stIndex++;
        resolve();
      });
    }

    throw "Error advancing function call";
  }


  /** override stepInto and stepOver for special case of function return  */
  stepInto() {
    // if current child branch is untouched or completely finished 
    if (this.currentIter === null || this.currentIter.finishedExecuting) 
      return this.advance();

    // the function statement we're stepping into may
    // include a return statement. this causes the function to 
    // end early by throwing an exception

    // console.log("ci :: " , this.currentIter.constructor.name)
    return this.currentIter.stepInto()
      .catch(e => {
        if (e instanceof FunctionReturn) {
          // end function early
          this.callback(this.currentIter.command, e.value);
          return e.value;
        }

        // some other exception
        throw e;
      })
  }

  stepOver() {
    // the function statement we're stepping over may 
    // return early by throwing an exception
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

    // otherwise behave as usual
    return super.stepOver();
  }
}

class FunctionCallCommandIterator extends CommandIterator {
  constructor(astNode, callback) {
    super(astNode, callback);
    this.gotFunction = false;

    this.tracingFunction = false;
  }

  /** Trace function call astNode -- something 
   *  of the pattern
   * 
   *  xxx(arg1, arg2, ..., argn)
   * 
   *  but xxx must be interpreted first. 
   */
  trace() {
    if (this.currentlyActive()) return this.activeTrace();

    var childTrace = this.currentIter.trace();

    if (childTrace instanceof UserFunctionTrace) 
      return childTrace;

    var calleeStr = "";
    var callStr = "";
    if (! this.tracingFunction) {
      calleeStr = childTrace;
      callStr = this.command.args.map(x => x.text).join(", ");
    }
    else {
      calleeStr = this.astNode.functionName;
      callStr = childTrace;
    }

    return combineStrings(calleeStr, "(", callStr, ")");
  }

  advance() {
    if (! this.gotFunction) {
      return new Promise(resolve => {
        this.currentIter = getCommandIterator(
          this.command.functionNode,
          (_cmd, ret) => this.command.command = createFunctionFromCallee(ret, this.command.args),
        )

        this.gotFunction = true;
        resolve();
      });
    }

    // now we can invoke the actual function 
    return new Promise(resolve => {
            // for tracing
            this.tracingFunction = true;
      resolve(this.currentIter = getCommandIterator(this.command, 
          (cmd, ret) => { 

            this.callback(cmd, ret);
          }),
      );
    });
  }
}

/**
 * NOTE:
 * If 'break' is implemented, it will needed to be handled by these
 * iterator methods 
 */

function whileLoopText(condition, loopSts) {
  return [
      "while (" + condition.text + ") {",
      ...indent(loopSts.map(x => x.text)),
      "}"
  ];
}

class WhileLoopCommandIterator extends SaveExecutedIterator {
  constructor(astNode, callback) {
    super(astNode, callback);

    // condition should be executed first, 
    // and this happens when index is out of bounds
    this.index = this.command.numStatements();

    // extra flag just to keep track of
    // which part is being traced
    this.tracingCond = true;
  }

  // active trace but with newlines
  activeTrace() {
    return highlightText(
      ...whileLoopText(this.command.condition, this.command.loopStatements)
    );
  }

  /** WhileLoopCommandIterator.trace
   */
  trace() {
    // in between conditions or statements
    if (this.currentlyActive()) return this.activeTrace();
    
    var childTrace = this.currentIter.trace();
    if (childTrace instanceof UserFunctionTrace) 
      return childTrace; // return wrapped version so my parents can check it


    var cond = this.command.condition.text;
    if (this.tracingCond) cond = childTrace;

    // first line of while loop
    var lines = [
      combineStrings(joinStrings(["while (", cond, ") {"]))
    ];

    // trace body  
    for (var i = 0; i < this.command.numStatements(); i++) {
      // if (i == this.index - 1) lines.push(childTrace);
      if (! this.tracingCond && i == this.currIndex) lines.push(childTrace);
      else lines.push(this.command.loopStatements[i].text);
    }
    lines.push("}");

    return combineStrings(breakLines(...lines));
  }

  callback() {
    this.command.storedStack = true;
    super.callback();
  }

  advance() {
    if (this.index < this.command.numStatements()) {
      this.tracingCond = false;
      return new Promise(resolve => {

        this.setCommandIterator(
          this.command.loopStatements[this.index].clone(), 
          () => {} // no callback action
        );

        this.currIndex = this.index++;
        resolve();
      });
    }

    this.tracingCond = true;

    // evaluate condition
    return new Promise(resolve => {
      this.setCommandIterator(this.command.condition.clone(),
        // if condition held, do the loop again.
        // otherwise this iterator is finished.
        (cmd, ret) => {
          this.command.pushCmd(cmd);
          if (ret) this.index = 0;
          else this.callback(cmd, ret);
        }
      );
      this.index = 0;
      resolve();
    })

  }
}

// define constants to refer to 
// for loop ( init ; cond ; incr ) sequence
const FOR_INIT = 0;
const FOR_COND = 1;
const FOR_INCR = 2;
const FOR_BODY = 3;

const indentBlock = () => "\u2800\u2800"; // whitespace char for now 
const indent = (xs) => xs.map(x => combineStrings(joinStrings([indentBlock(), x])));

// return array of lines
function forLoopText(inits, cond, incrs, bodySts) {
  var cs = (xs) => xs.map(x => x.text).join(", "); 
  return [
      `for (${cs(inits)}; ${cs([cond])}; ${cs(incrs)}) {`,
      ...indent(bodySts.map(x => x.text)),
      "}"
  ];
} 

class ForLoopCommandIterator extends SaveExecutedIterator {
  constructor(astNode, callback) {
    super(astNode, callback);
    this.stIndex = 0;
    // keeping track of whether
    // executing init/cond/incr statements
    // or body 
    this.sectionIndex = FOR_INIT;
  }
  
  activeTrace() {
    return highlightText(
      ...forLoopText(
        this.command.initStatements, this.command.condition,
        this.command.incrStatements, this.command.loopStatements,
      )
    );
  }

  /** ForLoopCommandIterator.trace 
   */
  trace() {
    if (this.currentlyActive()) return this.activeTrace()

    var childTrace = this.currentIter.trace();
    if (childTrace instanceof UserFunctionTrace) return childTrace;

    var init = [];
    this.command.initStatements.forEach((st, i) => {
      if (this.sectionIndex == FOR_INIT && i == this.currStIndex)
        init.push(childTrace)
      else init.push(st.text);
    }) ;
    init = combineStrings(joinStrings(init, ", "));

    var cond = this.command.condition.text;
    if (this.sectionIndex == FOR_COND) cond = childTrace;

    var incr = [];
    this.command.incrStatements.forEach((st, i) => {
      if (this.sectionIndex == FOR_INCR && i == this.currStIndex)
        incr.push(childTrace)
      else incr.push(st.text);
    });
    incr = combineStrings(joinStrings(incr, ", "));

    var lines = [
      // first line consists of init, condition, incr
      combineStrings(
        joinStrings([
          "for (", 
          combineStrings(joinStrings([init, cond, incr], ";")),
          ") {"
        ])
      )
    ];

    // todo trace body
    var statements = this.command.loopStatements;
    statements.forEach((st, i) => {
      if (this.sectionIndex == FOR_BODY 
         && i == this.currStIndex) lines.push(childTrace);
      else lines.push(st.text);
    });

    lines.push("}");
    return combineStrings(breakLines(...lines));
  }

  callback() {
    this.command.storedStack = true;
    super.callback();
  }

  getStatements(statementType) {
    if (statementType == FOR_INIT) return this.command.initStatements;
    if (statementType == FOR_INCR) return this.command.incrStatements;
    if (statementType == FOR_BODY) return this.command.loopStatements;
    if (statementType == FOR_COND) return [this.command.condition];
  }

  getNextSection(statementType) {
    if (statementType == FOR_INIT) return FOR_COND;
    if (statementType == FOR_COND) return FOR_BODY;
    if (statementType == FOR_BODY) return FOR_INCR;
    if (statementType == FOR_INCR) return FOR_COND;
  }

  advance() {
    // if the current section is finished, go to the next.
    // otherwise continue in the current one
    var statements = this.getStatements(this.sectionIndex);
    // if any section is empty, stIndex may still 
    // be out of bounds for the next section, so loop until 
    // some statements are found 
    // -- but also a for block may be completely empty...
    while (this.stIndex >= statements.length) {
      this.stIndex = 0;
      this.sectionIndex = this.getNextSection(this.sectionIndex);
      statements = this.getStatements(this.sectionIndex);
    }

    return new Promise(resolve => {
      this.setCommandIterator(
        statements[this.stIndex].clone(), 
        (cmd, ret) => {
          if (this.sectionIndex == FOR_COND && ! ret) {
            this.callback(cmd, ret);
          }
        },
      );

      this.currStIndex = this.stIndex++;
      resolve();
    });
  }
}



// helper because if is difficult to write in one line
function ifBlockText(condBlockPairs, finalElse) {
  var ifCond = condBlockPairs[0][0];
  var ifBlock = condBlockPairs[0][1];

  var lines = [
    "if (" + ifCond.text +  ") {", 
    ...indent(ifBlock.map(x => x.text)),
    "}",
  ];

  var cond, block;
  for (var i = 1; i < condBlockPairs.length; i++) { 
    cond = condBlockPairs[i][0];
    block = condBlockPairs[i][1];
    // print else or elif
    var condLine;
    if (i + 1 == condBlockPairs.length && finalElse) 
      condLine = "else {";
    else 
      condLine = "elif (" + cond.text + ") {";

    lines = lines.concat([
      condLine,
      ...indent(block.map(x => x.text)),
      "}",
    ]);
  }
  return lines;
}

class IfBlockCommandIterator extends CommandIterator {
  constructor(astNode, callback) {
    super(astNode, callback);
    this.currentBlock = null;

    // count if/else blocks
    this.blockIndex = 0; 

    // count statements inside a block
    // if condition holds
    this.stIndex = 0;
    this.currBlockIndex = 0;
  }

  activeTrace() {
    return highlightText(
      ...ifBlockText(this.command.condBlockPairs, this.command.finalElse)
      );
  }

  // TODO trace
  trace() {
    // print first block with 'if' and the rest with 'else if'
    if (this.currentlyActive()) return this.activeTrace();

    var childTrace = this.currentIter.trace();
    if (childTrace instanceof UserFunctionTrace) return childTrace;

    var lines = [];
    var condTrace;
    var elword = "if";
    this.command.condBlockPairs.forEach(([cond, block], bi) => {
      if (this.command.finalElse && 
          bi + 1 == this.command.condBlockPairs.length) {
        lines.push("else {");
      }
      else {
        if (bi > 0) 
          elword = "elif";

        condTrace = cond.text;
        
        // current block gets set after tracing condition 
        if (bi == this.currBlockIndex && this.currentBlock == null) 
            condTrace = childTrace;

        lines.push(combineStrings(joinStrings([elword, "(", condTrace, ") {"])));
      }

      // if we have current block, then the condition has already been traced
      block.forEach((st, bsti) => {
        if (bi == this.currBlockIndex && this.currentBlock && bsti == this.currStIndex)
          lines.push(childTrace);
        else lines.push(st.text);
      });

      lines.push("}");
    });

    return combineStrings(breakLines(...lines));
  }

  callback() {
    this.command.storedStack = true;
    super.callback();
  }

  advance() {
    //  if already inside a block
    if (this.currentBlock) {
      if (this.stIndex < this.currentBlock.length) {
        // add final callback to last statement in this if block
        var callback = (cmd, _ret) => {};
        if (this.stIndex + 1 == this.currentBlock.length) 
          callback = (cmd, ret) => this.callback(cmd, ret); 
        
        return new Promise(resolve => {
          this.setCommandIterator(this.currentBlock[this.stIndex].clone(), callback);

          this.currStIndex = this.stIndex++;
          resolve();
        })
      }
      // this case shouldn't happen -- advance doesn't get called
      // after finishedExecuting is set by callback (which is provided
      // to the last command in this block)
      else throw "Error advancing if block";
    }

    // otherwise try each condition until one holds
    if (this.blockIndex < this.command.condBlockPairs.length) {
      return new Promise(resolve => {
        // cbp is a pair (conditionASTNode, Array{ASTNode})
        var cbp = this.command.condBlockPairs[this.blockIndex];
        var cond = cbp[0]; var lines = cbp[1];

        // capture current/local value of blockIndex 
        var localBlockIndex = this.blockIndex; 

        var cb = (cmd, ret) => {
          // if condition held, next call to advance will start executing this block
          // only exception is an empty else-if block. 
          // this will just cause the if block to end. 
          if (ret) { 
            if (lines.length) this.currentBlock = lines;
            else this.callback(cmd, ret); // empty block case 
          }
          else if (localBlockIndex + 1 == this.command.condBlockPairs.length) {
            // final else-if failed
            this.callback(cmd, ret)
          }
        }

        this.setCommandIterator(cond.clone(), cb);

        this.currBlockIndex = this.blockIndex++;
        resolve();
      });
    }

    throw "Error advancing if block";
  }
}
