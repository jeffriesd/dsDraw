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

const LOOP_MAX = 1000000; // stop infinite loops from 
                            // taking up too many resources


class ControlFlowCommand {
  constructor() {
    this.executed = [];
    this.storedStack = false;
    this.steps = 0;
  }
  /** ControlFlowCommand.execPush
   *    execute command and push it onto stack for undo
   *    if this is first call to execute
   */
  execPush(command) {
    if (! this.storedStack) this.executed.push(command);
    return command.execute();
  }

  undo() {
    this.executed.slice().reverse().forEach(cmd => cmd.undo());
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

  execute() {
    while (this.condition.command.execute()) {
      this.loopStatements.forEach(s => this.execPush(s.command));
      if (this.steps++ > LOOP_MAX) {
        alert("Loop is taking too long");
        break;
      }
    }
    this.storedStack = true;
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

  execute() {
    this.initStatements.forEach(s => this.execPush(s.command));
    while (this.condition == null || this.execPush(this.condition.command)) {
      this.loopStatements.forEach(s => { 
        this.execPush(s.clone().command);
      });
      this.incrStatements.forEach(s => this.execPush(s.command));
      if (this.steps++ > LOOP_MAX) {
        alert("Loop is taking too long");
        break;
      }
    }
    this.storedStack = true;
  }
}

class IfBlockCommand extends ControlFlowCommand {
  constructor(condBlockPairs) {
    super();
    this.condBlockPairs = condBlockPairs;
  }

  /** IfBlockCommand.execute
   *    try conditions until one evaluates true, then
   *    execute all the lines in that block and break
   */
  execute() {
    var cond, lines;
    for (var i = 0; i < this.condBlockPairs.length; i++) {
      cond = this.condBlockPairs[i][0];
      lines = this.condBlockPairs[i][1];
      if (this.execPush(cond.command)) {
        lines.forEach(line => this.execPush(line.command));
        break;
      }
    }
    this.storedStack = true;
  }
}

