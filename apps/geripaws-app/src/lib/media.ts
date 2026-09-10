import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

const MAX_DIMENSION = 1600;

/** Resizes an over-large photo down to a sane max dimension and re-compresses
 * it before upload — this is the single biggest lever on Storage cost (an
 * unresized phone photo can be 5-10x the size for no visible benefit at the
 * sizes this app ever displays a photo). Skips resizing (but still
 * re-compresses) if the source is already within bounds. Video is
 * intentionally left untouched here — see lib/attachments.ts. */
export async function prepareImageForUpload(uri: string, width?: number, height?: number): Promise<string> {
  const context = ImageManipulator.manipulate(uri);
  if (width && height && Math.max(width, height) > MAX_DIMENSION) {
    if (width >= height) {
      context.resize({ width: MAX_DIMENSION });
    } else {
      context.resize({ height: MAX_DIMENSION });
    }
  }
  const image = await context.renderAsync();
  const result = await image.saveAsync({ compress: 0.7, format: SaveFormat.JPEG });
  return result.uri;
}
