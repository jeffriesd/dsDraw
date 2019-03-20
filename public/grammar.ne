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
 */

  const lexer = moo.compile({
    " ": " ",
    "\t": "\t",
    "-": "-",
    "+": "+",
    "*": "*",
    "/": "/",
    "^": "^",
    MOD: "%",
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
    ":": ":",
    ";": ";",
    QUOTE: "\"",
    FOR: "for",
    WHILE: "while",
    DEF: "define",
    RET: "return",
    number: /-?(?:[0-9]|[0-9][0-9]+)(?:\.[0-9]+)?(?:[eE][-+]?[0-9]+)?\b/,
    varName: /[a-zA-Z][a-zA-Z0-9]*/,
    character: /[^\n"]/, 
  });
%}

@lexer lexer

@builtin "number.ne"
@builtin "whitespace.ne"

exprLine -> line {% id %} 
      | statement {% id %}
      | funcdef   {% id %}

line -> statement _ ";" {% id %} 
      | forLoop   {% id %}

statement -> assignment {% id %} 
           | expr {% id %} 
           | return {% id %}

assignment -> %varName _ "=" _ expr                   {% buildAssignment %}
            | expr  %DOT %varName _ "=" _ expr        {% buildRangePropertyAssignment %}
            | expr "[" _ expr _ "]" _ "=" _ expr      {% buildListAssignment %} 

expr -> bool {% id %}

bool -> bool _ %AND _ disj  {% buildConjunction %}
      | disj                {% id %}

disj -> disj _ %OR _ not    {% buildDisjunction %}
      | eqcomp              {% id %}

eqcomp -> eqcomp _ %EQEQ _ noteqcomp {% buildEquals %} 
        | noteqcomp                  {% id %} 

noteqcomp -> noteqcomp _ %NOTEQ _ lcomp {% buildNotEquals %} 
           | lcomp                      {% id %} 

lcomp -> lcomp _ "<" _ gcomp  {% buildComparison %}
       | gcomp            {% id %} 
 
gcomp -> gcomp _ ">" _ lecomp {% buildComparison %} 
       | lecomp           {% id %}

lecomp -> lecomp _ %LESSEQ _ gecomp {% buildComparison %}
        | gecomp                    {% id %} 

gecomp -> gecomp _ %GREATEQ _ not {% buildComparison %} 
        | not                     {% id %} 

not -> %NOT _ boolTerminal  {% buildLogicalNot %}
      | boolTerminal        {% id %}

boolTerminal -> math    {% id %}
      # | comp            {% id %}
      | %TRUE           {% wrapBool %}
      | %FALSE          {% wrapBool %}

comparator -> ("<" | ">" | %LESSEQ | %GREATEQ ) {% id %} 

comp -> bool _ comparator _ bool  {% buildComparison %}
      | bool _ %EQEQ _ bool       # {% buildEquals %}  
      | bool _ %NOTEQ _ bool      # {% buildNotEquals %}  

math -> math _ ("+"|"-") _ product {% buildAddSub %} | product {% id %}

product -> product _ ("*"|"/"|%MOD) _ exp  {% buildMultDiv %} | exp {% id %}

exp -> unaryNeg _ "^" _ exp {% buildExp %} # right associative
     | unaryNeg             {% id %}

unaryNeg -> "-" mathTerminal {% buildNegate %}
          | mathTerminal     {% id %}

nonQuote -> " " | "\t" | "-" | "+" | "*" | "/" | "^" | %LESSEQ | %GREATEQ | %EQEQ 
          | %DOT | %NOTEQ | %TRUE | %FALSE | ">" | "<" | "," | "(" | ")" | "=" | "{" 
          | "}" | "[" | "]" | ";" 
          | %number 
          | %methodName 
          | %varName 
          | %character

mathTerminal -> number            {% id %}
       | callable                 {% id %}
       | accessor                 {% id %}  # list access
       | list                     {% id %}
       | dict                     {% id %}
       | %QUOTE nonQuote:* %QUOTE {% wrapString %}
       | %varName                 {% buildVariable %}
       | "(" _ bool _ ")"         {% d => d[2] %}     # drop parens
       | propGet                  {% id %}

number -> %number {% wrapNumber %}

# list is just an array of expressions
list -> "[" _ "]"         {% buildList %}
list -> "[" _ args _ "]"  {% buildList %}

# accessor returns an element, a sublist, or a list of 
# data structure child objects (e.g. nodes in a range)
# TODO -- add step e.g. list[2:10:2] or list[::-1]
accessor -> objExpr "[" _ expr _ "]"                      {% buildSingleAccess %}
accessor -> objExpr "[" _ (expr _):? ":" _ (expr _):? "]" {% buildRangeAccess %}


# objExpr is used to differentiate between expressions that can 
# be called (function names) or accessed (for a property or element)
# and plain old math/bool expressions
#
# otherwise parser has trouble with
# 'i < a.length()' because it will think
# 'i < a.length' is a function name
objExpr -> callable {% id %}
         | dict     {% id %}
         | accessor {% id %}
         | list     {% id %}
         | propGet  {% id %}
         | %varName {% buildVariable %}

# dot operator
propGet -> objExpr %DOT %varName {% buildPropGet %}

callable -> function {% id %} 

function -> objExpr "(" _ args _ ")" {% buildFunctionCall %}
          | objExpr "(" ")"      {% buildFunctionCall %}

# note no spaces before or after bookend args
args -> funcarg (_ "," _ funcarg):* {% buildFunctionArguments %}
funcarg -> expr {% id %}

dictArgs -> dictPair (_ "," _ dictPair):* {% buildDictArgs %}
dictPair -> expr _ ":" _ expr             {% d => [d[0], d[4]] %}

dict -> "{" "}"            {% buildDict %}
      | "{" _ dictArgs _ "}" {% buildDict %}
# # Control Flow

# note no spaces before or after bookend statements
commaSepStatements -> statement (_ "," _ statement):* {% buildCommaSepStatements %}

forPars 
-> "(" _ (commaSepStatements _ ):? ";" _ (bool _):? ";" _ (commaSepStatements _):?  ")" {% buildForPars %}

forLoop -> 
  %FOR _  forPars _ "{" _ (line _ ):* "}" {% buildForLoop %}
  
whileLoop ->
  %WHILE _ "(" _ bool _ ")" _ "{" _ (line _ ):* "}" {% buildWhileLoop %}


# function definition
funcdefargs -> %varName (_ "," _ %varName):*                                          {% buildCommaSepStatements %}
funcdef -> %DEF " " %varName _ "(" _ funcdefargs _ ")" _ "{" _ (line _ ):* "}" {% buildFunctionDefinition %}
funcdef -> %DEF " " %varName _ "(" ")" _ "{" _ (line _ ):* "}"                 {% buildFunctionDefinition %}
return -> %RET " " expr {% buildReturn %} 

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


/** cloneOperands
 *    helper method to clone an array of operands
 */
function cloneOperands(operands) {
  return operands.map(x => {
    if (x == null) return null;
    if (x.isLiteral) return x;
    if (x.clone) return x.clone();
    if (x instanceof Array) return cloneOperands(x);
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
    },
    toString: () => "buildAdd",
  };
}

function buildSub(opNode1, opNode2) {
  return {
    isLiteral: opNode1.isLiteral && opNode2.isLiteral,
    opNodes: [opNode1, opNode2],
    command: new SubCommand(opNode1, opNode2),
    clone: function() {
      return buildSub(opNode1.clone(), opNode2.clone());
    },
    toString: () => "buildSub",
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
  else if (operator == "/")
    return buildDiv(operands[0], operands[4]);
  else 
    return buildMod(operands[0], operands[4]);
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
    },
    toString: () => "buildMult",
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
    },
    toString: () => "buildDiv",
  };
}

function buildMod(opNode1, opNode2) {
  return {
    isLiteral: opNode1.isLiteral && opNode2.isLiteral,
    opNodes: [opNode1, opNode2],
    command: new ModCommand(opNode1, opNode2),
    clone: function() {
      return buildMod(opNode1.clone(), opNode2.clone());
    },
    toString: () => "buildMod",
  }
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
    },
    toString: () => "buildExp",
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
    },
    toString: () => "buildNegate",
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
 *    function -> objExpr "(" _ args _ ")" 
 *              | objExpr "(" ")"      
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
    },
    toString: () => "buildFunctionCall",
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
    },
    toString: () => "buildMethodCall",
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
      return wrapNumber(operands);
    },
    toString: () => "wrapNumber",
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
      return wrapString(operands);
    },
    toString: () => "wrapString",
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
      return wrapBool(operands);
    },
    toString: () => "wrapBool",
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
    },
    toString: () => "buildVariable",
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
    },
    toString: () => "buildAssignment",
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
    },
    toString: () => "buildRangePropertyAssignment",
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
    },
    toString: () => "buildComparison",
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
    },
    toString: () => "buildForLoop",
  };
}

/** buildWhileLoop
 *    create while loop node (single condition)
 *
 *    pattern:
 *      whileLoop ->
 *        %WHILE _ "(" _ bool _ ")" _ "{" _ (statement _ ";" _ ):* "}" 
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
    },
    toString: () => "buildWhileLoop",
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
    },
    toString: () => "buildSingleAccess",
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
    },
    toString: () => "buildRangeAccess",
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
 *      list -> "[" _ "]" 
 *      list -> "[" _ args _ "]" 
 *    
 *    buildList clones opnodes so function calls get re-evaluated
 *    when list is cloned
 */
function buildList(operands) {
  var elements = [];
  if (operands.length > 3)
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
    clone: function() {
      return buildList(cloneOperands(operands));
    },
    toString: () => "buildList",
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
    },
    toString: () => "buildListAssignment",
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
    },
    toString: () => "buildChildPropGet",
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
    clone: function() {
      return buildPropGet(cloneOperands(operands));
    },
    toString: () => "buildPropGet",
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
    },
    toString: () => "buildParentPropGet",
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
    },
    toString: () => "buildConjunction",
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
    },
    toString: () => "buildDisjunction",
  };
}

/** buildLogicalNot
 *  pattern:
 *    not -> %NOT _ boolTerminal 
 */
function buildLogicalNot(operands) {
  var opNode1 = operands[2];
  return {
    isLiteral: opNode1.isLiteral,
    opNodes: [opNode1],
    command: new LogicalNotCommand(opNode1),
    clone: function() {
      return buildLogicalNot(cloneOperands(operands));
    },
    toString: () => "buildLogicalNot",
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
    },
    toString: () => "buildEquals",
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
    },
    toString: () => "buildNotEquals",
  };
}


/** buildDictArgs
 *    return array of [key, value] pair (arrays)
 *    
 *    dictArgs -> dictPair (_ "," _ dictPair):* 
 */
function buildDictArgs(operands) {
  var dictArgs = [operands[0]];
  for (var idx in operands[1])
    dictArgs.push(operands[1][idx][3]);
  return dictArgs;
}

/** buildDict
 *    build dictionary AST node
 *    
 *    for now, dictionary keys must be literals or
 *    variables, which are evaluated once and 
 *    those literals values are used. 
 *    For instance:
 *    i = 3
 *    d = { i : "asdf" } 
 *    i = 5
 *    d[3] still == "asdf" (not  d[5])
 *
 */
function buildDict(operands, loc, rej, originalPairs) {
  var pairs = [];
  if (operands.length > 3) 
    pairs = operands[2];

  // evaluate keys only once (not again on clones)
  pairs = originalPairs || 
    pairs.map(([k, v]) => {
      var kval = null;
      if (k.isLiteral || k.command instanceof GetVariableCommand)
        kval = k.command.execute();
      if (kval == null || kval instanceof Object) 
        throw "Dictionary keys must be string or number";

      return [k.command.execute(), v.command.execute()];
    });
  return {
    isLiteral: pairs.every(x => x[1].isLiteral),
    opNodes: pairs,
    command: {
      execute: function() {
        return Object.assign({}, 
        ...pairs.map(([k, v]) => ({[k]: v})));
      },
      undo: function() {}
    },
    clone: function() {
      return buildDict(cloneOperands(operands), null, null, pairs);
    },
    toString: () => "buildDict",
  };
}

/** buildFunctionDefinition
 *    build AST node for function definition
 *    when executed it binds the name to 
 *    a new UserFunctionCommand object
 *    
 *    pattern:
 *      funcdef -> 
 *        %DEF " " %varName _ "(" _ funcdefargs _ ")" _ "{" _ (line _ ):* "}" 
 *        %DEF " " %varName _ "(" ")" _ "{" _ (line _ ):* "}"                 
 */
function buildFunctionDefinition(operands) {
  var argNames = [];
  var flIdx;
  if (operands.length > 11) {
    argNames = operands[6].map(x => x.text);
    flIdx = 12;
  }
  else 
    flIdx = 9;

  var funcName = operands[2].text;
  var funcStatements = [];
  for (var idx in operands[flIdx])
    funcStatements.push(operands[flIdx][idx][0]);
  
  return {
    isLiteral: false,
    opNodes: funcStatements,
    command: { 
      execute: function() {
        createFunctionDefinition(funcName, argNames, funcStatements);
      },
      undo: function() {}
    },
    clone: function() {
      return buildDict(cloneOperands(operands));
    },
    toString: () => "buildFunctionDefinition",
  };
}

/** buildReturn
 *    build AST node for return statement
 *    pattern:
 *      return -> %RET " " expr
 */
function buildReturn(operands) {
  var exprNode = operands[2];
  return {
    isLiteral: false,
    opNodes: [exprNode],
    command: new ReturnCommand(exprNode),
    clone: function() {
      return buildReturn(cloneOperands(operands));
    },
    toString: () => "buildReturn",
  };
}
%}
