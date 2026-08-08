function premultipliedByte(color: number, alpha: number): number {
  return Math.round((color * alpha) / 255);
}

function colorForContribution(contribution: number, alpha: number): number | null {
  if (contribution === 0) return 0;
  const center = Math.round((contribution * 255) / alpha);
  for (let color = Math.max(0, center - 2); color <= Math.min(255, center + 2); color += 1) {
    if (premultipliedByte(color, alpha) === contribution) return color;
  }
  return null;
}

/**
 * Re-express an ADD texture without an opaque black matte. The resulting
 * straight-RGBA pixels have exactly the same 8-bit premultiplied RGB, so
 * plus-lighter receives the same additive energy while zero-energy black
 * becomes genuinely transparent.
 */
export function canonicalizeAdditiveRgba(pixels: Uint8ClampedArray): void {
  for (let offset = 0; offset < pixels.length; offset += 4) {
    const sourceAlpha = pixels[offset + 3];
    const contributions = [
      premultipliedByte(pixels[offset], sourceAlpha),
      premultipliedByte(pixels[offset + 1], sourceAlpha),
      premultipliedByte(pixels[offset + 2], sourceAlpha),
    ];
    const minimumAlpha = Math.max(...contributions);
    if (minimumAlpha === 0) {
      pixels[offset] = 0;
      pixels[offset + 1] = 0;
      pixels[offset + 2] = 0;
      pixels[offset + 3] = 0;
      continue;
    }

    for (let alpha = minimumAlpha; alpha <= 255; alpha += 1) {
      const colors = contributions.map((value) => colorForContribution(value, alpha));
      if (colors.some((value) => value === null)) continue;
      pixels[offset] = colors[0] as number;
      pixels[offset + 1] = colors[1] as number;
      pixels[offset + 2] = colors[2] as number;
      pixels[offset + 3] = alpha;
      break;
    }
  }
}

export function additiveContribution(pixel: ArrayLike<number>): [number, number, number] {
  return [
    premultipliedByte(pixel[0], pixel[3]),
    premultipliedByte(pixel[1], pixel[3]),
    premultipliedByte(pixel[2], pixel[3]),
  ];
}
