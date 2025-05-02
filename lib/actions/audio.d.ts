import "dotenv/config";
import { MulmoStudio } from "../types";
export declare const audio: (studio: MulmoStudio, files: {
    outDirPath: string;
}, concurrency: number) => Promise<void>;
