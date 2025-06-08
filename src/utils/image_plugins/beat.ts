import { ImageProcessorParams } from "../../types/index.js";

export const imageType = "beat";

const processBeatReference = async (params: ImageProcessorParams) => {
  const { beat, context } = params;
  
  // Check if this is a beat media type
  if (!beat.image || beat.image.type !== imageType) return;
  
  // Get the beat index to reference
  const currentBeatIndex = context.studio.script.beats.indexOf(beat);
  const referenceIndex = beat.image.index !== undefined 
    ? beat.image.index 
    : currentBeatIndex - 1; // Default to previous beat if index not specified
  
  // Validate the reference index
  if (referenceIndex < 0 || referenceIndex >= context.studio.script.beats.length || referenceIndex === currentBeatIndex) {
    throw new Error(`Invalid beat reference index: ${referenceIndex}. Current beat index: ${currentBeatIndex}`);
  }
  
  // Get the referenced beat's image path
  const referencedStudioBeat = context.studio.beats[referenceIndex];
  if (referencedStudioBeat?.imageFile) {
    return referencedStudioBeat.imageFile;
  }
  
  // If the referenced beat doesn't have an image file yet, construct the expected path
  const suffix = "p"; // Same suffix used in imagePreprocessAgent
  const referencedImagePath = `${context.fileDirs.imageDirPath}/${context.studio.filename}/${referenceIndex}${suffix}.png`;
  
  return referencedImagePath;
};

export const process = processBeatReference; 