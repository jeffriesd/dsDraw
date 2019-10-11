function pathToURL(path) {
  return path.replace(/^public\//, "");
}


/** ClientSocket
 *    manages client side of websocket connection
 *    for sending and receiving video blobs
 *    and commands (truncate video, setVideoURL, etc.)
 */
class ClientSocket {
  constructor(websock, mediaController, cState) {
    if (ClientSocket.instance) return ClientSocket.instance;
    this.websock = websock;
    this.mc = mediaController;
    this.cState = cState;

    this.init();

    ClientSocket.instance = this;

    // some actions wait on a response from 
    // the server by making a request with unique
    // id and waiting on a server messages
    // that signifies completion of that request
    // 
    // a map from uniqueId to Promise resolve functions
    // allows server messages to resolve the promise
    this.requestNum = 0;
    this.requestPromises = new Map();
  }

  static getInstance() {
    if (ClientSocket.instance == null)
      throw "Eager instantiation failed for ClientSocket";
    return ClientSocket.instance;
  }

  init() {
    this.websock.onopen = (event) => console.log("websocket connection open");
    this.websock.onclose = () => console.log("websocket connection closed");
    this.websock.onerror = (err) => console.log("[WS ERROR]:", err);
    this.websock.onmessage = (event) => this.processServerMessage(event.data);
  }

  processServerMessage(message) {
    var msgObj = JSON.parse(message);
    console.log("message from server: ", msgObj.type);

    switch (msgObj.type) {
      case "setVideoURL":
        this.mc.setVideoURL(msgObj.body.id, pathToURL(msgObj.body.url));
        this.mc.updateThumbnail(msgObj.body.id);
        break;
      case "setVideoDownload":
        this.mc.setVideoDownload(pathToURL(msgObj.body.url));
        break;
      case "setMath":
        var textBox = VariableEnvironment.getCanvasObj(msgObj.body.label);
        textBox.setMath(msgObj.body.mathSVG);
        break;
      case "resolvePromise":
        var res = this.requestPromises.get(msgObj.body.reqNum);
        if (res) { 
          // resolve promise and delete it from map 
          res();
          this.requestPromises.delete(msgObj.body.reqNum);
        }
        else alert("Error resolving promise");
        break;
      case "error":
        alert("Error: " + msgObj.body.error);
        break;
      case "log": 
        console.log("Message log from server:", msgObj.body);
        break;
    }
  }

  static sendServer(type, body) {
    var wsInstance = ClientSocket.getInstance();
    wsInstance.sendServer(type, body);
  }

  sendServer(type, body) {
    this.websock.send(JSON.stringify({type: type, body: body}));
  }

  static sendBlob(...args) {
    var wsInstance = ClientSocket.getInstance();
    wsInstance.sendBlob(...args);
  }

  sendBlob(blob) {
    // blob can only be sent by itself (not stringified)
    // so any metadata message must precede it
    this.websock.send(blob);
  }

  /** ClientSocket.requestPromise
   *    used to create a promise that 
   *    waits on a response from the server
   *    using an increasing unique id 
   */
  requestPromise(msgType, msgBody) {
    var reqNum = this.requestNum++;
    return new Promise(resolve => {
      this.requestPromises.set(reqNum, resolve);
      this.sendServer("requestPromise", { reqType: msgType, reqNum: reqNum, reqBody: msgBody });
    });
  }
}
