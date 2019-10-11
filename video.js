
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
const sendMessage = require("./server-connection").sendMessage;

const BITRATE = 1000;

const clipNamePattern = /\/\d+\.webm$/;
var uniqueFileID = new Date().getTime();
const tempFile = () => uniqueFileID++;

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

  /** VideoManager.addClip
   *    adds clip to map
   *    and writes video file 
   *    (with sendClient setVideoURL as callback)
   *    
   *    !! if previous recording exists, merge them.
   */
  addClip(clipId, buffer) {
    console.log("adding clip: ", clipId);

    // merge with existing clip {clipId} (unless it doesn't exist yet)
    if (this.clips.has(clipId)) {
      console.log("MERGING")
      this.mergeOverwrite(clipId, buffer);
    }
    else {
      // otherwise add clip to map and write a new video file 
      var clipPath = this.idToPath(clipId);
      this.clips.set(clipId, clipPath);
      // write clip and send URL once complete
      if (buffer != null) {
        fs.writeFile(clipPath, buffer,
          () => this.sendClient(clipId, "setVideoURL"));
      }
    }
  }

  /** VideoManager.mergeOverwrite
   *    given a clipId corresponding to an existing
   *    video and a buffer of new content to merge
   *    with it, merge the two and write 
   *    it to the path of the original clip 
   */
  mergeOverwrite(clipId, appendBuffer) {
    var clipPath = this.clips.get(clipId);

    // create temp clip id for new buffer 
    var newBufferId = tempFile();
    var newBufferPath = this.idToPath(newBufferId);

    var mergedId = tempFile();
    var mergedPath = this.idToPath(mergedId);
    console.log("pls write")
    fs.writeFile(newBufferPath, appendBuffer,
      // callback after writing temp video for 2nd component
      () => {
        fu.mergeVideos([clipPath, newBufferPath], mergedPath)
        .then(() => { 
          var crop = s => s.match(/[^/]*\.webm$/)[0];
          sendMessage(this.ws, "log", "merge " + crop(clipPath)+ ", " +  crop(newBufferPath));

          this.sendClient(clipId, "setVideoURL", mergedPath);
          this.clips.set(clipId, mergedPath);
        })
        .catch(err => console.log("Merge overwrite error:", err, this.clipIds));
      }
    );
  }

  /** VideoManager.mergeClipsForDL
   *    takes array of clip ids and 
   *    merges videos together
   *
   *    sends merged file path over websocket server
   *    for video download
   */
  mergeClipsForDL(clipIds) {
    if (clipIds.some((e) => ! this.clips.has(e))) 
      throw "Cannot merge clips; some clips have not yet been recorded.";

    if (clipIds.length == 0)
      return;
    if (clipIds.length == 1)
      return this.sendClient(clipIds[0], "setVideoDownload");

    var filePaths = clipIds.map(x => this.clips.get(x));

    // create new clip id
    var mergedId = tempFile();
    var mergedPath = this.idToPath(mergedId);

    fu.mergeVideos(filePaths, mergedPath)
      .then(() => {
        console.log("done merging", mergedPath);

        this.clips.set(mergedId, mergedPath);

        this.sendClient(mergedId, "setVideoDownload");
      })
      .catch((err) => {
        console.log("Merge error:", err);
      });
  }

  /** VideoManager.deleteClipFiles
   *    remove video files from file system
   */
  deleteClipFiles(clipIds) {
    clipIds.forEach((id) => {
      if (! this.clips.has(id)) return;
      fs.unlinkSync(this.clips.get(id), (err) => console.log("Cleanup error:", err));
    });
  }

  /** VideoManager.truncateClip
   *    set duration of clip to timestamp in seconds 
   *
   *    output filename must be different, so use a temporary
   *    clip id, truncate the video, and overwrite the
   *    original file with the truncated version 
   */
  truncateClip(clipId, timeStamp) {
    var clipPath = this.clips.get(clipId);

    var truncId = tempFile();
    var truncPath = this.idToPath(truncId);

    fu.truncateVideo(clipPath, truncPath, timeStamp)
    .then(() => {
      // update id -> clipPath mapping
      this.clips.set(clipId, truncPath);
      this.sendClient(clipId, "setVideoURL", truncPath)
    })
    .catch(err => {
      console.log("Error truncating:", err);
    })
  }

  selectClip(clipId) {
    if (! this.clips.get(clipId))
      throw `No clip with ID '${clipId}'.`;

    this.sendClient(clipId, "setVideoURL");
  }

  /** VideoManager.sendClient
   *    sends clip id and URL via websocket connection
   */
  sendClient(clipId, messageType, alternatePath) {
    if (messageType == null)
      throw "sendClient requires 'messageType' parameter";

    if (this.clips.get(clipId) == null && messageType != "setVideoDownload")
      throw `No clip with id '${clipId}' in map.`;

    var filePath = alternatePath || this.clips.get(clipId);

    var body = { id: clipId, url: filePath };
    sendMessage(this.ws, body, messageType);
  }
}

module.exports = {
  VideoManager: VideoManager,
};

