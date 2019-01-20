function urlToPath(url) {
  var urlPattern = /temp\/\d+\/\d+\.[a-zA-Z\d]+$/; 
  var match = url.match(urlPattern);
  if (match) return "public/" + match[0];
};

function processClientMessage(ws, req, message) {
  // this client's VideoManager = req.session.vm
  var vm = req.session.vm;

  console.log("new message:", message);
  // handle blob -- end of recording
  if (message instanceof Buffer) {
    // client must also send id of clip being added
    if (req.session.currentClipId == null)
      throw "Cannot add clip; id hasn't been sent";
    vm.addClip(req.session.currentClipId, message);

    req.session.currentClipId = null;
    return;
  }

  var msgObj = JSON.parse(message);
  var body = msgObj.body;
                                                         
  switch (msgObj.type) {
    case "setClipId":
      req.session.currentClipId = msgObj.body.id; 
      break;
    case "truncate":
      vm.truncateClip(body.clipId, body.timeStamp);
      break;
    case "select":
      vm.selectClip(body.clipId);
      break;
    case "merge":
      vm.mergeClips(body.clipIds);
  }
};

module.exports = {
  processClientMessage: processClientMessage,
};
