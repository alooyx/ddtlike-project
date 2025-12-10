// MapLoader.js - VERSÃO CORRIGIDA (SEM CONFLITO DE GETTER)

import { Tile } from "../Maps/Tile.js";
import { Map } from "../Maps/Map.js";

export class MapLoader {
  static loadFromImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "Anonymous";

      img.onload = () => {
        try {
          console.log("🖼️ Imagem carregada, iniciando processamento...");

          // 1. Cria canvas temporário
          const canvas = document.createElement("canvas");
          const w = img.width;
          const h = img.height;
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext("2d");

          ctx.drawImage(img, 0, 0);

          // 2. Extrai os dados de pixel
          const imgData = ctx.getImageData(0, 0, w, h);
          const pixels = imgData.data;

          console.log(`📐 Dimensões: ${w}x${h} | Total de pixels: ${w * h}`);

          // 3. Cria o Tile físico (ground) - VAZIO inicialmente
          const ground = Tile.createEmpty(w, h, true);
          ground.data.fill(0); // Garante que começa zerado (tudo ar)

          const stride = ground._bw;
          const data = ground.data;

          console.log(
            `💾 Array de colisão: ${data.length} bytes (${stride} bytes por linha)`
          );

          // 4. Conversão Pixel → Bitmask
          let solidPixels = 0;
          for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
              const pixelIndex = (y * w + x) * 4;
              const alpha = pixels[pixelIndex + 3];

              // Considera sólido se alpha > 250
              if (alpha > 250) {
                const idx = y * stride + (x >> 3);
                const bit = 7 - (x % 8);
                data[idx] |= 1 << bit;
                solidPixels++;
              }
            }
          }

          console.log(
            `✅ Pixels sólidos encontrados: ${solidPixels} de ${w * h} (${(
              (solidPixels / (w * h)) *
              100
            ).toFixed(1)}%)`
          );

          // 5. Testa alguns pontos específicos
          console.log("🔍 Teste de colisão em pontos estratégicos:");
          const testPoints = [
            { x: 0, y: 0, desc: "Canto superior esquerdo" },
            {
              x: Math.floor(w / 2),
              y: 100,
              desc: "Centro-topo (spawn player)",
            },
            {
              x: Math.floor(w / 2),
              y: Math.floor(h / 2),
              desc: "Centro do mapa",
            },
            { x: Math.floor(w / 2), y: h - 50, desc: "Centro-base" },
          ];

          testPoints.forEach((pt) => {
            const isEmpty = ground.isEmpty(pt.x, pt.y);
            console.log(
              `  [${pt.x}, ${pt.y}] ${pt.desc}: ${
                isEmpty ? "🌫️ VAZIO" : "🧱 SÓLIDO"
              }`
            );
          });

          // 6. Cria a instância do Map (ground é passado como layer1)
          const mapInstance = new Map({ weight: 100 }, ground, null);

          // Define propriedades adicionais via setters
          mapInstance.image = img;
          mapInstance.width = w;
          mapInstance.height = h;

          // ============================================================
          // 🔧 CONECTAR MÉTODOS ADICIONAIS
          // ============================================================

          // NOTA: ground já é acessível via getter mapInstance.ground
          // (definido no Map.js como: get ground() { return this._layer1; })

          // 1. isEmpty - Já funciona via mapInstance.isEmpty()
          // (Map.js já tem este método que chama this._layer1.isEmpty)

          // 2. add - Já funciona via mapInstance.add()
          // (Map.js já tem este método que chama this._layer1.add)

          // 3. dig - Já funciona via mapInstance.dig()
          // (Map.js já tem este método que chama this._layer1.dig)

          // 4. isOutMap - Já funciona via mapInstance.isOutMap()
          // (Map.js já tem este método)

          // ============================================================
          // 🧪 TESTE FINAL DE SANIDADE
          // ============================================================
          console.log("\n🧪 Teste final de sanidade:");

          // Testa se ground é acessível via getter
          console.log(`  mapInstance.ground existe: ${!!mapInstance.ground}`);
          console.log(
            `  mapInstance.ground === ground: ${mapInstance.ground === ground}`
          );

          // Testa se os métodos funcionam
          const testX = Math.floor(w / 2);
          const testY = 100;
          const viaMapTest = mapInstance.isEmpty(testX, testY);
          const directTest = ground.isEmpty(testX, testY);

          console.log(
            `  mapInstance.isEmpty(${testX}, ${testY}): ${viaMapTest}`
          );
          console.log(`  ground.isEmpty(${testX}, ${testY}): ${directTest}`);
          console.log(
            `  ${directTest === viaMapTest ? "✅ MATCH" : "❌ MISMATCH"}`
          );

          // Testa isRectangleEmptyQuick com 4 parâmetros
          const rectTest = mapInstance.ground.isRectangleEmptyQuick(
            testX,
            testY,
            4,
            4
          );
          console.log(
            `  ground.isRectangleEmptyQuick(${testX}, ${testY}, 4, 4): ${rectTest}`
          );

          // Testa se dig está conectado
          console.log(
            `  mapInstance.dig é função: ${
              typeof mapInstance.dig === "function"
            }`
          );
          console.log(
            `  mapInstance.add é função: ${
              typeof mapInstance.add === "function"
            }`
          );

          // ============================================================

          console.log("\n✅ MapLoader finalizado com sucesso!\n");

          resolve({
            mapInstance: mapInstance,
            mapImage: img,
          });
        } catch (error) {
          console.error("❌ Erro ao processar pixels:", error);
          reject(error);
        }
      };

      img.onerror = (err) => {
        console.error("❌ Erro ao carregar imagem:", src);
        reject(err);
      };

      img.src = src;
    });
  }
}
