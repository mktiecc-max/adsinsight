/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  experimental: {
    optimizePackageImports: ["lucide-react", "recharts", "@tanstack/react-table"],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
