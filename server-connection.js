const vm = require("./video").VideoManager;

function processClientMessage(ws, req, message) {
  console.log("message from client: ", message);
  // handle blob -- end of recording
  if (message instanceof Buffer) {
    vm.addClip(ws, req.session.id, message);
    return;
  }

  var msgObj = JSON.parse(message);
                                                          
  switch (msgObj.type) {
  }
};

module.exports = {
  processClientMessage: processClientMessage,
};
