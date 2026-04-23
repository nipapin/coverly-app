import fs from 'fs';
import path from 'path';
const pkg = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8'));
/** @type {import('next').NextConfig} */
const nextConfig = {
    deploymentId: `build-${pkg.version}`,
    // Do not bundle ffmpeg-static — Turbopack would rewrite the binary path to \\ROOT\\… (ENOENT).
    serverExternalPackages: ['ffmpeg-static'],
    experimental: {
        serverActions: {
            allowedOrigins: ['http://localhost']
        }
    }
};

export default nextConfig;
