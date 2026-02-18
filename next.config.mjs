import pkg from './package.json' with { type: 'json' };
/** @type {import('next').NextConfig} */
const nextConfig = {

    experimental: {
        deploymentId: `build-${pkg.version}`
    }
};

export default nextConfig;
