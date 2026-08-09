import type { NextConfig } from "next";

const isVercel = process.env.VERCEL === "1";
const isEcs = process.env.DEPLOY_TARGET === "ecs";

const nextConfig: NextConfig = {
  // Vercel uses default output; standalone is for ECS/Docker only
  ...(isEcs && !isVercel ? { output: "standalone" as const } : {}),
  async redirects() {
    return [
      { source: '/app/competencies', destination: '/app/growth-record', permanent: false },
    ];
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      plasmo: false,
    };

    config.module.rules.push({
      test: /chatpye-extension\/.*\.(ts|tsx|js|jsx)$/,
      loader: "null-loader",
    });

    return config;
  },
};

export default nextConfig;
