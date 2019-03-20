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

/** WhileLoopCommand
 *    accepts Condition function and executes
 *    each command in a loop as long as
 *    the condition is satisifed
 *
 *    TODO: stop infinite loops-- limit to 1M steps maybe
 */
class WhileLoopCommand {
  constructor(condition, loopStatements) {
    this.condition = condition;
    this.loopStatements = loopStatements;
    this.steps = 0;
  }

  execute() {
    while (this.condition.command.execute()) {
      this.loopStatements.forEach(s => s.command.execute());
      if (this.steps++ > LOOP_MAX) {
        alert("Loop is taking too long");
        break;
      }
    }
  }

  step() {
    // this.statements.next().execute();
  }

  undo() {

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
class ForLoopCommand {
  constructor(initStatements, condition, incrStatements, loopStatements) {
    this.initStatements = initStatements;
    this.condition = condition;
    this.incrStatements = incrStatements;
    this.loopStatements = loopStatements;
    this.steps = 0;
    this.executed = [];
    // flag to ensure command stack is only created once
    this.storedStack = false; 
  }

  execPush(command) {
    if (! this.storedStack) this.executed.push(command);
    return command.execute();
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

  undo() {
    this.executed.slice().reverse().forEach(cmd => cmd.undo());
  }

}

