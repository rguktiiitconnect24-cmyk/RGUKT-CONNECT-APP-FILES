const fs = require('fs');
const Jimp = require('jimp');
const pngToIco = require('png-to-ico').default;

async function convert() {
  console.log('Reading public/logo.jpg...');
  const image = await Jimp.read('public/logo.jpg');
  
  console.log('Resizing to 256x256 (standard max size for ICO)...');
  image.resize(256, 256);
  
  console.log('Saving as temp.png...');
  await image.writeAsync('temp.png');
  
  console.log('Converting temp.png to public/logo.ico...');
  const buf = await pngToIco('temp.png');
  fs.writeFileSync('public/logo.ico', buf);
  
  console.log('Cleaning up...');
  fs.unlinkSync('temp.png');
  console.log('Done! Icon saved as public/logo.ico');
}

convert().catch(console.error);
