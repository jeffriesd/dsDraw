/** 
 *  function reference: 
 *    https://plot.ly/javascript/plotlyjs-function-reference/#plotlynewplot
 * 
 *  Plotly.newPlot(graphDiv, data, layout, config)
 *      graphDiv
 *          DOM node or string id of a DOM node
 *      data
 *          array of objects, see documentation
 *          (defaults to [])
 *      layout
 *          object, see documentation
 *          https://plot.ly/javascript/reference/#layout
 *          (defaults to {})
 *      config
 *          object, see documentation
 *          https://github.com/plotly/plotly.js/blob/master/src/plot_api/plot_config.js#L22-L86
 *          (defaults to {})
 */

const PLOTLY_CONFIG = {}
const plotDiv = $("<div hidden id='plotlydiv'/>");
$("body").append(plotDiv);


function renderPlot(img, data, layout, width, height) {
  layout["margin"] = { r: 20, l: 20, b: 20, t: 20 };
  Plotly.plot("plotlydiv", data, layout)
    .then(pdiv => {
      Plotly.toImage(pdiv, { format: "svg", width: width, height: height })
        .then(url => {
          img.src = url;
        });
    });
}


/** PlotlyPlot
 *    CanvasObject class for plot objects.
 *    Plot is rendered to png and drawn to 
 *    the canvas.
 * 
 *    Plot is rendered once with provided arguments
 * 
 *    TODO implement clone, config
 */
class PlotlyPlot extends CanvasObject {
  constructor(cState, x1, y1, x2, y2) {
    super(cState, x1, y1, x2, y2);
    this.plotImg = null;
    this.data = [];
    this.layout = {};

    this.resizePoint = new ResizePoint(this.cState, this, this.x2, this.y2);
  }

  get floatingChildren() {
    return [this.resizePoint];
  }

  setPlot() {
    this.plotImg = new Image();
    renderPlot(this.plotImg, this.data, this.layout, this.width, this.height);
  }

  draw() {
    super.draw();
    if (this.plotImg) {
      try {
        this.ctx.drawImage(this.plotImg, this.x1, this.y1, this.width, this.height);
        this.ctx.rect(this.x1, this.y1, this.width, this.height);
        this.ctx.stroke();
      }
      catch (err) {
        throw "Plotly error" + err;
      }
    }

    // draw to hit detection canvas
    this.hitCtx.beginPath();
    this.hitCtx.fillRect(this.x1, this.y1, this.width, this.height);
    this.hitCtx.stroke();

    this.resizePoint.draw();
  }

  /** PlotlyPlot.resize
   *    use square resizing policy
   */
  resize(deltaX, deltaY) {
    super.resize(deltaX, deltaY);
    this.layout["width"] = this.width;
    this.layout["height"] = this.height;

    Plotly.react("plotlydiv", this.data, this.layout)
      .then(pdiv => {
        Plotly.toImage(pdiv, { format: "svg", width: this.width, height: this.height })
          .then(url => {
            this.plotImg.src = url;
          });
      });

  }

}