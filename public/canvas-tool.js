/** Selector tool 
 */
class CanvasSelect {
  static outline(cState) {
    var ctx = cState.ctx;
    var x1 = cState.mouseDown.x;
    var y1 = cState.mouseDown.y;
    var x2 = cState.mouseMove.x;
    var y2 = cState.mouseMove.y;
    
    ctx.lineWidth = 1;
    ctx.strokeStyle = "#000";
    ctx.beginPath();
    ctx.rect(x1, y1, x2-x1, y2-y1);
    ctx.stroke();
  }
}
