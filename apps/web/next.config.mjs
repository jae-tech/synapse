/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@synapse/schemas'],
  output: process.env.NEXT_OUTPUT === 'standalone' ? 'standalone' : undefined,
};

export default nextConfig;
