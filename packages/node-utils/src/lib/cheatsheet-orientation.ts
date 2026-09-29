import { createRequire } from 'node:module';
import { join } from 'node:path';
import jsQR from 'jsqr';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.js';
import type { PDFPageProxy } from 'pdfjs-dist/types/src/display/api';

export type QuarterTurn = 0 | 90 | 180 | 270;

type CreateCanvas = (width: number, height: number) => {
  getContext(type: '2d'): {
    getImageData(sx: number, sy: number, sw: number, sh: number): ImageData;
  };
};

let cachedCreateCanvas: CreateCanvas | null | undefined;

function loadCreateCanvas(): CreateCanvas | null {
  if (cachedCreateCanvas !== undefined) return cachedCreateCanvas;
  try {
    const req = createRequire(join(process.cwd(), 'package.json'));
    cachedCreateCanvas = (req('canvas') as { createCanvas: CreateCanvas }).createCanvas;
  } catch (err) {
    console.warn(
      'canvas native module unavailable; skipping cheatsheet orientation detection:',
      err
    );
    cachedCreateCanvas = null;
  }
  return cachedCreateCanvas;
}

const QUARTER_TURNS: QuarterTurn[] = [0, 90, 180, 270];

function normalizeQuarterTurn(angle: number): QuarterTurn {
  const normalized = ((angle % 360) + 360) % 360;
  if (normalized === 90 || normalized === 180 || normalized === 270) return normalized;
  return 0;
}

function qrAfterClockwiseTurn(
  right: boolean,
  top: boolean,
  rotation: QuarterTurn
): { right: boolean; top: boolean } {
  if (rotation === 90) return { right: top, top: !right };
  if (rotation === 180) return { right: !right, top: !top };
  if (rotation === 270) return { right: !top, top: right };
  return { right, top };
}

function isPortraitAfter(portrait: boolean, rotation: QuarterTurn): boolean {
  const swapsAxes = rotation === 90 || rotation === 270;
  return swapsAxes ? !portrait : portrait;
}

export function extraRotationForQr(
  width: number,
  height: number,
  qrX: number,
  qrY: number
): QuarterTurn {
  const right = qrX >= width / 2;
  const top = qrY < height / 2;
  const portrait = height >= width;
  const candidates = QUARTER_TURNS.map((rotation) => {
    const qr = qrAfterClockwiseTurn(right, top, rotation);
    return {
      rotation,
      portrait: isPortraitAfter(portrait, rotation),
      topRight: qr.right && qr.top,
      top: qr.top,
    };
  });

  return (
    candidates.find((candidate) => candidate.portrait && candidate.topRight)?.rotation ??
    candidates.find((candidate) => candidate.portrait && candidate.top)?.rotation ??
    candidates.find((candidate) => candidate.topRight)?.rotation ??
    0
  );
}

async function extraRotationForPage(
  page: PDFPageProxy,
  createCanvas: CreateCanvas
): Promise<QuarterTurn> {
  const viewport = page.getViewport({ scale: 1 });
  const width = Math.ceil(viewport.width);
  const height = Math.ceil(viewport.height);
  if (width < 1 || height < 1) return 0;

  const canvas = createCanvas(width, height);
  const context = canvas.getContext('2d');
  const renderParams = {
    canvasContext: context,
    viewport,
  } as unknown as Parameters<PDFPageProxy['render']>[0];
  await page.render(renderParams).promise;
  const image = context.getImageData(0, 0, width, height);
  const result = jsQR(image.data, image.width, image.height);
  if (!result) return 0;

  const { topLeftCorner, topRightCorner, bottomRightCorner, bottomLeftCorner } = result.location;
  const qrX = (topLeftCorner.x + topRightCorner.x + bottomRightCorner.x + bottomLeftCorner.x) / 4;
  const qrY = (topLeftCorner.y + topRightCorner.y + bottomRightCorner.y + bottomLeftCorner.y) / 4;
  return extraRotationForQr(image.width, image.height, qrX, qrY);
}

export async function uprightRotationsForPdf(buffer: Buffer): Promise<QuarterTurn[]> {
  const createCanvas = loadCreateCanvas();
  if (!createCanvas) return [];

  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(buffer),
    verbosity: 0,
    disableWorker: true,
  } as Parameters<typeof pdfjsLib.getDocument>[0]);

  try {
    const pdf = await loadingTask.promise;
    const rotations: QuarterTurn[] = [];
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
      try {
        const page = await pdf.getPage(pageNumber);
        rotations.push(await extraRotationForPage(page, createCanvas));
      } catch (err) {
        console.warn(`Cheatsheet orientation check failed on page ${pageNumber}:`, err);
        rotations.push(0);
      }
    }
    return rotations;
  } catch (err) {
    console.warn('Cheatsheet orientation check failed:', err);
    return [];
  } finally {
    await loadingTask.destroy().catch(() => undefined);
  }
}

export function rotationWithUprightCorrection(
  pdfRotation: number,
  extra: QuarterTurn | undefined
): QuarterTurn {
  return normalizeQuarterTurn(pdfRotation + (extra ?? 0));
}
