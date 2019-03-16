class MathCommand extends ConsoleCommand {

  /** MathCommand.executeChildren
   *    default behavior for binary operators
   */
  executeChildren() {
    this.operands = this.argNodes.map(node => node.command.execute());
    this.op1 = this.operands[0];
    this.op2 = this.operands[1];
  }

  checkArguments() {
    if (isNaN(Number(this.op1)) || isNaN(Number(this.op2)))
      throw `Invalid operands for operator '${this.constructor.name}': ${this.op1}, ${this.op2}`;
  }

  undo() {}
}

class AddCommand extends MathCommand {
  checkArguments() {
    if (typeof this.op1 == "number" && typeof this.op2 == "number")
      return super.checkArguments();
    if (this.op1 instanceof Array && this.op2 instanceof Array) return;
    throw "Operands for '+' must be two lists or two numbers";
  }

  /** AddCommand.executeSelf
   *    perform addition or list concatenation
   */
  executeSelf() { 
    if (this.op1 instanceof Array)
      return this.op1.concat(this.op2);
    return this.op1 + this.op2; 
  };
}

class SubCommand extends MathCommand {
  executeSelf() { return this.op1 - this.op2; };
}

class MultCommand extends MathCommand {
  checkArguments() {
    if (typeof this.op1 == "number" && typeof this.op2 == "number")
      return super.checkArguments();
    if (this.op1 instanceof Array && typeof this.op2 == "number") {
      if (isNaN(this.op2) || this.op2 <= 0)
        throw `Cannot perform list extension with operand '${this.op2}'.`;
      else return;
    }
    throw `Invalid operands for '*': '${this.op1}', '${this.op2}'.`;
  }
  executeSelf() { 
    // evaluate expression (opNode) again for each list element
    // so [f()] * x causes f to be evaluated/executed x times
    if (this.op1 instanceof Array) {
      var argNode = this.argNodes[0]; 
      var extended = this.op1.slice();
      for (var i = 1; i < this.op2; i++) 
        extended = extended.concat(argNode.clone().command.execute().slice());
      return extended;
    }
    return this.op1 * this.op2;
  }
}

class DivCommand extends MathCommand {
  checkArguments() {
    super.checkArguments();
    if (this.op2 == 0)
      throw "Divide by zero error";
  }
  executeSelf() { return this.op1 / this.op2; };
}

// extend div for zero check
class ModCommand extends DivCommand {
  executeSelf() { return this.op1 % this.op2; };
}

class ExponentCommand extends MathCommand {
  executeSelf() { return this.op1 ** this.op2; };
}

class UnaryMathCommand extends MathCommand {
  executeChildren() {
    this.op1 = this.argNodes[0].command.execute();
  }
  checkArguments() {
    if (isNaN(Number(this.op1)))
      throw `Invalid operands for operator '${this.opName}': ${this.op1}.`;
  }
}

class NegateNumberCommand extends UnaryMathCommand {
  executeSelf() { return -this.op1; }
}

/** Boolean commands
 */
class ConjunctionCommand extends MathCommand {
  executeChildren() {}
  checkArguments() {}
  executeSelf() { 
    // do short circuiting
    return this.argNodes[0].command.execute() && this.argNodes[1].command.execute();
  }
}

class DisjunctionCommand extends MathCommand {
  executeChildren() {}
  checkArguments() {}
  executeSelf() { 
    // do short circuiting
    return this.argNodes[0].command.execute() || this.argNodes[1].command.execute();
  }
}

class LogicalNotCommand extends UnaryMathCommand {
  executeSelf() { return ! Boolean(this.op1); }
}

class LogicalEqualsCommand extends MathCommand {
  checkArguments() {} 
  executeSelf() { return this.op1 == this.op2; }
}
class LogicalNotEqualsCommand extends MathCommand {
  checkArguments() {} 
  executeSelf() { return this.op1 != this.op2; }
}

class LessThanCommand extends MathCommand {
  executeSelf() { return this.op1 < this.op2; }
}

class LessEqualThanCommand extends MathCommand {
  executeSelf() { return this.op1 <= this.op2; }
}

class GreaterThanCommand extends MathCommand {
  executeSelf() { return this.op1 > this.op2; }
}

class GreaterEqualThanCommand extends MathCommand {
  executeSelf() { return this.op1 >= this.op2; }
}