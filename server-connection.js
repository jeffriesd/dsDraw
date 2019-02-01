// websocket state
const WS_OPEN = 1;
const math = require("./math");

function urlToPath(url) {
  var urlPattern = /temp\/\d+\/\d+\.[a-zA-Z\d]+$/; 
  var match = url.match(urlPattern);
  if (match) return "public/" + match[0];
};


function processClientMessage(ws, req, message) {
  console.log("new message:", message);
  // handle blob -- end of recording
  if (message instanceof Buffer) {
    // client must also send id of clip being added
    if (req.session.currentClipId == null)
      throw "Cannot add clip; id hasn't been sent";
    req.session.vm.addClip(req.session.currentClipId, message);

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
      req.session.vm.truncateClip(body.clipId, body.timeStamp);
      break;
    case "selectClip":
      req.session.vm.selectClip(body.clipId);
      break;
    case "merge":
      req.session.vm.mergeClips(body.clipIds);
      break;
    case "renderMath":
      math.renderFormula(body.text, (data) => {
        var response = { label: body.label, mathSVG: data.svg};
        sendMessage(ws, response, "setMath");
      });
      break;
    case "deleteClip":
      req.session.vm.removeClips(msgObj.body.clipIds);
      break;
  }
}

function sendMessage(ws, body, messageType) {
  if (ws.readyState == WS_OPEN)
    ws.send(JSON.stringify(
      { type: messageType, body: body }));
  else
    throw "[WS SERVER => CLIENT ERROR]: WS not ready";
}


module.exports = {
  sendMessage: sendMessage,
  processClientMessage: processClientMessage,
};
