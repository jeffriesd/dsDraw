/**
 * Arrow functions common to
 * CurvedArrow and ChildArrow since
 * Javascript doesn't support interfaces
 */

class Arrow {
  static init(self, x1, y1, x2, y2, fromAnchor, toAnchor) {
      self.x1 = x1;
      self.y1 = y1;
      self.x2 = x2;
      self.y2 = y2;

      // default options
      self.thickness = 2;
      self.strokeColor = "#000";
      self.dashed = false;

      // default dash pattern
      self.lineDash = [10, 10];

      // default hit thickness
      self.hitThickness = 10;

      // head options
      self.hollow = true;
      self.headFill = "#fff";
      self.headWidth = 10;
      self.headHeight = 10;

      self.startPoint = new DragPoint(self.cState, self, self.x1, self.y1);

      // initialize control points at
      // start and end points
      var fromX = fromAnchor ? fromAnchor.x : self.x1;
      var toX = toAnchor ? toAnchor.x : self.x2;
      var fromY = fromAnchor ? fromAnchor.y : self.y1;
      var toY = toAnchor ? toAnchor.y : self.y2;
      var midX = Math.floor((fromX + toX) / 2);
      var midY = Math.floor((fromY + toY) / 2);
      
      self.cp1 = new ControlPoint(self.cState, self, midX, midY);
      self.cp2 = new ControlPoint(self.cState, self, midX, midY);

      self.head = new ArrowHead(self.cState, self);
      self.hasHead = true;
      
      // arrow may be 'locked' into place by parents
      if (fromAnchor || toAnchor) {
        self.locked = {
          from: fromAnchor,
          to: toAnchor,
        };
      }

      self.straighten();
  }

  static propTypes() {
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

  static propNames() {
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

  static getx1(self) {
    return self._x1;
  }

  static setx1(self, newX) {
    self._x1 = newX;
    if (self.startPoint)
      self.startPoint.x = newX;
  }

  static gety1(self) {
    return self._y1;
  }

  static sety1(self, newY) {
    self._y1 = newY;
    if (self.startPoint)
      self.startPoint.y = newY;
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


  static config(self) {
    return {
      thickness: self.thickness,
      dashed: self.dashed,
      hollow: self.hollow,
      headFill: self.headFill,
      headWidth: self.headWidth,
      headHeight: self.headHeight,
      label: self.label,
      strokeColor: self.strokeColor,
      hasHead: self.hasHead,
    };
  }

  static getStartCoordinates(self) {
    return {x: self.x1, y: self.y1};
  }


  static configureOptions(self) {
    self.ctx.lineWidth = self.thickness;
    if (self.dashed)
      self.ctx.setLineDash(self.lineDash);

    self.hitCtx.lineWidth = self.hitThickness;
  }

  static outline(ctx, x1, y1, x2, y2) {
    ctx.strokeStyle = "#000";
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  static angleToCP(self, cpn, x, y) {
    var cp;
    if (cpn == 1) cp = self.cp1; else if (cpn == 2) cp = self.cp2; 
    else throw `Invalid control point number ${cpn}`;
    var dx = cp.x - x;
    var dy = y - cp.y;
    var a = Math.atan2(dy, dx);
    if (isNaN(a)) {
      if (dy >= 0) return Math.PI/2;
      return 3*Math.PI/2;
    }
    return a;
  }

  static endingAngle(self) {
    return Math.PI - self.angleToCP(2, self.x2, self.y2);
  }


  static straighten(self) {
    var fromX, fromY, toX, toY;
    if (self.locked) {
      if (self.locked.from) {
        var center = self.locked.from.objectCenter();
        fromX = center.x;
        fromY = center.y;
      }
      if (self.locked.to) {
        var center = self.locked.to.objectCenter();
        toX = center.x;
        toY = center.y;
      }
    }
    fromX = fromX || self.x1;
    fromY = fromY || self.y1;
    toX   = toX   || self.x2;
    toY   = toY   || self.y2;

    var mx = (fromX + toX) / 2 | 0;
    var my = (fromY + toY) / 2 | 0;
    self.cp1.x = mx;
    self.cp2.x = mx;
    self.cp1.y = my;
    self.cp2.y = my;
  }


  static move(self, deltaX, deltaY) {
    self.cp1.x += deltaX;
    self.cp2.x += deltaX;
    self.cp1.y += deltaY;
    self.cp2.y += deltaY;
  }

  static draw(self) {
    var ctx = self.cState.ctx;
    var hitCtx = self.cState.hitCtx;

    ctx.beginPath();
    ctx.moveTo(self.x1, self.y1);
    ctx.bezierCurveTo(
      self.cp1.x, self.cp1.y, self.cp2.x, self.cp2.y, self.x2, self.y2
    );
    ctx.stroke();

    // undo linedash
    if (self.dashed)
      self.ctx.setLineDash([]);      

    hitCtx.beginPath();
    hitCtx.moveTo(self.x1, self.y1);
    hitCtx.bezierCurveTo(
      self.cp1.x, self.cp1.y, self.cp2.x, self.cp2.y, self.x2, self.y2
    );
    hitCtx.stroke();

    // draw starting point to hit canvas
    self.startPoint.configAndDraw();

    // configAndDraw control points if active
    if (self.active()) {
      self.cp1.configAndDraw();
      self.cp2.configAndDraw(); 
    }

    // configAndDraw head so it appears on top
    if (self.hasHead)
      self.head.configAndDraw();
  }

}


/** CurvedArrow class for drawing arcs on canvas.
 * 
 *  Composed with ArrowHead which can 
 *  vary independently of Arrow attributes
 */
class CurvedArrow extends CanvasObject {

  constructor(canvasState, x1, y1, x2, y2, fromAnchor, toAnchor) {
    super(canvasState, x1, y1, x2, y2);
    Arrow.init(this, x1, y1, x2, y2, fromAnchor, toAnchor);

    this.fromAnchorAlive = () => this.locked && this.locked.from && ! this.locked.from.dead;

    this.toAnchorAlive = () => this.locked && this.locked.to && ! this.locked.to.dead;
  }

  /** FOLLOWING METHODS IMPLEMENTED BY ARROW CLASS */


  /**
   *  hasHead is only exposed to user in CurvedArrow
   *  (users shouldnt be able to make directed graphs
   *   out of undirected graphs)
   */
  propTypes() {
    return {
      ...Arrow.propTypes(),
      "hasHead": "bool",
    };
  }

  propNames() {
    return {
      ...Arrow.propNames(),
      "hasHead": "hasHead",
      "head": "hasHead",
    };
  }

  /** 
   *  moving arrow x1, y1 should move startPoint as well
   */
  get x1() {
    return Arrow.getx1(this);
  }
   
  set x1(newX) {
    Arrow.setx1(this, newX);
  }

  get y1() {
    return Arrow.gety1(this);
  }

  set y1(newY) {
    Arrow.sety1(this, newY);
  }

  static defaultCoordinates(cState) {
    return Arrow.defaultCoordinates(cState);
  }

  /** CurvedArrow.config
   */
  config() {
    return Arrow.config(this);
  }


  getStartCoordinates() {
    return Arrow.getStartCoordinates(this);
  }

  /** CurvedArrow.configureOptions
   *    set drawing options and update endpoints
   *    if locked to parent
   */
  configureOptions() {
    super.configureOptions();
    Arrow.configureOptions(this);

    // CurvedArrow manages its own anchors as opposed to 
    // ChildArrow
    if (this.fromAnchorAlive()) this.locked.from.lockArrow(this, "from");
    if (this.toAnchorAlive()) this.locked.to.lockArrow(this, "to");
  }

  /** CurvedArrow.outline
   */
  static outline(ctx, x1, y1, x2, y2) {
    Arrow.outline(ctx, x1, y1, x2, y2);
  }

  /** CurvedArrow.angleToCP
   *    compute the angle from one control point to 
   *    an arbitrary coordinate
   *  
   *    param cpn - integer (1 or 2) deciding which control point to measure angle from 
   *    param x - x value of other coordinate
   *    param y - y value of other coordinate 
   */
  angleToCP(cpn, x, y) {
    return Arrow.angleToCP(this, cpn, x, y);
  }

  /** CurvedArrow.endingAngle
   *    return ending angle from 2nd control point to end point
   *    in radians
   */
  endingAngle() {
    return Arrow.endingAngle(this);
  }

  /** CurvedArrow.straighten
   *    set control points to midpoint
   */
  straighten() {
    Arrow.straighten(this);
  }

  /** CurvedArrow.move
   *    translate entire arrow by deltaX, deltaY
   */
  move(deltaX, deltaY) {
    super.move(deltaX, deltaY);
    Arrow.move(this, deltaX, deltaY);
  }

  /** CurvedArrow.draw
   */
  draw() {
    Arrow.draw(this);
  }

  /** PRECEDING METHODS IMPLEMENTED BY ARROW CLASS */

  /** CurvedArrow.clone
   */
  clone(cloneHandle) {
    var copy = super.clone(cloneHandle);
    
    // set control points
    copy.cp1.x = this.cp1.x;
    copy.cp1.y = this.cp1.y;
    copy.cp2.x = this.cp2.x;
    copy.cp2.y = this.cp2.y;
    return copy;
  }
}


/** ChildArrow
 *    differs from CurvedArrow only in type
 *    and how it evaluates when to lock (fromAnchorAlive) 
 * 
 */
class ChildArrow extends CanvasChildObject {

  constructor(canvasState, parentObject, cpx1, cpy1, cpx2, cpy2, fromAnchor, toAnchor) {
    super(canvasState); 
    this.parentObject = parentObject;
    Arrow.init(this, cpx1, cpy1, cpx2, cpy2, fromAnchor, toAnchor);

    this.fromAnchorAlive = () => true;
    this.toAnchorAlive = () => true;
  }

  toString() {
    return "ChildArrow";
  }

  /** ChildArrow.active
   *    override default implementation 
   *    (active iff (this.active || parent.active)
   *    because too many arcs/control points shown
   *    at once becomes cluttered and hard to click
   */
  active() {
    return this.cState.isActive(this) || this.cState.isActive(this.cp1) || this.cState.isActive(this.cp2);
  }

  getParent() {
    return this.parentObject;
  }

  /** 
   * FOLLOWING METHODS IMPLEMENTED BY ARROW CLASS 
   */

  propTypes() {
    return Arrow.propTypes();
  }

  propNames() {
    return Arrow.propNames();
  }

  /** 
   *  moving arrow x1, y1 should move startPoint as well
   */
  get x1() {
    return Arrow.getx1(this);
  }
   
  set x1(newX) {
    Arrow.setx1(this, newX);
  }

  get y1() {
    return Arrow.gety1(this);
  }

  set y1(newY) {
    Arrow.sety1(this, newY);
  }

  static defaultCoordinates(cState) {
    return Arrow.defaultCoordinates(cState);
  }

  /** CurvedArrow.config
   */
  config() {
    return Arrow.config(this);
  }


  getStartCoordinates() {
    return Arrow.getStartCoordinates(this);
  }

  /** CurvedArrow.configureOptions
   *    set drawing options and update endpoints
   *    if locked to parent
   */
  configureOptions() {
    super.configureOptions();
    Arrow.configureOptions(this);
  }

  /** CurvedArrow.outline
   */
  static outline(ctx, x1, y1, x2, y2) {
    Arrow.outline(ctx, x1, y1, x2, y2);
  }

  /** CurvedArrow.angleToCP
   *    compute the angle from one control point to 
   *    an arbitrary coordinate
   *  
   *    param cpn - integer (1 or 2) deciding which control point to measure angle from 
   *    param x - x value of other coordinate
   *    param y - y value of other coordinate 
   */
  angleToCP(cpn, x, y) {
    return Arrow.angleToCP(this, cpn, x, y);
  }

  /** CurvedArrow.endingAngle
   *    return ending angle from 2nd control point to end point
   *    in radians
   */
  endingAngle() {
    return Arrow.endingAngle(this);
  }

  /** CurvedArrow.straighten
   *    set control points to midpoint
   */
  straighten() {
    Arrow.straighten(this);
  }

  /** CurvedArrow.move
   *    translate entire arrow by deltaX, deltaY
   */
  move(deltaX, deltaY) {
    Arrow.move(this, deltaX, deltaY);
  }

  /** ChildArrow.draw
   */
  draw() {
    Arrow.draw(this);
  }
}


/** Handles drawing of arrow head using
 *  rotation and translation
 */
class ArrowHead extends CanvasChildObject {
  constructor(canvasState, parentArrow) {
    super(canvasState, parentArrow);

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

  /** ArrowHead.active
   *    override default implementation 
   *    (active iff (this.active || parent.active)
   *    because ChildArrow differs from CurvedArrow here
   */
  active() {
    return this.parentArrow.active();
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
    super(canvasState, parentArrow);
    
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
