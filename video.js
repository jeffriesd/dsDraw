
/** functions to handle video loading, merging, 
 *  splicing on the server side
 *
 *  user stops recording
 *  - raw data is sent to websockets server as a Buffer
 *  - new Video Clip object is created and new webm is written
 *  - (possibly merge files automatically)
 *  - response goes back to client with file path for new webm
 *
 *  user wants to truncate from current time
 *  - request is sent to websockets server with timestamp
 *  - server executes ffmpeg seek command
 *  - response goes back to client
 *
 *  later:
 *  reorder clips
 *
 *  VideoClip play
 *    .onend = () => this.nextClip(); -- may lag but user can merge eventually
 *
 */
const WRITE_PATH = "public/temp/";
const TEMP_PATH = "temp/";
const fs = require("fs");
const path = require("path");
const ffmpeg = require("fluent-ffmpeg");

const BITRATE = 1000;
const clipIds = [];

// websocket state
const WS_OPEN = 1;

const clipNamePattern = /\/\d+\.webm$/;

const Duplex = require('stream').Duplex;  
function bufferToStream(buffer) {  
  var stream = new Duplex();
  stream.push(buffer);
  stream.push(null);
  return stream;
};

class VideoManager {

  static assignClipId() {
    var newId = clipIds.reduce((acc, val) => Math.max(acc, val), 0) + 1;
    clipIds.push(newId);
    return newId;
  }

  /** VideoManager.addClip
   *    create new VideoClip object, which writes a new webm file,
   *    and merge it existing clips
   */
  static addClip(ws, clientId, buffer) {
    var vid = new VideoClip(clientId, buffer);   
    var clipPath = vid.clipPath;
    if (! fs.existsSync(vid.dir))
      throw `Directory does not exist: ${vid.dir}`;

    var clips = fs.readdirSync(vid.dir);
    clips = clips.map((c) => path.join(vid.dir, c));

    // write video and either reply to client with new URL 
    // or merge clips and then reply
    if (clips.length == 0) 
      vid.writeVideo(() => VideoManager.sendURL(ws, vid.clipPath));
    else  {
      clips.push(vid.clipPath);
      vid.writeVideo(() => VideoManager.mergeClips(ws, clips));
    }
  }

  /** VideoManager.mergeClips
   *    accepts array of file paths and 
   *    merges videos together
   *
   *    sends merged file path over websocket server
   */
  static mergeClips(ws, filePaths) {
    if (filePaths.length == 0)
      return;
    if (filePaths.length == 1)
      return filePaths[0];

    // create new clip Id
    var mergedPath = filePaths[0].replace(
      clipNamePattern, `/${VideoManager.assignClipId()}.webm`);

    var merged = ffmpeg().videoBitrate(BITRATE);
    merged.on("end",  
      () => {
        console.log("done merging", mergedPath);
        // remove other clips after merging
        VideoManager.removeClips(filePaths);
        // send updated URL once webm is written
        VideoManager.sendURL(ws, mergedPath);
      }
    );

    filePaths.forEach((f) => merged.input(f));
    merged.mergeToFile(mergedPath, TEMP_PATH);
  }

  static removeClips(filePaths) {
    filePaths.forEach((f) => 
      fs.unlinkSync(f, (err) => console.log("Cleanup error:", err)));
  }

  /** VideoManager.removeExcept
   *    remove all clips from directory except 
   *    filePath
   */
  static removeExcept(filePath) {
    var clipDir = filePath.replace(
      clipNamePattern, "");
    console.log("clipdir = ", clipDir);

    var otherClips = fs.readdirSync(clipDir)
                  .map(fn => path.join(clipDir, fn))
                  .filter(fn => fn !== filePath);

    VideoManager.removeClips(otherClips);
  }

  static truncateClip(ws, filePath, timeStamp) {
    var truncated = ffmpeg(filePath).videoBitrate(BITRATE);

    var truncPath = filePath.replace(
      clipNamePattern, `/${VideoManager.assignClipId()}.webm`);

    truncated.seekInput(0)
      .duration(timeStamp)
      .save(truncPath)
      .on("end", () => {
        console.log("done truncating", truncPath);
        VideoManager.sendURL(ws, truncPath);

        // remove other clips from current dir
        VideoManager.removeExcept(truncPath);
      });
  }

  static sendURL(ws, filePath) {
    if (ws.readyState == WS_OPEN)
      ws.send(JSON.stringify({ type: "setVideoURL", body: filePath }));
    else
      console.log("[WS SERVER => CLIENT ERROR]: WS not ready");
  }
}

/** VideoClip
 *    class to encapsulate reading
 *    and writing webms using ffmpeg
 */
class VideoClip {
  constructor(clientId, dataBuffer) {
    this.clipId = VideoManager.assignClipId();
    this.clientId = clientId;
    this.buffer = dataBuffer;

    this.dir = path.join(WRITE_PATH, String(this.clientId));
  }

  get clipPath() {
    if (! fs.existsSync(this.dir))
      fs.mkdirSync(this.dir, 
        { recursive: true }, (err) => console.log("readdir error:", err));
    return path.join(this.dir, String(this.clipId) + ".webm");
  }

  writeVideo(callback) { 
    fs.writeFile(this.clipPath, this.buffer, callback);
    // var stream = bufferToStream(this.buffer);
    // ffmpeg(stream).videoBitrate(BITRATE)
    //   .save(this.clipPath)
    //   .on("end", onEnd);
  }
}

module.exports = {
  VideoManager: VideoManager,
};

