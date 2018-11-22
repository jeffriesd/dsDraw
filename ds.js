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
