const spawn = require("child_process").spawn;
const fs = require("fs");
const path = require("path");

const TEMP_DIR = "TMP_FFMPEG";
const uniqueStr = () => String(new Date().getTime());

function fullPath(relPath) {
  return path.join(__dirname, relPath)
}

function writeListFile(tempFile, clipPaths) {
  var contents = 
    clipPaths.map(x => `file '${fullPath(x)}'`).join("\n");
  console.log(contents);

  return new Promise((resolve, reject) => { 
    fs.writeFile(tempFile, contents, (err) => {
      if (err) reject(err);
      else resolve();
    });
  })
}

function concatArgs(listFilePath, destPath) {
  return ["-y", "-f", "concat", "-safe", "0", "-i", 
          listFilePath, "-c", "copy", destPath];
}

/** mergeVideos
 *    accepts array of clip paths, a destination path, 
 *    and an optional callback
 */
function mergeVideos(clipPaths, destPath, stdErrCallback) {
  var tempFile = path.join(TEMP_DIR, uniqueStr());
  var args = concatArgs(tempFile, destPath);

  return new Promise((resolve, reject) => {
    writeListFile(tempFile, clipPaths).then(() => {
      var ffmpeg = spawn("ffmpeg", args);
      // ffmpeg.stderr.on("data", (data) => null);
      ffmpeg.on("close", (event) => resolve());
    }).catch((err) => {
      console.log("Error merging:", err);
    });
  });
}

function truncateArgs(srcFile, destFile, timeStamp) {
  return ["-y", "-i", srcFile, "-t", timeStamp, "-c", "copy", destFile];
}

/** truncateVideo
 *    accepts file paths for source and destination 
 *    and truncates video from timeStamp onward
 */
function truncateVideo(clipPath, destFile, timeStamp) {
  var args = truncateArgs(clipPath, destFile, timeStamp); 
  return new Promise((resolve, reject) => {
    var ffmpeg = spawn("ffmpeg", args);
    ffmpeg.on("close", (event) => resolve());
  });
}

module.exports = {
  mergeVideos: mergeVideos,
  truncateVideo: truncateVideo,
};
