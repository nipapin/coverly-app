import pkg from './package.json' with { type: 'json' };
/** @type {import('next').NextConfig} */
const nextConfig = {
    deploymentId: `build-${pkg.version.replace(/\./g, "-")}`,
    // Do not bundle ffmpeg-static — Turbopack would rewrite the binary path to \\ROOT\\… (ENOENT).
    serverExternalPackages: ['ffmpeg-static'],
    experimental: {
        serverActions: {
            allowedOrigins: ['http://localhost']
        }
    }
};

export default nextConfig;
