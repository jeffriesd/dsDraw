
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

class VideoManager {

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

    // merge clips and remove other clips
    if (clips.length > 1) 
      clipPath = VideoManager.mergeClips(ws, clips);
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
      /\/\d+\.webm$/, `/${VideoClip.assignClipId()+1}.webm`);
    console.log("merging clips to ", mergedPath);

    var merged = new ffmpeg();
    merged.on("end",  
      () => {
        // remove other clips after merging
        VideoManager.removeClips(filePaths);
        // send updated URL once webm is written
        ws.send(mergedPath);
      }
    );

    filePaths.forEach((f) => merged = merged.input(f));
    merged.mergeToFile(mergedPath, TEMP_PATH);
  }

  static removeClips(filePaths) {
    filePaths.forEach((f) => 
      fs.unlinkSync(f, (err) => console.log("Cleanup error:", err)));
  }

  static truncateClip(filePath, timeStamp) {

  }
}

/** VideoClip
 *    class to encapsulate reading
 *    and writing webms using ffmpeg
 */
class VideoClip {
  constructor(clientId, dataBuffer) {
    this.clipId = VideoClip.assignClipId();
    this.clientId = clientId;
    this.buffer = dataBuffer;

    this.dir = path.join(WRITE_PATH, String(this.clientId));

    this.writeFile();
  }

  get clipPath() {
    if (! fs.existsSync(this.dir))
      fs.mkdir(this.dir, 
        { recursive: true }, (err) => console.log("readdir error:", err));
    return path.join(this.dir, String(this.clipId) + ".webm");
  }

  writeFile() { 
    fs.writeFileSync(this.clipPath, this.buffer);
    console.log("done writing", this.clipPath);
  }

  static assignClipId() { 
    var ms = new Date().getTime();
    return ms;
  }
}

module.exports = {
  VideoManager: VideoManager,
};
