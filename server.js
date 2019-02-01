const express = require("express");
const session = require("client-sessions");

const VideoManager = require("./video").VideoManager;
const util = require("./server-util");
const serverSocket = require("./server-connection");

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


const clients = new Set();
var randomId = () => Math.random().toString().substr(2);
function assignClientId() {
  var newId = randomId();
  while (clients.has(newId)) newId = randomId();
  clients.add(newId);
  return newId;
}

app.ws("/", (ws, req) => {
  // new connection, create new video manager 
  // for this client
  if (req.session.id == null) { 
    req.session.id = assignClientId();
    req.session.vm = new VideoManager(req.session.id, ws);
  }
  console.log("new conn req", req.session.id);

  ws.on("message", (message) => {
    serverSocket.processClientMessage(ws, req, message);
  });
                                                            
  ws.on("end", () => {                                    
    console.log("Connection ended...");
  });                                                      
});

app.listen(3000);
