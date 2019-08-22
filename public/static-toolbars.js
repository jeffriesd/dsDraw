(function initDOM() {
  // initialize clip menu buttons
  $("#contButton").click((event) => {
    MediaController.getInstance().newClipFromCurrent();
  });
  $("#blankButton").click((event) => {
    MediaController.getInstance().newClipBlank();
  });
  $("#deleteClipButton").click((event) => {
    var clipIds = $(".activeClip")
      .toArray().map(x => parseInt(x.id.replace("thumbnail", "")));
    var delCmd = new DeleteClipCommand(CanvasState.getInstance(), clipIds);
    delCmd.execute();
  });

  $("#exportClipButton").click((event) => {
    var clipIds = $(".activeClip")
      .toArray().map(x => parseInt(x.id.replace("thumbnail", "")))
      .sort();
    var exportCmd = new ExportVideoCommand(CanvasState.getInstance(), clipIds);
    exportCmd.execute();
  });
})();