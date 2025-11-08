// Simple script to create placeholder icon SVGs
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const iconsDir = path.join(__dirname, '..', 'public', 'icons');

// Create icons directory if it doesn't exist
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

sizes.forEach(size => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="grad${size}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${size * 0.15}" fill="url(#grad${size})"/>
  <text x="50%" y="42%" text-anchor="middle" font-family="Arial, sans-serif" font-weight="bold" font-size="${size * 0.3}" fill="white">AMD</text>
  <text x="50%" y="65%" text-anchor="middle" font-family="Arial, sans-serif" font-size="${size * 0.15}" fill="white">Pro</text>
</svg>`;

  fs.writeFileSync(path.join(iconsDir, `icon-${size}x${size}.svg`), svg);
  console.log(`Created icon-${size}x${size}.svg`);
});

// Create maskable icon
const maskableSize = 512;
const maskableSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${maskableSize} ${maskableSize}">
  <defs>
    <linearGradient id="gradMaskable" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="${maskableSize}" height="${maskableSize}" fill="url(#gradMaskable)"/>
  <text x="50%" y="44%" text-anchor="middle" font-family="Arial, sans-serif" font-weight="bold" font-size="150" fill="white">AMD</text>
  <text x="50%" y="60%" text-anchor="middle" font-family="Arial, sans-serif" font-size="75" fill="white">Pro</text>
</svg>`;

fs.writeFileSync(path.join(iconsDir, 'maskable-icon-512x512.svg'), maskableSvg);
console.log('Created maskable-icon-512x512.svg');

console.log('\nNote: SVG icons created. For production, convert these to PNG using an image converter.');
console.log('You can use online tools like https://svgtopng.com or install sharp: npm install sharp');
