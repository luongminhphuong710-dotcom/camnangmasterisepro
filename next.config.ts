import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
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
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "designbuild.vn" },
      { protocol: "https", hostname: "gland.com.vn" },
      { protocol: "https", hostname: "res.cloudinary.com" },
    ],
  },
};

export default nextConfig;
