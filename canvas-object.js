

/** CanvasObject
 *    class for macro objects such as textbox, arrows,
 *    (not ResizePoint or ArrowHead, etc.)
 */
class CanvasObject {
  constructor(canvasState, x1, y1, x2, y2) {
    this.cState = canvasState;
    this.ctx = canvasState.ctx;
    this.hitCtx = canvasState.hitCtx;
    this.hashColor = null;

    this.x1 = x1;
    this.y1 = y1;
    this.x2 = x2;
    this.y2 = y2;

    this.width = this.x2 - this.x1;
    this.height = this.y2 - this.y1;

    this.cState.addCanvasObj(this);
  }

  getParent() {
    return this;
  }

  deactivate() {
  }

  click(event) {
          
  }

  move(deltaX, deltaY) {
    this.x1 += deltaX;
    this.x2 += deltaX;
    this.y1 += deltaY;
    this.y2 += deltaY;
  }

  drag(deltaX, deltaY) {
  }

  /** CanvasObject.mouseDown
   *    Called when click begins.
   *    Move this object to end of cState objects array
   *    so recently clicked objects are drawn last (on top).
   */
  mouseDown() {
    var idx = this.cState.objects.indexOf(this);
    this.cState.objects.splice(idx, 1);
    this.cState.objects.push(this);
  }

  release() {
  }

}

class CanvasChildObject {
  constructor(canvasState) {
    this.cState = canvasState;
    this.ctx = canvasState.ctx;
    this.hitCtx = this.cState.hitCtx;
    this.hashColor = null;

    this.cState.registerCanvasObj(this);
  }

  deactivate() {
  }

  click(event) {
    this.getParent().click(event);
  }

  move(deltaX, deltaY) {
  }

  drag(deltaX, deltaY) {
  }

  /** Event when click begins
   */
  mouseDown() {
    this.getParent().mouseDown();
  }

  release() {
  }
}
