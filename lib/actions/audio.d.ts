import "dotenv/config";
import { MulmoStudio, FileDirs } from "../types";
export declare const audio: (studio: MulmoStudio, files: FileDirs, concurrency: number) => Promise<void>;
