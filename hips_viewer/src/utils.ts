interface RGB {r: number, g: number, b: number}

// from https://stackoverflow.com/questions/5623838/rgb-to-hex-and-hex-to-rgb
export function hexToRgb(hex: string) {
  var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (result) {
    return {
        r: parseInt(result[1], 16) / 255,
        g: parseInt(result[2], 16) / 255,
        b: parseInt(result[3], 16) / 255,
    }
  }
  return null
}

// from https://stackoverflow.com/questions/5623838/rgb-to-hex-and-hex-to-rgb
export function rgbToHex(color: RGB) {
   let {r, g, b} = color
    r *= 255;
    g *= 255;
    b *= 255;
    return "#" + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
}

// from https://stackoverflow.com/questions/66123016/interpolate-between-two-colours-based-on-a-percentage-value
export function colorInterpolate(rgbA: RGB, rgbB: RGB, proportion: number) {
    return {
        r: rgbA.r * (1 - proportion) + rgbB.r * proportion,
        g: rgbA.g * (1 - proportion) + rgbB.g * proportion,
        b: rgbA.b * (1 - proportion) + rgbB.b * proportion,
    }
}
