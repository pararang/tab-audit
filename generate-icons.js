const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const sizes = [16, 48, 128];
const yellowColor = '#FFD700';

async function generateYellowIcon() {
  const iconsDir = path.join(__dirname, 'src', 'icons');

  for (const size of sizes) {
    const svgIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <rect width="100%" height="100%" fill="${yellowColor}"/>
      <text x="50%" y="50%" font-size="${size * 0.6}" text-anchor="middle" dy=".35em" fill="white" font-family="Arial,sans-serif" font-weight="bold">T</text>
    </svg>`;

    const outputPath = path.join(iconsDir, `icon${size}-yellow.png`);

    await sharp(Buffer.from(svgIcon)).png().toFile(outputPath);

    console.log(`Created ${outputPath}`);
  }

  console.log('All yellow icons generated successfully!');
}

generateYellowIcon().catch(console.error);
