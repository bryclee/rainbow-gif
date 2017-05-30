function rgbToHsv(r, g, b) {
    const rf = r / 255,
          gf = g / 255,
          bf = b / 255,
          cMax = Math.max(rf, gf, bf),
          cMin = Math.min(rf, gf, bf),
          cDelta = cMax - cMin;

    const h =
        cDelta === 0 ? 0 :
        cMax === rf  ? 60 * ((gf - bf) / cDelta % 6) :
        cMax === gf  ? 60 * ((bf - rf) / cDelta + 2) :
     /* cMax === bf */ 60 * ((rf - gf) / cDelta + 4);
    const s =
        cMax === 0 ? 0 : cDelta / cMax;
    const v = cMax;

    return {h: h, s: s, v: v};
}

function hsvToRgb(h, s, v) {
    const c = v * s,
          x = c * (1 - Math.abs((h / 60  % 2) - 1)),
          m = v - c;
    const [rf, gf, bf] =
        0 <= h && h < 60    ? [c, x, 0] :
        60 <= h && h < 120  ? [x, c, 0] :
        120 <= h && h < 180 ? [0, c, x] :
        180 <= h && h < 240 ? [0, x, c] :
        240 <= h && h < 300 ? [x, 0, c] :
    /* 300 <= h && h < 360 */ [c, 0, x];
    return {
        r: round((rf + m) * 255),
        g: round((gf + m) * 255),
        b: round((bf + m) * 255)
    };
}

function shiftHue(shift, r, g, b) {
    const {h, s, v} = rgbToHsv(r, g, b);
    return hsvToRgb((h + shift) % 360, s, v);
}

function round(num) {
    return Math.floor(num + 0.5);
}

module.exports = { rgbToHsv, hsvToRgb, shiftHue, round };
