class Graph extends CanvasObject {
  constructor(cState, x1, y1, x2, y2) {
    super(cState, x1, y1, x2, y2);

    this.fill = "rgba(100, 100, 100, 0.5)";
    this.fill = "blue";
    this.maxId = 0;
    this.sigInst = null;
    this.init();
  }

  init() {
    this.container = document.createElement("div");
    this.container.id = "sigmaCont";
    this.container.style.backgroundColor = "red";
    this.container.style.position = "absolute";
    this.container.style.left = this.x1 + "px";
    this.container.style.top = this.y1 + "px";
    this.container.style.width = this.width + "px";
    this.container.style.height = this.height + "px";

    document.body.appendChild(this.container);
  
    this.sigInst = new sigma(
      {
        renderer:
          {container: this.container,
           type: "canvas"
          },
      }
    );

    // set width and height and draw
    var sigmaScene = document.getElementsByClassName("sigma-scene")[0];
    var sigmaMouse = document.getElementsByClassName("sigma-mouse")[0];
    var sigmaLabels = document.getElementsByClassName("sigma-labels")[0];

    sigmaScene.setAttribute("width", this.width.toString() + "px");
    sigmaScene.setAttribute("height", this.height.toString() + "px");
    sigmaMouse.setAttribute("width", this.width.toString() + "px");
    sigmaMouse.setAttribute("height", this.height.toString() + "px");
    sigmaLabels.setAttribute("width", this.width.toString() + "px");
    sigmaLabels.setAttribute("height", this.height.toString() + "px");

    this.sigInst.refresh();
  }

  configureOptions() {
    this.ctx.fillStyle = this.fill; 
    this.hitCtx.fillStyle = this.hashColor;
  }

  draw() {
    this.configureOptions();

    this.ctx.beginPath();
    this.ctx.fillRect(this.x1, this.y1, this.width, this.height);
    this.hitCtx.fillRect(this.x1, this.y1, this.width, this.height);
  }

  click() {
    console.log("clicked");
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
