// js/MapLoader.js

import { Tile } from "../Maps/Tile.js";
import { Map } from "../Maps/Map.js"; // Verify this path matches your structure

export class MapLoader {
  // ⚠️ 'static' keyword is REQUIRED for Game.loadMap() to work
  static loadFromImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "Anonymous";

      img.onload = () => {
        try {
          console.log("🖼️ Image loaded, starting processing...");

          // 1. Create temp canvas
          const canvas = document.createElement("canvas");
          const w = img.width;
          const h = img.height;
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext("2d");

          ctx.drawImage(img, 0, 0);

          // 2. Extract pixel data
          const imgData = ctx.getImageData(0, 0, w, h);
          const pixels = imgData.data;

          console.log(`📐 Dimensions: ${w}x${h}`);

          // 3. Create physical Tile (ground)
          const ground = Tile.createEmpty(w, h, true);
          ground.data.fill(0); // Ensure clean start

          const stride = ground._bw;
          const data = ground.data;

          // 4. Pixel -> Bitmask Conversion
          let solidPixels = 0;
          for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
              const pixelIndex = (y * w + x) * 4;
              const alpha = pixels[pixelIndex + 3];

              // Alpha threshold for solidity
              if (alpha > 250) {
                const idx = y * stride + (x >> 3);
                const bit = 7 - (x % 8);
                data[idx] |= 1 << bit;
                solidPixels++;
              }
            }
          }

          console.log(
            `✅ Solid pixels: ${solidPixels} (${(
              (solidPixels / (w * h)) *
              100
            ).toFixed(1)}%)`
          );

          // 5. Create Map Instance
          // ground is passed as layer1
          const mapInstance = new Map({ weight: 100 }, ground, null);

          // Use SETTERS (now defined in Map.js)
          mapInstance.image = img;
          mapInstance.width = w;
          mapInstance.height = h;

          resolve({
            mapInstance: mapInstance,
            mapImage: img,
          });
        } catch (error) {
          console.error("❌ Error processing pixels:", error);
          reject(error);
        }
      };

      img.onerror = (err) => {
        console.error("❌ Error loading image:", src);
        reject(err);
      };

      img.src = src;
    });
  }
}
