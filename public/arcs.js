/** Arrow class for drawing arcs on canvas.
 *  Composed with ArrowHead which can 
 *  vary independently of Arrow attributes
 *
 *  Can be curved or composed of several
 *  straight segments with anchor points.
 */
class Arrow extends CanvasObject {

  constructor(canvasState, x1, y1, x2, y2, fromAnchor, toAnchor) {
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

    // head options
    this.hollow = true;
    this.headFill = "#fff";
    this.headWidth = 10;
    this.headHeight = 10;

    // arrow may be 'locked' into place by parents
    if (fromAnchor || toAnchor) {
      this.locked = {
        from: fromAnchor,
        to: toAnchor,
      };
    }

    // subscribe to anchor objects so they can
    // update my references when they are cloned
    if (fromAnchor) {
      fromAnchor.setAnchor(this, "from");
    }

    if (toAnchor) {
      toAnchor.setAnchor(this, "to");
    }

    this.fromAnchorAlive = () => this.locked && this.locked.from && ! this.locked.from.dead;

    this.toAnchorAlive = () => this.locked && this.locked.to && ! this.locked.to.dead;

    this.startPoint = new DragPoint(this.cState, this, this.x1, this.y1);

    // initialize control points at
    // start and end points
    var midX = Math.floor((this.x1 + this.x2) / 2);
    var midY = Math.floor((this.y1 + this.y2) / 2);
    
    this.cp1 = new ControlPoint(this.cState, this, midX, midY);
    this.cp2 = new ControlPoint(this.cState, this, midX, midY);

    this.head = new ArrowHead(canvasState, this);
  }

  propTypes() {
    return {
      "thickness": "int",
      "strokeColor": "color",
      "dashed": "bool",
      "headFill": "color",
      "hollow": "bool",
      "headWidth": "int",
      "headHeight": "int",
    };
  }

  propNames() {
    return {
      "thickness": "thickness",
      "st": "thickness",
      "color": "strokeColor",
      "sc": "strokeColor",
      "dash": "dashed",
      "headFill": "headFill",
      "hc": "headFill",
      "hf": "headFill",
      "hollow": "hollow",
      "hw": "headWidth",
      "hh": "headHeight",
    };
  }

  static defaultCoordinates(cState) {
    var center = cState.getCenter();
    var w = 200;
    return {
      x1: center.x,
      y1: center.y,
      x2: center.x + w,
      y2: center.y,
    };
  }

  /** Arrow.config
   */
  config() {
    return {
      thickness: this.thickness,
      dashed: this.dashed,
      hollow: this.hollow,
      headFill: this.headFill,
      headWidth: this.headWidth,
      headHeight: this.headHeight,
      label: this.label,
      strokeColor: this.strokeColor,
    };
  }


  getStartCoordinates() {
    return {x: this.x1, y: this.y1};
  }

  /** Arrow.configureOptions
   *    set drawing options and update endpoints
   *    if locked to parent
   */
  configureOptions() {
    super.configureOptions();
    this.ctx.lineWidth = this.thickness;
    if (this.dashed)
      this.ctx.setLineDash(this.lineDash);

    this.hitCtx.lineWidth = this.hitThickness;

    if (this.fromAnchorAlive()) this.locked.from.lockArrow(this, "from");
    if (this.toAnchorAlive()) this.locked.to.lockArrow(this, "to");
  }

  /** Arrow.outline
   */
  static outline(ctx, x1, y1, x2, y2) {
    ctx.strokeStyle = "#000";
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  /** Arrow.endingAngle
   *    return ending angle from 2nd control point to end point
   *    in radians
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

  /** Arrow.startingAngle
   *    return angle from start point to first control point
   */
  startingAngle() {
    var dx = this.x1 - this.cp1.x;
    var dy = this.y1 - this.cp1.y;
    
    if (this.cp1.x == this.x1 && this.cp1.y == this.y1) {
      dx = this.x1 - this.x1;
      dy = this.y1 - this.y1;
    }
    return -Math.atan2(dx, dy) + 0.5*Math.PI;
  }

  /** Arrow.straighten
   *    set control points to midpoint
   */
  straighten() {
    var mx = (this.x2 + this.x1) / 2 | 0;
    var my = (this.y2 + this.y1) / 2 | 0;
    this.cp1.x = mx;
    this.cp2.x = mx;
    this.cp1.y = my;
    this.cp2.y = my;
  }

  /** Arrow.move
   *    translate entire arrow by deltaX, deltaY
   *
   *    if arrow is locked to parent (e.g. array)
   *    don't allow user to move arrow directly
   */
  move(deltaX, deltaY) {
    if (! (this.fromAnchorAlive() || this.toAnchorAlive())) {
      super.move(deltaX, deltaY);
      this.startPoint.x += deltaX;
      this.startPoint.y += deltaY;
    }
    this.cp1.x += deltaX;
    this.cp2.x += deltaX;
    this.cp1.y += deltaY;
    this.cp2.y += deltaY;

  }

}


/** ChildArrow
 *    
 * 
 */
class ChildArrow extends CanvasChildObject {

  constructor(canvasState, parentObject, cpx1, cpy1, cpx2, cpy2) {
    super(canvasState); 
    this.parentObject = parentObject;

    this.x1 = cpx1;
    this.y1 = cpy1;
    this.x2 = cpx2;
    this.y2 = cpy2;

    // default options
    this.thickness = 2;
    this.strokeColor = "#000";
    this.dashed = false;

    // default dash pattern
    this.lineDash = [10, 10];

    // default hit thickness
    this.hitThickness = 8;

    // head options
    this.hollow = true;
    this.headFill = "#fff";
    this.headWidth = 10;
    this.headHeight = 10;

    this.fromAnchorAlive = () => true;
    this.toAnchorAlive = () => true;
    this.startPoint = new DragPoint(this.cState, this, this.x1, this.y1);

    // initialize control points at
    // start and end points
    var midX = Math.floor((this.x1 + this.x2) / 2);
    var midY = Math.floor((this.y1 + this.y2) / 2);
    
    this.cp1 = new ControlPoint(this.cState, this, midX, midY);
    this.cp2 = new ControlPoint(this.cState, this, midX, midY);

    this.head = new ArrowHead(canvasState, this);
  }

  getParent() {
    return this.parentObject;
  }

  propTypes() {
    return {
      "thickness": "int",
      "strokeColor": "color",
      "dashed": "bool",
      "headFill": "color",
      "hollow": "bool",
      "headWidth": "int",
      "headHeight": "int",
    };
  }

  propNames() {
    return {
      "thickness": "thickness",
      "st": "thickness",
      "color": "strokeColor",
      "sc": "strokeColor",
      "dash": "dashed",
      "headFill": "headFill",
      "hc": "headFill",
      "hf": "headFill",
      "hollow": "hollow",
      "hw": "headWidth",
      "hh": "headHeight",
    };
  }

  static defaultCoordinates(cState) {
    var center = cState.getCenter();
    var w = 200;
    return {
      x1: center.x,
      y1: center.y,
      x2: center.x + w,
      y2: center.y,
    };
  }

  /** ChildArrow.config
   */
  config() {
    return {
      thickness: this.thickness,
      strokeColor: this.strokeColor,
      dashed: this.dashed,
      hollow: this.hollow,
      headFill: this.headFill,
      headWidth: this.headWidth,
      headHeight: this.headHeight,
      label: this.label,
    };
  }


  getStartCoordinates() {
    return {x: this.x1, y: this.y1};
  }

  /** ChildArrow.configureOptions
   *    set drawing options and update endpoints
   *    if locked to parent
   */
  configureOptions() {
    super.configureOptions();
    this.ctx.lineWidth = this.thickness;
    if (this.dashed)
      this.ctx.setLineDash(this.lineDash);

    this.hitCtx.lineWidth = this.hitThickness;
    this.ctx.strokeStyle = this.getParent().active() ? this.cState.activeBorder : this.strokeColor;
  }

  /** ChildArrow.draw
   */
  draw() {
    

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

    // draw starting point to hit canvas
    this.startPoint.configAndDraw();

    // draw control points if active
    if (this.active()) {
      this.cp1.configAndDraw();
      this.cp2.configAndDraw(); 
    }

    // configAndDraw head so it appears on top
    this.head.configAndDraw();
  }

  /** ChildArrow.endingAngle
   *    return ending angle from 2nd control point to end point
   *    in radians
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

  /** ChildArrow.startingAngle
   *    return angle from start point to first control point
   */
  startingAngle() {
    var dx = this.x1 - this.cp1.x;
    var dy = this.y1 - this.cp1.y;
    
    if (this.cp1.x == this.x1 && this.cp1.y == this.y1) {
      dx = this.x1 - this.x1;
      dy = this.y1 - this.y1;
    }
    return -Math.atan2(dx, dy) + 0.5*Math.PI;
  }

  /** ChildArrow.straighten
   *    set control points to midpoint
   */
  straighten() {
    var mx = (this.x2 + this.x1) / 2 | 0;
    var my = (this.y2 + this.y1) / 2 | 0;
    this.cp1.x = mx;
    this.cp2.x = mx;
    this.cp1.y = my;
    this.cp2.y = my;
  }

  /** ChildArrow.move
   *    translate entire arrow by deltaX, deltaY
   *
   *    if arrow is locked to parent (e.g. array)
   *    don't allow user to move arrow directly
   */
  move(deltaX, deltaY) {
    this.cp1.x += deltaX;
    this.cp2.x += deltaX;
    this.cp1.y += deltaY;
    this.cp2.y += deltaY;

    this.startPoint.x += deltaX;
    this.startPoint.y += deltaY;
  }
}


/** CurvedArrow
 *    draws curved arc with 2 control points
 *  
 *    CurvedArrow is a (macro, parent-type) CanvasObject and 
 *    is cloned independently of its anchors (unlike ChildArrow)
 * 
 *    drawing is the same as ChildArrow
 * 
 *    cloning is different and uses _cloneRef
 *    to find clones of anchors if there are any.
 */
class CurvedArrow extends Arrow {

  /** CurvedArrow.clone
   */
  clone() {
    var copy = super.clone();
    
    // set control points
    copy.cp1.x = this.cp1.x;
    copy.cp1.y = this.cp1.y;
    copy.cp2.x = this.cp2.x;
    copy.cp2.y = this.cp2.y;

    if (this.locked) {
      copy.locked = {
        from: this.locked.from._cloneRef,
        to: this.locked.to._cloneRef,
      };
    }
    return copy;
  }

  /** CurvedArrow.draw
   */
  draw() {
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

    // draw starting point to hit canvas
    this.startPoint.configAndDraw();

    // configAndDraw control points if active
    if (this.active()) {
      this.cp1.configAndDraw();
      this.cp2.configAndDraw(); 
    }

    // configAndDraw head so it appears on top
    this.head.configAndDraw();
  }
}

/** Handles drawing of arrow head using
 *  rotation and translation
 */
class ArrowHead extends CanvasChildObject {
  constructor(canvasState, parentArrow) {
    super(canvasState);

    this.parentArrow = parentArrow;

    this.hollow = true;
    this.fill = "#fff";

    this.width = 10;
    this.height = 10;
  }

  get x() {
    return this.getParent().x2;
  }

  get y() {
    return this.getParent().y2;
  }

  getParent() {
    return this.parentArrow.getParent();
  }

  getStartCoordinates() {
    return {x: this.parentArrow.x2, y: this.parentArrow.y2};
  }
 
  /** ArrowHead.configureOptions
   */
  configureOptions() {
    super.configureOptions();
    this.ctx.fillStyle = this.getParent().headFill;

    this.width = this.parentArrow.headWidth;
    this.height = this.parentArrow.headHeight;
  }

  /** ArrowHead.draw
   */
  draw() {
    
    var arrow = this.parentArrow;
  
    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.translate(arrow.x2, arrow.y2);
    this.ctx.rotate(arrow.endingAngle());

    var hw = Math.floor(this.width / 2);
    
    if (arrow.hollow) {
      this.ctx.moveTo(-this.height, -hw);
      this.ctx.lineTo(0, 0);
      this.ctx.lineTo(-this.height, hw);
    }
    else {
      this.ctx.moveTo(0, 0);
      this.ctx.lineTo(-this.height, -hw);
      this.ctx.lineTo(-this.height, hw);
      this.ctx.lineTo(0, 0);
      this.ctx.fill();
      this.ctx.closePath();
    }
    
    this.ctx.stroke();
    this.ctx.restore();

    this.hitCtx.save();
    this.hitCtx.beginPath();
    this.hitCtx.translate(arrow.x2, arrow.y2);
    this.hitCtx.rotate(arrow.endingAngle());

    // draw twice as big as actual arrow head
    this.hitCtx.moveTo(0, 0);
    this.hitCtx.lineTo(-2 * this.height, -this.width);
    this.hitCtx.lineTo(-2 * this.height, this.width);

    this.hitCtx.fill();
    this.hitCtx.restore();
  }

  /** ArrowHead.drag
   *    shift arrow end point by deltaX, deltaY
   */
  drag(deltaX, deltaY) {
    if (this.parentArrow.toAnchorAlive()) return;

    // just move end point to new location
    this.parentArrow.x2 += deltaX;
    this.parentArrow.y2 += deltaY;
  }

  shiftDrag(deltaX, deltaY) {
    if (this.parentArrow.toAnchorAlive()) return;
    // holding shift will lock arrow into horizontal or vertical orientation.
    // snap along more displaced (by drag) axis
    var dx = Math.abs(this.cState.mouseMove.x - this.cState.mouseDown.x);
    var dy = Math.abs(this.cState.mouseMove.y - this.cState.mouseDown.y);
    if (dx > dy) { // lock in horizontal orientation
      this.parentArrow.y2 = this.parentArrow.y1;
      this.parentArrow.x2 += deltaX;
    }
    else {
      this.parentArrow.x2 = this.parentArrow.x1;
      this.parentArrow.y2 += deltaY;
    }
    // snap straight
    this.parentArrow.straighten();
  }
}

class DragPoint extends CanvasChildObject {
  constructor(canvasState, parentObj, x, y) {
    super(canvasState);
    this.parentObj = parentObj;

    this.x = x;
    this.y = y;

    this.radius = 15;
  }

  getParent() {
    return this.parentObj;
  }

  /** DragPoint.draw 
   *    only draw to hit detect canvas
   */
  draw() {
    
    // don't draw if locked to parent
    if (this.getParent().fromAnchorAlive()) return;

    this.hitCtx.fillStyle = this.hashColor;
    this.hitCtx.beginPath();
    this.hitCtx.arc(this.x, this.y, this.radius, 0, 2 * Math.PI);
    this.hitCtx.fill();
  }

  /** DragPoint.drag
   *    Move (x1, y1) of parent (move arrow start position)
   */
  drag(deltaX, deltaY) {
    if (this.getParent().fromAnchorAlive()) return; 

    this.x += deltaX;
    this.y += deltaY;
    this.parentObj.x1 += deltaX;
    this.parentObj.y1 += deltaY;
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
    super.configureOptions();
    this.ctx.fillStyle = this.fill;
  }

  /** ControlPoint.draw
   */
  draw() {
    
    
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

  doubleClick() {
    this.parentArrow.straighten();
  }

}
