class CanvasObjectConstructor extends ConsoleCommand {
  constructor(cState, ...argNodes) {
    super(...argNodes);
    this.cState = cState;
  }

  /** CanvasObjectConstructor.createObject
   *    default no args constructor
   */
  createObject() {
    if (this.coords == undefined) {
      this.coords = this.cState.getCenter();
      this.coords.x1 = this.coords.x; this.coords.y1 = this.coords.y;
      this.coords.x2 = this.coords.x + this.canvasClass.defaultWidth();
      this.coords.y2 = this.coords.y + this.canvasClass.defaultHeight();
    }
    this.newObj = new this.canvasClass(this.cState,
      this.coords.x1, this.coords.y1, this.coords.x2, this.coords.y2);
  }

  applyStyle() {
    if (this.styleOptions == undefined) return;
    if (this.newObj.propNames == undefined) return;

    // style options argument must be a dictionary
    if (this.styleOptions instanceof Dictionary) {
      var validOptions = this.newObj.propNames();
      if (Array.from(this.styleOptions.keys())
        .every(x => validOptions.hasOwnProperty(x))) {
        // if all properties are valid, apply them
        this.styleOptions.forEach((v, k) => this.newObj[validOptions[k]] = v);
        return;
      }
    }
    throw "Invalid style options";
  }

  /** CanvasObjectConstructor.executeSelf
   *    create object if uninitialized.
   *    add object to canvas by calling restore
   *    and return it as an object so label assignment
   *    can be performed when user enters
   *    'x = array()'
   *    but not for
   *    'y = x'
   */
  executeSelf() {
    if (this.newObj == undefined) {
      this.createObject();
      this.applyStyle();
    }
    this.newObj.restore();
    return this.newObj;
  }

  /** 
   *  All constructors take default argument of style dict
   */
  executeChildren() {
    super.executeChildren();
    this.styleOptions = this.args[0];
  }

  undo() {
    this.newObj.destroy();
  }

  argsError(errMessage) {
    if (this.usage)
      throw errMessage + "\nUsage: " + this.usage();
    throw errMessage;
  }
}


class TextBoxConstructor extends CanvasObjectConstructor {
  constructor(...args) {
    super(...args);
    this.canvasClass = TextBox;
  }
}

class MathBoxConstructor extends CanvasObjectConstructor {
  constructor(...args) {
    super(...args);
    this.canvasClass = MathBox;
  }
}

/** ImageBoxConstructor
 *    url can be passed in as style option
 */
class ImageBoxConstructor extends CanvasObjectConstructor {
  constructor(...args) {
    super(...args);
    this.canvasClass = ImageBox;
  }
}

class RectBoxConstructor extends CanvasObjectConstructor {
  constructor(...args) {
    super(...args);
    this.canvasClass = RectBox;
  }
}

class RoundBoxConstructor extends CanvasObjectConstructor {
  constructor(...args) {
    super(...args);
    this.canvasClass = RoundBox;
  }
}

class DiamondBoxConstructor extends CanvasObjectConstructor {
  constructor(...args) {
    super(...args);
    this.canvasClass = DiamondBox;
  }
}

class ParallelogramBoxConstructor extends CanvasObjectConstructor {
  constructor(...args) {
    super(...args);
    this.canvasClass = ParallelogramBox;
  }
}

class ConnectorConstructor extends CanvasObjectConstructor {
  constructor(...args) {
    super(...args);
    this.canvasClass = Connector;
  }
}

class CurvedArrowConstructor extends CanvasObjectConstructor {
  constructor(...args) {
    super(...args);
    this.canvasClass = CurvedArrow;
  }

  /** CurvedArrowConstructor.executeChildren
   *    0/1-ary constructor is ([style])
   *    2/3-ary constructor is (startAnchor, endAnchor, [style])
   */
  executeChildren() {
    super.executeChildren();
    if (this.args.length > 1) {
      this.startAnchor = this.args[0];
      this.endAnchor = this.args[1];
      this.styleOptions = this.args[2];
    }
    else {
      this.styleOptions = this.args[0];
    }
  }

  /** CurvedArrowConstructor.checkArguments
   *    ensure anchors are canvas objects 
   */
  checkArguments() {
    const checkAnchor = function(a) {
      // anchors can be non-existent 
      // i.e. arrow is free or only one end is anchored
      if (a == undefined) return; 
      // otherwise anchor must be a (child) canvas object and support
      // arrow-locking by the lockArrow method
      if (! (a instanceof CanvasObject || a instanceof CanvasChildObject) || a.lockArrow == undefined)
        throw "Arc anchor must refer to canvas object that supports arc-locking";
    };
    checkAnchor(this.startAnchor);
    checkAnchor(this.endAnchor);
  }

  createObject() {
    this.coords = this.coords || CurvedArrow.defaultCoordinates(this.cState);
    this.newObj = new CurvedArrow(this.cState, this.coords.x1, this.coords.y1, this.coords.x2,
      this.coords.y2, this.startAnchor, this.endAnchor);
    }
}

/** Array1DConstructor
 *    array constructor syntax:
 *      array([[initializer]], [[styleOptions]])
 *
 *      e.g. 
 *      array("random", { ds: "tower" })
 *      array([1, 2, 3, 4])
 *      array()
 *
 *    default initializer is random
 *    default array length is 8
 */
class Array1DConstructor extends CanvasObjectConstructor {
  constructor(cState, ...args) {
    super(cState, ...args);
    this.canvasClass = Array1D;
  }

  executeChildren() {
    super.executeChildren();
    this.initializer = this.args[0];
    // default parameters
    if (this.initializer == undefined) this.initializer = "random";

    this.styleOptions = this.args[1];
  }

  /** Array1DConstructor.checkArguments
   *    initializer must be string "random"
   *    or array
   */
  checkArguments() {
    if (!(this.initializer == "random" || this.initializer instanceof Array))
      this.argsError("Invalid array initializer. Must be 'random' or list");
  }

  createObject() {
    this.coords = this.coords || Array1D.defaultCoordinates(this.cState);
    this.newObj = new Array1D(this.cState, this.coords.x1, this.coords.y1, this.coords.x2,
      this.coords.y2);

    if (this.initializer == "random")
      randomArray(Array1D.defaultLength, Array1D.randomSeed).forEach(x => this.newObj.append(x));
    else if (this.initializer instanceof Array)
      this.initializer.forEach(x => this.newObj.append(x));
  }

  usage() {
    return "array(initializer, styleOptions)";
  }
}

/** LinkedListConstructor 
 *    array constructor syntax:
 *      array(initializer, styleOptions)
 *
 *      e.g. 
 *      array("random", { ds: "tower" })
 *      array([1, 2, 3, 4])
 *      array()
 *
 *    default initializer is random
 *    default array length is 8
 */
class LinkedListConstructor extends CanvasObjectConstructor {
  constructor(cState, ...args) {
    super(cState, ...args);
    this.canvasClass = LinkedList;
  }

  executeChildren() {
    super.executeChildren();
    this.initializer = this.args[0];
    this.styleOptions = this.args[1];
  }

  createObject() {
    this.coords = this.coords || LinkedList.defaultCoordinates(this.cState);
    this.newObj = new LinkedList(
      this.cState, this.coords.x1, this.coords.y1, this.coords.x2, this.coords.y2);

    // default parameters
    if (this.initializer == undefined) this.initializer = "random";

    if (this.initializer == "random")
      randomArray(LinkedList.defaultLength, LinkedList.randomSeed).forEach(x => this.newObj.append(x));
    else if (this.initializer instanceof Array)
      this.initializer.forEach(x => this.newObj.append(x));
    else
      this.argsError("Invalid initializer");
  }

  usage() {
    return "array(initializer, styleOptions)";
  }
}

class BSTConstructor extends CanvasObjectConstructor {
  constructor(cState, ...args) {
    super(cState, ...args);
    this.canvasClass = BSTCanvasObject;
  }

  executeChildren() {
    super.executeChildren();
    this.initializer = this.args[0];
    this.styleOptions = this.args[1];
  }

  buildComplete(bst, arr, low, high) {
    if (low > high) return;
    var mid = Math.floor((low + high) / 2);
    bst.insert(arr[mid]);
    this.buildComplete(bst, arr, low, mid - 1);
    this.buildComplete(bst, arr, mid + 1, high);
  }

  createObject() {
    this.coords = this.coords || BSTCanvasObject.defaultCoordinates(this.cState);
    this.newObj = new BSTCanvasObject(
      this.cState, this.coords.x1, this.coords.y1, this.coords.x2, this.coords.y2);

    // default parameters
    if (this.initializer == undefined) this.initializer = "random";

    var len = BSTCanvasObject.defaultSize;
    if (this.initializer == "random")
      randomArray(len, BSTCanvasObject.randomSeed).forEach(x => this.newObj.insert(x));
    else if (this.initializer == "complete") {
      var vals = randomArray(len, BSTCanvasObject.randomSeed).sort((a, b) => a > b);
      this.buildComplete(this.newObj, vals, 0, len - 1);
    }
    else if (this.initializer instanceof Array)
      this.initializer.forEach(x => this.newObj.insert(x));
    else
      this.argsError("Invalid initializer");
  }

  usage() {
    return "bst(initializer, styleOptions)";
  }
}

class BinaryHeapConstructor extends CanvasObjectConstructor {
  constructor(cState, ...args) {
    super(cState, ...args);
    this.canvasClass = BinaryHeap;
  }

  executeChildren() {
    super.executeChildren();
    this.initializer = this.args[0];
    this.styleOptions = this.args[1];
  }

  createObject() {
    this.coords = this.coords || BinaryHeap.defaultCoordinates(this.cState);
    this.newObj = new BinaryHeap(
      this.cState, this.coords.x1, this.coords.y1, this.coords.x2, this.coords.y2);

    // default parameters
    if (this.initializer == undefined) this.initializer = "random";

    var len = BinaryHeap.defaultSize;
    if (this.initializer == "random")
      randomArray(len, BinaryHeap.randomSeed).forEach(x => this.newObj.insert(x));
    else if (this.initializer instanceof Array)
      this.initializer.forEach(x => this.newObj.insert(x));
    else
      this.argsError("Invalid initializer");
  }

  usage() {
    return "bheap(initializer, styleOptions)";
  }
}

class GraphConstructor extends CanvasObjectConstructor {
  // graph 'initializer' object is an adjacency list.
  // example:
  // g = graph({ 1: [2, 3], 2: [1], 3: [] })

  executeChildren() {
    super.executeChildren();
    this.initializer = this.args[0];
    this.styleOptions = this.args[1];
  }

  /** buildComplete
   *    build complete graph (only 1 directed edge per 
   *    pair if using directed) 
   */
  buildComplete(size) {
    // keep track of nodes by value since addEdge requires ids
    var nodesByValue = new Map();

    var values = randomArray(size, this.canvasClass.randomSeed);

    values.forEach(v => {
      var newNode = this.newObj.addNode(v);
      nodesByValue.set(v, newNode);
    })

    for (var i = 0; i < size; i++) {
      for (var j = i+1; j < size; j++) {
        var fromNode = nodesByValue.get(values[i]);
        var toNode = nodesByValue.get(values[j]);
        this.newObj.addEdge(fromNode.index, toNode.index);
      }
    }
  }

  buildFromMap(m) {
    // keep track of nodes by value since addEdge requires ids
    var nodesByValue = new Map();

    // add all the nodes first
    Array.from(m.keys()).forEach(nodeVal => {
      var newNode = this.newObj.addNode(nodeVal);
      nodesByValue.set(nodeVal, newNode);
    });

    m.forEach((neighborVals, v) => {
      var i1 = nodesByValue.get(v).index;
      var i2;
      neighborVals.forEach(nv => {
        i2 = nodesByValue.get(nv).index;
        if (i1 == i2) return;
        this.newObj.addEdge(i1, i2);
      });
    });
  }

  createObject() {
    this.coords = this.coords || this.canvasClass.defaultCoordinates(this.cState);
    this.newObj = new this.canvasClass(
      this.cState, this.coords.x1, this.coords.y1, this.coords.x2, this.coords.y2);
    
    // no parameters
    if (this.initializer == undefined) this.buildComplete(this.canvasClass.defaultSize);
    else if (this.initializer instanceof Dictionary) { // use adjacency list
      this.buildFromMap(this.initializer);
    }
    else
      this.argsError("Invalid initializer");

    // render graph at construction 
    this.newObj.render();
  }

  usage() {
    return "graph(adjList, styleOptions)";
  }
}

class DiGraphConstructor extends GraphConstructor {
  constructor(cState, ...args) {
    super(cState, ...args);
    this.canvasClass = DiGraphCanvasObject;
  }
}

class UDGraphConstructor extends GraphConstructor {
  constructor(cState, ...args) {
    super(cState, ...args);
    this.canvasClass = UDGraphCanvasObject;
  }

  /** UDGraphConstructor.buildFromMap
   *    build an undirected graph from an adjacency list
   *    -- check that edges are not added twice
   */
  buildFromMap(m) {

    // keep track of nodes by value since addEdge requires ids
    var nodesByValue = new Map();

    // add all the nodes first
    Array.from(m.keys()).forEach(nodeVal => {
      var newNode = this.newObj.addNode(nodeVal);
      nodesByValue.set(nodeVal, newNode);
    });

    // in case dict is just {1: [2, 3]}, etc.
    // ensure all values have an entry
    m.forEach((neighborVals, _v) => {
      neighborVals.forEach(nv => {
        if (! nodesByValue.has(nv)) {
          var newNode = this.newObj.addNode(nv);
          nodesByValue.set(nv, newNode);
        }
      });
    });
    console.log(nodesByValue)

    m.forEach((neighborVals, v) => {
      var i1 = nodesByValue.get(v).index;
      var i2;
      neighborVals.forEach(nv => {
        i2 = nodesByValue.get(nv).index;
        if (i1 == i2) return;
        if (this.newObj.hasEdge(i1, i2)) return; 
        this.newObj.addEdge(i1, i2);
      });
    });
  }
}

class PlotlyPlotConstructor extends CanvasObjectConstructor {
  constructor(cState, ...args) {
    super(cState, ...args);
    this.canvasClass = PlotlyPlot;
  }

  executeChildren() {
    super.executeChildren();
    this.data = this.args[0] || [];
    this.layout = this.args[1] || {};
  }

  createObject() {
    this.coords = this.coords || PlotlyPlot.defaultCoordinates(this.cState);
    this.newObj = new PlotlyPlot(
      this.cState, this.coords.x1, this.coords.y1, this.coords.x2, this.coords.y2
    );
    this.newObj.data = this.data;
    this.newObj.layout = this.layout;
    this.newObj.setPlot();
  }

  usage() {
    return "plot(data, layout)"; 
  }
}