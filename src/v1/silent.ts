import { exec } from "child_process";
import { promisify } from "util";

const execPromise = promisify(exec);

async function createSilentMp3(filename: string, duration: number) {
  // Duration in seconds, so 0.5 for half a second
  const ffmpegCommand = `ffmpeg -f lavfi -t ${duration} -i anullsrc=r=44100:cl=mono -q:a 9 -acodec mp3 ${filename}`;

  try {
    await execPromise(ffmpegCommand);
    console.log(`Successfully created silent MP3 file: ${filename}`);
  } catch (error) {
    console.error("Error creating silent MP3 file:", error);
  }
}

// Call the function to create a 0.5-second silent MP3 file named "silent.mp3"
createSilentMp3("silent.mp3", 0.5);
