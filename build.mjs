import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = __dirname;
const outputDir = path.join(projectRoot, 'dist');

const excludeDirectories = new Set(['node_modules', 'dist', '.git', '.github']);
const excludedFiles = new Set(['package.json', 'package-lock.json', 'apphosting.yaml', 'build.mjs']);
const includeExtensions = new Set([
  '.html',
  '.css',
  '.js',
  '.mjs',
  '.cjs',
  '.json',
  '.ico',
  '.png',
  '.jpg',
  '.jpeg',
  '.svg',
  '.gif',
  '.webp',
  '.avif',
  '.txt',
  '.xml',
  '.webmanifest',
  '.woff',
  '.woff2',
  '.ttf',
  '.otf',
  '.eot',
  '.mp3',
  '.mp4',
  '.webm',
  '.ogg'
]);
const includeExact = new Set(['cname']);

async function ensureEmptyDirectory(directory) {
  await fs.rm(directory, { recursive: true, force: true });
  await fs.mkdir(directory, { recursive: true });
}

function shouldIncludeFile(fileName) {
  if (excludedFiles.has(fileName)) {
    return false;
  }

  const lowerName = fileName.toLowerCase();
  if (includeExact.has(lowerName)) {
    return true;
  }

  const extension = path.extname(lowerName);
  return includeExtensions.has(extension);
}

async function copyStaticFiles(fromDirectory, toDirectory) {
  const entries = await fs.readdir(fromDirectory, { withFileTypes: true });

  for (const entry of entries) {
    if (excludeDirectories.has(entry.name)) {
      continue;
    }

    const sourcePath = path.join(fromDirectory, entry.name);
    const relativePath = path.relative(projectRoot, sourcePath);
    const destinationPath = path.join(toDirectory, relativePath);

    if (entry.isDirectory()) {
      await copyStaticFiles(sourcePath, toDirectory);
      continue;
    }

    if (!shouldIncludeFile(entry.name)) {
      continue;
    }

    await fs.mkdir(path.dirname(destinationPath), { recursive: true });
    await fs.copyFile(sourcePath, destinationPath);
  }
}

(async () => {
  await ensureEmptyDirectory(outputDir);
  await copyStaticFiles(projectRoot, outputDir);
  console.log(`Static assets copied to ${path.relative(projectRoot, outputDir)}`);
})();
