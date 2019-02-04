//  TODO make 'math' a keyword or change $math.op
//  to use different name

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


Array.prototype.peek = function() {
  return this.length ? this[this.length - 1] : null;
};

const precedence = {
  "^": 3,
  "*": 2,
  "/": 2,
  "-": 1,
  "+": 1,
  "=": 0,
};

function higherPrec(op1, op2) {
  return precedence[op1] > precedence[op2];
}

function containsParens(expr) {
  return /[\(\)]/.test(expr);
} 

function isChar(ch) {
  return ch.match(/^[a-zA-Z]$/);
}

function isOperator(ch) {
  return ch.match(/^[\*\/\+\-\^=]$/);
}

function isEquals(ch) {
  return ch.match(/^=$/);
}

function isNum(ch) {
  return ch.match(/^\d+$/);
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

function isComma(ch) {
  return ch.match(/^,$/);
}

function parenBalanced(expr) {
  var parenCount = 0;
  expr.split("").forEach(ch => {
    if (parenCount < 0) return false;
    if (isLeftParen(ch)) parenCount++;
    if (isRightParen(ch)) parenCount--;
  });
  return parenCount == 0;
}

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

  expr.forEach(ch => {
    if (isChar(ch)) 
      charBuffer.push(ch);
    if (isNum(ch))
      numBuffer.push(ch);

    if (isOperator(ch) || isParen(ch)) {
      flushBuffers();
      tokens.push(ch);
    }
    if (isComma(ch))
      flushBuffers();

  });
  return tokens;
}

function polish(tokens) {
  var operators = [];
  var output = [];

  tokens.forEach(t => { 
    if (isOperator(t)) {
      while (higherPrec(operators.peek(), t)) // while op on top has higher prec
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

function convertBinOp(operator, operand1, operand2) {
  switch (operator) {
    case "*": return `$math.mult(${operand1}, ${operand2})`;
    case "/": return `$math.div(${operand1}, ${operand2})`;
    case "+": return `$math.add(${operand1}, ${operand2})`;
    case "-": return `$math.sub(${operand1}, ${operand2})`;
    case "^": return `$math.exp(${operand1}, ${operand2})`;
  }
}

function binOpsToFunctions(tokens) {
  if (tokens.length == 1) return tokens.pop();
  var polished = polish(tokens);
  var operands = [];
  var output = "";
  polished.forEach(op => {
    if (isOperator(op)) {
      var operand1 = operands.pop();
      var operand2 = operands.pop();
      operands.push(convertBinOp(op, operand1, operand2));
    }
    else 
      operands.push(op);
  });
  if (operands[0] == undefined) throw `Error evaluating '${tokens.join(" ")}'`;
  return operands.pop();
}

var objects = {
  "$asdf.child(4).value()": 5,
  "$jkl.length()": 2,
  "$arr.length(4, 3)": 99,
}


/** evaluateMethods
 *    all method calls take the form
 *    $obj.method((expr), (expr), ...)
 *
 *    - match function calls using regex:
 *      /\$[a-zA-Z]+(\.[a-zA-Z]+\([0-9,\s]*\))+/g;
 *      regex breakdown:
 *      object name:
 *      \$[a-zA-Z]+ = starts with $ and followed by 1 or more alphabetic chars 
 *
 *      methods and arguments:
 *      (\.[a-zA-Z]+\([0-9,\s]*\))+
 *      (\.[a-zA-Z]\( ... \))+ = one or more chained method calls with arguments enclosed in parens
 *
 *      method arguments:
 *      [\$\w\.\(\)\*\+\-\/\^,\s]* = expressions, commas, spaces
 *      
 *
 *      note: method calls may contain other method calls as arguments e.g.
 *      $arr.child($arr.length - 1),
 *      so arguments themselves must be parsed as expressions
 */
function evaluateMethods(expr) {
  console.log("raw expr =", expr);
  // var methodPattern = /\$[a-zA-Z]+[^\s]+/g;
  var methodPattern = /\$[a-zA-Z]+(\.[a-zA-Z]+\([\w,\s]*\))+/g;
  var matches = expr.match(methodPattern);
  if (matches == null) return expr;
  console.log("matches = ", matches);
  matches.forEach(m => {
    expr = expr.replace(m, objects[m]);
  });
  console.log("ev = ", expr);
  return expr;
}

function parDepths(chars) {
  var depths = [];
  var d = 0;
  chars.forEach(ch => {
    if (isLeftParen(ch)) d++;
    if (isRightParen(ch)) d--;
    depths.push(d);
  });
  return depths;
}

/** splitArgs
 *    for expr '1, 2, $c.call(1, (3+ 4)), 5',
 *    return [1, 2, $c.call(1, (3+4)), 5]
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

function splitArgs(expr) {
  return splitExpression(expr, isComma);
}

function splitOperands(expr) {
  return splitExpression(expr, isOperator, true);
}

function getFuncArgs(funcExpr) {
  // find first occurrence of $,
  // find its opening paren
  var methodPattern = /\$[a-zA-Z]+\.[a-zA-Z]+/;
  var match = funcExpr.match(methodPattern);
  if (match == null) throw `Malformed expression: '${funcExpr}'`;
  var funcName = match[0];
  var leftParIdx = match.index + funcName.length;

  // find matching right par
  var parDepth = 0;
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
    func: funcName, 
    args: splitArgs(funcExpr.substring(leftParIdx + 1, rightParIdx)),
  };
}

function decomposeFunction(funcExpr) {
  
}

class TreeNode {
  constructor(value) {
    this.value = value;
    this.result = value;
    this.children = [];
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
 *    - take function e.g. '$f($a(5), (2 + 5), 3)'
 *      and split it into its name and its arguments
 *      -> func = $f; args = [$a(5), (2 + 5), 3]
 *
 *    - create a new node for top-level function and
 *      recursively build children
 *
 *    - arguments may themselves be expressions containing 
 *      function calls, so replace each binary operator with
 *      function to simplify tree building
 */
function buildTree(expr) {
  if (expr == "") return null;
  if (! expr.includes("$")) 
    return new TreeNode(expr);
  else {
    // replace binary ops with functions 
    expr = binOpsToFunctions(splitOperands(expr));  

    var fargs = getFuncArgs(expr);
    var args = fargs.args;

    // create new node for this function call
    var func = new TreeNode(fargs.func);

    args.forEach(argExpr => {
      var newChild = buildTree(argExpr);
      if (newChild) // may be null e.g. $f()
        func.addChild(newChild);
    });
  }
  return func;
}

function getFunction(funcName) {
  return function(...args) {
    if (args.length == 0) return 1;
    if (args.length == 1) return args[0];
    if (args.length >= 2) return args[0] + args[1];
  };
}

function evaluateTree(root) {
  if (root == null) return;
  var operands = [];
  root.children.forEach(node => {
    evaluateTree(node);
  });
  console.log("applying", root.value, "to ", root.children.map(n => n.result));
  var operands = root.children.map(node => node.value);
  // apply function
  if (root.value.startsWith("$"))
    root.result = getFunction(root.value).apply(null, operands);
}

/** evaluateExpression
 *    - check for balanced parentheses
 *    - build function call tree
 *    - evaluate nodes in postorder
 */
function evaluateExpression(expr) {
  if (! parenBalanced(expr))
    throw `Unbalanced parentheses in expression '${expr}'.`;
  var p = polish(tokenize(evaluateMethods(expr)));
  return p;
}

// var expr = "x = 3 *    $asdf.child(4 - ($arr.length(4) ^ 1), 3).value() - $arr2.length()";
// var expr = "x = 3 *    $asdf.child((4 - 1), 3).value() - $arr2.length()";
// // var expr = "x = 3 * 4 + (5 - (8 * 2))";
// console.log("polish = ", evaluateExpression(expr));

var expr = "$a.call(1, $c.call($b.call($a.call() + 3 * 4), 2), (2 * 4 + 1), 3) + 3";
var expr = "$a.call() + (2 * 4 + 1)  + 3";
var tree = buildTree(expr);
tree.preorder();

evaluateTree(tree);
console.log(tree.result);

// var fargs = getFuncArgs("$a.call($b.call()+ 5 * $c.call(3, 4))");
// var args = "$b.call($a.call(), 3)";
// console.log("args = ", args);
// var spl = splitOperands(args);
// console.log(binOpsToFunctions(spl));
//
//

