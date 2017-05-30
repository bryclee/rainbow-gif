const Jimp = require('jimp');
const GifEncoder = require('gif-encoder');

const input = 'catmoji.jpg';
const output = 'cjimp2.gif';

const file = require('fs').createWriteStream(output);

Jimp.read(input).then(image => {
    // image.resize(100, Jimp.AUTO);
    console.time('Jimp/GifEncoder');

    const { width, height } = image.bitmap;

    const gif = new GifEncoder(width, height);

    gif.pipe(file);
    gif.writeHeader();
    gif.setDelay(500);
    gif.setRepeat(0);

    // Add some saturation for more effect
    // image.color([
    //     {apply: 'saturate', params: [ 50 ]}
    // ]);

    const rotations = 5;

    gif.addFrame(image.bitmap.data);
    for (var i = 1; i < rotations; i++) {
        image.color([
            {apply: 'hue', params: [ 360 / rotations ]}
        ]);
        gif.addFrame(image.bitmap.data);
        gif.read();
    }

    gif.finish();
    console.timeEnd('Jimp/GifEncoder');
}).catch(err => console.error(err));

// gif.pipe(file);
//
// gif.on('data', data => console.log(data));
//
// console.log('writeHeader');
// gif.writeHeader();
// console.log('setDelay');
// gif.setDelay(150);
// console.log('setRepeat');
// gif.setRepeat(0);
//
// console.log('addFrame red');
// gif.addFrame(red);
// console.log('addFrame green');
// gif.addFrame(green);
// console.log('addFrame blue');
// gif.addFrame(blue);
// console.log('finish');
// gif.finish();

