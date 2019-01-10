const fs = require("fs");
const path = require("path");

const temp = "public/temp/";

function cleanTempDir() {
  console.log("Cleaning up temporary files");

  fs.readdirSync(temp).forEach((dir) => {
    var subdir = temp + dir;
    fs.readdirSync(subdir).forEach((clip) => {
      fs.unlinkSync(path.join(subdir, clip));
    });
    // remove now-empty folder 
    fs.rmdirSync(subdir);
  });
}

module.exports = {
  cleanTempDir: cleanTempDir,
}
