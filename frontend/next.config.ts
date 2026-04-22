import path from "path";

const projectRoot = process.cwd();

/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: path.resolve(projectRoot),
  images: {
    domains: ['jukmaikkuypbefzxljdw.supabase.co'],
  },
};

export default nextConfig;


