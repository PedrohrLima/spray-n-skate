// Constantes do jogo SPRAY N' SKATE ---------------------------------------------
export const W = 960;
export const H = 540;
export const GROUND_Y = 440; // y do chão (onde as rodas encostam)
export const PLAYER_X = 210; // posição horizontal fixa do skatista

// Física
export const GRAVITY = 1900;
export const JUMP_V = -800; // pulo mais longo (~0,84 s no ar): mais tempo para fazer a manobra
export const GRIND_POP_V = -380; // "saída" automática no fim do rail
export const HIT_W = 16; // hitbox do skatista (menor que o desenho: perdoa as quinas)
export const HIT_H = 56;
export const HIT_GRACE = 9; // px de "raspão" tolerado no topo dos obstáculos

// Progressão
export const METER = 40; // pixels por metro
export const START_LIVES = 3;
export const MAX_LIVES = 3;

// Manobras (além do Ollie, que é o pulo)
export const TRICKS = {
  kickflip: { label: "KICKFLIP", key: "Z", dur: 0.32, points: 50 },
  shoveit: { label: "SHOVE-IT", key: "X", dur: 0.32, points: 50 },
  grab: { label: "INDY GRAB", key: "C", dur: 0.5, points: 75 },
};

// Obstáculos: cada um exige uma manobra específica para ser vencido -------
// parts: retângulos de colisão relativos ao início do obstáculo (dx, largura, altura)
export const OBSTACLES = {
  cone: {
    name: "Cone",
    need: "ollie",
    hint: "OLLIE",
    keyLabel: "ESPAÇO",
    points: 100,
    parts: [{ dx: 0, w: 30, h: 40 }],
  },
  bench: {
    name: "Banco da praça",
    need: "kickflip",
    hint: "KICKFLIP",
    keyLabel: "Z",
    points: 250,
    parts: [{ dx: 0, w: 100, h: 42 }],
  },
  hydrant: {
    name: "Hidrante",
    need: "shoveit",
    hint: "SHOVE-IT",
    keyLabel: "X",
    points: 250,
    parts: [{ dx: 0, w: 32, h: 58 }],
  },
  stairs: {
    name: "Escadaria",
    need: "grab",
    hint: "INDY GRAB",
    keyLabel: "C",
    points: 350,
    parts: [
      { dx: 0, w: 26, h: 22 },
      { dx: 26, w: 26, h: 44 },
      { dx: 52, w: 26, h: 66 },
      { dx: 78, w: 26, h: 44 },
      { dx: 104, w: 26, h: 22 },
    ],
  },
  rail: {
    name: "Corrimão",
    need: "grind",
    hint: "GRIND",
    keyLabel: "↓ (segure)",
    points: 400,
    parts: [{ dx: 0, w: 190, h: 30 }],
  },
};
export const TUTORIAL_ORDER = ["cone", "bench", "hydrant", "stairs", "rail"];

// Zonas do cenário (também são os "capítulos" da história) -----------------
// Cores em RGB para poder interpolar entre uma zona e a seguinte.
export const ZONES = [
  {
    name: "VILA RAD",
    top: [96, 178, 255], bottom: [255, 226, 176],
    far: [128, 160, 200], near: [92, 112, 154], ground: [74, 78, 92], line2: [236, 236, 236],
    stars: 0, lit: 0, sunA: 1, sunY: 120, moonA: 0, moonY: 120,
  },
  {
    name: "CENTRO",
    top: [88, 58, 142], bottom: [255, 146, 78],
    far: [112, 70, 124], near: [74, 48, 96], ground: [64, 58, 78], line2: [240, 210, 190],
    stars: 0.25, lit: 0.45, sunA: 1, sunY: 290, moonA: 0, moonY: 120,
  },
  {
    name: "AVENIDA NEON",
    top: [8, 8, 34], bottom: [52, 22, 88],
    far: [26, 26, 66], near: [18, 16, 46], ground: [34, 30, 52], line2: [120, 220, 255],
    stars: 1, lit: 1, sunA: 0, sunY: 420, moonA: 1, moonY: 105,
  },
  {
    name: "MADRUGADA",
    top: [64, 88, 170], bottom: [255, 170, 150],
    far: [104, 112, 170], near: [70, 76, 128], ground: [58, 60, 80], line2: [255, 230, 220],
    stars: 0.35, lit: 0.55, sunA: 1, sunY: 340, moonA: 0.4, moonY: 150,
  },
  // ---- 4 e 5: LOS ANGELES (dia na praia → pôr do sol)
  {
    name: "VENICE BEACH",
    top: [70, 160, 255], bottom: [255, 224, 176],
    far: [150, 168, 205], near: [214, 190, 160], ground: [150, 146, 148], line2: [255, 255, 255],
    stars: 0, lit: 0, sunA: 1, sunY: 150, moonA: 0, moonY: 120,
  },
  {
    name: "SUNSET BLVD",
    top: [112, 54, 150], bottom: [255, 118, 58],
    far: [128, 70, 118], near: [96, 56, 92], ground: [104, 88, 100], line2: [255, 214, 180],
    stars: 0.2, lit: 0.55, sunA: 1, sunY: 335, moonA: 0, moonY: 120,
  },
  // ---- 6 e 7: MIAMI (fim de tarde em South Beach → noite de neon em Ocean Drive)
  {
    name: "SOUTH BEACH",
    top: [150, 84, 196], bottom: [255, 172, 132],
    far: [170, 120, 180], near: [214, 150, 170], ground: [200, 160, 172], line2: [255, 244, 214],
    stars: 0.1, lit: 0.35, sunA: 1, sunY: 305, moonA: 0, moonY: 120,
  },
  {
    name: "OCEAN DRIVE",
    top: [14, 8, 54], bottom: [150, 38, 128],
    far: [60, 30, 100], near: [40, 22, 76], ground: [64, 46, 88], line2: [90, 240, 255],
    stars: 1, lit: 1, sunA: 0, sunY: 420, moonA: 1, moonY: 108,
  },
  // ---- 8 e 9: NOVA YORK (entardecer no Brooklyn → noite em Manhattan)
  {
    name: "BROOKLYN",
    top: [58, 72, 144], bottom: [255, 170, 112],
    far: [112, 100, 150], near: [86, 70, 100], ground: [92, 92, 104], line2: [250, 226, 160],
    stars: 0.3, lit: 0.6, sunA: 1, sunY: 335, moonA: 0, moonY: 120,
  },
  {
    name: "MANHATTAN",
    top: [6, 8, 30], bottom: [84, 52, 96],
    far: [40, 40, 90], near: [26, 26, 62], ground: [40, 40, 54], line2: [255, 216, 64],
    stars: 0.7, lit: 1, sunA: 0, sunY: 420, moonA: 1, moonY: 100,
  },
];

// Enredo: o personagem picha uma parede, a polícia vê e persegue — e ele foge de skate.
// Uma única cutscene (src/scenes/cutscene.js) abre todas as fases e o Arcade.

// As 3 fases (dificuldade crescente) + modo Arcade ---------------------------
//  meters: tamanho da fase · speed: [início, fim] em px/s (sobe até 85% da fase)
//  gap / gapEnd: tempo livre entre um obstáculo e o próximo, em segundos [mín, máx]
//  keys: paletas (ZONES) que o cenário atravessa · pool: chance de cada obstáculo
//  tutorial: obstáculos que aparecem sempre primeiro, nesta ordem
//  stickerGoal / maxBails: objetivos da 2ª e da 3ª estrela
export const LEVELS = [
  {
    id: 1, name: "LOS ANGELES", city: "la", tag: "FÁCIL", tagColor: "#6bd968",
    meters: 600, speed: [310, 430], gap: [1.7, 2.3], gapEnd: [1.5, 2.0], keys: [4, 5],
    pool: { cone: 0.3, bench: 0.3, hydrant: 0.25, stairs: 0.15 },
    tutorial: ["cone", "bench", "hydrant", "stairs"],
    stickerGoal: 60, maxBails: 1, lives: 3,
    gate: "SECOND ST. TUNNEL",
    line: "A polícia está na sua cola! Desvie dos obstáculos e chegue ao túnel!",
    midLine: "O sol está se pondo na Sunset Blvd... o túnel está perto!",
  },
  {
    id: 2, name: "MIAMI", city: "miami", tag: "MÉDIO", tagColor: "#ffd23f",
    meters: 850, speed: [360, 500], gap: [1.5, 2.0], gapEnd: [1.3, 1.75], keys: [6, 7],
    pool: { cone: 0.14, bench: 0.2, hydrant: 0.2, stairs: 0.2, rail: 0.26 },
    tutorial: ["rail"],
    stickerGoal: 95, maxBails: 1, lives: 3,
    gate: "PORT OF MIAMI TUNNEL",
    line: "A viatura está na sua cola! Corrimão: caia sobre ele segurando ↓.",
    midLine: "A noite caiu em Ocean Drive... mantenha o ritmo!",
  },
  {
    id: 3, name: "NOVA YORK", city: "ny", tag: "DIFÍCIL", tagColor: "#ff5d73",
    meters: 1100, speed: [410, 580], gap: [1.35, 1.8], gapEnd: [1.15, 1.55], keys: [8, 9],
    pool: { cone: 0.14, bench: 0.2, hydrant: 0.2, stairs: 0.22, rail: 0.24 },
    tutorial: [],
    stickerGoal: 130, maxBails: 1, lives: 3,
    gate: "HOLLAND TUNNEL",
    line: "Até o helicóptero está atrás de você! Não vacile!",
    midLine: "Manhattan acendeu! O túnel é logo ali, não pare!",
  },
];

// Modo Arcade: quase infinito, a velocidade e a dificuldade só aumentam
export const ARCADE = {
  id: 0, arcade: true, endless: true, name: "ARCADE", tag: "SEM FIM", tagColor: "#c77dff",
  meters: Infinity, ramp: 2600, zoneMeters: 450, speed: [330, 760],
  gap: [1.9, 2.5], gapEnd: [1.0, 1.35], keys: [0, 1, 2, 3], loop: true,
  pool: { cone: 0.16, bench: 0.2, hydrant: 0.2, stairs: 0.2, rail: 0.24 },
  unlock: { stairs: 120, rail: 280 }, // metros em que cada obstáculo passa a aparecer
  tutorial: ["cone", "bench", "hydrant"],
  lives: 3,
  line: "Sem linha de chegada! Fuja o mais longe que conseguir!",
};

// "Fase" usada só para animar o cenário no título e nos menus
export const DEMO = { keys: [0, 1, 2, 3], loop: true, zoneMeters: 90, meters: Infinity };

/** Textos dos 3 objetivos de estrela de uma fase */
export function starGoals(lv) {
  return [
    "Completar a fase",
    `Juntar ${lv.stickerGoal} estrelas`,
    lv.maxBails === 1 ? "No máximo 1 tombo" : `No máximo ${lv.maxBails} tombos`,
  ];
}

export const ENDINGS = {
  3: "Lenda da rua! A polícia nem chegou perto e a sua arte ficou lá!",
  2: "Que fuga! Você despistou a polícia e a pichação ficou na parede!",
  1: "Escapou por pouco... mas escapou! Bora treinar mais!",
};
