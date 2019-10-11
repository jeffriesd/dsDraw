const fs = require("fs");
const path = require("path");

const temp = "public/temp/";
const tempFFMPEG = "TMP_FFMPEG/";

function cleanDir(tempdir) {
  if (! fs.existsSync(tempdir)) return;
  if (! fs.lstatSync(tempdir).isDirectory()) 
    return fs.unlinkSync(tempdir);

  fs.readdirSync(tempdir).forEach((dir) => {
    var subdir = path.join(tempdir, dir);
    cleanDir(subdir);
    
    if (fs.existsSync(subdir) && fs.lstatSync(subdir).isDirectory()) {
      // remove now-empty folder 
      fs.rmdirSync(tempdir);
    }
  });

}

function cleanTempDir() {
  cleanDir(temp);
  cleanDir(tempFFMPEG);
}

module.exports = {
  cleanTempDir: cleanTempDir,
}
