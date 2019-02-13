@{%

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
 *
 *    TODO: allow arbitrary number of list indices e.g. l[0][0][0]...
 */

  const lexer = moo.compile({
    " ": " ",
    "\t": "\t",
    "-": "-",
    "+": "+",
    "*": "*",
    "/": "/",
    "^": "^",
    LESSEQ: "<=",
    GREATEQ: ">=",
    EQEQ: "==",
    NOTEQ: "!=",
    TRUE: "true",
    FALSE: "false",
    ">": ">",
    "<": "<",
    ",": ",",
    "(": "(",
    ")": ")",
    ".": ".",
    "=": "=",
    "{": "{",
    "}": "}",
    "[": "[",
    "]": "]",
    ";": ";",
    QUOTE: "\"",
    FOR: "for",
    WHILE: "while",
    number: /-?(?:[0-9]|[1-9][0-9]+)(?:\.[0-9]+)?(?:[eE][-+]?[0-9]+)?\b/,
    methodName: /[a-zA-Z][a-zA-Z0-9]*\.[a-zA-Z]+/,
    varName: /[a-zA-Z][a-zA-Z0-9]*/,
    character: /[^\n"]/, 
  });
%}

@lexer lexer

@builtin "number.ne"
@builtin "whitespace.ne"

line -> statement {% id %} 
      | forLoop   {% id %}

statement -> assignment {% id %} | expr {% id %}

assignment -> %varName _ "=" _ expr {% buildAssignment %}
            | %methodName _ "=" _ expr {% buildPropertyAssignment %}
            | accessor "." [a-zA-Z]:+ _ "=" _ expr {% buildRangePropertyAssignment %}
            | %varName "[" _ expr _ "]" _ "=" _ expr {% buildListAssignment %} 

expr -> bool {% id %}

bool -> math    {% id %} 
      | comp    {% id %}
      | %TRUE   {% wrapBool %}
      | %FALSE  {% wrapBool %}

comparator -> ("<" | ">" | %LESSEQ | %GREATEQ ) {% id %} 

comp -> bool _ comparator _ bool  {% buildComparison %}
      | bool _ %EQEQ _ bool       # {% buildEquals %}  
      | bool _ %NOTEQ _ bool      # {% buildNotEquals %}  

math -> math _ ("+"|"-") _ product {% buildAddSub %} | product {% id %}

product -> product _ ("*"|"/") _ exp  {% buildMultDiv %} | exp {% id %}

exp -> unaryNeg _ "^" _ exp {% buildExp %} # right associative
     | unaryNeg             {% id %}

unaryNeg -> "-" mathTerminal {% buildNegate %}
          | mathTerminal     {% id %}

nonQuote -> " " | "\t" | "-" | "+" | "*" | "/" | "^" | %LESSEQ | %GREATEQ | %EQEQ 
          | %NOTEQ | %TRUE | %FALSE | ">" | "<" | "," | "(" | ")" | "." | "=" | "{" 
          | "}" | "[" | "]" | ";" 
          | %number 
          | %methodName 
          | %varName 
          | %character

mathTerminal -> number            {% id %}
       | callable                 {% id %}
       | accessor                 {% id %}  # list access
       | list                     {% id %}
       | %QUOTE nonQuote:* %QUOTE {% wrapString %}
       | %varName                 {% buildVariable %}
       | "(" _ bool _ ")"         {% d => d[2] %}     # drop parens
       | accessor "." [a-zA-Z]:+  {% buildChildPropGet %}
       | deepAccessor             {% id %} 
       | %methodName              {% buildParentPropGet %}
       # methodName = obj.property 

number -> %number {% wrapNumber %}

# list is just an array of expressions
list -> "[" "]" {% buildList %}
list -> "[" _ args _ "]" {% buildList %}

# accessor returns a canvas child object or an array of canvas child objects
accessor -> %varName "[" _ expr _ "]"                      {% buildSingleAccess %}
accessor -> %varName "[" _ (expr _):? ":" _ (expr _):? "]" {% buildRangeAccess %}
deepAccessor -> %varName "[" _ expr _ "]" ("[" _ expr _ "]"):+   {% buildDeepAccess %}    #lists only

callable -> function {% id %} | method {% id %} 

method -> %methodName "(" _ args _ ")" {% buildMethodCall %}
        | %methodName "(" ")"      {% buildMethodCall %}

function -> %varName "(" _ args _ ")" {% buildFunctionCall %}
          | %varName "(" ")"      {% buildFunctionCall %}

# note no spaces before or after bookend args
args -> funcarg (_ "," _ funcarg):* {% buildFunctionArguments %}
funcarg -> expr {% id %}


# # Control Flow

# note no spaces before or after bookend statements
commaSepStatements -> statement (_ "," _ statement):* {% buildCommaSepStatements %}

forPars 
-> "(" _ (commaSepStatements _ ):? ";" _ (bool _):? ";" _ (commaSepStatements _):?  ")" {% buildForPars %}

forLoop -> 
  %FOR _  forPars _ "{" _ (statement _ ";" _ ):* "}" {% buildForLoop %}
  
whileLoop ->
  %WHILE _ "(" _ bool _ ")" _ "{" _ (statement ";"):* _ "}" {% buildWhileLoop %}

@{%

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
  };
}

function buildSub(opNode1, opNode2) {
  return {
    isLiteral: opNode1.isLiteral && opNode2.isLiteral,
    opNodes: [opNode1, opNode2],
    command: new SubCommand(opNode1, opNode2),
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
 *    function -> %varName "(" _ args _ ")" 
 *              | %varName "(" ")"      
 *   
 */
function buildFunctionCall(operands) {
  var functionName = operands[0].text;
  var functionArgs = []; // default (no args function)
  if (operands.length == 6) 
    functionArgs = operands[3];

  // used to check if assignment should set label of 
  // constructed object
  var constructed = functionName in constructors;

  return {
    isLiteral: false,
    opNodes: functionArgs,
    constructed: constructed,
    command: createFunctionCommand(functionName, functionArgs),
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
  };
}

/** buildPropertyAssignment 
 *    create property assignment node
 *    for configuring property of single canvas object
 *
 *    pattern:
 *      assignment -> %methodName _ "=" _ expr 
 *
 *    e.g.
 *    arr.bg = "red"
 *
 */
function buildPropertyAssignment(operands) {
  var split = operands[0].text.split(".");
  var canvasObjName = split[0];
  var propName = split[1];
  return {
    isLiteral: false,
    opNodes: [],
    command: new ConfigCommand(canvasObjName, propName, operands[4]),
  }
}


/** buildRangePropertyAssignment
 *    create a RangeConfig node 
 *    pattern:
 *      assignment -> accessor "." [a-zA-Z]:+ _ "=" _ expr 
 */
function buildRangePropertyAssignment(operands) {
  var accessorNode = operands[0];
  var propName = operands[2][0].text;
  var rValueNode = operands[6];
  return {
    isLiteral: false,
    opNodes: [],
    command: new RangeConfigCommand(accessorNode, propName, rValueNode),
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
  };
}

/** buildSingleAccess
 *    create 
 *  accessor -> %varName "[" _ expr _ "]               
 *
 */
function buildSingleAccess(operands) {
  var receiverName = operands[0].text;
  var keyNode = operands[3]; 
  return {
    isLiteral: false,
    opNodes: [],
    command: new GetChildCommand(receiverName, keyNode),
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
  var receiverName = operands[0].text;
  var low = operands[3] ? operands[3][0] : null;
  var high = operands[6] ? operands[6][0] : null;

  return {
    isLiteral: false,
    opNodes: [],
    command: new GetChildrenCommand(receiverName, low, high),
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
        return elements.map(opNode => opNode.command.execute());
      },
      undo: function() {},
    },
  };
}

/** buildListAssignment
 *    create op node that assigns
 *    a value to a list
 *
 *    pattern:
 *      assignment -> %varName "[" _ expr _ "]" _ "=" _ expr
 */
function buildListAssignment(operands) {
  var listName = operands[0].text;
  var indexNode = operands[3];
  var rValueNode = operands[9];

  return {
    isLiteral: false,
    opNodes: [],
    command: new AssignListElementCommand(listName, indexNode, rValueNode),
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
  };
}

/** buildDeepAccess
 *
 *  pattern:
 *  deepAccessor -> %varName "[" _ expr _ "]" ("[" _ expr _ "]"):+   
 *
 */
function buildDeepAccess(operands) {
  var varName = operands[0].text;
  return {
    isLiteral: true,
    opNodes: [],
    command: {
      execute: function() {
        var list = VariableEnvironment.getVar(varName);

        var indices = [operands[3].command.execute()];
        for (var idx in operands[6])
          indices.push(operands[6][idx][2].command.execute());

        indices.forEach(i => {
          if (! (list instanceof Array)) throw "Deep access is only possible for lists";
          if (i < 0 || i >= list.length) throw "Array index out of bounds";
          list = list[i];
        });
        return list;
      },
      undo: function() {},
    },
  };
}

%}
