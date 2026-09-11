import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

async function generateIcons() {
  const rootDir = process.cwd();
  const svgPath = path.join(rootDir, 'refra_logo_vector.svg');
  const outDir = path.join(rootDir, 'public');

  if (!fs.existsSync(svgPath)) {
    throw new Error(`Vector logo not found at: ${svgPath}`);
  }

  const svgBuffer = fs.readFileSync(svgPath);

  // Also copy refra_logo_vector.svg into public for web assets
  fs.copyFileSync(svgPath, path.join(outDir, 'refra_logo_vector.svg'));
  fs.copyFileSync(svgPath, path.join(outDir, 'favicon.svg'));

  console.log('Generating PWA standard and maskable icons from refra_logo_vector.svg...');

  // 1. pwa-192x192.png
  await sharp(svgBuffer)
    .resize(192, 192)
    .png({ quality: 100, compressionLevel: 9 })
    .toFile(path.join(outDir, 'pwa-192x192.png'));
  console.log('✓ Generated pwa-192x192.png');

  // 2. pwa-512x512.png
  await sharp(svgBuffer)
    .resize(512, 512)
    .png({ quality: 100, compressionLevel: 9 })
    .toFile(path.join(outDir, 'pwa-512x512.png'));
  console.log('✓ Generated pwa-512x512.png');

  // 3. apple-touch-icon.png (180x180)
  await sharp(svgBuffer)
    .resize(180, 180)
    .png({ quality: 100, compressionLevel: 9 })
    .toFile(path.join(outDir, 'apple-touch-icon.png'));
  console.log('✓ Generated apple-touch-icon.png');

  // 4. pwa-maskable-512x512.png
  // Android maskable icons require a safe-zone margin (10-15% on all sides).
  // We scale the emblem to 410x410 (~80% of 512) and center on #0c0d10 background.
  const innerEmblem = await sharp(svgBuffer)
    .resize(410, 410, { fit: 'contain' })
    .png()
    .toBuffer();

  await sharp({
    create: {
      width: 512,
      height: 512,
      channels: 4,
      background: { r: 12, g: 13, b: 16, alpha: 1 }, // #0c0d10 matching theme
    },
  })
    .composite([
      {
        input: innerEmblem,
        gravity: 'center',
      },
    ])
    .png({ quality: 100, compressionLevel: 9 })
    .toFile(path.join(outDir, 'pwa-maskable-512x512.png'));
  console.log('✓ Generated pwa-maskable-512x512.png (with Android safe zone)');

  // 5. favicon.ico (64x64 PNG buffer written as icon)
  await sharp(svgBuffer)
    .resize(64, 64)
    .png()
    .toFile(path.join(outDir, 'favicon.ico'));
  console.log('✓ Generated favicon.ico');

  console.log('All PWA icon assets generated successfully!');
}

generateIcons().catch((err) => {
  console.error('Error generating icons:', err);
  process.exit(1);
});

