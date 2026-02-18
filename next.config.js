import fs from 'fs';
import path from 'path';
const pkg = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8'));
/** @type {import('next').NextConfig} */
const nextConfig = {
    deploymentId: `build-${pkg.version}`
};

export default nextConfig;
