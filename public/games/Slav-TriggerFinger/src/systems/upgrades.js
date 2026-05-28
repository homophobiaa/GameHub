import { BULLET_POOL, getBulletDef } from "../defs/bullets.js";
import { MAX_TRACK_MARGIN_LEVEL, STARTING_PLATING } from "../config/gameplay.js";
import { MAX_COMBO_CAP } from "./timing.js";
import { pickRandom } from "../utils/random.js";

const STORE_DEFS = {
  warehouse: {
    id: "warehouse",
    name: "Warehouse",
    copy: "Pick a new bullet to add to your arsenal.",
  },
  whetstone: {
    id: "whetstone",
    name: "Whetstone",
    copy: "Hone one bullet you currently own.",
  },
  wrecker: {
    id: "wrecker",
    name: "Wrecker",
    copy: "Scraps bullets into chunks that can give their effect to another bullet.",
  },
  workshop: {
    id: "workshop",
    name: "Workshop",
    copy: "Tune the run itself.",
  },
};
export const STORE_CYCLE = [
  "warehouse",
  "workshop",
  "whetstone",
  "warehouse",
  "workshop",
  "wrecker",
];

function createWarehouseChoices() {
  return pickRandom(BULLET_POOL, 3).map((id) => ({
    kind: "add-piece",
    bulletId: id,
    title: `Add ${getBulletDef(id).name}`,
    copy: getBulletDef(id).description,
  }));
}

function getUpgradeablePieces(track) {
  return track.allPieces.filter((piece) => !piece.upgraded);
}

function getScrappablePieces(track) {
  const seenGroups = new Set();
  return track.allPieces.filter((piece) => {
    if (piece.groupId) {
      if (seenGroups.has(piece.groupId)) {
        return false;
      }
      seenGroups.add(piece.groupId);
    }

    const groupSize = piece.groupId
      ? track.getGroupPieces(piece.groupId).length
      : 1;
    return track.allPieces.length - groupSize > 0;
  });
}

function createSlotStoreChoices() {
  return [];
}

function createWorkshopChoices(track, runState = {}) {
  const rotatingChoices = [];

  if (track.cycleBeats < 12) {
    rotatingChoices.push({
      kind: "expand",
      beats: 0.5,
      title: "+0.5 Beat",
      copy: "Adds a half-beat to the track timeline.",
    });
  }

  if ((track.marginLevel ?? 0) < MAX_TRACK_MARGIN_LEVEL) {
    rotatingChoices.push({
      kind: "margin",
      amount: 1,
      title: "+1 Margin",
      copy: "Adds half a beat of domain space before and after the timeline.",
    });
  }

  const comboCap = runState.comboCap ?? 1.5;
  if (comboCap < MAX_COMBO_CAP) {
    const amount = Math.min(0.25, MAX_COMBO_CAP - comboCap);
    rotatingChoices.push({
      kind: "combo-cap",
      amount,
      title: "+0.25 Combo Cap",
      copy: `Raises max combo to x${(comboCap + amount).toFixed(2)}.`,
    });
  }

  rotatingChoices.push({
    kind: "shockwave",
    amount: 1,
    title: "+1 Shockwave",
    copy: "Adds one rechargeable shockwave for enemies near the base.",
  });

  return [
    {
      kind: "repair",
      amount: 3,
      title: "+3 Plating",
      copy: "Raises wave-start plating by three.",
    },
    ...pickRandom(rotatingChoices, 2),
  ];
}

function createChoicesForStore(storeId, track, runState) {
  if (storeId === "warehouse") {
    return createWarehouseChoices(track, runState);
  }

  if (storeId === "whetstone" || storeId === "wrecker") {
    return createSlotStoreChoices(track, runState);
  }

  return createWorkshopChoices(track, runState);
}

function createOfferForStore(store, track, runState) {
  return {
    store,
    choices: createChoicesForStore(store.id, track, runState),
    upgradeableCount: store.id === "whetstone" ? getUpgradeablePieces(track).length : 0,
    scrappableCount: store.id === "wrecker" ? getScrappablePieces(track).length : 0,
  };
}

function canUseOffer(offer) {
  if (offer.store.id === "whetstone") {
    return offer.upgradeableCount > 0;
  }

  if (offer.store.id === "wrecker") {
    return offer.scrappableCount > 0;
  }

  return offer.choices.length > 0;
}

export function createStoreOffer(track, runState = {}) {
  const forcedStore = STORE_DEFS[runState.forceStoreId];
  if (forcedStore) {
    return createOfferForStore(forcedStore, track, runState);
  }

  const cycleIndex = Number.isInteger(runState.storeCycleIndex)
    ? runState.storeCycleIndex
    : 0;

  for (let offset = 0; offset < STORE_CYCLE.length; offset += 1) {
    const store = STORE_DEFS[STORE_CYCLE[(cycleIndex + offset) % STORE_CYCLE.length]];
    const offer = createOfferForStore(store, track, runState);
    if (canUseOffer(offer)) {
      return {
        ...offer,
        cycleAdvance: offset + 1,
      };
    }
  }

  return {
    ...createOfferForStore(STORE_DEFS.warehouse, track, runState),
    cycleAdvance: 1,
  };
}

export function applyUpgradeChoice(track, choice, runState = {}) {
  if (choice.kind === "add-piece") {
    track.addInventoryPiece(choice.bulletId);
  }

  if (choice.kind === "upgrade") {
    track.upgradePiece(choice.uid);
  }

  if (choice.kind === "expand") {
    track.expandCycle(choice.beats ?? 1);
  }

  if (choice.kind === "margin") {
    track.expandMargin(choice.amount ?? 1);
  }

  if (choice.kind === "combo-cap") {
    runState.comboCap = Math.min(MAX_COMBO_CAP, (runState.comboCap ?? 1.5) + (choice.amount ?? 0.25));
  }

  if (choice.kind === "repair") {
    runState.maxPlating = (runState.maxPlating ?? runState.plating ?? STARTING_PLATING) + (choice.amount ?? 3);
    runState.plating = runState.maxPlating;
  }

  if (choice.kind === "shockwave") {
    runState.maxShockwaves = (runState.maxShockwaves ?? runState.shockwaves ?? 0) + (choice.amount ?? 1);
    runState.shockwaves = runState.maxShockwaves;
  }
}
