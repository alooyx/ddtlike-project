// js/utils/TestMapGenerator.js
import { MapLoader } from "../MapLoader.js";

export class TestMapGenerator {
  static async createPhysicsTestMap(width = 5000, height = 2000) {
    console.log(`🏗️ Gerando Mapa de Teste (${width}x${height})...`);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");

    // 1. LIMPA TUDO (Deixa transparente - Isso garante que é AR)
    ctx.clearRect(0, 0, width, height);

    // 2. Desenha um fundo visual (OPCIONAL - Só para você ver onde é o céu)
    // Desenhamos isso num layer visual separado depois, ou deixamos o canvas HTML com cor de fundo.
    // Mas para a FÍSICA, vamos deixar transparente mesmo para garantir.

    // Se quiser pintar o céu para ver, use Alpha baixo para o MapLoader ignorar
    ctx.fillStyle = "rgba(135, 206, 235, 0.1)"; // Azul quase invisível
    ctx.fillRect(0, 0, width, height);

    // 3. Configura o CHÃO (Sólido - Alpha 1.0)
    ctx.fillStyle = "#8B4513"; // Marrom

    const floorY = 1500;

    // --- A. CHÃO BASE ---
    ctx.fillRect(0, floorY, width, height - floorY);

    // --- B. RAMPAS (Para testar subida) ---
    // Rampa 1: Suave
    ctx.beginPath();
    ctx.moveTo(500, floorY);
    ctx.lineTo(1000, floorY - 200);
    ctx.lineTo(1000, floorY);
    ctx.fill();

    // Rampa 2: Parede
    ctx.beginPath();
    ctx.moveTo(1200, floorY);
    ctx.lineTo(1400, floorY - 400);
    ctx.lineTo(1400, floorY);
    ctx.fill();

    // --- C. GRID DE REFERÊNCIA (Para você ver que está andando) ---
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    for (let i = 0; i < width; i += 500) {
      ctx.fillRect(i, floorY, 10, height - floorY); // Postes a cada 500px

      // Escreve a distância no chão
      ctx.font = "60px Arial";
      ctx.fillText(`${i}m`, i + 20, floorY + 100);
    }

    // 4. Gera imagem
    const img = new Image();
    img.src = canvas.toDataURL();

    return new Promise((resolve) => {
      img.onload = async () => {
        // O MapLoader vai ler Transparente = Ar, Marrom = Chão. Sem erro.
        const result = await MapLoader.processImage(img);
        resolve(result);
      };
    });
  }
}
