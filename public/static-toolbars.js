(function initDOM() {

  // initialize clip menu buttons
  $("#contButton").click((event) => {
    if (clipMenuLocked()) return cmLockedAlert()
    MediaController.getInstance().newClipFromCurrent();
  });
  $("#blankButton").click((event) => {
    if (clipMenuLocked()) return cmLockedAlert()
    MediaController.getInstance().newClipBlank();
  });
  $("#deleteClipButton").click((event) => {
    if (clipMenuLocked()) return cmLockedAlert()
    var clipIds = $(".activeClip")
      .toArray().map(x => parseInt(x.id.replace("thumbnail", "")));

    var mc = MediaController.getInstance();
    mc.removeClips(clipIds);
  });

  $("#exportClipButton").click((event) => {
    if (clipMenuLocked()) return cmLockedAlert()
    var clipIds = $(".activeClip")
      .toArray().map(x => parseInt(x.id.replace("thumbnail", "")))
      .sort();

    var mc = MediaController.getInstance();

    var conn = ClientSocket.getInstance();

    // lock mediacontroller actions
    // video processing happens
    mc.waiting = true;
    
    var body = { clipIds: clipIds };
    conn.sendServer("merge", body);

  });
})();