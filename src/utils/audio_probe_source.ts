import path from "node:path";

// A still image never carries an audio track, so probing it only makes ffprobe a requirement for image-only renders.
const STILL_IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp", ".svg"]);

export const isStillImageFile = (filePath: string): boolean => {
  const withoutQuery = filePath.split(/[?#]/)[0];
  return STILL_IMAGE_EXTENSIONS.has(path.extname(withoutQuery).toLowerCase());
};

export const audioProbeSource = (files: { movieFile?: string; imageFile?: string }): string | undefined => {
  if (files.movieFile) {
    return files.movieFile;
  }
  if (!files.imageFile || isStillImageFile(files.imageFile)) {
    return undefined;
  }
  return files.imageFile;
};
