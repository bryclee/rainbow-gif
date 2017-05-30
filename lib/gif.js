const omggif = require('omggif');
const { palette, quantize } = require('neuquant-js');
const filetype = require('file-type');
const jpeg = require('jpeg-js');
const png = require('pngjs').PNG;
const { GifWriter, GifReader } = omggif;
const { shiftHue, round } = require('./colors');

const DEFAULT_DELAY = 30;

/**
 * Given a buffer, determine the filetype and parse accordingly
 */
function rainbowify(buffer, numFrames, OutputConstructor = Array) {
    const ft = filetype(buffer);

    if (!ft) {
        throw new Error('Unrecognized file type'); // Error: filetype not detected?
    }

    switch (ft.ext) {
        case 'gif': {
            const {width, height, frames} = parseGif(buffer);
            const outputBuffer = new OutputConstructor();
            const newGif = new GifWriter(outputBuffer, width, height, {loop: 0});

            rainbowifyFrames(frames, (frame, i) => {
                const {indexed, palette} = quantize(rgbaToRgb(frame.data));
                newGif.addFrame(0, 0, width, height, indexed, {
                    palette: rgbToNum(palette),
                    delay: frame.delay || DEFAULT_DELAY
                });
            });

            return outputBuffer.slice(0, newGif.end()); // something
            break;
        }
        case 'jpg': {
            const {data, width, height} = parseJpeg(buffer, true);
            const outputBuffer = new OutputConstructor(/* what is this length? */);
            const newGif = new GifWriter(outputBuffer, width, height, {loop: 0});

            rainbowifyStatic(data, numFrames, (frame, i) => {
                const {indexed, palette} = quantize(rgbaToRgb(frame));
                newGif.addFrame(0, 0, width, height, indexed, {
                    palette: rgbToNum(palette),
                    delay: DEFAULT_DELAY
                });
            });
            return outputBuffer.slice(0, newGif.end());
            break;
        }
        case 'png': {
            const {data, width, height} = parsePng(buffer);
            const outputBuffer = new OutputConstructor(/* what is this length? */);

            const newGif = new GifWriter(outputBuffer, width, height, {loop: 0});

            rainbowifyStatic(data, numFrames, (frame, i) => {
                const {indexed, palette} = quantize(rgbaToRgb(frame));
                newGif.addFrame(0, 0, width, height, indexed, {
                    palette: rgbToNum(palette),
                    delay: DEFAULT_DELAY
                });
            });
            return outputBuffer.slice(0, newGif.end());
            break;
        }
        default: {
            throw new Error(`Unknown file type ${ft.ext}`);
            break;
        }
    }
}

function parseGif(buffer) {
    try {
        const gifData = new GifReader(buffer);
        const {width, height} = gifData;
        const frames = [];

        for (let i = 0; i < gifData.numFrames(); i++) {
            const frameInfo = gifData.frameInfo(i);
            const frameData = [];
            if (
                frameInfo.width === width &&
                frameInfo.height === height &&
                frameInfo.x === 0 &&
                frameInfo.y === 0
            ) {
                gifData.decodeAndBlitFrameRGBA(i, frameData);
            } else if (frames[i - 1]) {
                const framePartial = [];
                gifData.decodeAndBlitFrameRGBA(i, framePartial);
                for (var j = 0; j < width * height * 4; ) {
                    if (framePartial[j]) {
                        frameData[j] = framePartial[j++];
                        frameData[j] = framePartial[j++];
                        frameData[j] = framePartial[j++];
                        frameData[j] = framePartial[j++];
                    } else {
                        // Copy rgba data
                        frameData[j] = frames[i - 1].data[j++];
                        frameData[j] = frames[i - 1].data[j++];
                        frameData[j] = frames[i - 1].data[j++];
                        frameData[j] = frames[i - 1].data[j++];
                    }
                }
            } else {
                console.error('Frame size incomplete', frameInfo);
                throw new Error('Frame size incomplete?');
            }
            frames.push({
                data: frameData,
                delay: frameInfo.delay
            });
        }

        return {width, height, frames};
    } catch(err) {
        console.error('Error parsing Gif:', err);
        throw new Error('Error parsing Gif');
    }
}

function parseJpeg(buffer) {
    try {
        const jpegData = jpeg.decode(buffer, true);
        return jpegData;
    } catch(err) {
        console.error('Error parsing Jpeg:', err);
        throw new Error('Error parsing Jpeg');
    }
}

function parsePng(buffer) {
    try {
        const pngData = png.sync.read(buffer);
        return pngData;
    } catch(err) {
        console.error('Error parsing Png:', err);
        throw new Error('Error parsing Png');
    }
}

function rainbowifyFrames(frames, cb) {
    const shift = frames.length > 3 ?
        360 / frames.length :
        360 / (frames.length * 2);

    cb(frames[0], 0);
    for (let i = 1; i < frames.length; i++) {
        shiftFrame(shift * i, frames[i].data);
        cb(frames[i], i);
    }

    if (frames.length <= 3) {
        for (let i = 0; i < frames.length; i++) {
            shiftFrame(frames.length * shift, frames[i].data);
            cb(frames[i], i);
        }
    }
}

// Mutates data containing rgba values and shifts hues. Call cb on mutated data
function rainbowifyStatic(data, numFrames, cb) {
    const shift = 360 / numFrames;

    cb(data, 0);
    for (let i = 1; i < numFrames; i++) {
        shiftFrame(shift, data);
        let middle = (256 * 128 + 128) << 2;
        cb(data, i);
    }
}

// Check that a index of an RGBA array is within the partial frame bounds
function getWithinFrame(i, x, y, frameWidth, frameHeight, totalWidth) {
    const row = Math.floor((i / 4) / totalWidth);
    const col = Math.floor(i / 4) % totalWidth;
    if (
        col >= x && col < x + frameWidth &&
        row >= y && row < y + frameHeight
    ) {
        return ((row - y) * frameWidth + (col - x)) * 4;
    }

    return -1;
}

// Shift hue for a frame of rgba data, mutates the original frame
function shiftFrame(shift, frame) {
    for (let i = 0; i < frame.length; i += 4) {
        const {r, g, b} = shiftHue(shift, frame[i], frame[i + 1], frame[i + 2]);
        frame[i] = r;
        frame[i + 1] = g;
        frame[i + 2] = b;
    }
}

// This is needed for getting the palette, seems to be expecting colors in Hex values
// Taken from neuqant-js docs: https://github.com/unindented/neuquant-js
function rgbToNum(arr) {
    const result = [];
    for (let i = 0; i < arr.length; i) {
        result.push((arr[i++] << 16) | (arr[i++] << 8) | arr[i++]);
    }
    return result;
}

function rgbaToRgb(rgba) {
    const result = [];
    for (var i = 0; i < rgba.length; ) {
        const scale = rgba[i + 3] / 255;
        result.push(round(rgba[i++] * scale));
        result.push(round(rgba[i++] * scale));
        result.push(round(rgba[i++] * scale));
        i++;
    }
    return result;
}

// Get the palette of the image. omggif expects palette to be passed in options, either global or local to frame
function getPalette(data) {
    const rgbData = data.filter((_, i) => (i + 1) % 4 !== 0);
    const colors = palette(rgbData);
    const result = rgbToNum(colors);
    return result;
}

module.exports = { rainbowify };
