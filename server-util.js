const fs = require("fs");
const path = require("path");

const temp = "public/temp/";

function cleanTempDir() {
  console.log("Cleaning up temporary files");

  fs.readdirSync(temp).forEach((dir) => {
    var subdir = temp + dir;
    fs.readdirSync(subdir).forEach((clips) => {
      fs.unlink(path.join(subdir, c), (err) => {
        if (err) console.log("cleanup error:", err);
      });
    });
    // remove now-empty folder 
    fs.rmdirSync(subdir);
  });
}

module.exports = {
  cleanTempDir: cleanTempDir,
}
