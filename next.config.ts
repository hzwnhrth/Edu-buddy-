import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Next.js can write helper files for coding tools into the project during
  // development. This project keeps only the files the team wrote, so the
  // documented switch below turns that generation off.
  agentRules: false,
};

export default nextConfig;
