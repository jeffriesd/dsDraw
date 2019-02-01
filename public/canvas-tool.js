/** Selector tool 
 */
class CanvasSelect {
  static outline(ctx, x1, y1, x2, y2) {
    ctx.lineWidth = 1;
    ctx.strokeStyle = "#000";
    ctx.beginPath();
    ctx.rect(x1, y1, x2-x1, y2-y1);
    ctx.stroke();
  }
}
