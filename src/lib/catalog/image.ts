import imageCompression from 'browser-image-compression'

/** Compress + downscale before upload. Pass optimize=false for max quality. */
export async function prepareImage(file: File, optimize = true): Promise<File> {
  if (!optimize) return file
  return imageCompression(file, {
    maxWidthOrHeight: 1600,
    maxSizeMB: 1.2,
    fileType: 'image/webp',
    useWebWorker: true,
  })
}
