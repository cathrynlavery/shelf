/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  images: {
    domains: ["public.blob.vercel-storage.com"],
  },
};

module.exports = nextConfig;
