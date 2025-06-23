import { build } from 'esbuild';

const tasks = [
    {
        name: 'render',
        config: {
            entryPoints: ['tasks/cutopia/inputRender.tsx'],
            bundle: true,
            format: 'esm',
            loader: { '.svg': 'dataurl' },
            define: { 'process.env.NODE_ENV': '"production"' },
            outfile: 'tasks/cutopia/bundled/inputRender.js'
        }
    },
    {
        name: 'entry',
        config: {
            entryPoints: ['tasks/cutopia/main.ts'],
            bundle: true,
            platform: 'node',
            format: 'esm',
            target: 'node16',
            outdir: 'tasks/cutopia/bundled',
            external: [
                // Node.js 内置模块
                'os',
                'path',
                'fs',
                'crypto',
                'util',
                'events',
                'stream',
                'child_process',
                'url',
                'querystring',
                'http',
                'https',
                'net',
                'tls',
                'zlib',
                'buffer',
                // Node.js 相关的 npm 包
                '@ffmpeg-installer/ffmpeg',
                '@ffprobe-installer/ffprobe'
            ],
            // 添加 banner 来确保 ESM 环境正确
            banner: {
                js: `
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
`
            }
        }
    }
];

for (const task of tasks) {
    console.log(`🔨 Building ${task.name}...`);
    try {
        await build(task.config);
        console.log(`✅ ${task.name} built successfully!`);
    } catch (error) {
        console.error(`❌ Failed to build ${task.name}:`, error);
        console.error('Error details:', error.message);
        process.exit(1);
    }
}
