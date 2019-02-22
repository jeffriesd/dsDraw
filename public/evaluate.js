//  TODO add boolean operators
//  to use different name
//
//  TODO check if arithmetic arguments are booleans
//

/** Possible tokens:
 *    - number (3, 0.5, -5)
 *    - variable name (x, arr123, ...
 *    - method/property name
 *    - parens
 *    - operator (=, +, -, *, /, ^, ...
 *
 *    tricky cases:
 *    4 + -3 vs. 4 -3
 *    
 */

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
    if (this.op1 instanceof Array) {
      var extended = this.op1.slice();
      for (var i = 1; i < this.op2; i++)
        extended = extended.concat(this.op1.slice());
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

class ConjunctionCommand extends MathCommand {
  executeSelf() { return Boolean(this.op1 && this.op2); }
}

class DisjunctionCommand extends MathCommand {
  executeSelf() { return Boolean(this.op1 || this.op2); }
}

class LogicalNotCommand extends UnaryMathCommand {
  executeSelf() { return ! Boolean(this.op1); }
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

const precedence = {
  "UNARY-": 4,
  "^": 3,
  "*": 2,
  "/": 2,
  "-": 1,
  "+": 1,
  "=": 0,
};

function containsParens(expr) {
  return /[\(\)]/.test(expr);
} 

function isChar(ch) {
  return ch.match(/^[a-zA-Z]$/);
}

function isOperator(ch) {
  return ch.match(/^(UNARY|)[\*\/\+\-\^=]$/);
}

function isEquals(ch) {
  return ch.match(/^=$/);
}

function isNum(ch) {
  return ch.match(/^(\d|\.)$/);
}

function isLeftParen(ch) {
  return ch == "(";
}

function isRightParen(ch) {
  return ch == ")";
}

function isParen(ch) {
  return isLeftParen(ch) || isRightParen(ch);
}

function isLeftSqBracket(ch) {
  return ch == "[";
}

function isRightSqBracket(ch) {
  return ch == "]";
}

function isComma(ch) {
  return ch.match(/^,$/);
}

/** parenBalanced
 *    check for balanced parentheses
 */
function parenBalanced(expr) {
  var parenCount = 0;
  var pars = [];
  expr.split("").forEach(ch => {
    if (parenCount < 0) return false;
    if (isLeftParen(ch) || isLeftSqBracket(ch)) parenCount++;
    if (isRightParen(ch) || isRightSqBracket(ch)) parenCount--;
    if (isLeftSqBracket(ch)) pars.push(ch);
    if (isLeftParen(ch)) pars.push(ch);
    if (isRightSqBracket(ch) && ! isLeftSqBracket(pars.pop())) return false;
    if (isRightParen(ch) && ! isLeftParen(pars.pop())) return false;
  });
  return parenCount == 0;
}

/** tokenize
 *    return array of tokens from string expr
 *
 *    use a special prefix to indicate whether
 *    token is unary operator
 */
function tokenize(expr) {
  numBuffer = [];
  charBuffer = [];
  tokens = [];

  function flushBuffers() {
    if (numBuffer.length) {
      tokens.push(numBuffer.join(""));
      numBuffer = [];
    }
    if (charBuffer.length) {
      tokens.push(charBuffer.join(""));
      charBuffer = [];
    }
  }

  expr = expr.replace(/\s+/g, "").split("");

  var lastCh = "";
  var prefix;
  expr.forEach(ch => {
    if (isChar(ch)) 
      charBuffer.push(ch);
    if (isNum(ch))
      numBuffer.push(ch);
    if (isOperator(ch) || isParen(ch)) {
      if ((lastCh == "" || isOperator(lastCh) || isComma(lastCh))
        && isOperator(ch))
        ch = "UNARY" + ch;
      flushBuffers();
      tokens.push(ch);
    }
    if (isComma(ch))
      flushBuffers();
    lastCh = ch;
  });

  flushBuffers();

  return tokens;
}

/** polish
 *    convert array of tokens into reverse 
 *    polish notation for evaluation
 */
function polish(tokens) {
  var operators = [];
  var output = [];

  tokens.forEach(t => { 
    if (isOperator(t)) {
      while (precedence[operators.peek()] >= precedence[t]) 
        output.push(operators.pop());
      operators.push(t);
    }
    else if (isRightParen(t)) {
      while (! isLeftParen(operators.peek()))
        output.push(operators.pop());
      operators.pop(); // discard left paren
    }
    else if (isLeftParen(t))
      operators.push(t);
    else 
      output.push(t);
  });

  // push remaining ops
  return output.concat(operators.reverse());
}

/** convertBinOp
 *    convert binary operators to function calls
 *    using obj.method() syntax
 */
function convertBinOp(operator, operand1, operand2) {
  switch (operator) {
    case "*": return `mult(${operand1}, ${operand2})`;
    case "/": return `div(${operand1}, ${operand2})`;
    case "+": return `add(${operand1}, ${operand2})`;
    case "-": return `sub(${operand1}, ${operand2})`;
    case "UNARY-": return `negateNum(${operand1})`; 
    case "^": return `exp(${operand1}, ${operand2})`;
    case "=": return `assign("${operand1}", ${operand2})`;
  }
}

/** infixMathEval
 *    evaluates infix math expression
 */
function infixMathEval(operator, operand1, operand2) {
  operand1 = Number(operand1);
  operand2 = Number(operand2);
  switch (operator) {
    case "*": return operand1 * operand2;
    case "/": return operand1 / operand2;
    case "+": return operand1 + operand2;
    case "-": return operand1 - operand2;
    case "UNARY-": return -operand1;
    case "^": return operand1 ** operand2;
  }
}

/** evaluateTokens 
 *    convert array of tokens (function calls, 
 *    operators, numbers (created from splitOperands))
 *    into all function calls
 *
 *    operators are passed in reverse order because
 *    of reverse polish notation algorithm
 */
function evaluateTokens(tokens, evaluator) {
  console.log("toks = ", tokens);
  if (tokens.length == 1) return tokens.pop();
  var polished = polish(tokens);
  var operands = [];
  var output = "";
  var result;
  console.log("polish = ", polished);
  polished.forEach(op => {
    if (isOperator(op)) {
      var operand1 = operands.pop();
      if (op.startsWith("UNARY")) { 
        result = evaluator(op, operand1);
        console.log("applying", op, "to", operand1);
      }
      else {
        var operand2 = operands.pop();
        result = evaluator(op, operand2, operand1);
      }
    }
    else 
      result = op;
    if (result == null) throw `Error evaluating expression '${tokens}' on operator '${op}'.`;
    operands.push(result);
  });
  if (operands[0] == undefined) throw `Error evaluating '${tokens.join(" ")}'`;
  return operands.pop();
}

/** parDepths
 *    return an array of parenthetical 'depths'
 *    given a (balanced) parenthesized expression
 *    e.g. 
 *     0000000111111111111111210 
 *    'a.call(1, 2 * f.call())'
 */
function parDepths(chars) {
  var depths = [];
  var d = 0;
  chars.forEach(ch => {
    if (isLeftParen(ch) || isLeftSqBracket(ch)) d++;
    if (isRightParen(ch) || isRightSqBracket(ch)) d--;
    depths.push(d);
  });
  return depths;
}

/** splitExpression
 *    split an expression into an array of whitespace-trimmed
 *    components using some delimiter(s)
 *
 *    delimFunction is a boolean function which recognizes
 *    delimiting characters
 *
 *    includeDelim, when set true, includes each delimiter in the
 *    resulting array
 */
function splitExpression(expr, delimFunction, includeDelim=false) {
  var args = [];
  var chars = expr.split("");
  var depths = parDepths(chars);
  var left = 0; // sliding window
  chars.forEach((ch, idx) => {
    if (delimFunction(ch) && depths[idx] == 0) {
      args.push(expr.substring(left, idx).trim());
      if (includeDelim) args.push(ch);
      left = idx + 1;
    }
  });
  args.push(expr.substring(left).trim());
  return args;
}

/** splitArgs
 *    split expression on and exclude commas
 */
function splitArgs(expr) {
  return splitExpression(expr, isComma);
}

/** splitOperands
 *    split expression into operators and operands
 */
function splitOperands(expr) {
  return splitExpression(expr, isOperator, true);
}

/** getFuncArgs
 *    converts function or method call (string) to object
 *    containing function name (including '()') and array of arguments
 *    e.g.
 *
 *    getFuncArgs("arr1.swap(0, arr1.length() - 1)")
 *    returns
 *    
 *    func: "arr1.swap()"
 *    args: ["0", "arr1.length() - 1"]
 *
 *    '()' is included to differentiate functions from
 *    string literals in evaluation of tree
 *
 *    note: methodPattern and functionPattern match opening paren
 */
function getFuncArgs(funcExpr) {
  var match = funcExpr.match(methodPattern);
  if (match == null) match = funcExpr.match(functionPattern);
  if (match == null) throw `Malformed expression: '${funcExpr}'`;
  var funcName = match[0];
  var leftParIdx = match.index + funcName.length;

  // find matching right par
  var parDepth = 1;
  var rightParIdx = -1;
  var ch = "";
  for (var idx = leftParIdx; idx < funcExpr.length; idx++) {
    ch = funcExpr[idx];
    if (isLeftParen(ch)) parDepth++;
    if (isRightParen(ch)) parDepth--;
    if (parDepth == 0) {
      rightParIdx = idx;
      break;
    }
  }
  return {
    func: funcName + ")",
    args: splitArgs(funcExpr.substring(leftParIdx, rightParIdx)),
  };
}

class TreeNode {
  constructor(value) {
    this.value = value;
    this.result = value;
    this.children = [];
  }

  get receiver() {
    if (this.value.match(methodPattern))
      return this.value.split(".")[0];
    throw `Can't get receiver of non-method '${this.value}'.`;
  }

  get methodName() {
    if (this.value.match(methodPattern))
      return this.value.split(".")[1];
    throw `Can't get method name of non-method '${this.value}'.`;
  }

  get functionName() {
    if (this.value.match(functionPattern))
      return this.value;
    throw `Can't get function name of non-function '${this.value}'.`;
  }
  
  addChild(value) {
    this.children.push(value);
  }

  preorder(indent="") {
    console.log(indent + this.value);
    this.children.forEach(node => {
      if (node)
        node.preorder(indent + "  ");
    });
  }
}

/** buildTree
 *    - take function expression e.g. 
 *      'f.call(a(5), (2 + 5), 3)'
 *      and split it into its name and its arguments
 *      => func = f.call; args = [a(5), (2 + 5), 3]
 *
 *    - create a new node for top-level function and
 *      recursively build children
 *
 *    - pure math expressions get evaluated immediately,
 *      while string literals (alphanumeric) simply evaluate
 *      to themselves
 *
 *    - arguments may themselves be expressions containing 
 *      function calls, so replace each binary operator with
 *      function call to simplify tree building
 *      e.g. 
 *      f.call(1, 2) + b.call(5) + 6 
 *      => math.add(6, math.add(b.call(5), f.call(1, 2)))
 */
function buildTree(expr) {
  if (! parenBalanced(expr)) throw `Unbalanced parens in expression: '${expr}'.`;
  if (expr == "") return null;
  if (! (expr.match(functionPattern) || expr.match(methodPattern) || expr.match(assignmentPattern))) {
    if (! (expr.match(variablePattern) || expr.match(stringLiteralPattern))) {
      if (expr.match(mathCharsPattern))
        expr = String(evaluateMath(expr));
      else
        throw `Invalid literal expression: '${expr}'.`;
    }
    // return string or number literal
    return new TreeNode(expr);
  }

  // replace binary ops with functions 
  expr = evaluateTokens(splitOperands(expr), convertBinOp);

  var fargs = getFuncArgs(expr);
  var args = fargs.args;
  console.log("func:", fargs.func, ", args:", args);

  // create new node for this function call
  var funcTree = new TreeNode(fargs.func);

  // parse each argument and create new node
  // (unless result is null, in which case
  // children = [] (0 arg function))
  args.forEach(argExpr => {
    var newChild = buildTree(argExpr);
    if (newChild) // may be null e.g. f()
      funcTree.addChild(newChild);
  });
  
  return funcTree;
}

/** evaluateMath
 *    evaluate math expression (no function calls) 
 *    by first converting to reverse polish
 */
function evaluateMath(mathExpr) {
  return evaluateTokens(tokenize(mathExpr), infixMathEval);
}

/** evaluateTree
 *    evaluate function tree in postorder traversal
 *    and push commands onto undo stack as they are evaluated
 */
function evaluateTree(root, undoStack) {
  if (root == null) return;
  var operands = [];
  root.children.forEach(node => {
    evaluateTree(node, undoStack);
  });

  var operands = root.children.map(node => node.result);
  // apply method i.e. arr.swap, args=[3, 5]
  if (root.value.match(methodPattern)) {
    if (root.command == undefined) 
      root.command = createMethodCommand(root.receiver, root.methodName, operands);
    root.result = root.command.execute();
  }
  else if (root.value.match(functionPattern)) {
    if (root.command == undefined)
      root.command = createFunctionCommand(root.functionName, operands)
    root.result = root.command.execute();
  } 
  else if (root.value.match(variablePattern)) {
    //TODO figure out how to treat varnames vs string literals
    if (root.command == undefined)
      root.command = new GetVariableCommand(root.value);
    root.result = root.command.execute();
  }
  else if (root.value.match(stringLiteralPattern))
    root.result = root.value;
  else if (root.value.match(numberPattern))
    root.result = root.value;
  else 
    root.result = root.value;//TODO remove this
    //throw `Error evaluating function '${root.value}'.`;

  if (root.command)
    undoStack.push(root.command)
}

class CommandExpression {
  constructor(cState, expression) {
    this.cState = cState;
    this.expression = expression;

    this.functionTree = buildTree(expression);
    console.log("function tree:");
    this.functionTree.preorder();

    // maintain reverse post order for undoing
    // commands in reverse order of normal evaluation
    this.undoStack = [];
  }

  execute() {
    if (this.functionTree == null) return;
    this.undoStack = [];
    evaluateTree(this.functionTree, this.undoStack);
    this.undoStack = this.undoStack.reverse();
    return this.functionTree.result;
  }

  undo() {
    this.undoStack.forEach(cmdObj => {
      cmdObj.undo();
    });
  }

}

// var expr = "x = 3 *    asdf.child(4 - ($arr.length(4) ^ 1), 3).value() - $arr2.length()";
// var expr = "x = 3 *    $asdf.child((4 - 1), 3).value() - $arr2.length()";
// // var expr = "x = 3 * 4 + (5 - (8 * 2))";
// console.log("polish = ", evaluateExpression(expr));
//
//

// var expr = "$a.call(1, $c.call($b.call($a.call() + 3 * 4), 2), (2 * 4 + 1), 3) + 3";
// var expr = "$a.call() + (2 * 4 + 1)  + 3";
// var expr = "3 * 4 + 4 * 4 + (9 / 2 * 3 ^ 1 )";
// var expr = "arr[1,2].call([1, 2, 3], 4) + 3";
// var tree = buildTree(expr);
// console.log("\n\n");
// tree.preorder();
