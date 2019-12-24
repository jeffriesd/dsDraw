class MathCommand extends ConsoleCommand {

  /** MathCommand.executeChildren
   *    default behavior for binary operators
   */
  getChildValues() {
    this.op1 = this.args[0];
    this.op2 = this.args[1];
  }

  checkArguments() {
    if (isNaN(Number(this.op1)) || isNaN(Number(this.op2)))
      throw `Invalid operands for operator '${this.constructor.name}': ${stringify(this.op1)}, ${stringify(this.op2)}`;
  }
}

class AddCommand extends MathCommand {
  checkArguments() {
    if (typeof this.op1 == "number" && typeof this.op2 == "number")
      return super.checkArguments();
    if (typeof this.op1 == "string" && typeof this.op2 == "string") return;
    if (this.op1 instanceof Array && this.op2 instanceof Array) return;
    throw "Operands for '+' must be two lists, two strings, or two numbers";
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
    // just copy values, don't evaluate astnodes again
    // so [f()] * x causes f to be evaluated only once
    if (this.op1 instanceof Array) {
      var original = this.op1.slice();
      var extended = this.op1.slice();
      for (var i = 1; i < this.op2; i++) 
        extended = extended.concat(original);
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

class FloorDivCommand extends MathCommand {
  checkArguments() {
    super.checkArguments();
    if (this.op2 == 0)
      throw "Divide by zero error";
  }
  executeSelf() { return Math.floor(this.op1 / this.op2); };
}


// extend div for zero check
class ModCommand extends DivCommand {
  executeSelf() { return this.op1 % this.op2; };
}

class ExponentCommand extends MathCommand {
  executeSelf() { return this.op1 ** this.op2; };
}

class UnaryMathCommand extends MathCommand {
  getChildValues() {
    this.op1 = this.args[0];
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
  getChildValues() {
  }
  executeChildren() { return new Promise(resolve => resolve()); }
  checkArguments() {}
  executeSelf() { 
    this.precheckArguments();
    var lNode = this.argNodes[0];
    var rNode = this.argNodes[1];
    // do short circuiting
    return liftCommand(lNode.command)
      .then(res => {
        if (! res) return res; // short circuit on falsy
        return liftCommand(rNode.command);
      });
  }
}

class DisjunctionCommand extends MathCommand {
  getChildValues() {}
  executeChildren() { return new Promise(resolve => resolve()); }
  checkArguments() {}
  executeSelf() { 
    this.precheckArguments();
    // do short circuiting
    var lNode = this.argNodes[0];
    var rNode = this.argNodes[1];
    return liftCommand(lNode.command)
      .then(res => {
        if (res) return res; // short circuit on truthy
        return liftCommand(rNode.command);
      });
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