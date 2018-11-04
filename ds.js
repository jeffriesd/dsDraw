class MyArray {
  constructor(canvasState) {
    this.cellSize = 30;
    this.cState = canvasState;
    this.ctx = canvasState.ctx;
    this.hitCtx = canvasState.hitCtx;
    this.hashColor = null;

    this.x1 = this.cState.mouseDown.x;
    this.x2 = this.cState.mouseUp.x;
    this.y1 = this.cState.mouseDown.y;

    // round to even multiple of cellSize 
    var width = this.x2 - this.x1;
    this.x2 = this.x1 + Math.floor(width / this.cellSize) * this.cellSize;

    this.numElements = (this.x2 - this.x1) / this.cellSize + 1;

    this.array = [];

    this.init();

    this.cState.addCanvasObj("array", this);
  }

  init() {
    for (var x = this.x1; x <= this.x2; x += this.cellSize) {
      // create new ArrayNode with random value
      var val = Math.random() * this.numElements | 0;
      var arrNode = new ArrayNode(this.cState, x, this.y1, val);
      
      // add new array node to canvas objects
      this.cState.addCanvasObj("arrayNode", arrNode);

      this.array.push(arrNode); 
    }
  }

  draw() {
    for (var nodeID in this.array) {
      this.array[nodeID].draw();
    }
  }

  /*  outline
   *    method to show hollow box as user drags mouse 
   *    to create new array
   */
  static outline(cState) {
    cState.ctx.strokeStyle = "#000";
    var w = cState.mouseMove.x - cState.mouseDown.x;
    var h = cState.mouseMove.y - cState.mouseDown.y;
    cState.ctx.rect(cState.mouseDown.x, cState.mouseDown.y, w, h);
    cState.ctx.stroke();
  }
}

class ArrayNode {
  constructor(canvasState, x, y, value) {
    this.canvasState = canvasState;
    this.hashColor = null;
    this.ctx = canvasState.ctx;
    this.hitCtx = canvasState.hitCtx;

    // drawing options
    this.fillStyle = "#ffffff";
    this.x = x;
    this.y = y;
    this.value = value;
    this.cellSize = 30;
  }

  draw() {
    // draw box
    this.ctx.beginPath();
    this.ctx.fillStyle = this.fillStyle;
    this.ctx.rect(this.x, this.y, 
                  this.cellSize, this.cellSize);
    this.ctx.fillRect(this.x, this.y, this.cellSize, this.cellSize);
    this.ctx.stroke();
    
    // draw value
    var valStr = this.value.toString();
    var textMeasure = this.ctx.measureText(valStr);

    var textOffX = (this.cellSize - textMeasure.width) / 2;
    var textOffY = 20;

    this.ctx.fillStyle = "#000";
    this.ctx.fillText(valStr,
                      this.x + textOffX,
                      this.y + textOffY);

    // draw to hit detection canvas
    this.hitCtx.beginPath();
    this.hitCtx.fillStyle = this.hashColor;
    this.hitCtx.fillRect(this.x, this.y, 
                      this.cellSize, this.cellSize);
    this.hitCtx.stroke();
  }

  click() {
    this.fillStyle = "#faa";
  }
}

class SigmaContainer {
  constructor(cState, x1, y1, x2, y2) {
    this.cState = cState;
    this.ctx = cState.ctx;
    this.hitCtx = cState.hitCtx; 

    this.x1 = x1;
    this.x2 = x2;
    this.y1 = y1;
    this.y2 = y2;

    this.maxId = 0;

    this.width = x2 - x1;
    this.height = y2 - y1;

    this.sigInst = null;
    init();
  }

  init() {
    this.container = document.createElement("div");
  
    this.sigInst = new sigma(
      {
        renderer:
          {container: this.container,
           type: "canvas"
          },
      }
    );

    // set width and height and draw
    var sigmaScene = document.findElementsByClassName("sigma-scene")[0];
    var sigmaMouse = document.findElementsByClassName("sigma-mouse")[0];
    var sigmaLabels = document.findElementsByClassName("sigma-labels")[0];

    sigmaScene.setAttribute("width", this.width.toString() + "px");
    sigmaScene.setAttribute("height", this.height.toString() + "px");
    sigmaMouse.setAttribute("width", this.width.toString() + "px");
    sigmaMouse.setAttribute("height", this.height.toString() + "px");
    sigmaLabels.setAttribute("width", this.width.toString() + "px");
    sigmaLabels.setAttribute("height", this.height.toString() + "px");

    this.sigInst.refresh();
  }

  draw() {
    // draw background of pseudo-container on canvas
  }

  click() {
    this.sigInst.graph.addNode(
      {
        id: this.maxId,
        size: 1,
        x: Math.random() * 10,
        y: Math.random() * 10,
        color: "#ff0000",
      }    
    );
    this.sigInst.refresh();

    this.maxId++;
  }
}
