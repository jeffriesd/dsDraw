
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
 */
const WRITE_PATH = "public/temp/";
const TEMP_PATH = "TMP_FFMPEG/";
const fs = require("fs");
const path = require("path");
const fu = require("./ffmpeg-util");

const BITRATE = 1000;

// websocket state
const WS_OPEN = 1;

const clipNamePattern = /\/\d+\.webm$/;
const tempFile = () => new Date().getTime() + ".webm";

// convert Buffer to ReadableStream
const Duplex = require('stream').Duplex;  
function bufferToStream(buffer) {  
  var stream = new Duplex();
  stream.push(buffer);
  stream.push(null);
  return stream;
};

class VideoManager {
  constructor(clientId, ws) {
    this.ws = ws;
    this.clientId = clientId;
    this.dir = path.join(WRITE_PATH, String(this.clientId));
    
    // ensure directory exists
    if (! fs.existsSync(this.dir))
      fs.mkdirSync(this.dir, 
        { recursive: true }, (err) => console.log("mkdir error:", err));

    this.clips = new Map();
  }

  idToPath(clipId) {
    return path.join(this.dir, String(clipId) + ".webm");
  }

  getClipPaths() {
    var clips = fs.readdirSync(this.dir);
    return clips.map((c) => path.join(this.dir, c));
  }

  writeVideo(clipPath, buffer, callback) { 
    fs.writeFile(clipPath, buffer, callback);
    // var stream = bufferToStream(this.buffer);
    // ffmpeg(stream).videoBitrate(BITRATE)
    //   .save(this.clipPath)
    //   .on("end", onEnd);
  }

  /** VideoManager.addClip
   *    create new VideoClip object, which writes a new webm file,
   *    and merge it existing clips
   */
  // addClip(buffer) {
  //   var vid = new VideoClip(this.clientId, buffer);   
  //   var clipPath = vid.clipPath;
  //   if (! fs.existsSync(vid.dir))
  //     throw `Directory does not exist: ${vid.dir}`;

  //   var clips = fs.readdirSync(vid.dir);
  //   clips = clips.map((c) => path.join(vid.dir, c));

  //   // write video and either reply to client with new URL 
  //   // or merge clips and then reply
  //   if (clips.length == 0) 
  //     vid.writeVideo(() => this.sendClient(vid.clipPath));
  //   else  {
  //     clips.push(vid.clipPath);
  //     vid.writeVideo(() => this.mergeClips(clips));
  //   }
  // }

  /** VideoManager.addClip
   *    adds clip to map
   *    and writes video file 
   *    (with sendClient setVideoURL as callback)
   */
  addClip(clipId, buffer) {
    var clipPath = this.idToPath(clipId);

    // add clip to map
    this.clips.set(clipId, clipPath);

    // write clip and send URL once complete
    if (buffer != null) {
      this.writeVideo(clipPath, buffer,
        () => this.sendClient(clipId, "setVideoURL"));
    }

    return clipId;
  }

  /** VideoManager.mergeClips
   *    accepts array of file paths and 
   *    merges videos together
   *
   *    sends merged file path over websocket server
   *    for video download
   */
  mergeClips(clipIds) {
    if (clipIds.some((e) => ! this.clips.has(e)))
      throw "Cannot merge clips; some ids are invalid.";

    if (clipIds.length == 0)
      return;
    if (clipIds.length == 1)
      return this.sendClient(clipIds[0], "setVideoDownload");

    var filePaths = clipIds.map(x => this.idToPath(x));

    // create new clip id
    var mergedId = tempFile();
    var mergedPath = this.idToPath(mergedId);

    fu.mergeVideos(filePaths, mergedPath)
      .then(() => {
        console.log("done merging", mergedPath);

        this.sendClient(mergedId, "setVideoDownload");
      })
      .catch((err) => {
        console.log("Merge error:", err);
      });
  }

  /** VideoManager.removeClips
   *    delete clips in file system and notify
   *    client to remove from clip menu
   */
  removeClips(clipIds) {
    if (clipIds.some((e) => ! this.clips.has(e)))
      throw "Cannot remove clips; some ids are invalid.";

    clipIds.forEach((id) => {
      fs.unlinkSync(this.idToPath(id), (err) => console.log("Cleanup error:", err));
      this.sendClient(id, "removeClip");
    });
  }

  // TODO make all functions accept clipIds instead of paths

  /** VideoManager.removeExcept
   *    remove all clips from directory except 
   *    clip with given id
   */
  removeExcept(clipId) {
    var otherClips = 
      Array.from(this.clips.keys())
        .filter(c => c != clipId);

    this.removeClips(otherClips);
  }

  /** VideoManager.truncateClip
   *    set duration of clip to timestamp in seconds 
   *
   *    output filename must be different, so use a temporary
   *    clip id, truncate the video, and overwrite the
   *    original file with the truncated version 
   */
  truncateClip(clipId, timeStamp) {
    var clipPath = this.idToPath(clipId);
    // var truncated = ffmpeg(clipPath).videoBitrate(BITRATE);

    var truncId = tempFile();
    var truncPath = this.idToPath(truncId);

    fu.truncateVideo(clipPath, truncPath, timeStamp)
      .then(() => {
        this.removeClips([clipId]);
      })
      .then(() => {
        fs.rename(truncPath, clipPath, 
          (err) => { if (err) console.log("File rename error:", err) });
      }).then(() => {
        this.sendClient(clipId, "setVideoURL");
      }).catch((err) => {
        console.log("Error truncating:", err);
      });

    // truncated.seekInput(0)
    //   .duration(timeStamp)
    //   .save(truncPath)
    //   .on("end", () => {
    //     console.log("done truncating", truncPath);
    //     this.sendClient(truncId, "setVideoURL");

    //     // remove previous clip from map
    //     this.clips.delete(clipId);

    //     // // remove other clips from current dir
    //     // this.removeExcept(truncPath);
    //   });
  }

  selectClip(clipId) {
    if (! this.clips.get(clipId))
      throw `No clip with ID '${clipId}'.`;

    this.sendClient(clipId, "setVideoURL");
  }

  /** VideoManager.sendClient
   *    sends clip id and URL via websocket connection
   */
  sendClient(clipId, messageType) {
    if (messageType == null)
      throw "sendClient requires 'messageType' parameter";

    if (this.clips.get(clipId) == null && messageType != "setVideoDownload")
      throw `No clip with id '${clipId}' in map.`;

    var filePath = this.idToPath(clipId);

    if (this.ws.readyState == WS_OPEN)
      this.ws.send(JSON.stringify({ type: messageType,
        body: { id: clipId, url: filePath }}));
    else
      throw "[WS SERVER => CLIENT ERROR]: WS not ready";
  }
}

module.exports = {
  VideoManager: VideoManager,
};

