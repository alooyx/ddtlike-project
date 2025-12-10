// js/components.js - Componentes ECS (Entity Component System)

// Posição no mundo
export const Position = (x, y) => ({ x, y });

// Velocidade (não usado atualmente, mas útil no futuro)
export const Velocity = (x, y) => ({ x, y });

// Componente visual básico (tank, projétil simples)
export const Renderable = (type, color, size) => ({
  type, // "tank" ou "projectile"
  color, // Cor (ex: "#adff2f")
  size, // Tamanho
});

// Componente visual com sprite animada (projéteis com sprite sheet)
export const SpriteRenderable = (
  spriteAnimation,
  scale = 1.0,
  rotation = 0
) => ({
  type: "sprite",
  animation: spriteAnimation, // Instância de SpriteAnimation
  scale, // Escala (0.2 = 20% do tamanho original)
  rotation, // Rotação (não usado ainda)
});

// Sprite da arma equipada (nas costas do tank)
export const WeaponSprite = (
  imagePath,
  offsetX = -15,
  offsetY = -5,
  scale = 1.0
) => ({
  type: "weapon",
  imagePath,
  offsetX, // Offset horizontal
  offsetY, // Offset vertical
  scale,
  image: null, // Será carregado dinamicamente
  loaded: false,
  loading: false,
});

// Controles do jogador
export const PlayerControl = () => ({
  angle: 45, // Ângulo da mira (0-180)
  power: 50, // Força do tiro (0-100)
  isCharging: false, // Está carregando?
  weaponId: "missile", // ID da arma equipada
  facingRight: true, // Direção que o tank está virado
});

// Marca entidade para ser seguida pela câmera
export const CameraFocus = () => ({
  active: true,
});

// Componente de física (projétil/bomba)
export const BombComponent = (bombInstance, impactId) => ({
  instance: bombInstance, // Instância de BombObject
  impactId, // ID do tipo de explosão (ex: "crater_small")
});

// Componente de corpo físico (para gravidade do tank)
export const Body = (width, height) => ({
  width,
  height,
  isGrounded: false, // Está tocando o chão?
});

// 💥 NOVO: Componente de Explosão
export const ExplosionComponent = (duration) => ({
  startTime: Date.now(),
  duration, // ms até a explosão desaparecer
});
