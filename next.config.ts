import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "masterisehomes.com" },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "designbuild.vn" },
      { protocol: "https", hostname: "gland.com.vn" },
      { protocol: "https", hostname: "res.cloudinary.com" },
    ],
  },
};

export default nextConfig;
