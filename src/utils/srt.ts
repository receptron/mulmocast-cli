import { MulmoStudioBeat } from "../types/index.js";

const formatSRTTime = (seconds: number): string => {
  const totalMs = Math.floor(seconds * 1000);
  const hours = Math.floor(totalMs / 3600000);
  const minutes = Math.floor((totalMs % 3600000) / 60000);
  const secs = Math.floor((totalMs % 60000) / 1000);
  const ms = totalMs % 1000;

  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")},${ms.toString().padStart(3, "0")}`;
};

export const generateSRT = (studioBeats: MulmoStudioBeat[], getTextFunc: (index: number) => string): string => {
  const srtEntries: string[] = [];
  let sequenceNumber = 1;

  studioBeats.forEach((studioBeat, index) => {
    const text = getTextFunc(index);

    if (!text || text.trim() === "") {
      return;
    }

    const startTime = studioBeat.startAt ?? 0;
    const duration = studioBeat.duration ?? 0;
    const endTime = startTime + duration;

    const startTimeFormatted = formatSRTTime(startTime);
    const endTimeFormatted = formatSRTTime(endTime);

    const entry = [sequenceNumber.toString(), `${startTimeFormatted} --> ${endTimeFormatted}`, text, ""].join("\n");

    srtEntries.push(entry);
    sequenceNumber++;
  });

  return srtEntries.join("\n");
};
