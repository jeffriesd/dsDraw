// Generated automatically by nearley, version 2.16.0
// http://github.com/Hardmath123/nearley
(function () {
function id(x) { return x[0]; }


/** About the grammar
 *    math expressions involve the following operators:
 *      +: numeric addition, concatenate strings, concatenate lists
 *      -: unary numeric negation or numeric subtraction
 *      *: numeric mult or list build e.g. '[0] * 4'
 *      /: numeric (float and int (javascript / )) division
 *      ^: numeric exponentiation
 *
 *      math expressions reduce to the following single 'terms':
 *        number, list, string, callable, varName
 *
 *      math expressions are a strict subset of bool expressions
 *
 *    bool expressions are a superset of math expressions 
 *    (5 || 0 makes sense; True * False does not). bool
 *    expressions involve the following operators:
 *      ||: logical incluisve or
 *      &&: logical and
 *      !: logical not
 *
 *    bool expressions reduce to the following single 'terms':
 *      math expression terms + true, false, or parenthesized 
 *      boolean expressions
 *
 *    expressions (most generic) are simply the union of bool expressions
 *    and dictionary terms. dictionary terms have no applicable
 *    operators, so they get their own classification
 */

  const lexer = moo.compile({
    " ": " ",
    "\t": "\t",
    "-": "-",
    "+": "+",
    "*": "*",
    "/": "/",
    "^": "^",
    DOT: ".",
    LESSEQ: "<=",
    GREATEQ: ">=",
    EQEQ: "==",
    NOTEQ: "!=",
    TRUE: "true",
    FALSE: "false",
    OR: "||",
    AND: "&&",
    NOT: "!",
    ">": ">",
    "<": "<",
    ",": ",",
    "(": "(",
    ")": ")",
    "=": "=",
    "{": "{",
    "}": "}",
    "[": "[",
    "]": "]",
    ";": ";",
    QUOTE: "\"",
    FOR: "for",
    WHILE: "while",
    number: /-?(?:[0-9]|[0-9][0-9]+)(?:\.[0-9]+)?(?:[eE][-+]?[0-9]+)?\b/,
    varName: /[a-zA-Z][a-zA-Z0-9]*/,
    character: /[^\n"]/, 
  });



/** Postprocessors build a tree of function/operator calls
 *  where each node is an object with the following properties:
 *
 *  isLiteral: this subtree is composed entirely of literal (string/number) nodes
 *  opNodes: references to child nodes
 *  command: command object that calculates the desired result by calling 
 *           child node commands and combining these with the operator or function
 *
 *  About Command object nodes and evaluation:
 *    semantic checks for errors in expressions like ("cat" + 3)
 *    occur when the function is evaluated (i.e. when node.command.execute() is called), 
 *    not when the tree is built. 
 *    This is because the types of some operands may not be known at compiile time 
 *    (i.e. variable and function calls)
 */


/** cloneOperands
 *    helper method to clone an array of operands
 */
function cloneOperands(operands) {
  return operands.map(x => {
    if (x == null) return null;
    if (x.clone) return x.clone();
    return x;
  });
}

/** buildAddSub 
 *    create addition or subtraction node
 *
 *    pattern:
 *    sum -> sum _ ("+"|"-") _ product 
 */
function buildAddSub(operands) {
  var operator = operands[2];
  if (operator == "+")
    return buildAdd(operands[0], operands[4]);
  return buildSub(operands[0], operands[4]);
}

/** buildAdd 
 *    valid operator only for two string/number results
 */
function buildAdd(opNode1, opNode2) {
  return {
    isLiteral: opNode1.isLiteral && opNode2.isLiteral,
    opNodes: [opNode1, opNode2],
    command: new AddCommand(opNode1, opNode2),
    clone: function() {
      return buildAdd(opNode1.clone(), opNode2.clone());
    }
  };
}

function buildSub(opNode1, opNode2) {
  return {
    isLiteral: opNode1.isLiteral && opNode2.isLiteral,
    opNodes: [opNode1, opNode2],
    command: new SubCommand(opNode1, opNode2),
    clone: function() {
      return buildSub(opNode1.clone(), opNode2.clone());
    }
  };
}


/** buildMultDiv
 *    create multiplication or division node
 *
 *    pattern:
 *    product -> product _ ("*"|"/") _ exp
 */
function buildMultDiv(operands) {
  var operator = operands[2];
  if (operator == "*")
    return buildMult(operands[0], operands[4]);
  return buildDiv(operands[0], operands[4]);
}


/** buildMult 
 *    valid operator only for two string/number results
 */
function buildMult(opNode1, opNode2) {
  return {
    isLiteral: opNode1.isLiteral && opNode2.isLiteral,
    opNodes: [opNode1, opNode2],
    command: new MultCommand(opNode1, opNode2),
    clone: function() {
      return buildMult(opNode1.clone(), opNode2.clone());
    }
  };
}

/** buildDiv 
 *    valid operator only for two number results
 */
function buildDiv(opNode1, opNode2) {
  return {
    isLiteral: opNode1.isLiteral && opNode2.isLiteral,
    opNodes: [opNode1, opNode2],
    command: new DivCommand(opNode1, opNode2),
    clone: function() {
      return buildDiv(opNode1.clone(), opNode2.clone());
    }
  };
}

/** buildExp
 *    create exponentiation node (right associative)
 *
 *    pattern:
 *    exp -> unaryNeg _ "^" _ exp  
 */
function buildExp(operands) {
  var opNode1 = operands[0];
  var opNode2 = operands[4];
  return {
    isLiteral: opNode1.isLiteral && opNode2.isLiteral,
    opNodes: [opNode1, opNode2],
    command: new ExponentCommand(opNode1, opNode2),
    clone: function() {
      return buildExp(cloneOperands(operands));
    }
  };
}

/** buildNegate
 *    create unary negation node 
 *
 *    pattern:
 *    Negate -> "-" factor | factor
 */
function buildNegate(operands) {
  var opNode = operands[1];
  return {
    isLiteral: opNode.isLiteral,
    opNodes: [opNode],
    command: new NegateNumberCommand(opNode),
    clone: function() {
      return buildExp(cloneOperands(operands));
    }
  };
}


/** buildFunctionCall 
 *    build command node using 
 *    factory method for function Command
 *    objects
 *
 *    isLiteral false by definition
 *
 *  pattern:
 *    function -> expr "(" _ args _ ")" 
 *              | expr "(" ")"      
 *   
 */
function buildFunctionCall(operands) {
  var functionNode = operands[0];
  var functionArgs = []; // default (no args function)
  if (operands.length == 6) 
    functionArgs = operands[3];
  
  // used to check if assignment should set label of 
  // constructed object
  var constructed = functionNode.text in constructors;

  return {
    isLiteral: false,
    opNodes: functionArgs,
    constructed: constructed,
    command: createFunctionCommand(functionNode, functionArgs),
    clone: function() {
      return buildFunctionCall(cloneOperands(operands));
    }
  };
}

/** buildFunctionArguments
 *    returns an array of nodes for use
 *    in building function Command node
 *
 *    pattern: 
 *      args -> funcarg (_ "," _ funcarg):* 
 *      funcarg -> expr 
 */
function buildFunctionArguments(operands) {
  var argNodes = [operands[0]];
  for (var idx in operands[1]) 
    argNodes.push(operands[1][idx][3]);
  return argNodes;
}

/** buildMethodCall 
 *    build command node using 
 *    factory method for method Command
 *    objects
 *
 *    isLiteral false by definition
 *
 *  pattern:
 *    method -> %methodName "(" _ args _ ")" 
 *            | %methodName "(" ")"      
 */
function buildMethodCall(operands) {
  var methodName = operands[0].text;
  var methodArgs = []; // default (no args method)
  if (operands.length == 6) 
    methodArgs = operands[3];

  return {
    isLiteral: false,
    opNodes: methodArgs,
    command: createMethodCommand(methodName, methodArgs),
    clone: function() {
      return buildMethodCall(cloneOperands(operands));
    }
  };
}

function wrapNumber(operands) {
  return {
    isLiteral: true,
    opNodes: [],
    command: { 
      execute: function() { return Number(operands[0]); },
      undo: function() {},
    },
    clone: function() {
      return Number(operands[0]);
    }
  }
}

/** wrapString
 *  
 *  pattern:
 *    "\"" [.]:* "\""
 */
function wrapString(operands) {
  return {
    isLiteral: true,
    opNodes: [],
    command: {
      execute: function() { 
        return operands[1].join("");
      },
      undo: function() {},
    },
    clone: function() {
      return operands[1].join("");
    }
  };
}

/** wrapBool
 *    create boolean evaluation node
 *    pattern: %TRUE | %FALSE
 */
function wrapBool(operands) {
  return {
    isLiteral: true,
    opNodes: [],
    command: {
      execute: function() { return operands[0] == "true"; },
      undo: function() {},
    },
    clone: function() {
      return operands[0] == "true";
    }
  };
}

/** buildVariable
 *    create getVariable node
 *
 *    pattern:
 *      varName -> %varName
 */
function buildVariable(operands) {
  var varName = operands[0].text;
  return {
    isLiteral: false,
    opNodes: [],
    command: new GetVariableCommand(varName),
    clone: function() {
      return buildVariable(cloneOperands(operands));
    }
  }
}

/** buildAssignment
 *    create assignment node
 *
 *    pattern:
 *      assignment -> %varName _ "=" _ math
 */
function buildAssignment(operands) {
  var lValue = operands[0].text;
  var rValue = operands[4];
  return {
    isLiteral: false,
    opNodes: [],
    command: new AssignVariableCommand(lValue, rValue),
    clone: function() {
      return buildAssignment(cloneOperands(operands));
    }
  };
}

/** buildRangePropertyAssignment
 *    create a RangeConfig node 
 *    pattern:
 *      assignment -> expr %DOT %varName _ "=" _ expr        
 */
function buildRangePropertyAssignment(operands) {
  var receiverNode = operands[0];
  var propName = operands[2].text;
  var rValueNode = operands[6];
  return {
    isLiteral: false,
    opNodes: [],
    command: new RangeConfigCommand(receiverNode, propName, rValueNode),
    clone: function() {
      return buildRangePropertyAssignment(cloneOperands(operands));
    }
  };
}

/** buildComparison
 *    create comparison (<, >, <=, >=) node
 *       
 *    pattern:
 *      comp -> bool _ comparator _ bool  
 */
function buildComparison(operands) {
  var opNode1 = operands[0];
  var opNode2 = operands[4];

  var comp = operands[2];
  var compCommand;
  if (comp == "<")
    compCommand = LessThanCommand;
  else if (comp == "<=")
    compCommand = LessEqualThanCommand;
  else if (comp == ">")
    compCommand = GreaterThanCommand;
  else if (comp == ">=")
    compCommand = GreaterEqualThanCommand;

  return {
    isLiteral: opNode1.isLiteral && opNode2.isLiteral,
    opNodes: [opNode1, opNode2],
    command: new compCommand(opNode1, opNode2),
    clone: function() {
      return buildComparison(cloneOperands(operands));
    }
  }
}


/** buildCommaSepStatements
 *    return array of comma separated statement
 *    nodes
 *
 *    pattern:
 *      commaSepStatement -> statement _ ("," _ statement):*
 */
function buildCommaSepStatements(operands) {
  var statements = [operands[0]];
  for (var idx in operands[2]) 
    statements.push(operands[2][idx][2]);
  return statements; 
}

/** buildForPars
 *    return a 2d array of statements
 *
 *    pattern:
 *    forPars -> 
 *      "(" _ (commaSepStatements _ ):? ";" _ (bool _):? ";" _ (commaSepStatements _):?  ")" 
 *      
 */
function buildForPars(operands) {
  var initStatements = operands[2] ? operands[2][0] : [];
  var condition = operands[5] ? operands[5][0] : null;
  var incrStatements = operands[8] ? operands[8][0] : [];
  return [initStatements, condition, incrStatements];
}

/** buildForLoop
 *    create for loop node with
 *    statement subtrees or empty arrays as 'arguments'
 *    i.e. setup statements, test condition, increment statements
 *
 *    pattern:
 *      forLoop 
          -> %FOR _  forPars _ "{" _ (statement ";"):* _ "}" 
 */
function buildForLoop(operands) {
  var initStatements = operands[2][0];
  var condition = operands[2][1];
  var incrStatements = operands[2][2];

  var loopStatements = [];
  for (var idx in operands[6])
    loopStatements.push(operands[6][idx][0]);

  return {
    isLiteral: false,
    opNodes: loopStatements,
    command: new ForLoopCommand(initStatements, condition, 
          incrStatements, loopStatements),
    clone: function() {
      return buildForLoop(cloneOperands(operands));
    }
  };
}

/** buildWhileLoop
 *    create while loop node (single condition)
 *
 *    pattern:
 *      whileLoop ->
 *        %WHILE _ "(" _ bool _ ")" _ "{" _ (statement ";"):* _ "}" 
 */
function buildWhileLoop(operands) {
  var condition = operands[4];
  
  var loopStatements = [];
  for (var idx in operands[10]) 
    loopStatements.push(operands[10][idx][0])

  return {
    isLiteral: false,
    opNodes: loopStatements,
    command: new WhileLoopCommand(condition, loopStatements),
    clone: function() {
      return buildWhileLoop(cloneOperands(operands));
    }
  };
}

/** buildSingleAccess
 *    create 
 *  accessor -> expr "[" _ expr _ "]               
 *
 */
function buildSingleAccess(operands) {
  var receiver = operands[0];
  var keyNode = operands[3]; 
  return {
    isLiteral: false,
    opNodes: [],
    command: new GetChildCommand(receiver, keyNode),
    clone: function() {
      return buildSingleAccess(cloneOperands(operands));
    }
  };
}

/** buildRangeAccess
 *    create GetChildren node. When evaluated,
 *    this node returns an array of children
 *
 *    syntax: 
 *      arr[3:] - get children from index 3 to end (inclusive)
 *      arr[:3] - get children from starting index up to 2
 *      arr[3:5] - get children from index 3 to 4
 *      arr[:] - get all children
 *
 *    pattern:
 *      accessor -> %varName "[" _ (expr _):? ":" _ (expr _):? "]" 
 */
function buildRangeAccess(operands) {
  var receiver = operands[0];
  var low = operands[3] ? operands[3][0] : null;
  var high = operands[6] ? operands[6][0] : null;

  return {
    isLiteral: false,
    opNodes: [],
    command: new GetChildrenCommand(receiver, low, high),
    clone: function() {
      return buildRangeAccess(cloneOperands(operands));
    }
  };
}

/** buildList
 *    create op node that just returns an array. List elements
 *    get evaluated upon instantiation,
 *    so the following sequence won't change the list:
 *
 *    x = 3
 *    list = [x, 4, 5]
 *    x = 4
 *
 *    pattern:
 *      list -> "[" "]" 
 *      list -> "[" _ args _ "]" 
 *    
 *    buildList clones opnodes so function calls get re-evaluated
 *    when list is cloned
 */
function buildList(operands) {
  var elements = [];
  if (operands.length > 2)
    elements = operands[2];

  return {
    isLiteral: elements.every(x => x.isLiteral),
    opNodes: elements,
    command: {
      execute: function() {
        return elements.map(opNode => opNode.clone().command.execute());
      },
      undo: function() {},
    },
    clone: function() {
      return buildList(cloneOperands(operands));
    }
  };
}

/** buildListAssignment
 *    create op node that assigns
 *    a value to a list
 *
 *    pattern:
 *      assignment -> expr "[" _ expr _ "]" _ "=" _ expr      
 */
function buildListAssignment(operands) {
  var listNode = operands[0];
  var indexNode = operands[3];
  var rValueNode = operands[9];

  return {
    isLiteral: false,
    opNodes: [],
    command: new AssignListElementCommand(listNode, indexNode, rValueNode),
    clone: function() {
      return buildListAssignment(cloneOperands(operands));
    }
  };
}

/** buildChildPropGet
 *    create node to fetch a property from a
 *    canvas child object e.g. 'array[0].bg'
 *
 *    mathTerminal -> accessor "." [a-zA-Z]:+  
 */
function buildChildPropGet(operands) {
  var accessorNode = operands[0];
  var propName = operands[2][0].text;
  return {
    isLiteral: false,
    opNodes: [],
    command: new GetChildPropertyCommand(accessorNode, propName),
    clone: function() {
      return buildChildPropGet(cloneOperands(operands));
    }
  };
}

/** buildPropGet
 *    create node that performs property access
 *    on result of expression
 *
 *    pattern:
 *      propGet -> expr "." %varName      
 */
function buildPropGet(operands) {
  var receiverNode = operands[0];
  var propName = operands[2].text;
  return { 
    isLiteral: false,
    opNodes: [],
    command: new GetPropertyCommand(receiverNode, propName),
  };
}


/** buildParentPropGet
 *    create node to fetch property from
 *    parent canvas object special case of
 *    list.length 
 *
 *    pattern: 
 *    mathTerminal -> %methodName
 *                    
 *    note: methodName just happens to match
 *    the same pattern as "obj.property"
 */
function buildParentPropGet(operands) {
  var spl = operands[0].text.split(".");
  var varName = spl[0];
  var propName = spl[1];
  return {
    isLiteral: false,
    opNodes: [],
    command: new GetParentPropertyCommand(spl[0], spl[1]),
    clone: function() {
      return buildParentPropGet(cloneOperands(operands));
    }
  };
}

/** buildConjunction
 *  pattern: 
 *    bool -> bool _ %AND _ disj  
 */
function buildConjunction(operands) {
  var opNode1 = operands[0];
  var opNode2 = operands[4];
  return {
    isLiteral: opNode1.isLiteral && opNode2.isLiteral,
    opNodes: [opNode1, opNode2],
    command: new ConjunctionCommand(opNode1, opNode2),
    clone: function() {
      return buildConjunction(cloneOperands(operands));
    }
  };
}

/** buildDisjunction
 *  pattern:
 *    disj -> disj _ %OR _ not   
 */
function buildDisjunction(operands) {
  var opNode1 = operands[0];
  var opNode2 = operands[4];
  return {
    isLiteral: opNode1.isLiteral && opNode2.isLiteral,
    opNodes: [opNode1, opNode2],
    command: new DisjunctionCommand(opNode1, opNode2),
    clone: function() {
      return buildDisjunction(cloneOperands(operands));
    }
  };
}

/** buildLogicalNot
 *  pattern:
 *    not -> %NOT _ boolTerminal 
 */
function buildLogicalNot(operands) {
  var opNode1 = operands[0];
  var opNode2 = operands[4];
  return {
    isLiteral: opNode1.isLiteral && opNode2.isLiteral,
    opNodes: [opNode1, opNode2],
    command: new LogicalNotCommand(opNode1, opNode2),
    clone: function() {
      return buildLogicalNot(cloneOperands(operands));
    }
  };
}

/**
 *  pattern:
 *    eqcomp -> eqcomp _ %EQEQ _ noteqcomp 
 */
function buildEquals(operands) {
  var opNode1 = operands[0];
  var opNode2 = operands[4];
  return {
    isLiteral: opNode1.isLiteral && opNode2.isLiteral,
    opNodes: [opNode1, opNode2],
    command: new LogicalEqualsCommand(opNode1, opNode2),
    clone: function() {
      return buildEquals(cloneOperands(operands));
    }
  };
}

/** buildNotEquals
 *  pattern:
 *    noteqcomp -> noteqcomp _ %NOTEQ _ lcomp 
 */
function buildNotEquals(operands) {
  var opNode1 = operands[0];
  var opNode2 = operands[4];
  return {
    isLiteral: opNode1.isLiteral && opNode2.isLiteral,
    opNodes: [opNode1, opNode2],
    command: new LogicalNotEqualsCommand(opNode1, opNode2),
    clone: function() {
      return buildNotEquals(cloneOperands(operands));
    }
  };
}

var grammar = {
    Lexer: lexer,
    ParserRules: [
    {"name": "unsigned_int$ebnf$1", "symbols": [/[0-9]/]},
    {"name": "unsigned_int$ebnf$1", "symbols": ["unsigned_int$ebnf$1", /[0-9]/], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "unsigned_int", "symbols": ["unsigned_int$ebnf$1"], "postprocess": 
        function(d) {
            return parseInt(d[0].join(""));
        }
        },
    {"name": "int$ebnf$1$subexpression$1", "symbols": [{"literal":"-"}]},
    {"name": "int$ebnf$1$subexpression$1", "symbols": [{"literal":"+"}]},
    {"name": "int$ebnf$1", "symbols": ["int$ebnf$1$subexpression$1"], "postprocess": id},
    {"name": "int$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "int$ebnf$2", "symbols": [/[0-9]/]},
    {"name": "int$ebnf$2", "symbols": ["int$ebnf$2", /[0-9]/], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "int", "symbols": ["int$ebnf$1", "int$ebnf$2"], "postprocess": 
        function(d) {
            if (d[0]) {
                return parseInt(d[0][0]+d[1].join(""));
            } else {
                return parseInt(d[1].join(""));
            }
        }
        },
    {"name": "unsigned_decimal$ebnf$1", "symbols": [/[0-9]/]},
    {"name": "unsigned_decimal$ebnf$1", "symbols": ["unsigned_decimal$ebnf$1", /[0-9]/], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "unsigned_decimal$ebnf$2$subexpression$1$ebnf$1", "symbols": [/[0-9]/]},
    {"name": "unsigned_decimal$ebnf$2$subexpression$1$ebnf$1", "symbols": ["unsigned_decimal$ebnf$2$subexpression$1$ebnf$1", /[0-9]/], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "unsigned_decimal$ebnf$2$subexpression$1", "symbols": [{"literal":"."}, "unsigned_decimal$ebnf$2$subexpression$1$ebnf$1"]},
    {"name": "unsigned_decimal$ebnf$2", "symbols": ["unsigned_decimal$ebnf$2$subexpression$1"], "postprocess": id},
    {"name": "unsigned_decimal$ebnf$2", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "unsigned_decimal", "symbols": ["unsigned_decimal$ebnf$1", "unsigned_decimal$ebnf$2"], "postprocess": 
        function(d) {
            return parseFloat(
                d[0].join("") +
                (d[1] ? "."+d[1][1].join("") : "")
            );
        }
        },
    {"name": "decimal$ebnf$1", "symbols": [{"literal":"-"}], "postprocess": id},
    {"name": "decimal$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "decimal$ebnf$2", "symbols": [/[0-9]/]},
    {"name": "decimal$ebnf$2", "symbols": ["decimal$ebnf$2", /[0-9]/], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "decimal$ebnf$3$subexpression$1$ebnf$1", "symbols": [/[0-9]/]},
    {"name": "decimal$ebnf$3$subexpression$1$ebnf$1", "symbols": ["decimal$ebnf$3$subexpression$1$ebnf$1", /[0-9]/], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "decimal$ebnf$3$subexpression$1", "symbols": [{"literal":"."}, "decimal$ebnf$3$subexpression$1$ebnf$1"]},
    {"name": "decimal$ebnf$3", "symbols": ["decimal$ebnf$3$subexpression$1"], "postprocess": id},
    {"name": "decimal$ebnf$3", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "decimal", "symbols": ["decimal$ebnf$1", "decimal$ebnf$2", "decimal$ebnf$3"], "postprocess": 
        function(d) {
            return parseFloat(
                (d[0] || "") +
                d[1].join("") +
                (d[2] ? "."+d[2][1].join("") : "")
            );
        }
        },
    {"name": "percentage", "symbols": ["decimal", {"literal":"%"}], "postprocess": 
        function(d) {
            return d[0]/100;
        }
        },
    {"name": "jsonfloat$ebnf$1", "symbols": [{"literal":"-"}], "postprocess": id},
    {"name": "jsonfloat$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "jsonfloat$ebnf$2", "symbols": [/[0-9]/]},
    {"name": "jsonfloat$ebnf$2", "symbols": ["jsonfloat$ebnf$2", /[0-9]/], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "jsonfloat$ebnf$3$subexpression$1$ebnf$1", "symbols": [/[0-9]/]},
    {"name": "jsonfloat$ebnf$3$subexpression$1$ebnf$1", "symbols": ["jsonfloat$ebnf$3$subexpression$1$ebnf$1", /[0-9]/], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "jsonfloat$ebnf$3$subexpression$1", "symbols": [{"literal":"."}, "jsonfloat$ebnf$3$subexpression$1$ebnf$1"]},
    {"name": "jsonfloat$ebnf$3", "symbols": ["jsonfloat$ebnf$3$subexpression$1"], "postprocess": id},
    {"name": "jsonfloat$ebnf$3", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "jsonfloat$ebnf$4$subexpression$1$ebnf$1", "symbols": [/[+-]/], "postprocess": id},
    {"name": "jsonfloat$ebnf$4$subexpression$1$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "jsonfloat$ebnf$4$subexpression$1$ebnf$2", "symbols": [/[0-9]/]},
    {"name": "jsonfloat$ebnf$4$subexpression$1$ebnf$2", "symbols": ["jsonfloat$ebnf$4$subexpression$1$ebnf$2", /[0-9]/], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "jsonfloat$ebnf$4$subexpression$1", "symbols": [/[eE]/, "jsonfloat$ebnf$4$subexpression$1$ebnf$1", "jsonfloat$ebnf$4$subexpression$1$ebnf$2"]},
    {"name": "jsonfloat$ebnf$4", "symbols": ["jsonfloat$ebnf$4$subexpression$1"], "postprocess": id},
    {"name": "jsonfloat$ebnf$4", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "jsonfloat", "symbols": ["jsonfloat$ebnf$1", "jsonfloat$ebnf$2", "jsonfloat$ebnf$3", "jsonfloat$ebnf$4"], "postprocess": 
        function(d) {
            return parseFloat(
                (d[0] || "") +
                d[1].join("") +
                (d[2] ? "."+d[2][1].join("") : "") +
                (d[3] ? "e" + (d[3][1] || "+") + d[3][2].join("") : "")
            );
        }
        },
    {"name": "_$ebnf$1", "symbols": []},
    {"name": "_$ebnf$1", "symbols": ["_$ebnf$1", "wschar"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "_", "symbols": ["_$ebnf$1"], "postprocess": function(d) {return null;}},
    {"name": "__$ebnf$1", "symbols": ["wschar"]},
    {"name": "__$ebnf$1", "symbols": ["__$ebnf$1", "wschar"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "__", "symbols": ["__$ebnf$1"], "postprocess": function(d) {return null;}},
    {"name": "wschar", "symbols": [/[ \t\n\v\f]/], "postprocess": id},
    {"name": "line", "symbols": ["statement"], "postprocess": id},
    {"name": "line", "symbols": ["forLoop"], "postprocess": id},
    {"name": "statement", "symbols": ["assignment"], "postprocess": id},
    {"name": "statement", "symbols": ["expr"], "postprocess": id},
    {"name": "assignment", "symbols": [(lexer.has("varName") ? {type: "varName"} : varName), "_", {"literal":"="}, "_", "expr"], "postprocess": buildAssignment},
    {"name": "assignment", "symbols": ["expr", (lexer.has("DOT") ? {type: "DOT"} : DOT), (lexer.has("varName") ? {type: "varName"} : varName), "_", {"literal":"="}, "_", "expr"], "postprocess": buildRangePropertyAssignment},
    {"name": "assignment", "symbols": ["expr", {"literal":"["}, "_", "expr", "_", {"literal":"]"}, "_", {"literal":"="}, "_", "expr"], "postprocess": buildListAssignment},
    {"name": "expr", "symbols": ["bool"], "postprocess": id},
    {"name": "bool", "symbols": ["bool", "_", (lexer.has("AND") ? {type: "AND"} : AND), "_", "disj"], "postprocess": buildConjunction},
    {"name": "bool", "symbols": ["disj"], "postprocess": id},
    {"name": "disj", "symbols": ["disj", "_", (lexer.has("OR") ? {type: "OR"} : OR), "_", "not"], "postprocess": buildDisjunction},
    {"name": "disj", "symbols": ["eqcomp"], "postprocess": id},
    {"name": "eqcomp", "symbols": ["eqcomp", "_", (lexer.has("EQEQ") ? {type: "EQEQ"} : EQEQ), "_", "noteqcomp"], "postprocess": buildEquals},
    {"name": "eqcomp", "symbols": ["noteqcomp"], "postprocess": id},
    {"name": "noteqcomp", "symbols": ["noteqcomp", "_", (lexer.has("NOTEQ") ? {type: "NOTEQ"} : NOTEQ), "_", "lcomp"], "postprocess": buildNotEquals},
    {"name": "noteqcomp", "symbols": ["lcomp"], "postprocess": id},
    {"name": "lcomp", "symbols": ["lcomp", "_", {"literal":"<"}, "_", "gcomp"], "postprocess": buildComparison},
    {"name": "lcomp", "symbols": ["gcomp"], "postprocess": id},
    {"name": "gcomp", "symbols": ["gcomp", "_", {"literal":">"}, "_", "lecomp"], "postprocess": buildComparison},
    {"name": "gcomp", "symbols": ["lecomp"], "postprocess": id},
    {"name": "lecomp", "symbols": ["lecomp", "_", (lexer.has("LESSEQ") ? {type: "LESSEQ"} : LESSEQ), "_", "gecomp"], "postprocess": buildComparison},
    {"name": "lecomp", "symbols": ["gecomp"], "postprocess": id},
    {"name": "gecomp", "symbols": ["gecomp", "_", (lexer.has("GREATEQ") ? {type: "GREATEQ"} : GREATEQ), "_", "not"], "postprocess": buildComparison},
    {"name": "gecomp", "symbols": ["not"], "postprocess": id},
    {"name": "not", "symbols": [(lexer.has("NOT") ? {type: "NOT"} : NOT), "_", "boolTerminal"], "postprocess": buildLogicalNot},
    {"name": "not", "symbols": ["boolTerminal"], "postprocess": id},
    {"name": "boolTerminal", "symbols": ["math"], "postprocess": id},
    {"name": "boolTerminal", "symbols": [(lexer.has("TRUE") ? {type: "TRUE"} : TRUE)], "postprocess": wrapBool},
    {"name": "boolTerminal", "symbols": [(lexer.has("FALSE") ? {type: "FALSE"} : FALSE)], "postprocess": wrapBool},
    {"name": "comparator$subexpression$1", "symbols": [{"literal":"<"}]},
    {"name": "comparator$subexpression$1", "symbols": [{"literal":">"}]},
    {"name": "comparator$subexpression$1", "symbols": [(lexer.has("LESSEQ") ? {type: "LESSEQ"} : LESSEQ)]},
    {"name": "comparator$subexpression$1", "symbols": [(lexer.has("GREATEQ") ? {type: "GREATEQ"} : GREATEQ)]},
    {"name": "comparator", "symbols": ["comparator$subexpression$1"], "postprocess": id},
    {"name": "comp", "symbols": ["bool", "_", "comparator", "_", "bool"], "postprocess": buildComparison},
    {"name": "comp", "symbols": ["bool", "_", (lexer.has("EQEQ") ? {type: "EQEQ"} : EQEQ), "_", "bool"]},
    {"name": "comp", "symbols": ["bool", "_", (lexer.has("NOTEQ") ? {type: "NOTEQ"} : NOTEQ), "_", "bool"]},
    {"name": "math$subexpression$1", "symbols": [{"literal":"+"}]},
    {"name": "math$subexpression$1", "symbols": [{"literal":"-"}]},
    {"name": "math", "symbols": ["math", "_", "math$subexpression$1", "_", "product"], "postprocess": buildAddSub},
    {"name": "math", "symbols": ["product"], "postprocess": id},
    {"name": "product$subexpression$1", "symbols": [{"literal":"*"}]},
    {"name": "product$subexpression$1", "symbols": [{"literal":"/"}]},
    {"name": "product", "symbols": ["product", "_", "product$subexpression$1", "_", "exp"], "postprocess": buildMultDiv},
    {"name": "product", "symbols": ["exp"], "postprocess": id},
    {"name": "exp", "symbols": ["unaryNeg", "_", {"literal":"^"}, "_", "exp"], "postprocess": buildExp},
    {"name": "exp", "symbols": ["unaryNeg"], "postprocess": id},
    {"name": "unaryNeg", "symbols": [{"literal":"-"}, "mathTerminal"], "postprocess": buildNegate},
    {"name": "unaryNeg", "symbols": ["mathTerminal"], "postprocess": id},
    {"name": "nonQuote", "symbols": [{"literal":" "}]},
    {"name": "nonQuote", "symbols": [{"literal":"\t"}]},
    {"name": "nonQuote", "symbols": [{"literal":"-"}]},
    {"name": "nonQuote", "symbols": [{"literal":"+"}]},
    {"name": "nonQuote", "symbols": [{"literal":"*"}]},
    {"name": "nonQuote", "symbols": [{"literal":"/"}]},
    {"name": "nonQuote", "symbols": [{"literal":"^"}]},
    {"name": "nonQuote", "symbols": [(lexer.has("LESSEQ") ? {type: "LESSEQ"} : LESSEQ)]},
    {"name": "nonQuote", "symbols": [(lexer.has("GREATEQ") ? {type: "GREATEQ"} : GREATEQ)]},
    {"name": "nonQuote", "symbols": [(lexer.has("EQEQ") ? {type: "EQEQ"} : EQEQ)]},
    {"name": "nonQuote", "symbols": [(lexer.has("DOT") ? {type: "DOT"} : DOT)]},
    {"name": "nonQuote", "symbols": [(lexer.has("NOTEQ") ? {type: "NOTEQ"} : NOTEQ)]},
    {"name": "nonQuote", "symbols": [(lexer.has("TRUE") ? {type: "TRUE"} : TRUE)]},
    {"name": "nonQuote", "symbols": [(lexer.has("FALSE") ? {type: "FALSE"} : FALSE)]},
    {"name": "nonQuote", "symbols": [{"literal":">"}]},
    {"name": "nonQuote", "symbols": [{"literal":"<"}]},
    {"name": "nonQuote", "symbols": [{"literal":","}]},
    {"name": "nonQuote", "symbols": [{"literal":"("}]},
    {"name": "nonQuote", "symbols": [{"literal":")"}]},
    {"name": "nonQuote", "symbols": [{"literal":"="}]},
    {"name": "nonQuote", "symbols": [{"literal":"{"}]},
    {"name": "nonQuote", "symbols": [{"literal":"}"}]},
    {"name": "nonQuote", "symbols": [{"literal":"["}]},
    {"name": "nonQuote", "symbols": [{"literal":"]"}]},
    {"name": "nonQuote", "symbols": [{"literal":";"}]},
    {"name": "nonQuote", "symbols": [(lexer.has("number") ? {type: "number"} : number)]},
    {"name": "nonQuote", "symbols": [(lexer.has("methodName") ? {type: "methodName"} : methodName)]},
    {"name": "nonQuote", "symbols": [(lexer.has("varName") ? {type: "varName"} : varName)]},
    {"name": "nonQuote", "symbols": [(lexer.has("character") ? {type: "character"} : character)]},
    {"name": "mathTerminal", "symbols": ["number"], "postprocess": id},
    {"name": "mathTerminal", "symbols": ["callable"], "postprocess": id},
    {"name": "mathTerminal", "symbols": ["accessor"], "postprocess": id},
    {"name": "mathTerminal", "symbols": ["list"], "postprocess": id},
    {"name": "mathTerminal$ebnf$1", "symbols": []},
    {"name": "mathTerminal$ebnf$1", "symbols": ["mathTerminal$ebnf$1", "nonQuote"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "mathTerminal", "symbols": [(lexer.has("QUOTE") ? {type: "QUOTE"} : QUOTE), "mathTerminal$ebnf$1", (lexer.has("QUOTE") ? {type: "QUOTE"} : QUOTE)], "postprocess": wrapString},
    {"name": "mathTerminal", "symbols": [(lexer.has("varName") ? {type: "varName"} : varName)], "postprocess": buildVariable},
    {"name": "mathTerminal", "symbols": [{"literal":"("}, "_", "bool", "_", {"literal":")"}], "postprocess": d => d[2]},
    {"name": "mathTerminal", "symbols": ["propGet"], "postprocess": id},
    {"name": "number", "symbols": [(lexer.has("number") ? {type: "number"} : number)], "postprocess": wrapNumber},
    {"name": "list", "symbols": [{"literal":"["}, {"literal":"]"}], "postprocess": buildList},
    {"name": "list", "symbols": [{"literal":"["}, "_", "args", "_", {"literal":"]"}], "postprocess": buildList},
    {"name": "accessor", "symbols": ["objExpr", {"literal":"["}, "_", "expr", "_", {"literal":"]"}], "postprocess": buildSingleAccess},
    {"name": "accessor$ebnf$1$subexpression$1", "symbols": ["expr", "_"]},
    {"name": "accessor$ebnf$1", "symbols": ["accessor$ebnf$1$subexpression$1"], "postprocess": id},
    {"name": "accessor$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "accessor$ebnf$2$subexpression$1", "symbols": ["expr", "_"]},
    {"name": "accessor$ebnf$2", "symbols": ["accessor$ebnf$2$subexpression$1"], "postprocess": id},
    {"name": "accessor$ebnf$2", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "accessor", "symbols": ["objExpr", {"literal":"["}, "_", "accessor$ebnf$1", {"literal":":"}, "_", "accessor$ebnf$2", {"literal":"]"}], "postprocess": buildRangeAccess},
    {"name": "objExpr", "symbols": ["callable"], "postprocess": id},
    {"name": "objExpr", "symbols": ["accessor"], "postprocess": id},
    {"name": "objExpr", "symbols": ["list"], "postprocess": id},
    {"name": "objExpr", "symbols": ["propGet"], "postprocess": id},
    {"name": "objExpr", "symbols": [(lexer.has("varName") ? {type: "varName"} : varName)], "postprocess": buildVariable},
    {"name": "propGet", "symbols": ["objExpr", (lexer.has("DOT") ? {type: "DOT"} : DOT), (lexer.has("varName") ? {type: "varName"} : varName)], "postprocess": buildPropGet},
    {"name": "callable", "symbols": ["function"], "postprocess": id},
    {"name": "function", "symbols": ["objExpr", {"literal":"("}, "_", "args", "_", {"literal":")"}], "postprocess": buildFunctionCall},
    {"name": "function", "symbols": ["objExpr", {"literal":"("}, {"literal":")"}], "postprocess": buildFunctionCall},
    {"name": "args$ebnf$1", "symbols": []},
    {"name": "args$ebnf$1$subexpression$1", "symbols": ["_", {"literal":","}, "_", "funcarg"]},
    {"name": "args$ebnf$1", "symbols": ["args$ebnf$1", "args$ebnf$1$subexpression$1"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "args", "symbols": ["funcarg", "args$ebnf$1"], "postprocess": buildFunctionArguments},
    {"name": "funcarg", "symbols": ["expr"], "postprocess": id},
    {"name": "commaSepStatements$ebnf$1", "symbols": []},
    {"name": "commaSepStatements$ebnf$1$subexpression$1", "symbols": ["_", {"literal":","}, "_", "statement"]},
    {"name": "commaSepStatements$ebnf$1", "symbols": ["commaSepStatements$ebnf$1", "commaSepStatements$ebnf$1$subexpression$1"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "commaSepStatements", "symbols": ["statement", "commaSepStatements$ebnf$1"], "postprocess": buildCommaSepStatements},
    {"name": "forPars$ebnf$1$subexpression$1", "symbols": ["commaSepStatements", "_"]},
    {"name": "forPars$ebnf$1", "symbols": ["forPars$ebnf$1$subexpression$1"], "postprocess": id},
    {"name": "forPars$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "forPars$ebnf$2$subexpression$1", "symbols": ["bool", "_"]},
    {"name": "forPars$ebnf$2", "symbols": ["forPars$ebnf$2$subexpression$1"], "postprocess": id},
    {"name": "forPars$ebnf$2", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "forPars$ebnf$3$subexpression$1", "symbols": ["commaSepStatements", "_"]},
    {"name": "forPars$ebnf$3", "symbols": ["forPars$ebnf$3$subexpression$1"], "postprocess": id},
    {"name": "forPars$ebnf$3", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "forPars", "symbols": [{"literal":"("}, "_", "forPars$ebnf$1", {"literal":";"}, "_", "forPars$ebnf$2", {"literal":";"}, "_", "forPars$ebnf$3", {"literal":")"}], "postprocess": buildForPars},
    {"name": "forLoop$ebnf$1", "symbols": []},
    {"name": "forLoop$ebnf$1$subexpression$1", "symbols": ["statement", "_", {"literal":";"}, "_"]},
    {"name": "forLoop$ebnf$1", "symbols": ["forLoop$ebnf$1", "forLoop$ebnf$1$subexpression$1"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "forLoop", "symbols": [(lexer.has("FOR") ? {type: "FOR"} : FOR), "_", "forPars", "_", {"literal":"{"}, "_", "forLoop$ebnf$1", {"literal":"}"}], "postprocess": buildForLoop},
    {"name": "whileLoop$ebnf$1", "symbols": []},
    {"name": "whileLoop$ebnf$1$subexpression$1", "symbols": ["statement", {"literal":";"}]},
    {"name": "whileLoop$ebnf$1", "symbols": ["whileLoop$ebnf$1", "whileLoop$ebnf$1$subexpression$1"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "whileLoop", "symbols": [(lexer.has("WHILE") ? {type: "WHILE"} : WHILE), "_", {"literal":"("}, "_", "bool", "_", {"literal":")"}, "_", {"literal":"{"}, "_", "whileLoop$ebnf$1", "_", {"literal":"}"}], "postprocess": buildWhileLoop}
]
  , ParserStart: "line"
}
if (typeof module !== 'undefined'&& typeof module.exports !== 'undefined') {
   module.exports = grammar;
} else {
   window.grammar = grammar;
}
})();
