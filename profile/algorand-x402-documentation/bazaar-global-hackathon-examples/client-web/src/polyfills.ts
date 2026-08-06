// Browser shims for Node globals some dependencies expect.
// Imported FIRST in main.tsx so they exist before any library code runs.
import { Buffer } from "buffer";

const g = globalThis as Record<string, unknown>;
if (!g.Buffer) g.Buffer = Buffer;
if (!g.process) g.process = { env: {} };
