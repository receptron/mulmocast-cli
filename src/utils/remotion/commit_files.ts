export type FileOps = {
  exists: (file: string) => boolean;
  rename: (from: string, to: string) => void;
  remove: (file: string) => void;
};

export type FileMove = { from: string; to: string };

export const backupPathOf = (file: string) => `${file}.pre-review`;

// Moves every `from` onto its `to`, or none of them: on any failure the moves already made are undone
// and the files they replaced are put back, then the error is rethrown.
export const commitFiles = (moves: FileMove[], ops: FileOps) => {
  const undoSteps: (() => void)[] = [];
  try {
    moves.forEach(({ from, to }) => {
      if (ops.exists(to)) {
        ops.rename(to, backupPathOf(to));
        undoSteps.push(() => ops.rename(backupPathOf(to), to));
      }
      ops.rename(from, to);
      undoSteps.push(() => ops.rename(to, from));
    });
  } catch (error) {
    // Undo in reverse; one failing undo must not stop the others from restoring their files.
    undoSteps.reverse().forEach((undo) => {
      try {
        undo();
      } catch {
        // the original error below is what the caller needs to see
      }
    });
    throw error;
  }
  // The moves are committed by now; a backup that cannot be removed is a leftover, not a failed commit.
  moves.forEach(({ to }) => {
    try {
      ops.remove(backupPathOf(to));
    } catch {
      // leave it; the next commit onto this path overwrites it
    }
  });
};
