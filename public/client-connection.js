
/** WebSocketConnection
 *    manages client side of websocket connection
 *    for sending and receiving video blobs
 *    and commands (truncate video, setVideoURL, etc.)
 */
class WebSocketConnection {
  constructor(websock, mediaController) {
    this.websock = websock;
    this.mc = mediaController;

    this.init();

    this.instance = null;
  }

  static getInstance(websock, mediaController) {
    if (this.instance == null)
      this.instance = new WebSocketConnection(websock, mediaController);
    return this.instance;
  }

  init() {
    this.websock.onopen = (event) => console.log("websocket connection open");
    this.websock.onclose = () => console.log("websocket connection closed");
    this.websock.onerror = (err) => console.log("[WS ERROR]:", err);
    this.websock.onmessage = (event) => this.processServerMessage(event.data);
  }

  processServerMessage(message) {
    console.log("Message from server:", message);
    var msgObj = JSON.parse(message);

    switch (msgObj.type) {
      case "setVideoURL":
        this.mc.setVideoURL(msgObj.body);
        break;
    }
  }

  sendMessage(type, body) {
    this.websock.send(JSON.stringify({type: type, body: body}));
  }

  sendBlob(blob) {
    this.websock.send(blob);
  }
}
