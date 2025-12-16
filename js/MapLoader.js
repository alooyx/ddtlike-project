// js/MapLoader.js

// ✅ IMPORTANTE: Verifique se esses caminhos estão corretos!
// Eles assumem que você tem a pasta "Maps" na raiz do projeto (ao lado da pasta "js")
import { Tile } from "../Maps/Tile.js";
import { Map as GameMap } from "../Maps/Map.js"; // Renamed to avoid conflict with native Map

export class MapLoader {
  static loadFromImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "Anonymous";

      img.onload = () => {
        try {
          console.log("🖼️ Image loaded, starting processing...");

          const canvas = document.createElement("canvas");
          const w = img.width;
          const h = img.height;
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext("2d");

          ctx.drawImage(img, 0, 0);

          const imgData = ctx.getImageData(0, 0, w, h);
          const pixels = imgData.data;

          console.log(`📐 Dimensions: ${w}x${h}`);

          // Create physical Tile
          const ground = Tile.createEmpty(w, h, true);
          ground.data.fill(0);

          // Access internal width (bytes width)
          // Note: accessing _bw directly is a bit hacky but works for now.
          // Ideally Tile should expose a getter for stride.
          const stride = Math.floor(w / 8) + 1;
          const data = ground.data;

          let solidPixels = 0;
          for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
              const pixelIndex = (y * w + x) * 4;
              const alpha = pixels[pixelIndex + 3];

              // [FIX] Lower threshold to 10 (instead of 250)
              // This fixes the "Ghost Map" issue where bullets pass through edges
              if (alpha > 10) {
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

          // Create Map Instance
          const mapInstance = new GameMap({ weight: 100 }, ground, null);

          mapInstance.image = img; // Helper for renderer
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
