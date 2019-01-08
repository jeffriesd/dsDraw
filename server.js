const ffmpeg = require("fluent-ffmpeg");
const fs = require("fs");
const path = require("path");
const express = require("express");
const WSServer = require("ws").Server;
const vid = require("./video");

// init express app
const app = express();
app.use(express.static(__dirname + "/public"));

app.get("/", (req, res) => {
  res.sendFile("index.html");
});

// clear temp dir
var temp = "public/temp";
console.log(temp);
fs.readdir(temp, (err, items) => {
  if (items == null) return;
  items.forEach((dir) => {
    var subdir = "public/temp/" + dir;
    fs.readdir(subdir, (err, clips) => {
      if (clips == null) return;
      clips.forEach((c) => 
        fs.unlink(path.join(subdir, c), (err) => console.log("cleanup error:", err)));
    });
  });
});

var clients = [];
function assignClientId() {
  var newId = clients.reduce((acc, val) => Math.max(acc, val), 0) + 1;
  clients.push(newId);
  return newId;
}

// init websocket server
const wsserver = new WSServer({port: 3001});
wsserver.on("connection", ((ws) => {
	ws.on("message", (message) => {
    if (! (message instanceof Buffer))
      return;

		console.log("from client: ", message.constructor.name);
    console.log("size: ", message.length);

    clientId = ws.id ? ws.id : ws.id = assignClientId();
    vid.VideoManager.addClip(ws, clientId, message);
	});

	ws.on("end", () => {
		console.log("Connection ended...");
	});

}));

// var f1 = __dirname + "/public/temp/1/v1.webm";
// var f2 = __dirname + "/public/temp/1/v2.webm";
// var m = __dirname + "/public/temp/1/merged.webm";
// var temp = __dirname + "/temp";
// 
// var merged = new ffmpeg()
//               .mergeAdd(f1)
//               .mergeAdd(f2)
//               .on("error", (err) => console.log(err))
//               .on("end", () => console.log("done merging"))
//               .mergeToFile(m, temp);
   
// s.input(p1).seekInput(2)
//   .on("error", (err) => console.log(err))
//   .on("end", () => console.log("finished"))
//   .mergeToFile(m, temp);

app.listen(3000);
