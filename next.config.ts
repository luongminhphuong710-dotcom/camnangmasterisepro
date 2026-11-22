import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
  async headers() {
    return [
      {
        source: "/admin/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow, noarchive, noimageindex" }],
      },
      {
        source: "/api/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow, noarchive, noimageindex" }],
      },
    ];
  },
  async redirects() {
    return [
      { source: "/stores", destination: "/gian-hang", permanent: true },
      { source: "/stores/:path*", destination: "/gian-hang/:path*", permanent: true },
      { source: "/projects", destination: "/du-an", permanent: true },
      { source: "/projects/:path*", destination: "/du-an/:path*", permanent: true },
      { source: "/news", destination: "/tin-tuc", permanent: true },
      { source: "/news/:path*", destination: "/tin-tuc/:path*", permanent: true },
    ];
  },
  images: {
    minimumCacheTTL: 86400,
    remotePatterns: [
      { protocol: "https", hostname: "masterisehomes.com" },
      { protocol: "https", hostname: "**.masterisehomes.com" },
      { protocol: "https", hostname: "web-mh-api.goterest.com" },
      { protocol: "https", hostname: "mmx.prnasia.com" },
      { protocol: "https", hostname: "premedia.vneconomy.vn" },
      { protocol: "https", hostname: "media.vneconomy.vn" },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "designbuild.vn" },
      { protocol: "https", hostname: "gland.com.vn" },
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "cafefcdn.com" },
      { protocol: "https", hostname: "i2-vnexpress.vnecdn.net" },
    ],
  },
};

export default nextConfig;
