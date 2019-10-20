
// TODO
// decorator pattern (maybe) to highlight lines
// debugger style 

// if (cond1) {
//
// } else (cond2) {
//  
// } [else (cond n) {} ]
// [else {
//
// }]
//
//
//  for (;;) {
//    s1;
//    s2;
//    s2;
//  }
//
//  after parsing block:
//    put each statement on its own line
//
//    bind statements to line numbers 
//    at compile time
//
//    when blocks execute a line of code,
//    highlight that line
//
//    Loops/blocks could be iterators

const LOOP_MAX = 10000; // stop infinite loops from 
                            // taking up too many resources


class ControlFlowCommand {
  constructor() {
    this.executed = [];
    this.storedStack = false;
    this.steps = 0;
  }

  /** ControlFlowCommand.pushCmd
   *    execute command and push it onto stack for undo
   *    if this is first call to execute
   */
  pushCmd(command) {
    if (! this.storedStack) this.executed.push(command);
  }

  /** ControlFlowCommand.liftAndPush
   *    wrapper to (possibly) save command and then  
   *    execute it 
   */
  liftAndPush(command) {
    return new Promise(resolve => {
      this.pushCmd(command);
      resolve(liftCommand(command));
    });
  }

  executeStatements(statements, cloneCommands) {
    if (cloneCommands == undefined) cloneCommands = true;
    return statements.reduce((prev, cur) => {
      return prev.then(() => {
        // limit number of computations
        if (this.steps++ > LOOP_MAX) throw "Loop too long";

        // clone ast nodes for each new iteration to update references
        var cl;
        if (cloneCommands)
          cl = cur.clone().command;
        else 
          cl = cur.command;

        return this.liftAndPush(cl);
      });
    }, new Promise(resolve => resolve()));
  }

  doBody() {
    return this.executeStatements(this.loopStatements);
  }

  /** ControlFlowCommand.execute
   *    Only clone loop commands the first time through 
   *    (to be clear, each loop iteration gets cloned commands,
   *     but when somebody does undo then redo, the same commands)
   *     are used as in the original)
   */
  execute() {
    if (this.storedStack) {
      // executeStatements takes ast nodes so 
      // give the input the correct structure
      var statements = this.executed.map(cmd => { return { command : cmd } });
      return this.executeStatements(statements, false);
    }

    // otherwise execute as normal
    return this.executeSelf();
  }

  undo() {
    this.executed.slice().reverse().forEach(cmd => cmd.undo());
  }
}

class CodeBlockCommand extends ControlFlowCommand {
  constructor(statements) {
    super();
    this.loopStatements = statements;
  }

  executeSelf() {
    return this.doBody()
      .then(() => { this.storedStack = true } );
  }
}

/** WhileLoopCommand
 *    accepts Condition function and executes
 *    each command in a loop as long as
 *    the condition is satisifed
 *
 *    TODO: stop infinite loops-- limit to 1M steps maybe
 */
class WhileLoopCommand extends ControlFlowCommand {
  constructor(condition, loopStatements) {
    super();
    this.condition = condition;
    this.loopStatements = loopStatements;
  }

  maybeContinue() {
    if (this.condition == null) 
      return new Promise(resolve => resolve());

    return this.liftAndPush(this.condition.clone().command).then(condRet => {
      if (condRet)
        return this.doBody()
          .then(() => this.maybeContinue());
      else
        this.storedStack = true;
    });
  }

  executeSelf() {
    return this.maybeContinue();
  }
}

/** ForLoopCommand
 *  
 *  syntax:
 *  
 *  for ((expr|"");(condition);(expr|"") {
 *    (expr1)
 *    `command1`
 *    (expr2)
 *    `command2`
 *  }
 * 
 *  opNodes get cloned on each successive loop so 
 *  a unique command object gets created (unique state)
 * 
 *  TODO
 *    add to array for undo
 */
class ForLoopCommand extends ControlFlowCommand {
  constructor(initStatements, condition, incrStatements, loopStatements) {
    super();
    this.initStatements = initStatements;
    this.condition = condition;
    this.incrStatements = incrStatements;
    this.loopStatements = loopStatements;
  }

  maybeContinue() {
    if (this.condition == null) 
      return new Promise(resolve => resolve());

    return this.liftAndPush(this.condition.clone().command).then(condRet => {
      if (condRet)
        return this.doBody()
        .then(() => this.doIncr()
        .then(() => this.maybeContinue()));
      else
        this.storedStack = true;
    });
  }

  doInit() {
    return this.executeStatements(this.initStatements);
  }

  doIncr() {
    return this.executeStatements(this.incrStatements);
  }

  executeSelf() {
    return this.doInit().then(() => this.maybeContinue());
  }
}

class IfBlockCommand extends ControlFlowCommand {
  constructor(condBlockPairs) {
    super();
    this.condBlockPairs = condBlockPairs;
  }

  untilFirstTrue() {
    var cond, lines;
    return this.condBlockPairs.reduce((prev, cur) => {
      cond = cur[0];
      lines = cur[1];
      // if previous block evaluated to true, 
      // then subsequent else ifs should fall through
      return prev.then(prevCondRet => {
        // exit after first true condition 
        if (prevCondRet) return;

        return this.liftAndPush(cond.clone().command)
          .then(curCondRet => {
            // if false, don't execute block
            if (! curCondRet) { 
              this.storedStack = true;
              return;
            }
            // return true so subsequent else-blocks don't get eval'd
            return this.executeStatements(lines).then(() => true);
          })
      })
    }, new Promise(resolve => resolve()));
  }

  /** IfBlockCommand.executeSelf
   *    try conditions until one evaluates true, then
   *    execute all the lines in that block and break
   */
  executeSelf() {
    return this.untilFirstTrue();
  }
}

