/** Small, local document detector. Coordinates follow the visible portrait camera crop. */
export type Point = { x: number; y: number };
export type DocumentQuad = [Point, Point, Point, Point]; // TL, TR, BR, BL; normalized
type Line = { slope: number; offset: number; votes: number };

export const DOCUMENT_GUIDE: DocumentQuad = [
  { x: 0.08, y: 0.06 }, { x: 0.92, y: 0.06 },
  { x: 0.92, y: 0.94 }, { x: 0.08, y: 0.94 },
];

/** Hough peaks for near-horizontal/vertical borders, allowing mild perspective/rotation. */
function borderLines(edges: Uint8Array, width: number, height: number, vertical: boolean): Line[] {
  const size = vertical ? width : height;
  const length = vertical ? height : width;
  const peaks: Line[] = [];
  const points: Point[] = [];
  for (let y = 2; y < height - 2; y++) {
    for (let x = 2; x < width - 2; x++) {
      if (edges[y * width + x] & (vertical ? 1 : 2)) points.push({ x, y });
    }
  }
  for (let degrees = -24; degrees <= 24; degrees++) {
    const slope = Math.tan(degrees * Math.PI / 180);
    const bins = new Uint16Array(size);
    for (const { x, y } of points) {
      const offset = Math.round(vertical ? x - slope * (y - height / 2) : y - slope * (x - width / 2));
      if (offset > size * 0.04 && offset < size * 0.96) bins[offset]++;
    }
    for (let offset = 2; offset < size - 2; offset++) {
      // A two-pixel neighbourhood tolerates aliasing in the small analysis image.
      const votes = bins[offset - 1] + bins[offset] + bins[offset + 1];
      if (votes > length * 0.3) peaks.push({ slope, offset, votes });
    }
  }
  const selected: Line[] = [];
  for (const peak of peaks.sort((a, b) => b.votes - a.votes)) {
    const innerLimit = vertical ? 0.36 : 0.3;
    if (peak.offset > size * innerLimit && peak.offset < size * (1 - innerLimit)) continue;
    if (selected.some((p) => Math.abs(p.offset - peak.offset) < size * 0.06 && Math.abs(p.slope - peak.slope) < 0.12)) continue;
    // Keep candidates on both sides even if text produces stronger interior lines.
    const side = peak.offset < size / 2;
    if (selected.filter((p) => (p.offset < size / 2) === side).length < 4) selected.push(peak);
  }
  return selected;
}

function intersection(v: Line, h: Line, width: number, height: number): Point {
  const x = (v.offset - v.slope * height / 2 + v.slope * (h.offset - h.slope * width / 2)) / (1 - v.slope * h.slope);
  return { x, y: h.offset + h.slope * (x - width / 2) };
}

function borderSupport(a: Point, b: Point, edges: Uint8Array, width: number, height: number, direction: number) {
  const count = Math.ceil(Math.hypot(b.x - a.x, b.y - a.y));
  let hits = 0;
  for (let i = 0; i <= count; i++) {
    const x = Math.round(a.x + (b.x - a.x) * i / count);
    const y = Math.round(a.y + (b.y - a.y) * i / count);
    let hit = false;
    for (let d = -2; d <= 2; d++) {
      const px = x + (direction === 1 ? d : 0);
      const py = y + (direction === 2 ? d : 0);
      if (px >= 0 && py >= 0 && px < width && py < height && (edges[py * width + px] & direction)) hit = true;
    }
    if (hit) hits++;
  }
  return hits / (count + 1);
}

/** Requires four long, supported edges; a timer or a still camera alone never qualifies. */
export function detectDocument({ data, width, height }: Pick<ImageData, "data" | "width" | "height">): DocumentQuad | null {
  // A small spatial blur suppresses phone-camera noise before measuring borders.
  const gray = new Uint8Array(width * height);
  const luminance = new Uint8Array(width * height);
  let brightness = 0;
  for (let i = 0; i < gray.length; i++) {
    luminance[i] = (data[i * 4] * 77 + data[i * 4 + 1] * 150 + data[i * 4 + 2] * 29) >> 8;
    brightness += luminance[i];
  }
  if (brightness / gray.length < 30) return null;
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = y * width + x;
      gray[i] = (luminance[i] * 4 + (luminance[i - 1] + luminance[i + 1] + luminance[i - width] + luminance[i + width]) * 2 + luminance[i - width - 1] + luminance[i - width + 1] + luminance[i + width - 1] + luminance[i + width + 1]) / 16;
    }
  }
  const edges = new Uint8Array(gray.length);
  for (let y = 2; y < height - 2; y++) {
    for (let x = 2; x < width - 2; x++) {
      const i = y * width + x;
      const gx = gray[i - width + 1] + 2 * gray[i + 1] + gray[i + width + 1] - gray[i - width - 1] - 2 * gray[i - 1] - gray[i + width - 1];
      const gy = gray[i + width - 1] + 2 * gray[i + width] + gray[i + width + 1] - gray[i - width - 1] - 2 * gray[i - width] - gray[i - width + 1];
      // Detect low-contrast paper borders too, rather than requiring a white sheet on black.
      if (Math.abs(gx) > 32 && Math.abs(gx) > Math.abs(gy) * 1.3) edges[i] |= 1;
      if (Math.abs(gy) > 32 && Math.abs(gy) > Math.abs(gx) * 1.3) edges[i] |= 2;
    }
  }
  const vertical = borderLines(edges, width, height, true);
  const horizontal = borderLines(edges, width, height, false);
  let best: DocumentQuad | null = null;
  let bestScore = 0;
  for (const left of vertical.filter((p) => p.offset < width * 0.36)) {
    for (const right of vertical.filter((p) => p.offset > width * 0.64)) {
      for (const top of horizontal.filter((p) => p.offset < height * 0.3)) {
        for (const bottom of horizontal.filter((p) => p.offset > height * 0.7)) {
          const quad: DocumentQuad = [
            intersection(left, top, width, height), intersection(right, top, width, height),
            intersection(right, bottom, width, height), intersection(left, bottom, width, height),
          ];
          if (quad.some((p) => p.x < width * 0.035 || p.x > width * 0.965 || p.y < height * 0.035 || p.y > height * 0.965)) continue;
          const lengths = quad.map((p, i) => Math.hypot(p.x - quad[(i + 1) % 4].x, p.y - quad[(i + 1) % 4].y));
          const ratio = (lengths[0] + lengths[2]) / (lengths[1] + lengths[3]);
          if (ratio < 0.45 || ratio > 0.92 || Math.min(lengths[1], lengths[3]) < height * 0.6) continue;
          if (Math.min(lengths[0], lengths[2]) / Math.max(lengths[0], lengths[2]) < 0.7 || Math.min(lengths[1], lengths[3]) / Math.max(lengths[1], lengths[3]) < 0.7) continue;
          const support = quad.map((p, i) => borderSupport(p, quad[(i + 1) % 4], edges, width, height, i % 2 === 0 ? 2 : 1));
          if (Math.min(...support) < 0.65 || support.reduce((sum, n) => sum + n, 0) / 4 < 0.78) continue;
          const area = Math.abs(quad.reduce((sum, p, i) => sum + p.x * quad[(i + 1) % 4].y - p.y * quad[(i + 1) % 4].x, 0)) / 2 / (width * height);
          const score = area * support.reduce((sum, n) => sum + n, 0);
          if (area > 0.35 && score > bestScore) {
            best = quad.map((p) => ({ x: p.x / width, y: p.y / height })) as DocumentQuad;
            bestScore = score;
          }
        }
      }
    }
  }
  return best;
}

export function cornersMoved(a: DocumentQuad, b: DocumentQuad) {
  return Math.max(...a.map((p, i) => Math.hypot(p.x - b[i].x, p.y - b[i].y))) > 0.018;
}

/** Centered guide follows the detected page proportions; no fixed A4 distortion. */
export function documentGuide(quad: DocumentQuad | null): DocumentQuad {
  if (!quad) return DOCUMENT_GUIDE;
  const length = (a: Point, b: Point) => Math.hypot((a.x - b.x) * 0.75, a.y - b.y);
  const ratio = (length(quad[0], quad[1]) + length(quad[3], quad[2])) / (length(quad[0], quad[3]) + length(quad[1], quad[2]));
  const height = Math.min(0.88, 0.84 * 0.75 / ratio);
  const width = height * ratio / 0.75;
  return [
    { x: (1 - width) / 2, y: (1 - height) / 2 }, { x: (1 + width) / 2, y: (1 - height) / 2 },
    { x: (1 + width) / 2, y: (1 + height) / 2 }, { x: (1 - width) / 2, y: (1 + height) / 2 },
  ];
}

/** Matches object-fit: cover in the 3:4 viewfinder, including landscape camera streams. */
export function drawCameraFrame(video: HTMLVideoElement, canvas: HTMLCanvasElement, maxSide: number) {
  const sw = Math.min(video.videoWidth, video.videoHeight * 0.75);
  const sh = sw / 0.75;
  canvas.width = Math.round(maxSide * 0.75);
  canvas.height = maxSide;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx || !sw || !sh) throw new Error("Camera frame unavailable");
  ctx.drawImage(video, (video.videoWidth - sw) / 2, (video.videoHeight - sh) / 2, sw, sh, 0, 0, canvas.width, canvas.height);
  return ctx;
}

/** Inverse projective mapping removes the background and straightens the four page edges. */
export function rectifyDocument(source: HTMLCanvasElement, quad: DocumentQuad): HTMLCanvasElement {
  const [a, b, c, d] = quad.map((p) => ({ x: p.x * (source.width - 1), y: p.y * (source.height - 1) }));
  const distance = (p: Point, q: Point) => Math.hypot(p.x - q.x, p.y - q.y);
  const width = Math.max(1, Math.round((distance(a, b) + distance(d, c)) / 2));
  const height = Math.max(1, Math.round((distance(a, d) + distance(b, c)) / 2));
  const dx1 = b.x - c.x, dx2 = d.x - c.x, dx3 = a.x - b.x + c.x - d.x;
  const dy1 = b.y - c.y, dy2 = d.y - c.y, dy3 = a.y - b.y + c.y - d.y;
  const det = dx1 * dy2 - dx2 * dy1;
  const g = (dx3 * dy2 - dx2 * dy3) / det;
  const h = (dx1 * dy3 - dx3 * dy1) / det;
  const ax = b.x - a.x + g * b.x, bx = d.x - a.x + h * d.x;
  const ay = b.y - a.y + g * b.y, by = d.y - a.y + h * d.y;
  const input = source.getContext("2d")!.getImageData(0, 0, source.width, source.height).data;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  const output = ctx.createImageData(width, height);
  for (let y = 0; y < height; y++) {
    const v = y / Math.max(1, height - 1);
    for (let x = 0; x < width; x++) {
      const u = x / Math.max(1, width - 1);
      const divisor = g * u + h * v + 1;
      const sx = Math.max(0, Math.min(source.width - 1, (ax * u + bx * v + a.x) / divisor));
      const sy = Math.max(0, Math.min(source.height - 1, (ay * u + by * v + a.y) / divisor));
      const ix = Math.floor(sx), iy = Math.floor(sy), fx = sx - ix, fy = sy - iy;
      const nextX = Math.min(ix + 1, source.width - 1), nextY = Math.min(iy + 1, source.height - 1);
      const out = (y * width + x) * 4;
      for (let channel = 0; channel < 3; channel++) {
        const top = input[(iy * source.width + ix) * 4 + channel] * (1 - fx) + input[(iy * source.width + nextX) * 4 + channel] * fx;
        const bottom = input[(nextY * source.width + ix) * 4 + channel] * (1 - fx) + input[(nextY * source.width + nextX) * 4 + channel] * fx;
        output.data[out + channel] = top * (1 - fy) + bottom * fy;
      }
      output.data[out + 3] = 255;
    }
  }
  ctx.putImageData(output, 0, 0);
  return canvas;
}
