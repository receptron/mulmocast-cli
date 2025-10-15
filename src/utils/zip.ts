import fs from "fs";
import archiver from "archiver";
import path from "path";

/**
 * Promise-based ZIP archive builder
 *
 * @example
 * const zipper = new ZipBuilder("output.zip");
 * zipper.addFile("file1.txt", "renamed.txt");
 * zipper.addFile("file2.txt");
 * await zipper.finalize();
 */
export class ZipBuilder {
  private archive: archiver.Archiver;
  private output: fs.WriteStream;
  private outputPath: string;
  private finalized = false;

  constructor(outputPath: string) {
    this.outputPath = outputPath;
    this.output = fs.createWriteStream(outputPath);
    this.archive = archiver("zip", {
      zlib: { level: 9 }, // Maximum compression level
    });

    // Pipe archive data to the file
    this.archive.pipe(this.output);

    // Error handling
    this.archive.on("error", (err: Error) => {
      throw err;
    });

    this.archive.on("warning", (err: archiver.ArchiverError) => {
      if (err.code !== "ENOENT") {
        throw err;
      }
      // console.warn("ZIP warning:", err);
    });
  }

  /**
   * Add a file to the archive
   * @param filePath - Path to the file to add
   * @param nameInZip - Optional name for the file inside the ZIP (defaults to basename)
   */
  addFile(filePath: string, nameInZip?: string): void {
    if (this.finalized) {
      throw new Error("Cannot add files after finalize() has been called");
    }

    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const name = nameInZip ?? path.basename(filePath);
    this.archive.file(filePath, { name });
  }

  /**
   * Add multiple files to the archive
   * @param files - Array of file paths or objects with path and name
   */
  addFiles(files: Array<string | { path: string; name?: string }>): void {
    files.forEach((file) => {
      if (typeof file === "string") {
        this.addFile(file);
      } else {
        this.addFile(file.path, file.name);
      }
    });
  }

  /**
   * Add a directory to the archive
   * @param dirPath - Path to the directory to add
   * @param destPath - Optional destination path inside the ZIP
   */
  addDirectory(dirPath: string, destPath?: string): void {
    if (this.finalized) {
      throw new Error("Cannot add directory after finalize() has been called");
    }

    if (!fs.existsSync(dirPath)) {
      throw new Error(`Directory not found: ${dirPath}`);
    }

    const dest = destPath ?? path.basename(dirPath);
    this.archive.directory(dirPath, dest);
  }

  /**
   * Add content from a string or buffer
   * @param content - String or Buffer content
   * @param nameInZip - Name for the file inside the ZIP
   */
  addContent(content: string | Buffer, nameInZip: string): void {
    if (this.finalized) {
      throw new Error("Cannot add content after finalize() has been called");
    }

    this.archive.append(content, { name: nameInZip });
  }

  /**
   * Finalize the archive and return a promise that resolves when complete
   * @returns Promise that resolves with the output file path
   */
  async finalize(): Promise<string> {
    if (this.finalized) {
      throw new Error("Archive has already been finalized");
    }

    this.finalized = true;

    return new Promise((resolve, reject) => {
      this.output.on("close", () => {
        // const bytes = this.archive.pointer();
        // console.log(`ZIP archive created: ${this.outputPath} (${bytes} bytes)`);
        resolve(this.outputPath);
      });

      this.output.on("error", reject);
      this.archive.on("error", reject);

      // Finalize the archive
      this.archive.finalize();
    });
  }

  /**
   * Get the output file path
   */
  getOutputPath(): string {
    return this.outputPath;
  }
}
