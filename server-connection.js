const vm = require("./video").VideoManager;

function urlToPath(url) {
  var urlPattern = /temp\/\d+\/\d+\.[a-zA-Z\d]+$/; 
  var match = url.match(urlPattern);
  if (match) return "public/" + match[0];
};

function processClientMessage(ws, req, message) {
  console.log("message from client: ", message);
  // handle blob -- end of recording
  if (message instanceof Buffer) {
    vm.addClip(ws, req.session.id, message);
    return;
  }

  var msgObj = JSON.parse(message);
  var body = msgObj.body;
                                                          
  switch (msgObj.type) {
    case "truncate":
      var filePath = urlToPath(body.url);
      vm.truncateClip(ws, filePath, body.timeStamp);
      break;
  }
};

module.exports = {
  processClientMessage: processClientMessage,
};
