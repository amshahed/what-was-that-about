import path from "node:path";
import { copyFileSync, mkdirSync, rmSync } from "node:fs";

// Remotion cannot load file:// URLs during a render. Media must come from the bundle's public
// folder and be referenced with staticFile(). This stages the files for one render.
export class RenderAssets {
  readonly dir: string;

  constructor(dir: string) {
    this.dir = dir;
    rmSync(dir, { recursive: true, force: true });
    mkdirSync(dir, { recursive: true });
  }

  /** Copies a file into the public folder; returns the name to pass to staticFile(). */
  add(sourcePath: string, name: string): string {
    const dest = path.join(this.dir, ...name.split("/"));
    mkdirSync(path.dirname(dest), { recursive: true });
    copyFileSync(sourcePath, dest);
    return name;
  }
}
