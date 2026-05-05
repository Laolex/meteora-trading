import path from "node:path";
import type { NextConfig } from "next";

const cwd = process.cwd();
const turbopackRoot = path.basename(cwd) === "frontend" ? cwd : path.join(cwd, "frontend");

const nextConfig: NextConfig = {
  turbopack: {
    root: turbopackRoot,
  },
};

export default nextConfig;
