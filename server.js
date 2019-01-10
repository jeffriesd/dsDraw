const express = require("express");
const session = require("client-sessions");

const vid = require("./video");
const util = require("./server-util");
const connManager = require("./server-connection");

const secret = "my23 kjnads9y super ;klsdaf0[u723rsecret";

// init express app and express Websockets
const app = express();
const expressWS = require("express-ws")(app);

// clean up temporary files
util.cleanTempDir();

// set public dir
app.use(express.static(__dirname + "/public"));

app.use(session({
  cookieName: "session",
  secret: secret,
  duration: 30 * 60 * 1000,
  activeDuration: 10 * 60 * 1000,
}));

app.get("/", (req, res) => {
  res.sendFile("index.html");
});


const clients = [];
function assignClientId() {
  var newId = clients.reduce((acc, val) => Math.max(acc, val), 0) + 1;
  clients.push(newId);
  return newId;
}

app.ws("/", (ws, req) => {
  if (req.session.id == null) req.session.id = assignClientId();
  console.log("new conn req", req.session.id);

  ws.on("message", (message) => {
    connManager.processClientMessage(ws, req, message);
  });
                                                            
  ws.on("end", () => {                                    
    console.log("Connection ended...");
  });                                                      
});

app.listen(3000);
