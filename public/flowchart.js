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
    this.strokeColor =  "#000";
    this.fontStyle = null;
    this.fontFamily = "Purisa";
    this.fontSize = 12;

    this.horizontalAlign = "left";
    this.verticalAlign = "top";
    this.textX = this.x1;
    this.textY = this.y1;

    this.showBorder = false;
    this.borderThickness = 2;

    // attribute to allow for slight space between edge
    // of text box and text itself
    this.textMargin = 8;

    this.wrappedText = [];

    this.createEditor();

    // add clickable point for resizing
    this.resizePoint = new ResizePoint(this.cState, this, this.x2, this.y2);
  }

  get floatingChildren() {
    return [this.resizePoint];
  }

  propTypes() {
    return {
      "fontFamily": "font",
      "fontSize": "int",
      "verticalAlign": ["top", "middle"],
      "horizontalAlign": ["left", "right", "center"],
      "fill": "color",
    };
  }

  propNames() {
    return {
        "ff": "fontFamily",
        "fontFamily": "fontFamily",
        "font": "fontSize",
        "fontSize": "fontSize",
        "fs": "fontSize",
        "va": "verticalAlign",
        "ha": "horizontalAlign",
        "bg": "fill",
        "fill": "fill",
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
      fill: this.fill,
      strokeColor: this.strokeColor,
      label: this.label,
    };
  }

  clone(cloneHandle) {
    var copy = super.clone(cloneHandle);

    // set text in clone
    copy.editor.value = this.editor.value;
    return copy;
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
    this.editor.spellcheck = false;
    this.editor.style.paddingLeft = "0";
    this.editor.style.paddingRight = "0";
    this.editor.style.position = "absolute"; 
    this.editor.style.backgroundColor = this.fill;
    // this.editor.style.background = "transparent";

    this.positionEditor();

    // disable resize
    this.editor.style.resize = "none";

    // hide until flowchart box clicked
    this.editor.hidden = true;

    // add to document body
    document.body.appendChild(this.editor);
  
    // end editing with enter key
    this.editor.onkeydown = (event) => {
      if (event.keyCode == ENTER && !hotkeys[SHIFT]) { // allow shift-enter
        this.deactivate(); // calls textEntered()
      }
    };

    this.editor.onmousedown = (event) => {
      this.cState.eventHandler.mouseDown(event);
    }
  }

  get horizontalAlign() {
    return this._horizontalAlign;
  }

  set horizontalAlign(ha) {
    if (this.editor)
      this.editor.style.textAlign = ha;
    this._horizontalAlign = ha;
  }

  get verticalAlign() {
    return this._verticalAlign;
  }

  set verticalAlign(va) {
    if (this.editor)
      this.editor.style.alignItems = va;
    this._verticalAlign = va;
  }

  /** FlowchartBox.positionEditor
   *    editor is opaque, so use margin to 
   *    actually shrink editor slightly to hide border
   */
  positionEditor() {
    // set size
    var width = this.x2 - this.x1 - 2 * this.textMargin;
    var height = this.y2 - this.y1 - 2 * this.textMargin;
    this.editor.style.width = width + "px";
    this.editor.style.height = height + "px";

    // set position
    this.editor.style.top = this.y1 + this.textMargin + "px";
    this.editor.style.left = this.x1 + this.textMargin + "px";
  }

  /** FlowchartBox.configureOptions
   */
  configureOptions() {
    super.configureOptions();
    // editor bg color
    this.editor.style.backgroundColor = this.fill;

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
      var ht = this.cState.textHeight();
      var textHeight = (this.wrappedText.length + 1) * ht;
      var boxHeight = this.y2 - this.y1;

      var offset = Math.floor((boxHeight - textHeight) / 2);
      // dont extend above container
      offset = Math.max(0, offset);
      this.textY = (this.y1 + offset);

      // hack for vertical alignment of editor
      this.editor.style.paddingTop = offset + "px";
    }

    this.textY += this.textMargin;
  }
  
  /** FlowchartBox.drawText
   *    only draw text to editor context 
   *    when the <textarea> is hidden
   */
  drawText() {
    this.textEntered();
    this.ctx.textBaseline = "alphabetic";
    this.ctx.fillStyle = "#000";

    // when editing, let HTML display
    // the text. 
    // When <textarea> is deactivated, 
    // draw the text to the canvas.
    var ctx = this.editor.hidden ? this.ctx : this.ctx.recCtx;

    // approximate height
    var ht = this.cState.textHeight();
    var lineY = this.textY + ht;

    for (var i = 0; i < this.wrappedText.length; i++) {
      var text = this.wrappedText[i];
      // don't fill past container
      if (lineY + ht > this.y2) {
        ctx.fillText("...", this.textX, lineY);
        ctx.stroke();
        return;
      }

      ctx.fillText(text, this.textX, lineY);
      lineY += ht;
    }
    ctx.stroke();
  }

  static outline(ctx, x1, y1, x2, y2) {
    ctx.lineWidth = 1;
    ctx.strokeStyle = "#000";
    ctx.beginPath();
    ctx.rect(x1, y1, x2-x1, y2-y1);
    ctx.stroke();
  }

  /** FlowchartBox.move
   */
  move(deltaX, deltaY) {
    super.move(deltaX, deltaY);
    // move editor with box
    this.positionEditor();
  }

  /** FlowchartBox.resize
   *    cause box to change width by deltaX, height by deltaY,
   *    with top left corner staying in same position. 
   *    Gets called by child resizePoint.
   *
   *    If resize would invert box, don't allow it.
   */
  resize(deltaX, deltaY) {
    super.resize(deltaX, deltaY);
    // resize editor as well
    this.positionEditor();
    // re-render text
    this.textEntered();
  }

  /** FlowchartBox.click
   *  bring up <textarea> to edit text
   */
  click(event) {
    super.click(event);
    this.editor.style.display = "flex";
    this.editor.hidden = false;

    // necessary for focus/select behavior
    // event.preventDefault();
    this.editor.select();
  } 

  /** FlowchartBox.deactivate
   *    hide editor and format text
   */
  deactivate() {
    this.editor.hidden = true;
    this.editor.style.display = "none";
    this.textEntered();
  }

  /** FlowchartBox.hover
   *    show border of text box when hovering
   *    even if border is transparent
   */
  hover() {
    super.hover();
    this.showBorder = true;
  }

  /** FlowchartBox.textEntered
   *    performs word wrap 
   */
  textEntered() {
    var lines = this.editor.value.split("\n");
    var wrappedText = lines.map(l => this.wrapText(l)).flat();
    this.wrappedText = wrappedText;
  }

  wrapText(text) {
    var words = text.split(" ");

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
        // if line is too long, push it and start a new line
        if (words[i] == "\n" || lineWidth > this.width - (2 * this.textMargin)) {
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

    return wrappedText;
  }

  /** FlowchartBox.angleToPosition
   *    map the angle of an outgoing arrow
   *    (incoming = angleToPosition(2pi - theta))
   *    to a position along the perimeter of this box
   * 
   *    a - angle in radians
   */
  angleToPosition(a) {
    var pi = Math.PI;
    while (a < 0) a += 2*pi;
    a %= 2*pi;

    const inRange = (x, y) => a >= x && a <= y
    var x, y;
    if (inRange(7*pi/4, 2*pi) || inRange(0, pi/4)) { // right
      // need to map angle from strictly increasing interval
      if (a >= 0 && a <= pi/4) 
        a = 2*pi + a;
      x = this.x2;
      y = -linMap(7*pi/4, 9*pi/4, -this.y2, -this.y1, a);
    }
    else if (inRange(pi/4, 3*pi/4)) { // top
      y = this.y1;
      x = -linMap(pi/4, 3*pi/4, -this.x2, -this.x1, a);
    }
    else if (inRange(3*pi/4, 5*pi/4)) { // right
      x = this.x1;
      y = linMap(3*pi/4, 5*pi/4, this.y1, this.y2, a);
    }
    else if (inRange(5*pi/4, 7*pi/4)) { // bottom
      y = this.y2;
      x = linMap(5*pi/4, 7*pi/4, this.x1, this.x2, a);
    }
    return { x : x, y : y};
  }

  /** FlowchartBox.lockArrow
   *    put tip of arrow on edge of box and use
   *    angle to determine position and side
   * 
   *    angleToPosition function maps the angle
   *    of an outgoing arrow 
   *
   *    move control point as well to avoid oscillation
   *    between two different angles 
   *    (visual glitch that occurs when control point is inside node)
   */
  lockArrow(arrow, dir) {
    var myCenter = this.objectCenter();
    var startAngle = arrow.angleToCP(1, myCenter.x, myCenter.y);
    var endAngle = arrow.angleToCP(2, myCenter.x, myCenter.y);

    if (dir == "from") {
      var anchorPos = this.angleToPosition(startAngle);
      arrow.x1 = anchorPos.x;
      arrow.y1 = anchorPos.y;
    }
    else if (dir == "to") {
      var anchorPos = this.angleToPosition(endAngle);
      arrow.x2 = anchorPos.x;
      arrow.y2 = anchorPos.y;
    }
  }
}

class RectBox extends FlowchartBox {
  /** RectBox.draw
   *    renders rectangular box on main canvas
   *    and hitCanvas and draws wrapped words
   */
  draw() {
    

    this.ctx.beginPath();
    this.ctx.rect(this.x1, this.y1, this.width, this.height);
    this.ctx.fillRect(this.x1, this.y1, this.width, this.height);
    this.ctx.stroke();
    
    // helper method for text
    this.drawText();

    // draw to hit detection canvas
    this.hitCtx.beginPath();
    this.hitCtx.fillRect(this.x1, this.y1, this.width, this.height);
    this.hitCtx.stroke();

    this.resizePoint.configAndDraw();
  }

}

class RoundBox extends FlowchartBox {
  
  constructor(canvasState, x1, y1, x2, y2) {
    super(canvasState, x1, y1, x2, y2);

    this.radius = 10;
  } 

  /** RoundBox.draw
   */
  draw() {
    

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
    this.drawText();

    // draw to hit detection canvas
    this.hitCtx.beginPath();
    this.hitCtx.fillRect(this.x1, this.y1, this.width, this.height);
    this.hitCtx.stroke();

    this.resizePoint.configAndDraw();
  }

  /** RoundBox.outline
   */
  static outline(ctx, x1, y1, x2, y2) {
    ctx.strokeStyle = "#000";
    var radius = 10;

    ctx.beginPath();
    ctx.moveTo(x1 + radius, y1);
    ctx.lineTo(x2 - radius, y1);
    ctx.quadraticCurveTo(x2, y1, x2, y1 + radius);
    ctx.lineTo(x2, y2 - radius);
    ctx.quadraticCurveTo(x2, y2, x2 - radius, y2);
    ctx.lineTo(x1 + radius, y2);
    ctx.quadraticCurveTo(x1, y2, x1, y2 - radius);
    ctx.lineTo(x1, y1 + radius);
    ctx.quadraticCurveTo(x1, y1, x1 + radius, y1);
    ctx.closePath();

    ctx.stroke();
  }

}

class DiamondBox extends FlowchartBox {

  /** configureOptions  
   *    set style options for drawing and redefine edge points
   */
  configureOptions() {
    super.configureOptions();


    var hw = Math.floor(this.width / 2);
    var hh = Math.floor(this.height / 2);
  }

  get hw() { return Math.floor(this.width / 2); }

  get hh() { return Math.floor(this.height / 2); }

  get leftX() { return this.x1 - this.hw; }

  get rightX() { return this.x2 + this.hw; } 

  get midX() { return this.x1 + this.hw; } 

  get topY() { return this.y1 - this.hh; } 

  get bottomY() { return this.y2 + this.hh; }

  get midY() { return this.y1 + this.hh; }

  /** DiamondBox.draw
   *    currently creates diamond that
   *    circumscribes box drawn by mouse
   */
  draw() {
    

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

    this.resizePoint.configAndDraw();
  }

  /** DiamondBox.outline
   */
  static outline(ctx, x1, y1, x2, y2) {
    ctx.strokeStyle = "#000";
    var hw = Math.floor((x2 - x1)/ 2);
    var hh = Math.floor((y2 - y1)/ 2);

    ctx.beginPath();
    ctx.moveTo(x1 - hw, y1 + hh);
    ctx.lineTo(x1 + hw, y1 - hh);
    ctx.lineTo(x2 + hw, y1 + hh);
    ctx.lineTo(x1 + hw, y2 + hh);
    ctx.lineTo(x1 - hw, y1 + hh);
    
    ctx.stroke();
  }

  /** DiamondBox.angleToPosition
   *    maps angles to points along the perimeter
   *    of this diamond
   * @param {*} a - angle of outgoing/incoming arrow
   *              i.e. angle from center of anchor 
   *                   object to control point
   */
  angleToPosition(a) {
    var pi = Math.PI;
    while (a < 0) a += 2*pi;
    a %= 2*pi;

    const inRange = (x, y) => a >= x && a <= y
    var x, y;
    if (inRange(0, pi/2)) { // upper right side
      x = -linMap(0, pi/2, -this.rightX, -this.midX, a);
      y = -linMap(0, pi/2, -this.midY, -this.topY, a);
    }
    else if (inRange(pi/2, pi)) { // upper left side
      x = -linMap(pi/2, pi, -this.midX, -this.leftX, a);
      y = linMap(pi/2, pi, this.topY, this.midY, a);
    }
    else if (inRange(pi, 3*pi/2)) { // lower left side
      x = linMap(pi, 3*pi/2, this.leftX, this.midX, a);
      y = linMap(pi, 3*pi/2, this.midY, this.bottomY, a);
    }
    else { // lower right side
      while (a < 0) a += 2*pi;
      x = linMap(3*pi/2, 2*pi, this.midX, this.rightX, a);
      y = -linMap(3*pi/2, 2*pi, -this.bottomY, -this.midY, a);
    }
    return { x : x, y : y};
  }
}

class ParallelogramBox extends FlowchartBox {
  constructor(canvasState, x1, y1, x2, y2) {
    super(canvasState, x1, y1, x2, y2);

    this.skewSlope = 3;
  } 

  get outerRight() {
    return this.x2 + Math.floor(this.height / this.skewSlope);
  }

  get innerRight() {
    return this.x2;
  }

  get outerLeft() {
    return this.x1 - Math.floor(this.height / this.skewSlope);
  }

  get innerLeft() {
    return this.x1;
  }

  /** ParallelogramBox.draw
   */
  draw() {
    

    this.ctx.beginPath();
    this.ctx.moveTo(this.outerLeft, this.y2);
    this.ctx.lineTo(this.x1, this.y1);
    this.ctx.lineTo(this.outerRight, this.y1);
    this.ctx.lineTo(this.x2, this.y2);
    this.ctx.lineTo(this.outerLeft, this.y2);
    this.ctx.stroke();
    this.ctx.fill();

    this.drawText();

    this.hitCtx.beginPath();
    this.hitCtx.moveTo(this.outerLeft, this.y2);
    this.hitCtx.lineTo(this.x1, this.y1);
    this.hitCtx.lineTo(this.outerRight, this.y1);
    this.hitCtx.lineTo(this.x2, this.y2);
    this.hitCtx.lineTo(this.outerLeft, this.y2);
    this.hitCtx.stroke();
    this.hitCtx.stroke();
    this.hitCtx.fill();

    this.resizePoint.configAndDraw();
  }

  /** ParallelogramBox.outline
   */
  static outline(ctx, x1, y1, x2, y2) {
    ctx.strokeStyle = "#000";
    var skewSlope = 3;

    var bottomLeft = {
      x: x1 - Math.floor((y2 - y1) / skewSlope),
      y: y2,
    };

    var topRight = {
      x: x2 - Math.floor((y2 - y1) / -skewSlope),
      y: y1,
    };
    ctx.beginPath();
    ctx.moveTo(bottomLeft.x, bottomLeft.y);
    ctx.lineTo(x1, y1);
    ctx.lineTo(topRight.x, topRight.y);
    ctx.lineTo(x2, y2);
    ctx.lineTo(bottomLeft.x, bottomLeft.y);
    ctx.stroke();
  }

  /** ParallelogramBox.angleToPosition
   *    maps angles to points along the perimeter
   *    of this paralellogram
   * @param {*} a - angle of outgoing/incoming arrow
   *              i.e. angle from center of anchor 
   *                   object to control point
   */
  angleToPosition(a) {
    var pi = Math.PI;
    while (a < 0) a += 2*pi;
    a %= 2*pi;

    const inRange = (x, y) => a >= x && a <= y
    var x, y;
    if (inRange(7*pi/4, 2*pi) || inRange(0, pi/4)) { // right
      // need to map angle from strictly increasing interval
      if (a >= 0 && a <= pi/4) 
        a = 2*pi + a;
      x = linMap(7*pi/4, 9*pi/4, this.innerRight, this.outerRight, a);
      y = -linMap(7*pi/4, 9*pi/4, -this.y2, -this.y1, a);
    }
    else if (inRange(pi/4, 3*pi/4)) { // top
      y = this.y1;
      x = -linMap(pi/4, 3*pi/4, -this.outerRight, -this.x1, a);
    }
    else if (inRange(3*pi/4, 5*pi/4)) { // left
      x = linMap(3*pi/4, 5*pi/4, this.innerLeft, this.outerLeft, a);
      y = linMap(3*pi/4, 5*pi/4, this.y1, this.y2, a);
    }
    else if (inRange(5*pi/4, 7*pi/4)) { // bottom
      y = this.y2;
      x = linMap(5*pi/4, 7*pi/4, this.outerLeft, this.x2, a);
    }
    return { x : x, y : y};
  }

}

class TextBox extends FlowchartBox {
  constructor(canvasState, x1, y1, x2, y2) {
    super(canvasState, x1, y1, x2, y2);
    this.fill = "transparent";
    this.strokeColor = "gray";

    this.lineDash = [1, 2];
  }

  propTypes() {
    return {
      "fontFamily": "font",
      "fontSize": "int",
      "verticalAlign": ["top", "middle"],
      "horizontalAlign": ["left", "right", "center"],
    };
  }

  propNames() {
    return {
      "ff": "fontFamily",
      "fontFamily": "fontFamily",
      "font": "fontSize",
      "fontSize": "fontSize",
      "fs": "fontSize",
      "va": "verticalAlign",
      "ha": "horizontalAlign",
    }
  }

  config() {
    return {
      fontStyle: this.fontStyle,
      fontFamily: this.fontFamily,
      fontSize: this.fontSize,
      horizontalAlign: this.horizontalAlign,
      verticalAlign: this.verticalAlign,
      label: this.label,
    }
  }

  configureOptions() {
    super.configureOptions();
    this.ctx.setLineDash(this.lineDash);
  }

  /** TextBox.draw
   *    display dotted line border in editor
   *    but no border in recording
   */
  draw() {
    

    this.ctx.editCtx.beginPath();
    this.ctx.editCtx.rect(this.x1, this.y1, this.width, this.height);
    this.ctx.editCtx.fillRect(this.x1, this.y1, this.width, this.height);
    this.ctx.editCtx.stroke();
    
    this.drawText();

    // draw to hit detection canvas
    this.hitCtx.beginPath();
    this.hitCtx.fillRect(this.x1, this.y1, this.width, this.height);
    this.hitCtx.stroke();

    this.resizePoint.configAndDraw();

    // undo lineDash
    this.ctx.setLineDash([]);
  }
}

class MathBox extends TextBox {
  constructor(cState, x1, y1, x2, y2) {
    super(cState, x1, y1, x2, y2);
    this.svg = null;
    this.fontFamily = "monospace";
    this.fontSize = 24;

    // apply text render
    this.editor.onkeydown = (event) => {
      if (event.keyCode == ENTER) {
        this.deactivate();
        var body = { text: this.editor.value, label: this.label };
        ClientSocket.sendServer("renderMath", body);
      }
    };
  }

  config() {
    return {
      ...super.config(),
      svg: this.svg,
    };
  }

  /** MathBox.setMath
   *    gets called once client receives
   *    rendered svg from server
   *
   *    TODO fix case of \require{}
   */
  setMath(mathSVG) {
    this.svg = new Image();
    var src = "data:image/svg+xml; charset=utf8, " + 
      encodeURIComponent(mathSVG.replace(/></g, ">\n\r<"));
    this.svg.src = src;
    this.svg.onload = repaint;
  }

  /** MathBox.drawText
   */
  drawText() {
    this.textEntered();
    if (! this.editor.hidden) // if currently editing, don't draw image
      return super.drawText();
    if (this.editor.value == "") return;
    if (this.svg && this.x1 && this.y1 && this.width && this.height && this.editor.hidden) {
      // mathjax rendering may fail
      try {
          this.ctx.drawImage(this.svg, this.x1, this.y1, this.width, this.height);
      }
      catch (err) {
        console.warn("Error rendering latex");
      }
    }
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
  }

  get radius() {
    var dx = Math.pow(this.width, 2);
    var dy = Math.pow(this.height, 2);
    return Math.floor(Math.sqrt(dx + dy) / 2);
  }

  /**  Connector.draw
   */
  draw() {
    var center = this.objectCenter();

    this.ctx.beginPath();
    this.ctx.arc(center.x, center.y, this.radius, 0, Math.PI * 2);
    this.ctx.stroke();
    this.ctx.fill();

    this.drawText();

    this.hitCtx.beginPath();
    this.hitCtx.arc(center.x, center.y, this.radius, 0, Math.PI * 2);
    this.hitCtx.stroke();
    this.hitCtx.fill();

    this.resizePoint.configAndDraw();
  }

  resize(deltaX, deltaY) {
    var delta = Math.max(deltaX, deltaY);
    super.resize(delta, delta);
  }

  /** Connector.outline
   */
  static outline(ctx, x1, y1, x2, y2) {
    ctx.strokeStyle = "#000";

    var dx = Math.pow(x2 - x1, 2);
    var dy = Math.pow(y2 - y1, 2);
    var radius = Math.floor(Math.sqrt(dx + dy) / 2);

    var r2 = Math.floor(radius / Math.sqrt(2));
 
    var cX = r2 + x1;
    var cY = r2 + y1; 

    ctx.beginPath();
    ctx.arc(cX, cY, radius, 0, Math.PI * 2);
    ctx.stroke();
  }


  angleToPosition(a) {
    var center = this.objectCenter();
    return { 
      x: center.x + this.radius * Math.cos(a),
      y: center.y - this.radius * Math.sin(a),
    }
  }
}

/**
 *  TODO: generalize this to cover resize point and
 *        controlpoint by passing in onDrag function
 */
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

  /** ResizePoint.hover
   *    change mouse pointer to resize shape
   */
  hover() {
    this.parentBox.hover();
    document.body.style.cursor = "nwse-resize";     
  }
}


