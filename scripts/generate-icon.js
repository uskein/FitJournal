/**
 * Genera el icono de DiarioFit como PNG usando pngjs.
 * Uso: node scripts/generate-icon.js
 */
const { PNG } = require('pngjs');
const fs = require('fs');
const path = require('path');

function generateIcon(size) {
  const png = new PNG({ width: size, height: size });
  const data = png.data;

  // Colores de marca
  const bg1 = { r: 0x3E, g: 0x6B, b: 0x60 }; // salvia
  const bg2 = { r: 0x2D, g: 0x52, b: 0x48 }; // salvia oscuro
  const white = { r: 0xFF, g: 0xFF, b: 0xFF };
  const amber = { r: 0xE0, g: 0xA4, b: 0x58 };

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;

      // Gradiente diagonal de fondo
      const t = (x + y) / (2 * size);
      const r = Math.round(bg1.r + (bg2.r - bg1.r) * t);
      const g = Math.round(bg1.g + (bg2.g - bg1.g) * t);
      const b = Math.round(bg1.b + (bg2.b - bg1.b) * t);

      data[idx] = r;
      data[idx + 1] = g;
      data[idx + 2] = b;
      data[idx + 3] = 255;
    }
  }

  // Texto "DF" - dibujar con píxeles
  const fontSize = Math.round(size * 0.40);
  const cx = size / 2;
  const cy = size * 0.44;
  const strokeW = Math.max(2, Math.round(size * 0.035));

  // Letra D
  const dLeft = cx - fontSize * 0.52;
  const dTop = cy - fontSize * 0.45;
  const dBot = cy + fontSize * 0.45;
  const dRight = dLeft + fontSize * 0.55;
  const dMid = dLeft + fontSize * 0.22;

  // D: línea vertical izquierda
  for (let y = dTop; y <= dBot; y++) {
    for (let x = dLeft; x <= dLeft + strokeW; x++) {
      setPixel(data, size, Math.round(x), Math.round(y), white);
    }
  }
  // D: línea horizontal superior
  for (let x = dLeft; x <= dRight; x++) {
    for (let y = dTop; y <= dTop + strokeW; y++) {
      setPixel(data, size, Math.round(x), Math.round(y), white);
    }
  }
  // D: línea horizontal inferior
  for (let x = dLeft; x <= dRight; x++) {
    for (let y = dBot - strokeW; y <= dBot; y++) {
      setPixel(data, size, Math.round(x), Math.round(y), white);
    }
  }
  // D: curva derecha (simplificada como línea vertical con muesca)
  for (let y = dTop + strokeW; y <= dBot - strokeW; y++) {
    const progress = (y - dTop) / (dBot - dTop);
    const bulge = Math.sin(progress * Math.PI) * fontSize * 0.12;
    const xPos = dRight - bulge;
    for (let x = xPos; x <= xPos + strokeW; x++) {
      setPixel(data, size, Math.round(x), Math.round(y), white);
    }
  }

  // Letra F
  const fLeft = cx + fontSize * 0.08;
  const fTop = cy - fontSize * 0.45;
  const fBot = cy + fontSize * 0.45;
  const fRight = fLeft + fontSize * 0.48;
  const fMid = fTop + fontSize * 0.42;

  // F: línea vertical
  for (let y = fTop; y <= fBot; y++) {
    for (let x = fLeft; x <= fLeft + strokeW; x++) {
      setPixel(data, size, Math.round(x), Math.round(y), white);
    }
  }
  // F: línea horizontal superior
  for (let x = fLeft; x <= fRight; x++) {
    for (let y = fTop; y <= fTop + strokeW; y++) {
      setPixel(data, size, Math.round(x), Math.round(y), white);
    }
  }
  // F: línea horizontal media
  const fMidRight = fLeft + fontSize * 0.38;
  for (let x = fLeft; x <= fMidRight; x++) {
    for (let y = fMid; y <= fMid + strokeW; y++) {
      setPixel(data, size, Math.round(x), Math.round(y), white);
    }
  }

  // Barra de acento ámbar debajo del texto
  const barY = cy + fontSize * 0.58;
  const barH = Math.max(3, Math.round(size * 0.012));
  const barW = Math.round(size * 0.36);
  const barX = Math.round((size - barW) / 2);
  for (let y = barY; y < barY + barH; y++) {
    for (let x = barX; x < barX + barW; x++) {
      setPixel(data, size, x, y, amber);
    }
  }

  // Punto decorativo ámbar
  const dotX = Math.round(size * 0.74);
  const dotY = Math.round(size * 0.26);
  const dotR = Math.round(size * 0.025);
  for (let y = dotY - dotR; y <= dotY + dotR; y++) {
    for (let x = dotX - dotR; x <= dotX + dotR; x++) {
      if ((x - dotX) ** 2 + (y - dotY) ** 2 <= dotR ** 2) {
        setPixel(data, size, x, y, amber);
      }
    }
  }

  return PNG.sync.write(png);
}

function setPixel(data, size, x, y, color) {
  if (x < 0 || x >= size || y < 0 || y >= size) return;
  const idx = (y * size + x) * 4;
  data[idx] = color.r;
  data[idx + 1] = color.g;
  data[idx + 2] = color.b;
  data[idx + 3] = 255;
}

const outDir = path.join(__dirname, '..', 'assets');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const sizes = [
  { size: 1024, name: 'icon.png' },
  { size: 512, name: 'icon-512.png' },
  { size: 192, name: 'icon-192.png' },
  { size: 48, name: 'favicon-48.png' },
];

for (const { size, name } of sizes) {
  const buf = generateIcon(size);
  fs.writeFileSync(path.join(outDir, name), buf);
  console.log(`✓ ${name} (${size}x${size})`);
}

console.log('\nIconos de DiarioFit generados correctamente.');
