import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // مطلوب لـ Prisma على Vercel
  serverExternalPackages: ["@prisma/client"],
};

export default nextConfig;
