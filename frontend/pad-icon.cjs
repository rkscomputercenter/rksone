const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const inputPath = path.join(__dirname, 'assets', 'icon.png');
const outputPath = path.join(__dirname, 'assets', 'icon-padded.png');

sharp(inputPath)
  .resize(700, 700, {
    fit: 'contain',
    background: { r: 255, g: 255, b: 255, alpha: 1 }
  })
  .extend({
    top: 162,
    bottom: 162,
    left: 162,
    right: 162,
    background: { r: 255, g: 255, b: 255, alpha: 1 }
  })
  .toFile(outputPath)
  .then(() => {
    console.log('Successfully padded icon!');
    // Overwrite original icon
    fs.renameSync(outputPath, inputPath);
  })
  .catch(err => {
    console.error('Error padding icon:', err);
    process.exit(1);
  });
