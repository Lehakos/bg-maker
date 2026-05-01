import {
  createDefaultPieceLayout,
  createDefaultProjectParameters,
  createDefaultTileLayout,
  getCardTemplateFields,
  getFirstCardSideText,
  getFirstPieceFaceText,
  getFirstTileSideText,
  getPieceTemplateFields,
  getTileTemplateFields,
  resolveCardLayout,
  resolvePieceLayout,
  resolveTileLayout,
  type CardLayout,
  type CardTemplate,
  type ComponentCollection,
  type GameComponent,
  type GameProject,
  type LayoutZone,
  type PieceAppearance,
  type PieceLayout,
  type PieceTemplate,
  type ProjectParameter,
  type TableSetup,
  type TemplateFieldValues,
  type TileLayout,
  type TileTemplate
} from "@bg-maker/shared";

type CardComponent = Extract<GameComponent, { type: "card" }>;
type DieComponent = Extract<GameComponent, { type: "die" }>;
type PieceComponent = Extract<GameComponent, { type: "piece" }>;
type TileComponent = Extract<GameComponent, { type: "tile" }>;

export type SeedDataset = {
  cardTemplates: CardTemplate[];
  collections: ComponentCollection[];
  components: GameComponent[];
  pieceTemplates: PieceTemplate[];
  project: GameProject;
  tableSetup?: TableSetup;
  tileTemplates: TileTemplate[];
};

const pokerCardSize = {
  preset: "poker",
  widthMm: 63,
  heightMm: 88
} as const;

const cardPadding = {
  topMm: 4,
  rightMm: 4,
  bottomMm: 4,
  leftMm: 4
};

export const seedDatasets: SeedDataset[] = [
  createSoloDungeonDataset(),
  createMarketRaceDataset(),
  createComponentSamplerDataset()
];

function createSoloDungeonDataset(): SeedDataset {
  const projectId = "solo-dungeon";
  const createdAt = "2026-04-20T09:00:00.000Z";
  const updatedAt = "2026-04-27T18:00:00.000Z";
  const parameters = projectParameters({
    player_1_color: "#b91c1c",
    player_2_color: "#1d4ed8",
    player_3_color: "#15803d",
    player_4_color: "#a16207"
  });
  const actionTemplate = createCardTemplate(
    projectId,
    "solo-action-card-template",
    "Dungeon action card",
    "Hero deck",
    createdAt,
    updatedAt
  );
  const encounterTemplate = createCardTemplate(
    projectId,
    "solo-encounter-card-template",
    "Encounter card",
    "Encounter deck",
    createdAt,
    updatedAt
  );
  const heroTemplate = createPieceTemplate(
    projectId,
    "solo-hero-standee-template",
    "Hero standee",
    createDefaultPieceLayout({
      appearance: { fillColor: "#fef3c7", strokeColor: "#92400e" },
      faceText: "Hero",
      formFactor: "standee",
      shape: "pawn"
    }),
    createdAt,
    updatedAt
  );
  const healthTemplate = createPieceTemplate(
    projectId,
    "solo-health-token-template",
    "Health token",
    createDefaultPieceLayout({
      appearance: { fillColor: "#fee2e2", strokeColor: "#b91c1c" },
      faceText: "HP",
      formFactor: "flat",
      shape: "circle"
    }),
    createdAt,
    updatedAt
  );
  const roomTemplate = createTileTemplate(
    projectId,
    "solo-room-tile-template",
    "Dungeon room tile",
    createDefaultTileLayout({
      appearance: { fillColor: "#e5e7eb", strokeColor: "#374151" },
      faceText: "Room",
      shape: "box",
      size: { widthMm: 70, heightMm: 70 }
    }),
    createdAt,
    updatedAt
  );
  const cardTemplates = [actionTemplate, encounterTemplate];
  const pieceTemplates = [heroTemplate, healthTemplate];
  const tileTemplates = [roomTemplate];

  const strike = createCardComponent({
    createdAt,
    description: "Basic attack in the starter deck.",
    fieldValues: {
      cost: "1 AP",
      effect: "Deal 1 damage to an enemy in your room.",
      title: "Strike"
    },
    id: "solo-strike-card",
    name: "Strike",
    parameters,
    projectId,
    tags: ["starter", "attack"],
    template: actionTemplate,
    updatedAt
  });
  const guard = createCardComponent({
    createdAt,
    description: "Keeps the hero alive through early encounters.",
    fieldValues: {
      cost: "1 AP",
      effect: "Block 2 damage before the next enemy attack.",
      title: "Guard"
    },
    id: "solo-guard-card",
    name: "Guard",
    parameters,
    projectId,
    tags: ["starter", "defense"],
    template: actionTemplate,
    updatedAt
  });
  const raider = createCardComponent({
    createdAt,
    description: "A low-threat encounter for room one.",
    fieldValues: {
      cost: "Threat 1",
      effect: "Attack 1. Reward: gain 1 coin.",
      title: "Cave raider"
    },
    id: "solo-cave-raider-card",
    name: "Cave raider",
    parameters,
    projectId,
    tags: ["enemy", "level-1"],
    template: encounterTemplate,
    updatedAt
  });
  const trap = createCardComponent({
    createdAt,
    description: "Adds pressure to exploration turns.",
    fieldValues: {
      cost: "Hazard",
      effect: "Lose 1 HP unless you discard a Guard.",
      title: "Spike trap"
    },
    id: "solo-spike-trap-card",
    name: "Spike trap",
    parameters,
    projectId,
    tags: ["hazard", "level-1"],
    template: encounterTemplate,
    updatedAt
  });
  const hero = createPieceComponent({
    createdAt,
    description: "Starting hero standee.",
    id: "solo-hero-standee",
    name: "Hero",
    parameters,
    projectId,
    tags: ["player"],
    template: heroTemplate,
    updatedAt
  });
  const health = createPieceComponent({
    createdAt,
    description: "Damage and healing tracker tokens.",
    id: "solo-health-token",
    name: "Health token",
    parameters,
    projectId,
    tags: ["health", "token"],
    template: healthTemplate,
    updatedAt
  });
  const room = createTileComponent({
    createdAt,
    description: "A modular room for the dungeon map.",
    id: "solo-room-tile",
    name: "Room tile",
    parameters,
    projectId,
    tags: ["map", "room"],
    template: roomTemplate,
    updatedAt
  });
  const dungeonDie = createDieComponent({
    createdAt,
    description: "Used for traps, enemy AI, and loot checks.",
    faceLabels: ["Hit", "Hit", "Block", "Coin", "Move", "Blank"],
    id: "solo-dungeon-die",
    name: "Dungeon die",
    projectId,
    tags: ["randomizer"],
    updatedAt
  });
  const components: GameComponent[] = [strike, guard, raider, trap, hero, health, room, dungeonDie];
  const collections: ComponentCollection[] = [
    createCollection({
      createdAt,
      id: "solo-starter-deck",
      items: [
        { componentId: strike.id, quantity: 8 },
        { componentId: guard.id, quantity: 6 }
      ],
      name: "Starter deck",
      notes: "Shuffle at setup and draw 5.",
      projectId,
      tags: ["setup", "player"],
      type: "deck",
      updatedAt
    }),
    createCollection({
      createdAt,
      id: "solo-encounter-deck",
      items: [
        { componentId: raider.id, quantity: 6 },
        { componentId: trap.id, quantity: 4 }
      ],
      name: "Level 1 encounter deck",
      notes: "Draw one card whenever the hero enters a new room.",
      projectId,
      tags: ["encounter"],
      type: "deck",
      updatedAt
    }),
    createCollection({
      createdAt,
      id: "solo-explore-bag",
      items: [
        { componentId: room.id, quantity: 9 },
        { componentId: health.id, quantity: 10 },
        { componentId: dungeonDie.id, quantity: 2 }
      ],
      name: "Explore bag",
      notes: "Useful scratch bag for testing room and reward pulls.",
      projectId,
      tags: ["bag", "setup"],
      type: "bag",
      updatedAt
    }),
    createCollection({
      createdAt,
      id: "solo-starting-setup",
      items: [
        { componentId: hero.id, quantity: 1 },
        { componentId: health.id, quantity: 5 },
        { componentId: room.id, quantity: 1 },
        { componentId: dungeonDie.id, quantity: 2 }
      ],
      name: "Starting setup",
      notes: "Mixed helper collection for placing the first room fast.",
      projectId,
      tags: ["setup"],
      type: "custom",
      updatedAt
    })
  ];

  return {
    cardTemplates,
    collections,
    components,
    pieceTemplates,
    project: {
      id: projectId,
      name: "Solo Dungeon",
      description: "Compact solo card crawl project with decks, a bag, and a starter table.",
      players: "1",
      parameters,
      status: "testing",
      notes: "Use this as the card-heavy dataset. Starter deck and encounter deck are ready.",
      componentCount: components.length,
      createdAt,
      updatedAt
    },
    tableSetup: createTableSetup({
      createdAt,
      height: 1000,
      placements: [
        createPlacement({
          collectionId: "solo-starting-setup",
          id: "solo-starting-setup-placement",
          x: 1280,
          y: 640
        })
      ],
      projectId,
      updatedAt,
      width: 1600,
      zones: [
        createZone({
          children: [
            createSourceZone({
              childrenType: "card",
              id: "solo-player-deck-zone",
              layout: "stack",
              name: "Starter deck",
              padding: 12,
              source: { kind: "collection", collectionId: "solo-starter-deck" },
              width: 140,
              height: 150,
              x: 24,
              y: 32
            }),
            createSourceZone({
              childrenType: "piece",
              id: "solo-health-zone",
              layout: "row",
              name: "Health",
              capacity: 5,
              gap: 6,
              padding: 12,
              source: { kind: "component", componentId: "solo-health-token" },
              width: 240,
              height: 100,
              x: 180,
              y: 72
            })
          ],
          id: "solo-player-zone",
          name: "Hero area",
          width: 420,
          height: 220,
          x: 80,
          y: 680
        }),
        createZone({
          children: [
            createSourceZone({
              childrenType: "tile",
              id: "solo-room-tile-zone",
              layout: "grid",
              name: "Room stack",
              capacity: 9,
              columns: 3,
              gap: 8,
              padding: 12,
              source: { kind: "component", componentId: "solo-room-tile" },
              width: 300,
              height: 300,
              x: 40,
              y: 44
            }),
            createSourceZone({
              childrenType: "piece",
              id: "solo-hero-zone",
              layout: "stack",
              name: "Hero",
              padding: 12,
              source: { kind: "component", componentId: "solo-hero-standee" },
              width: 120,
              height: 140,
              x: 380,
              y: 180
            })
          ],
          id: "solo-dungeon-zone",
          name: "Dungeon map",
          width: 560,
          height: 520,
          x: 520,
          y: 260
        }),
        createZone({
          id: "solo-encounter-zone",
          name: "Encounter deck",
          children: [
            createSourceZone({
              childrenType: "card",
              id: "solo-encounter-source-zone",
              layout: "stack",
              name: "Encounter source",
              padding: 12,
              source: { kind: "collection", collectionId: "solo-encounter-deck" },
              width: 140,
              height: 150,
              x: 70,
              y: 36
            })
          ],
          width: 280,
          height: 220,
          x: 940,
          y: 110
        })
      ]
    }),
    tileTemplates
  };
}

function createMarketRaceDataset(): SeedDataset {
  const projectId = "market-race";
  const createdAt = "2026-04-22T12:00:00.000Z";
  const updatedAt = "2026-04-26T15:30:00.000Z";
  const parameters = projectParameters({
    player_1_color: "#dc2626",
    player_2_color: "#2563eb",
    player_3_color: "#16a34a",
    player_4_color: "#f59e0b"
  });
  const contractTemplate = createCardTemplate(
    projectId,
    "market-contract-card-template",
    "Contract card",
    "Contract deck",
    createdAt,
    updatedAt
  );
  const marketTileTemplate = createTileTemplate(
    projectId,
    "market-stall-tile-template",
    "Market stall tile",
    createDefaultTileLayout({
      appearance: { fillColor: "#d1fae5", strokeColor: "#047857" },
      faceText: "Stall",
      shape: "hex",
      size: { widthMm: 64, heightMm: 56 }
    }),
    createdAt,
    updatedAt
  );
  const coinTemplate = createPieceTemplate(
    projectId,
    "market-coin-token-template",
    "Coin token",
    createDefaultPieceLayout({
      appearance: { fillColor: "#fde68a", strokeColor: "#b45309" },
      faceText: "1",
      formFactor: "flat",
      shape: "circle"
    }),
    createdAt,
    updatedAt
  );
  const meepleTemplate = createPieceTemplate(
    projectId,
    "market-meeple-template",
    "Player meeple",
    createDefaultPieceLayout({
      appearance: { fillColor: "#dbeafe", strokeColor: "#1d4ed8" },
      faceText: "P",
      formFactor: "solid",
      shape: "meeple"
    }),
    createdAt,
    updatedAt
  );
  const cardTemplates = [contractTemplate];
  const tileTemplates = [marketTileTemplate];
  const pieceTemplates = [coinTemplate, meepleTemplate];
  const grainContract = createCardComponent({
    createdAt,
    description: "Early contract for testing the market row.",
    fieldValues: {
      cost: "2 coins",
      effect: "Deliver grain to gain 3 VP.",
      title: "Grain contract"
    },
    id: "market-grain-contract-card",
    name: "Grain contract",
    parameters,
    projectId,
    tags: ["contract", "early"],
    template: contractTemplate,
    updatedAt
  });
  const spiceContract = createCardComponent({
    createdAt,
    description: "Higher-value market objective.",
    fieldValues: {
      cost: "4 coins",
      effect: "Deliver spice to gain 6 VP and move one space.",
      title: "Spice contract"
    },
    id: "market-spice-contract-card",
    name: "Spice contract",
    parameters,
    projectId,
    tags: ["contract", "late"],
    template: contractTemplate,
    updatedAt
  });
  const stallTile = createTileComponent({
    createdAt,
    description: "Shared market slot for contract drafting.",
    id: "market-stall-tile",
    name: "Market stall",
    parameters,
    projectId,
    tags: ["market", "board"],
    template: marketTileTemplate,
    updatedAt
  });
  const coin = createPieceComponent({
    createdAt,
    description: "Currency token.",
    id: "market-coin-token",
    name: "Coin",
    parameters,
    projectId,
    tags: ["resource"],
    template: coinTemplate,
    updatedAt
  });
  const meeple = createPieceComponent({
    appearance: { fillColor: { key: "player_1_color", source: "project" }, strokeColor: "#111827" },
    createdAt,
    description: "Player pawn for turn order and board position.",
    id: "market-player-meeple",
    name: "Player meeple",
    parameters,
    projectId,
    tags: ["player"],
    template: meepleTemplate,
    updatedAt
  });
  const priceDie = createDieComponent({
    createdAt,
    description: "Random price pressure for the open market.",
    faceLabels: ["-1", "0", "0", "+1", "+1", "+2"],
    id: "market-price-die",
    name: "Price die",
    projectId,
    tags: ["market", "randomizer"],
    updatedAt
  });
  const components: GameComponent[] = [
    grainContract,
    spiceContract,
    stallTile,
    coin,
    meeple,
    priceDie
  ];
  const collections: ComponentCollection[] = [
    createCollection({
      createdAt,
      id: "market-contract-deck",
      items: [
        { componentId: grainContract.id, quantity: 6 },
        { componentId: spiceContract.id, quantity: 4 }
      ],
      name: "Contract deck",
      notes: "Reveal three cards into the market row.",
      projectId,
      tags: ["market", "deck"],
      type: "deck",
      updatedAt
    }),
    createCollection({
      createdAt,
      id: "market-resource-bag",
      items: [
        { componentId: coin.id, quantity: 40 },
        { componentId: stallTile.id, quantity: 5 },
        { componentId: priceDie.id, quantity: 1 }
      ],
      name: "Resource bag",
      notes: "Bag-style collection that mixes tokens, tiles, and dice.",
      projectId,
      tags: ["resources"],
      type: "bag",
      updatedAt
    }),
    createCollection({
      createdAt,
      id: "market-player-kit",
      items: [
        { componentId: meeple.id, quantity: 1 },
        { componentId: coin.id, quantity: 5 },
        { componentId: grainContract.id, quantity: 1 }
      ],
      name: "Player kit",
      notes: "Mixed setup pack for testing custom collections.",
      projectId,
      tags: ["player", "setup"],
      type: "custom",
      updatedAt
    })
  ];

  return {
    cardTemplates,
    collections,
    components,
    pieceTemplates,
    project: {
      id: projectId,
      name: "Market Race",
      description: "Light economy race with a shared market row and resource bag.",
      players: "2-4",
      parameters,
      status: "testing",
      notes: "Use this as the mixed economy dataset.",
      componentCount: components.length,
      createdAt,
      updatedAt
    },
    tableSetup: createTableSetup({
      createdAt,
      height: 1000,
      placements: [
        createPlacement({
          collectionId: "market-resource-bag",
          id: "market-resource-bag-placement",
          x: 1180,
          y: 650
        }),
        createPlacement({
          componentId: "market-price-die",
          id: "market-price-die-placement",
          x: 1330,
          y: 650
        })
      ],
      projectId,
      updatedAt,
      width: 1600,
      zones: [
        createZone({
          id: "market-deck-zone",
          name: "Contract deck",
          children: [
            createSourceZone({
              childrenType: "card",
              id: "market-contract-source-zone",
              layout: "stack",
              name: "Contract deck source",
              padding: 12,
              source: { kind: "collection", collectionId: "market-contract-deck" },
              width: 140,
              height: 150,
              x: 60,
              y: 36
            })
          ],
          width: 260,
          height: 220,
          x: 160,
          y: 120
        }),
        createZone({
          id: "market-row-zone",
          name: "Market row",
          children: [
            createSourceZone({
              childrenType: "tile",
              id: "market-row-source-zone",
              layout: "row",
              name: "Market row source",
              capacity: 5,
              gap: 8,
              padding: 12,
              source: { kind: "component", componentId: "market-stall-tile" },
              width: 520,
              height: 120,
              x: 60,
              y: 70
            })
          ],
          width: 640,
          height: 260,
          x: 500,
          y: 170
        }),
        createZone({
          children: [
            createSourceZone({
              childrenType: "piece",
              id: "market-coin-source-zone",
              layout: "grid",
              name: "Coins",
              capacity: 12,
              columns: 6,
              gap: 4,
              padding: 12,
              source: { kind: "component", componentId: "market-coin-token" },
              width: 260,
              height: 120,
              x: 48,
              y: 56
            })
          ],
          id: "market-supply-zone",
          name: "Supply",
          width: 360,
          height: 260,
          x: 1040,
          y: 560
        })
      ]
    }),
    tileTemplates
  };
}

function createComponentSamplerDataset(): SeedDataset {
  const projectId = "component-sampler";
  const createdAt = "2026-04-25T10:00:00.000Z";
  const updatedAt = "2026-04-25T16:45:00.000Z";
  const parameters = projectParameters({});
  const actionTemplate = createCardTemplate(
    projectId,
    "sampler-action-card-template",
    "Sampler action card",
    "Sampler",
    createdAt,
    updatedAt
  );
  const tileTemplate = createTileTemplate(
    projectId,
    "sampler-hex-tile-template",
    "Sampler hex tile",
    createDefaultTileLayout({
      appearance: { fillColor: "#e0f2fe", strokeColor: "#0369a1" },
      faceText: "Hex",
      shape: "hex",
      size: { widthMm: 55, heightMm: 48 }
    }),
    createdAt,
    updatedAt
  );
  const tokenTemplate = createPieceTemplate(
    projectId,
    "sampler-token-template",
    "Sampler token",
    createDefaultPieceLayout({
      appearance: { fillColor: "#f5f3ff", strokeColor: "#7c3aed" },
      faceText: "T",
      formFactor: "flat",
      shape: "hex"
    }),
    createdAt,
    updatedAt
  );
  const sampleCard = createCardComponent({
    createdAt,
    description: "Generic card for smoke testing.",
    fieldValues: {
      cost: "0",
      effect: "Use this to test card previews and decks.",
      title: "Sample card"
    },
    id: "sampler-card",
    name: "Sample card",
    parameters,
    projectId,
    tags: ["sample", "card"],
    template: actionTemplate,
    updatedAt
  });
  const sampleTile = createTileComponent({
    createdAt,
    description: "Generic tile for bag and layout testing.",
    id: "sampler-tile",
    name: "Sample tile",
    parameters,
    projectId,
    tags: ["sample", "tile"],
    template: tileTemplate,
    updatedAt
  });
  const sampleToken = createPieceComponent({
    createdAt,
    description: "Generic token for bag and custom collection testing.",
    id: "sampler-token",
    name: "Sample token",
    parameters,
    projectId,
    tags: ["sample", "token"],
    template: tokenTemplate,
    updatedAt
  });
  const sampleDie = createDieComponent({
    createdAt,
    description: "Generic six-sided die.",
    faceLabels: ["1", "2", "3", "4", "5", "6"],
    id: "sampler-die",
    name: "Sample die",
    projectId,
    tags: ["sample", "die"],
    updatedAt
  });
  const components: GameComponent[] = [sampleCard, sampleTile, sampleToken, sampleDie];
  const collections: ComponentCollection[] = [
    createCollection({
      createdAt,
      id: "sampler-deck",
      items: [{ componentId: sampleCard.id, quantity: 10 }],
      name: "Sample deck",
      notes: "Deck-only validation example.",
      projectId,
      tags: ["sample"],
      type: "deck",
      updatedAt
    }),
    createCollection({
      createdAt,
      id: "sampler-bag",
      items: [
        { componentId: sampleTile.id, quantity: 12 },
        { componentId: sampleToken.id, quantity: 24 },
        { componentId: sampleDie.id, quantity: 3 }
      ],
      name: "Sample bag",
      notes: "Bag validation example.",
      projectId,
      tags: ["sample"],
      type: "bag",
      updatedAt
    }),
    createCollection({
      createdAt,
      id: "sampler-custom-set",
      items: [
        { componentId: sampleCard.id, quantity: 2 },
        { componentId: sampleTile.id, quantity: 2 },
        { componentId: sampleToken.id, quantity: 4 },
        { componentId: sampleDie.id, quantity: 1 }
      ],
      name: "Mixed custom set",
      notes: "Custom collection with every component type.",
      projectId,
      tags: ["sample", "mixed"],
      type: "custom",
      updatedAt
    })
  ];

  return {
    cardTemplates: [actionTemplate],
    collections,
    components,
    pieceTemplates: [tokenTemplate],
    project: {
      id: projectId,
      name: "Component Sampler",
      description: "Small kitchen-sink dataset for cards, tiles, tokens, dice, and collections.",
      players: "1-4",
      parameters,
      status: "draft",
      notes: "Use this when you need a quick clean testbed.",
      componentCount: components.length,
      createdAt,
      updatedAt
    },
    tileTemplates: [tileTemplate]
  };
}

function createCardTemplate(
  projectId: string,
  id: string,
  name: string,
  backText: string,
  createdAt: string,
  updatedAt: string
): CardTemplate {
  const layout = createActionCardLayout(backText);

  return {
    id,
    projectId,
    name,
    layout,
    fields: getCardTemplateFields(layout),
    createdAt,
    updatedAt
  };
}

function createActionCardLayout(backText: string): CardLayout {
  return {
    version: 1,
    size: pokerCardSize,
    sides: {
      front: {
        paddingMm: { ...cardPadding },
        zones: [
          createTextZone({
            id: "front-title",
            name: "Title",
            x: 0,
            y: 0,
            width: 100,
            height: 14,
            text: "Title",
            fieldKey: "title",
            fontSize: 16,
            bold: true
          }),
          createTextZone({
            id: "front-effect",
            name: "Effect",
            x: 8,
            y: 24,
            width: 84,
            height: 48,
            text: "Effect",
            fieldKey: "effect",
            fontSize: 10
          }),
          createTextZone({
            id: "front-cost",
            name: "Cost",
            x: 0,
            y: 88,
            width: 100,
            height: 12,
            text: "0",
            fieldKey: "cost",
            fontSize: 9,
            bold: true
          })
        ]
      },
      back: {
        paddingMm: { topMm: 0, rightMm: 0, bottomMm: 0, leftMm: 0 },
        zones: [
          createTextZone({
            id: "back-title",
            name: "Back title",
            x: 8,
            y: 40,
            width: 84,
            height: 20,
            text: backText,
            fontSize: 13,
            bold: true,
            color: "#f8fafc"
          })
        ]
      }
    }
  };
}

function createTextZone(input: {
  align?: "center" | "left" | "right";
  bold?: boolean;
  color?: string;
  fieldKey?: string;
  fontSize?: number;
  height: number;
  id: string;
  name: string;
  text: string;
  width: number;
  x: number;
  y: number;
}): LayoutZone {
  return {
    id: input.id,
    name: input.name,
    x: input.x,
    y: input.y,
    width: input.width,
    height: input.height,
    content: {
      type: "text",
      source: input.fieldKey ? { fieldKey: input.fieldKey, mode: "field" } : { mode: "static" },
      text: input.text,
      fontSize: input.fontSize ?? 12,
      bold: input.bold ?? false,
      align: input.align ?? "center",
      color: input.color ?? "#1f2937"
    }
  };
}

function createCardComponent(input: {
  createdAt: string;
  description: string;
  fieldValues: TemplateFieldValues;
  id: string;
  name: string;
  notes?: string;
  parameters: ProjectParameter[];
  projectId: string;
  tags: string[];
  template: CardTemplate;
  updatedAt: string;
}): CardComponent {
  const layout = resolveCardLayout(input.template.layout, input.fieldValues, input.parameters);

  return {
    id: input.id,
    projectId: input.projectId,
    type: "card",
    name: input.name,
    description: input.description,
    tags: input.tags,
    notes: input.notes ?? "",
    frontText: getFirstCardSideText(layout.sides.front),
    backText: getFirstCardSideText(layout.sides.back),
    templateId: input.template.id,
    fieldValues: input.fieldValues,
    layout,
    createdAt: input.createdAt,
    updatedAt: input.updatedAt
  };
}

function createTileTemplate(
  projectId: string,
  id: string,
  name: string,
  layout: TileLayout,
  createdAt: string,
  updatedAt: string
): TileTemplate {
  return {
    id,
    projectId,
    name,
    layout,
    fields: getTileTemplateFields(layout),
    createdAt,
    updatedAt
  };
}

function createTileComponent(input: {
  createdAt: string;
  description: string;
  id: string;
  name: string;
  notes?: string;
  parameters: ProjectParameter[];
  projectId: string;
  tags: string[];
  template: TileTemplate;
  updatedAt: string;
}): TileComponent {
  const fieldValues: TemplateFieldValues = {};
  const layout = resolveTileLayout(input.template.layout, fieldValues, input.parameters);

  return {
    id: input.id,
    projectId: input.projectId,
    type: "tile",
    name: input.name,
    description: input.description,
    tags: input.tags,
    notes: input.notes ?? "",
    labelText: getFirstTileSideText(layout),
    templateId: input.template.id,
    fieldValues,
    layout,
    createdAt: input.createdAt,
    updatedAt: input.updatedAt
  };
}

function createPieceTemplate(
  projectId: string,
  id: string,
  name: string,
  layout: PieceLayout,
  createdAt: string,
  updatedAt: string
): PieceTemplate {
  return {
    id,
    projectId,
    name,
    layout,
    fields: getPieceTemplateFields(layout),
    createdAt,
    updatedAt
  };
}

function createPieceComponent(input: {
  appearance?: PieceAppearance;
  createdAt: string;
  description: string;
  id: string;
  name: string;
  notes?: string;
  parameters: ProjectParameter[];
  projectId: string;
  tags: string[];
  template: PieceTemplate;
  updatedAt: string;
}): PieceComponent {
  const fieldValues: TemplateFieldValues = {};
  const appearance = input.appearance ?? input.template.layout.appearance;
  const layout = resolvePieceLayout(
    input.template.layout,
    fieldValues,
    appearance,
    input.parameters
  );

  return {
    id: input.id,
    projectId: input.projectId,
    type: "piece",
    name: input.name,
    description: input.description,
    tags: input.tags,
    notes: input.notes ?? "",
    labelText: getFirstPieceFaceText(layout),
    templateId: input.template.id,
    appearance,
    fieldValues,
    layout,
    createdAt: input.createdAt,
    updatedAt: input.updatedAt
  };
}

function createDieComponent(input: {
  createdAt: string;
  description: string;
  faceLabels: string[];
  id: string;
  name: string;
  notes?: string;
  projectId: string;
  tags: string[];
  updatedAt: string;
}): DieComponent {
  return {
    id: input.id,
    projectId: input.projectId,
    type: "die",
    name: input.name,
    description: input.description,
    tags: input.tags,
    notes: input.notes ?? "",
    sides: input.faceLabels.length,
    faceLabels: input.faceLabels,
    createdAt: input.createdAt,
    updatedAt: input.updatedAt
  };
}

function createCollection(input: {
  createdAt: string;
  id: string;
  items: ComponentCollection["items"];
  name: string;
  notes: string;
  projectId: string;
  tags: string[];
  type: ComponentCollection["type"];
  updatedAt: string;
}): ComponentCollection {
  return {
    id: input.id,
    projectId: input.projectId,
    type: input.type,
    name: input.name,
    description: "",
    tags: input.tags,
    notes: input.notes,
    items: input.items,
    createdAt: input.createdAt,
    updatedAt: input.updatedAt
  };
}

function createTableSetup(
  input: Omit<TableSetup, "placements"> & {
    placements: TableSetup["placements"];
  }
): TableSetup {
  return input;
}

function createZone(input: {
  background?: TableSetup["zones"][number]["background"];
  border?: Partial<TableSetup["zones"][number]["border"]>;
  capacity?: TableSetup["zones"][number]["capacity"];
  children?: TableSetup["zones"];
  columns?: number;
  description?: string;
  gap?: number;
  height: number;
  id: string;
  layout?: TableSetup["zones"][number]["layout"];
  name: string;
  overflow?: TableSetup["zones"][number]["overflow"];
  padding?: number;
  size?: TableSetup["zones"][number]["size"];
  visibility?: TableSetup["zones"][number]["visibility"];
  width: number;
  x: number;
  y: number;
}): TableSetup["zones"][number] {
  return {
    id: input.id,
    name: input.name,
    description: input.description ?? "",
    x: input.x,
    y: input.y,
    width: input.width,
    height: input.height,
    padding: input.padding ?? 8,
    size: input.size ?? "fixed",
    overflow: input.overflow ?? "hidden",
    capacity: input.capacity ?? null,
    layout: input.layout ?? "free",
    ...(input.gap !== undefined ? { gap: input.gap } : {}),
    ...(input.columns !== undefined ? { columns: input.columns } : {}),
    visibility: input.visibility ?? "all",
    background: input.background ?? { type: "color", color: "#e0f2fe" },
    border: {
      width: 1,
      color: "#0e7490",
      ...input.border
    },
    childrenType: "zone",
    children: input.children ?? []
  };
}

function createSourceZone(input: {
  background?: TableSetup["zones"][number]["background"];
  border?: Partial<TableSetup["zones"][number]["border"]>;
  capacity?: TableSetup["zones"][number]["capacity"];
  childrenType: Extract<TableSetup["zones"][number], { autofill: boolean }>["childrenType"];
  columns?: number;
  description?: string;
  face?: Extract<TableSetup["zones"][number], { autofill: boolean }>["face"];
  gap?: number;
  height: number;
  id: string;
  layout?: TableSetup["zones"][number]["layout"];
  name: string;
  overflow?: TableSetup["zones"][number]["overflow"];
  padding?: number;
  size?: TableSetup["zones"][number]["size"];
  source?: Extract<TableSetup["zones"][number], { autofill: boolean }>["source"];
  visibility?: TableSetup["zones"][number]["visibility"];
  width: number;
  x: number;
  y: number;
}): TableSetup["zones"][number] {
  return {
    id: input.id,
    name: input.name,
    description: input.description ?? "",
    x: input.x,
    y: input.y,
    width: input.width,
    height: input.height,
    padding: input.padding ?? 8,
    size: input.size ?? "fixed",
    overflow: input.overflow ?? "hidden",
    capacity: input.capacity ?? null,
    layout: input.layout ?? "stack",
    ...(input.gap !== undefined ? { gap: input.gap } : {}),
    ...(input.columns !== undefined ? { columns: input.columns } : {}),
    visibility: input.visibility ?? "all",
    background: input.background ?? { type: "color", color: "#f8fafc" },
    border: {
      width: 1,
      color: "#64748b",
      ...input.border
    },
    autofill: true,
    childrenType: input.childrenType,
    face: input.face ?? "up",
    ...(input.source ? { source: input.source } : {})
  };
}

function createPlacement(input: {
  collectionId?: string;
  componentId?: string;
  id: string;
  face?: TableSetup["placements"][number]["face"];
  rotationDeg?: number;
  x: number;
  y: number;
}): TableSetup["placements"][number] {
  return {
    id: input.id,
    source: input.componentId
      ? { kind: "component", componentId: input.componentId }
      : { kind: "collection", collectionId: input.collectionId ?? "" },
    x: input.x,
    y: input.y,
    rotationDeg: input.rotationDeg ?? 0,
    face: input.face ?? "front"
  };
}

function projectParameters(overrides: Record<string, string>): ProjectParameter[] {
  return createDefaultProjectParameters().map((parameter) => ({
    ...parameter,
    value: overrides[parameter.key] ?? parameter.value
  }));
}
