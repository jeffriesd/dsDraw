
/** TODO:
 *    - remove anchor point class -- really just need to look ahead 
 *    for flowchart box and handle anchored arrows within FcBox classest 
 *    - - need like box.getLeftEdge() for differing functionality between
 *        diamonds and rectangles
 */

class FlowchartBox extends CanvasObject {
  constructor(canvasState, x1, y1, x2, y2) {
    super(canvasState, x1, y1, x2, y2);

    this.fill = "#fff";
    this.border =  "#000";
    this.fontStyle = null;
    this.fontFamily = "Purisa";
    this.fontSize = 12;

    this.horizontalAlign = "left";
    this.verticalAlign = "top";
    this.textX = this.x1;
    this.textY = this.y1;

    // attribute to allow for slight space between edge
    // of text box and text itself
    this.textMargin = 8;

    this.wrappedText = [];

    this.createEditor();

    // add clickable point for resizing
    this.resizePoint = new ResizePoint(this.cState, this, this.x2, this.y2);
  }

  propNames() {
    return {
        "ff": "fontFamily",
        "fontFamily": "fontFamily",
        "font": "fontSize",
        "fontSize": "fontSize",
        "fs": "fontSize",
        "label": "label",
        "va": "verticalAlign",
        "ha": "horizontalAlign",
    };
  }

  static defaultCoordinates(cState) {
    var center = cState.getCenter();
    var w = 200;
    var h = 200;
    return {
      x1: center.x,
      y1: center.y,
      x2: center.x + w,
      y2: center.y + h,
    };
  }

  /** FlowchartBox.config
   *    return object with configurable 
   *    attribute names and values for
   *    cloning
   */
  config() {
    return {
      fontStyle: this.fontStyle,
      fontFamily: this.fontFamily,
      fontSize: this.fontSize,
      horizontalAlign: this.horizontalAlign,
      verticalAlign: this.verticalAlign,
    };
  }

  clone() {
    var copy = super.clone();

    // set text in clone
    copy.editor.value = this.editor.value;
    return copy;
  }

  getToolbar() {
    return FlowchartToolbar.getInstance(this.cState);
  } 

  getOptions() {
    return FlowchartBoxOptions.getInstance(this.cState);
  }

  /**createEditor
   *  initializes <textarea> element for editing text
   *  inside flowchart element
   *
   *  TODO:
   *    - allow user to press enter early
   *    (perhaps shift+enter)
   */
  createEditor() {
    this.editor = document.createElement("textarea");
    this.editor.style.paddingLeft = this.textMargin + "px";
    this.editor.style.paddingRight = this.textMargin + "px";
    this.editor.style.position = "absolute"; 
    this.editor.style.border = "0";

    this.positionEditor();

    // disable resize
    this.editor.style.resize = "none";

    // hide until flowchart box clicked
    this.editor.hidden = true;

    // add to document body
    document.body.appendChild(this.editor);
  
    // end editing with enter key
    this.editor.onkeydown = (event) => {
      if (event.keyCode == ENTER) {
        this.deactivate();
      }
    };
  }

  positionEditor() {
    // set size
    var width = this.x2 - this.x1;
    var height = this.y2 - this.y1;
    this.editor.style.width = width + "px";
    this.editor.style.height = height + "px";

    // set position
    this.editor.style.top = this.y1 + "px";
    this.editor.style.left = this.x1 + "px";
  }

  configureOptions() {
    this.ctx.strokeStyle = this.border;
    this.ctx.lineWidth = this.borderThickness;
    this.ctx.fillStyle = this.fill;
    
    var font = "";
    if (this.fontStyle)
      font += this.fontStyle + " ";

    font += this.fontSize + "px ";
    font += this.fontFamily;

    this.ctx.font = font;
    this.editor.style.font = font;

    // set text drawing option for canvas
    this.ctx.textAlign = this.horizontalAlign;

    // change x coordinate for diff alignments
    if (this.horizontalAlign == "right")
      this.textX = this.x2 - this.textMargin;
    else if (this.horizontalAlign == "center")
      this.textX = Math.floor((this.x1 + this.x2) / 2);
    else 
      this.textX = this.x1 + this.textMargin; // left align is default

    // change y coordinates for diff vertical alignments
    if (this.verticalAlign == "top") {
      this.textY = this.y1;

      // hack for vertical alignment of editor
      this.editor.style.paddingTop = "0px";
    }
    else {
      // center is default
      var ht = this.ctx.measureText("_").width * 2;
      var textHeight = (this.wrappedText.length + 1) * ht;
      var boxHeight = this.y2 - this.y1;

      var offset = Math.floor((boxHeight - textHeight) / 2);
      // dont extend above container
      offset = Math.max(0, offset);
      this.textY = (this.y1 + offset);

      // hack for vertical alignment of editor
      this.editor.style.paddingTop = offset + "px";
    }

    this.hitCtx.fillStyle = this.hashColor;
    this.hitCtx.strokeStyle = this.hashColor;
  }
  
  drawText() {
    this.textEntered();

    // approximate height
    var ht = this.ctx.measureText("_").width * 2;
    var lineY = this.textY + ht;
    this.ctx.fillStyle = "#000";
    for (var i = 0; i < this.wrappedText.length; i++) {
      // don't fill past container
      if (lineY + ht > this.y2) {
        this.ctx.fillText("...", this.textX, lineY);
        break;
      }

      this.ctx.fillText(this.wrappedText[i], this.textX, lineY);
      lineY += ht;
    }
    this.ctx.stroke();
  }

  /** FlowchartBox.move
   */
  move(deltaX, deltaY) {
    this.x1 += deltaX;
    this.x2 += deltaX;
    this.y1 += deltaY;
    this.y2 += deltaY; 

    // move editor with box
    this.positionEditor();

    // move resize point with box
    this.resizePoint.x += deltaX;      
    this.resizePoint.y += deltaY;
  }

  /** resize
   *    cause box to change width by deltaX, height by deltaY,
   *    with top left corner staying in same position. 
   *    Gets called by child resizePoint.
   *
   *    If resize would invert box, don't allow it.
   */
  resize(deltaX, deltaY) {
    this.x2 += deltaX;
    this.y2 += deltaY;

    if (this.x2 < this.x1)
      this.x2 = this.x1;
    if (this.y2 < this.y1)
      this.y2 = this.y1;

    this.width = this.x2 - this.x1;
    this.height = this.y2 - this.y1;

    // resize editor as well
    this.positionEditor();

    // re-render text
    this.textEntered();
   
    // move resize point
    this.resizePoint.x = this.x2;
    this.resizePoint.y = this.y2;
  }

  /** click(event)
   *  bring up <textarea> to edit text
   */
  click(event) {
    super.click(event);
    this.editor.hidden = false;

    // necessary for focus/select behavior
    event.preventDefault();
    this.editor.select();
  } 


  /** FlowchartBox.deactivate
   *    hide editor and format text
   */
  deactivate() {
    super.deactivate();
    this.editor.hidden = true;
    this.textEntered();
  }

  /** FlowchartBox.textEntered
   *    performs word wrap 
   */
  textEntered() {
    var words = this.editor.value.split(" ");

    var wrappedText = [];
      
    var line = "";
    var lineWidth = 0;
    var wordWidth = 0;

    for (var i = 0; i < words.length; i++) {
      wordWidth = this.ctx.measureText(words[i] + " ").width;
      // check for horizontal overflow of a single word
      if (wordWidth > this.width - (2 * this.textMargin)) {
        wrappedText.push("...");
      }
      else { 
        lineWidth += wordWidth;
        if (lineWidth > this.width - (2 * this.textMargin)) {
          // draw current line and reset
          wrappedText.push(line);
          lineWidth = wordWidth;
          line = "";
        }
        line += words[i] + " ";
      }
    }
    // add final line if total string was nonempty
    if (this.editor.value != "")
      wrappedText.push(line);
    
    this.wrappedText = wrappedText;
  }
}

class RectBox extends FlowchartBox {

  constructor(canvasState, x1, y1, x2, y2) {
    super(canvasState, x1, y1, x2, y2);

    // set borderThickness lower for rect command
    this.borderThickness = 2;
  }

  static outline(cState) {
    cState.ctx.strokeStyle = "#000";
    var w = cState.mouseMove.x - cState.mouseDown.x;
    var h = cState.mouseMove.y - cState.mouseDown.y;
    cState.ctx.rect(cState.mouseDown.x, cState.mouseDown.y, w, h);
    cState.ctx.stroke();
  }

  /** RectBox.draw
   *    renders rectangular box on main canvas
   *    and hitCanvas and draws wrapped words
   */
  draw(active=false) {
    this.configureOptions();
    super.draw(active);

    this.ctx.beginPath();
    this.ctx.rect(this.x1, this.y1, this.width, this.height);
    this.ctx.fillRect(this.x1, this.y1, this.width, this.height);
    this.ctx.stroke();
    
    // helper method for text
    if (this.editor.hidden)
      this.drawText();

    // draw to hit detection canvas
    this.hitCtx.beginPath();
    this.hitCtx.fillRect(this.x1, this.y1, this.width, this.height);
    this.hitCtx.stroke();

    this.resizePoint.draw();
  }


}

class RoundBox extends FlowchartBox {
  
  constructor(canvasState, x1, y1, x2, y2) {
    super(canvasState, x1, y1, x2, y2);


    this.radius = 10;

    // need extra border thickness parameter
    // because using custom path instead of ctx.rect()
    this.borderThickness = 2;
  } 

  configureOptions() {
    super.configureOptions();
    this.ctx.lineWidth = this.borderThickness;
  }

  /** RoundBox.draw
   */
  draw(active=false) {
    this.configureOptions();
    super.draw(active);

    // draw rounded box
    this.ctx.beginPath();
    
    this.ctx.moveTo(this.x1 + this.radius, this.y1);
    this.ctx.lineTo(this.x2 - this.radius, this.y1);
    this.ctx.quadraticCurveTo(this.x2, this.y1, this.x2, this.y1 + this.radius);
    this.ctx.lineTo(this.x2, this.y2 - this.radius);
    this.ctx.quadraticCurveTo(this.x2, this.y2, this.x2 - this.radius, this.y2);
    this.ctx.lineTo(this.x1 + this.radius, this.y2);
    this.ctx.quadraticCurveTo(this.x1, this.y2, this.x1, this.y2 - this.radius);
    this.ctx.lineTo(this.x1, this.y1 + this.radius);
    this.ctx.quadraticCurveTo(this.x1, this.y1, this.x1 + this.radius, this.y1);

    this.ctx.stroke();
    this.ctx.fill();

    // helper method for text
    if (this.editor.hidden)
      this.drawText();

    // draw to hit detection canvas
    this.hitCtx.beginPath();
    this.hitCtx.fillRect(this.x1, this.y1, this.width, this.height);
    this.hitCtx.stroke();

    this.resizePoint.draw();
  }

  static outline(cState) {
    var x1 = cState.mouseDown.x;
    var y1 = cState.mouseDown.y;
    var x2 = cState.mouseMove.x;
    var y2 = cState.mouseMove.y;
    var radius = 10;

    cState.ctx.beginPath();
    cState.ctx.moveTo(x1 + radius, y1);
    cState.ctx.lineTo(x2 - radius, y1);
    cState.ctx.quadraticCurveTo(x2, y1, x2, y1 + radius);
    cState.ctx.lineTo(x2, y2 - radius);
    cState.ctx.quadraticCurveTo(x2, y2, x2 - radius, y2);
    cState.ctx.lineTo(x1 + radius, y2);
    cState.ctx.quadraticCurveTo(x1, y2, x1, y2 - radius);
    cState.ctx.lineTo(x1, y1 + radius);
    cState.ctx.quadraticCurveTo(x1, y1, x1 + radius, y1);
    cState.ctx.closePath();

    cState.ctx.stroke();
    
  }

}

class DiamondBox extends FlowchartBox {

  constructor(canvasState, x1, y1, x2, y2) {
    super(canvasState, x1, y1, x2, y2);


    // need extra border thickness parameter
    // because using custom path instead of ctx.rect()
    this.borderThickness = 2;
  } 

  /** configureOptions  
   *    set style options for drawing and redefine edge points
   */
  configureOptions() {
    super.configureOptions();
    this.ctx.lineWidth = this.borderThickness;

    var hw = Math.floor(this.width / 2);
    var hh = Math.floor(this.height / 2);
    
    this.leftX = this.x1 - hw;
    this.rightX = this.x2 + hw;
    this.midX = this.x1 + hw;
    this.topY = this.y1 - hh;
    this.bottomY = this.y2 + hh;
    this.midY = this.y1 + hh;
  }

  
  /** DiamondBox.draw
   *    currently creates diamond that
   *    circumscribes box drawn by mouse
   */
  draw(active=false) {
    this.configureOptions();
    super.draw(active);

    this.ctx.beginPath();

    this.ctx.moveTo(this.leftX, this.midY);
    this.ctx.lineTo(this.midX, this.topY);
    this.ctx.lineTo(this.rightX, this.midY);
    this.ctx.lineTo(this.midX, this.bottomY);
    this.ctx.lineTo(this.leftX, this.midY);

    this.ctx.closePath();
    this.ctx.stroke();
    this.ctx.fill();

    // draw text
    if (this.editor.hidden)
      this.drawText();

    this.hitCtx.beginPath();
    this.hitCtx.moveTo(this.leftX, this.midY);
    this.hitCtx.lineTo(this.midX, this.topY);
    this.hitCtx.lineTo(this.rightX, this.midY);
    this.hitCtx.lineTo(this.midX, this.bottomY);
    this.hitCtx.lineTo(this.leftX, this.midY);

    this.hitCtx.closePath();
    this.hitCtx.stroke();
    this.hitCtx.fill();

    this.resizePoint.draw();
  }

  static outline(cState) {
    var x1 = cState.mouseDown.x;
    var y1 = cState.mouseDown.y;
    var x2 = cState.mouseMove.x;
    var y2 = cState.mouseMove.y;
    var hw = Math.floor((x2 - x1)/ 2);
    var hh = Math.floor((y2 - y1)/ 2);

    cState.ctx.beginPath();
    cState.ctx.strokeStyle = "#000";
    cState.ctx.moveTo(x1 - hw, y1 + hh);
    cState.ctx.lineTo(x1 + hw, y1 - hh);
    cState.ctx.lineTo(x2 + hw, y1 + hh);
    cState.ctx.lineTo(x1 + hw, y2 + hh);
    cState.ctx.lineTo(x1 - hw, y1 + hh);
    
    cState.ctx.stroke();
  }
}


class ParallelogramBox extends FlowchartBox {
  constructor(canvasState, x1, y1, x2, y2) {
    super(canvasState, x1, y1, x2, y2);

    // need extra border thickness parameter
    // because using custom path instead of ctx.rect()
    this.borderThickness = 2;

    this.skewSlope = 3;
  } 

  configureOptions() {
    super.configureOptions();
    this.ctx.lineWidth = this.borderThickness;

    this.bottomLeft = {
      x: this.x1 - Math.floor((this.y2 - this.y1) / this.skewSlope),
      y: this.y2,
    };

    this.topRight = {
      x: this.x2 - Math.floor((this.y2 - this.y1) / -this.skewSlope),
      y: this.y1,
    };
  }

  draw(active=false) {
    this.configureOptions();
    super.draw(active);

    this.ctx.beginPath();
    this.ctx.moveTo(this.bottomLeft.x, this.bottomLeft.y);
    this.ctx.lineTo(this.x1, this.y1);
    this.ctx.lineTo(this.topRight.x, this.topRight.y);
    this.ctx.lineTo(this.x2, this.y2);
    this.ctx.lineTo(this.bottomLeft.x, this.bottomLeft.y);
    this.ctx.stroke();
    this.ctx.fill();

    if (this.editor.hidden)
      this.drawText();

    this.hitCtx.beginPath();
    this.hitCtx.moveTo(this.bottomLeft.x, this.bottomLeft.y);
    this.hitCtx.lineTo(this.x1, this.y1);
    this.hitCtx.lineTo(this.topRight.x, this.topRight.y);
    this.hitCtx.lineTo(this.x2, this.y2);
    this.hitCtx.lineTo(this.bottomLeft.x, this.bottomLeft.y);
    this.hitCtx.stroke();
    this.hitCtx.stroke();
    this.hitCtx.fill();

    this.resizePoint.draw();
  }

  static outline(cState) {
    var x1 = cState.mouseDown.x;
    var y1 = cState.mouseDown.y;
    var x2 = cState.mouseMove.x;
    var y2 = cState.mouseMove.y;
    var skewSlope = 3;

    var bottomLeft = {
      x: x1 - Math.floor((y2 - y1) / skewSlope),
      y: y2,
    };

    var topRight = {
      x: x2 - Math.floor((y2 - y1) / -skewSlope),
      y: y1,
    };
    cState.ctx.beginPath();
    cState.ctx.moveTo(bottomLeft.x, bottomLeft.y);
    cState.ctx.lineTo(x1, y1);
    cState.ctx.lineTo(topRight.x, topRight.y);
    cState.ctx.lineTo(x2, y2);
    cState.ctx.lineTo(bottomLeft.x, bottomLeft.y);
    cState.ctx.stroke();
  }
}


class Connector extends FlowchartBox {
  constructor(canvasState, x1, y1, x2, y2) {

    // force x2, y2 to be bottom right point
    // on circumference of circle
    var dx = Math.pow(x2 - x1, 2);
    var dy = Math.pow(y2 - y1, 2);
    var radius = Math.floor(Math.sqrt(dx + dy) / 2);
    var r2 = Math.floor(radius / Math.sqrt(2));
    x2 = x1 + (r2 * 2);
    y2 = y1 + (r2 * 2);
    super(canvasState, x1, y1, x2, y2);

    // default fill
    this.fill = "#fff";
    this.border = "#000";
    this.borderThickness = 2;

    this.textMargin = 1;
    this.editor.style.padding = "0px";
  }

  configureOptions() {
    super.configureOptions();
    this.ctx.lineWidth = this.borderThickness;

    var dx = Math.pow(this.x2 - this.x1, 2);
    var dy = Math.pow(this.y2 - this.y1, 2);
    this.radius = Math.floor(Math.sqrt(dx + dy) / 2);
    var r2 = Math.floor(this.radius / Math.sqrt(2));
    this.centerX = this.x1  + r2;
    this.centerY = this.y1 + r2;

    this.hitCtx.fillStyle = this.hashColor;
    this.hitCtx.strokeStyle = this.hashColor;
  }

  /**  Connector.draw
   */
  draw(active=false) {
    this.configureOptions();
    super.draw(active);

    this.ctx.beginPath();
    this.ctx.arc(this.centerX, this.centerY, this.radius, 0, Math.PI * 2);
    this.ctx.stroke();
    this.ctx.fill();

    if (this.editor.hidden)
      this.drawText();

    this.hitCtx.beginPath();
    this.hitCtx.arc(this.centerX, this.centerY, this.radius, 0, Math.PI * 2);
    this.hitCtx.stroke();
    this.hitCtx.fill();

    this.resizePoint.draw();
  }

  resize(deltaX, deltaY) {
    var delta = Math.max(deltaX, deltaY);
    super.resize(delta, delta);
  }


  static outline(cState) {
    var x1 = cState.mouseDown.x;
    var y1 = cState.mouseDown.y;
    var x2 = cState.mouseMove.x;
    var y2 = cState.mouseMove.y;

    var dx = Math.pow(x2 - x1, 2);
    var dy = Math.pow(y2 - y1, 2);
    var radius = Math.floor(Math.sqrt(dx + dy) / 2);

    var r2 = Math.floor(radius / Math.sqrt(2));
 
    var cX = r2 + x1;
    var cY = r2 + y1; 

    cState.ctx.beginPath();
    cState.ctx.arc(cX, cY, radius, 0, Math.PI * 2);
    cState.ctx.stroke();
  }
}

/** Arrow class for drawing arcs on canvas.
 *  Composed with ArrowHead which can 
 *  vary independently of Arrow attributes
 *
 *  Can be curved or composed of several
 *  straight segments with anchor points.
 *
 *  Main attributes:
 *    - thickness
 *    - solid/dashed
 *
 */
class Arrow extends CanvasObject {

  constructor(canvasState, x1, y1, x2, y2) {
    super(canvasState, x1, y1, x2, y2);

    this.x1 = x1;
    this.y1 = y1;
    this.x2 = x2;
    this.y2 = y2;

    // default options
    this.thickness = 2;
    this.strokeColor = "#000";
    this.dashed = false;

    // default dash pattern
    this.lineDash = [10, 10];

    // default hit thickness
    this.hitThickness = 8;

    // arrow may be 'locked' into place by parent
    this.locked = false;
  }

  config() {
    return {
      thickness: this.thickness,
      dashed: this.dashed,
    };
  }

  /** Arrow.clone
   */
  clone() {
    var copy = super.clone();

    copy.head = this.head.clone();
    copy.head.arrow = copy;
    return copy;
  }

  destroy() {
    super.destroy();
    // remove from parent anchor if exists
    if (this.locked) {
      for (var idx in this.locked.arrows) {
        if (this.locked.arrows[idx] === this) {
          delete this.locked.arrows[idx];
          break;
        }
      }
    }

  }

  getToolbar() {
    return FlowchartToolbar.getInstance(this.cState);
  }

  getOptions() {
    return ArrowOptions.getInstance(this.cState);
  }

  getStartCoordinates() {
    return {x: this.x1, y: this.y1};
  }

  /** Arrow.move
   *    translate entire arrow by deltaX, deltaY
   */
  move(deltaX, deltaY) {
    this.x1 += deltaX;
    this.x2 += deltaX;
    this.y1 += deltaY;
    this.y2 += deltaY;
  }

}


/** CurvedArrow
 *    draws curved arc with 2 control points
 */
class CurvedArrow extends Arrow {
  constructor(canvasState, x1, y1, x2, y2) {
    super(canvasState, x1, y1, x2, y2);

    // initialize control points at
    // start and end points
    this.cp1 = {
      x: this.x1,
      y: this.y1,
    };
    this.cp2 = {
      x: this.x2,
      y: this.y2,
    };
  
    this.cp1 = new ControlPoint(this.cState, this, this.x1, this.y1);
    this.cp2 = new ControlPoint(this.cState, this, this.x2, this.y2);

    // this.activePoint = this.cp1;

    this.head = new ArrowHead(canvasState, this);
  }

  /** CurvedArrow.clone
   */
  clone() {
    var copy = super.clone();
    
    // set control points
    copy.cp1.x = this.cp1.x;
    copy.cp1.y = this.cp1.y;
    copy.cp2.x = this.cp2.x;
    copy.cp2.y = this.cp2.y;
    
    return copy;  
  }

  configureOptions() {
    this.ctx.lineWidth = this.thickness;
    this.ctx.strokeStyle = this.strokeColor;

    if (this.dashed)
      this.ctx.setLineDash(this.lineDash);

    this.hitCtx.strokeStyle = this.hashColor;
    this.hitCtx.lineWidth = this.hitThickness;
  }


  /** CurvedArrow.draw
   */
  draw(active=false) {
    this.configureOptions();
    super.draw(active);

    var ctx = this.cState.ctx;
    var hitCtx = this.cState.hitCtx;

    ctx.beginPath();
    ctx.moveTo(this.x1, this.y1);
    ctx.bezierCurveTo(
      this.cp1.x, this.cp1.y, this.cp2.x, this.cp2.y, this.x2, this.y2
    );
    ctx.stroke();

    // undo linedash
    if (this.dashed)
      this.ctx.setLineDash([]);      

    hitCtx.beginPath();
    hitCtx.moveTo(this.x1, this.y1);
    hitCtx.bezierCurveTo(
      this.cp1.x, this.cp1.y, this.cp2.x, this.cp2.y, this.x2, this.y2
    );
    hitCtx.stroke();

    // draw control points if active
    if (this === this.cState.activeParent()) {
      this.cp1.draw();
      this.cp2.draw(); 
    }

    // draw head so it appears on top
    this.head.draw(active);
  }

  static outline(cState) {
    var ctx = cState.ctx;
    var x1 = cState.mouseDown.x;
    var y1 = cState.mouseDown.y;
    var x2 = cState.mouseMove.x;
    var y2 = cState.mouseMove.y;


    ctx.strokeStyle = "#000";
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  /** return ending angle using bezier math (t = 1)
   */
  endingAngle() {
    var dx = this.x2 - this.cp2.x;
    var dy = this.y2 - this.cp2.y;
    
    if (this.cp2.x == this.x2 && this.cp2.y == this.y2) {
      dx = this.x2 - this.x1;
      dy = this.y2 - this.y1;
    }
      
    return -Math.atan2(dx, dy) + 0.5*Math.PI;
  }


  /** CurvedArrow.move
   *    translate entire arrow by deltaX, deltaY
   *
   *    if arrow is locked to parent (e.g. array)
   *    don't allow user to move arrow directly
   */
  move(deltaX, deltaY, fromParent=false) {
    if (! this.locked || fromParent) {
      super.move(deltaX, deltaY);
      this.cp1.x += deltaX;
      this.cp2.x += deltaX;
      this.cp1.y += deltaY;
      this.cp2.y += deltaY;
    }
  }
}


/** RightAngleArrow to handle
 *  arrow composed of solely right angles.
 *
 *  To add a new right angle: hold ctrl,
 *  click on arrow head,
 *  and drag in new direction.
 *
 */
class RightAngleArrow extends Arrow {
  constructor(canvasState, x1, y1, x2, y2) {
    super(canvasState, x1, y1, x2, y2); 

    // force axis alignment
    this.y2 = this.y1;

    this.anglePoints = [];
    this.addedNewAngle = false;

    // create ArrowHead
    // (handled here because of forced alignment)
    this.head = new ArrowHead(canvasState, this);
  }

  /** RightAngleArrow.clone
   */
  clone() {
    var copy = super.clone();

    // copy angle points -- somehow broken currently
    // var copyPoint = {x: 0, y: 0};
    // this.anglePoints.forEach((point) => {
    //   copyPoint.x = point.x;
    //   copyPoint.y = point.y;
    //   copy.anglePoints.push(copyPoint);
    //   console.log("adding point at ", point);
    // }); 
  
    return copy;
  }


  /** endingOrientation()
   *    return up/down/left/right
   *    so arrowhead can be positioned appropriately
   */
  endingOrientation() {
    var penultimate = null;
    if (this.anglePoints.length > 0) 
      penultimate = this.anglePoints[this.anglePoints.length-1];
    else
      penultimate = {x: this.x1, y: this.y1};

    //up
    if (this.y2 - penultimate.y < 0) 
      return "U"; 
    //down
    if (this.y2 - penultimate.y > 0)
      return "D";      
    //left
    if (this.x2 - penultimate.x < 0)      
      return "L"
    //right
    if (this.x2 - penultimate.x > 0)
      return "R";

    // default
    return "R";
  }

  endingAngle() {
    var penultimate = null;
    if (this.anglePoints.length > 0) 
      penultimate = this.anglePoints[this.anglePoints.length-1];
    else
      penultimate = {x: this.x1, y: this.y1};
    var dx = this.x2 - penultimate.x;
    var dy = this.y2 - penultimate.y;
    return -Math.atan2(dx, dy) + 0.5*Math.PI;
  }

  configureOptions() {
    this.ctx.lineWidth = this.thickness;
    this.ctx.strokeStyle = this.strokeColor;

    if (this.dashed)
      this.ctx.setLineDash(this.lineDash);

    this.hitCtx.strokeStyle = this.hashColor;
    this.hitCtx.lineWidth = this.hitThickness;
  }

  /** RightAngleArrow.draw()
   *    draw line segments to canvas
   *    (draw slightly thicker on hit canvas so
   *    arrow can be more easily clicked)
   */
  draw(active=false) {
    this.configureOptions();
    super.draw(active);

    var curX = this.x1;
    var curY = this.y1;

    var ctx = this.ctx;
    var hitCtx = this.hitCtx;

    ctx.beginPath();
    ctx.moveTo(curX, curY);

    hitCtx.beginPath();
    hitCtx.moveTo(curX, curY);

    this.anglePoints.forEach(function(point) {
      ctx.lineTo(point.x, point.y);
      ctx.moveTo(point.x, point.y);

      hitCtx.lineTo(point.x, point.y);
      hitCtx.moveTo(point.x, point.y);

      curX = point.x;
      curY = point.y;
    });

    ctx.lineTo(this.x2, this.y2);
    ctx.stroke();

    if (this.dashed)
      this.ctx.setLineDash([]);

    hitCtx.lineTo(this.x2, this.y2);
    hitCtx.stroke();

    this.head.draw(active);
  }

  /** RightAngleArrow.move
   */
  move(deltaX, deltaY) {
    this.x1 += deltaX;
    this.y1 += deltaY;

    this.anglePoints.forEach(function(point) {
      point.x += deltaX;
      point.y += deltaY;
    });

    this.x2 += deltaX;
    this.y2 += deltaY;
  }

  static outline(cState) {
    var x1 = cState.mouseDown.x;
    var y1 = cState.mouseDown.y;
    var x2 = cState.mouseMove.x;     

    cState.ctx.strokeStyle = "#000";
    cState.ctx.beginPath();
    cState.ctx.moveTo(x1, y1);
    cState.ctx.lineTo(x2, y1);
    cState.ctx.stroke();
  }

}


/** Handles drawing of arrow head using
 *  rotation and translation
 */
class ArrowHead extends CanvasChildObject {
  constructor(canvasState, parentArrow) {
    super(canvasState);

    this.arrow = parentArrow;

    this.hollow = true;
    this.fill = "#fff";

    this.width = 10;
    this.height = 10;
  }

  /** ArrowHead.config
   *    Configurable options for cloning
   */
  config() {
    return {
      hollow: this.hollow,
      fill: this.fill,
    };
  }

  getParent() {
    return this.arrow.getParent();
  }

  getStartCoordinates() {
    return {x: this.arrow.x2, y: this.arrow.y2};
  }
  
  configureOptions() {
    this.ctx.strokeStyle = this.arrow.strokeColor;
    this.ctx.fillStyle = this.fill;
    this.hitCtx.fillStyle = this.hashColor;
  }

  /** ArrowHead.draw
   */
  draw(active) {
    this.configureOptions();
  
    if (active)
      this.ctx.strokeStyle = this.cState.activeBorder;

    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.translate(this.arrow.x2, this.arrow.y2);
    this.ctx.rotate(this.arrow.endingAngle());

    var hw = Math.floor(this.width / 2);
    // this.ctx.moveTo(0, -hw);
    // if (this.hollow) {
    //   this.ctx.lineTo(this.height, 0);
    //   this.ctx.lineTo(0, hw);
    //   this.ctx.moveTo(this.height, 0);
    //   this.ctx.lineTo(0, -hw);
    //   this.ctx.moveTo(this.height, 0);
    //   this.ctx.lineTo(0, 0);
    // }
    // else {
    //   this.ctx.lineTo(this.height, 0);
    //   this.ctx.lineTo(0, hw);
    //   this.ctx.lineTo(0, -hw);
    //   this.ctx.fill();
    // }
    
    if (this.hollow) {
      this.ctx.moveTo(0, 0);
      this.ctx.lineTo(-this.height, -hw);
      this.ctx.moveTo(0, 0);
      this.ctx.lineTo(-this.height, hw);
    }
    else {
      this.ctx.moveTo(0, 0);
      this.ctx.lineTo(-this.height, -hw);
      this.ctx.lineTo(-this.height, hw);
      this.ctx.lineTo(0, 0);
      this.ctx.fill();
    }
    
    this.ctx.stroke();
    this.ctx.restore();

    this.hitCtx.save();
    this.hitCtx.beginPath();
    this.hitCtx.translate(this.arrow.x2, this.arrow.y2);
    this.hitCtx.rotate(this.arrow.endingAngle());

    // draw twice as big as actual arrow head
    this.hitCtx.moveTo(0, 0);
    this.hitCtx.lineTo(-2 * this.height, -this.width);
    this.hitCtx.lineTo(-2 * this.height, this.width);

    this.hitCtx.fill();
    this.hitCtx.restore();
  }

  release() {
    if (this.arrow instanceof RightAngleArrow)
      this.arrow.addedNewAngle = false;
  }

  /** ArrowHead.drag
   *    shift arrow end point by deltaX, deltaY
   *    and add a new anglePoint if RightAngleArrow 
   */
  drag(deltaX, deltaY, fromParent=false) {
    if (this.arrow instanceof RightAngleArrow) {
      var ori = this.arrow.endingOrientation();
      
      var addNew = this.cState.hotkeys[SHIFT];

      if (addNew && !this.arrow.addedNewAngle) {
        // dont allow user to add more than one angle per drag
        this.arrow.addedNewAngle = true;

        this.arrow.anglePoints.push({x: this.arrow.x2, y: this.arrow.y2});
        if (ori == "U" || ori == "D") {
          this.arrow.x2 += deltaX;
        } else {
          this.arrow.y2 += deltaY;    
        }
      } else {
        if (ori == "U" || ori == "D") {
          this.arrow.y2 += deltaY;    
        } else {
          this.arrow.x2 += deltaX;
        }
      }

      // check if tip is on anchor point
      // TODO:
      //  need to consider case where arrow is created later
      //  and thus its color is on top
      //  -> easy fix: just check color 1 pixel ahead of arrow
      // var ori = this.arrow.endingOrientation();
      // var x = this.arrow.x2;
      // var y = this.arrow.y2;

      // var anchorRadius = 10;

      // if (ori == "L")
      //     x -= (this.height + anchorRadius);
      // if (ori == "R")
      //     x += (this.height + anchorRadius);
      // if (ori == "U")
      //     y -= (this.height + anchorRadius);
      // if (ori == "D")
      //     y += (this.height + anchorRadius);

      // var hoverObj = this.cState.getClickedObject(x, y);
      // var newX = this.arrow.x2;
      // var newY = this.arrow.y2;
      //     
      // if (hoverObj instanceof FlowchartBox) {
      //   // set arrow end to center of anchor - arrow tip height
      //   if (ori == "L")
      //     newX = hoverObj.x2 + this.height;
      //   if (ori == "R")
      //     newX = hoverObj.x1 - this.height;
      //   if (ori == "U")
      //     newY = hoverObj.y2 + this.height;
      //   if (ori == "D")
      //     newY = hoverObj.y1 - this.height;
      //   
      //   this.arrow.x2 = newX;
      //   this.arrow.y2 = newY;
      //   hoverObj.anchoredArrow = this.arrow;
      // }
    }
    else if (this.arrow instanceof CurvedArrow) {
      if (! this.arrow.locked || fromParent) {
        // just move end point to new location
        this.arrow.x2 += deltaX;
        this.arrow.y2 += deltaY;
      }
    }
  }

  /**Arrowhead.move
   */
  move(deltaX, deltaY) {
    this.arrow.move(deltaX, deltaY);
  }
}


class ResizePoint extends CanvasChildObject {
  constructor(canvasState, parentBox, x, y) {
    super(canvasState);
    this.parentBox = parentBox;

    this.x = x;
    this.y = y;

    // default radius 
    this.radius = 15;
  }

  getParent() {
    return this.parentBox.getParent();
  }

  getStartCoordinates() {
    return {x: this.x, y: this.y};
  }

  /** ResizePoint.draw
   */
  draw() {
    // only draw to hit detect canvas
    this.hitCtx.fillStyle = this.hashColor;
    this.hitCtx.beginPath();
    this.hitCtx.arc(this.x, this.y, this.radius, 0, 2 * Math.PI);
    this.hitCtx.fill();
  }

  /** ResizePoint.drag
   *    should cause parent to resize
   */
  drag(deltaX, deltaY) {
    this.parentBox.resize(deltaX, deltaY);
  }

  /** hover
   *    change mouse pointer to resize shape
   */
  hover() {
    document.body.style.cursor = "nwse-resize";     
  }
}


/** ControlPoint
 *    used to define curvature of CurvedArrow (bezier curve)
 */
class ControlPoint extends CanvasChildObject {
  constructor(canvasState, parentArrow, x, y) {
    super(canvasState);
    
    this.parentArrow = parentArrow;

    this.x = x;
    this.y = y;

    // default radius 
    this.radius = 10;

    // default fill
    this.fill = "#00f8";
  }

  getParent() {
    return this.parentArrow.getParent();
  }
  
  getStartCoordinates() {
    return {x: this.x, y: this.y}; 
  }

  /** ControlPoint.configureOptions
   */ 
  configureOptions() {
    this.ctx.fillStyle = this.fill;
    this.hitCtx.fillStyle = this.hashColor;
  }

  /** ControlPoint.draw
   */
  draw() {
    this.configureOptions();
    
    this.ctx.beginPath();
    this.ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2); 
    this.ctx.fill();

    this.hitCtx.beginPath();
    this.hitCtx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    this.hitCtx.fill();
  }

  /** ControlPoint.drag
   */
  drag(deltaX, deltaY) {
    this.x += deltaX;
    this.y += deltaY;
  }
}
