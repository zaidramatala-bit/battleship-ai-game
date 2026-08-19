import type { NextConfig } from "next";

/**
 * GitHub Pages serves the site from a subfolder and cannot run a Node server,
 * so the Pages workflow sets GITHUB_PAGES=true to switch the build to a static
 * export. Local development and any other host are unaffected.
 */
const pagesConfig: NextConfig = {
  output: "export",
  basePath: "/battleship-ai-game",
  images: { unoptimized: true },
};

const nextConfig: NextConfig = process.env.GITHUB_PAGES ? pagesConfig : {};

export default nextConfig;
