const Jimp = require('jimp');

Jimp.read('../frontend/public/app-logo.png')
  .then(image => {
    return image.resize(256, 256).writeAsync('square-logo.png');
  })
  .then(() => {
    console.log('Image resized to square');
    import('png-to-ico').then(pngToIco => {
      pngToIco.default('square-logo.png')
        .then(buf => {
          require('fs').writeFileSync('icon.ico', buf);
          console.log('Icon created successfully');
        })
        .catch(console.error);
    });
  })
  .catch(console.error);
