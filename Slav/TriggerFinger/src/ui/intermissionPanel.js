import { getBulletDef, getSlotColor, getSlotName, isElapsePiece } from "../defs/bullets.js";
import { CHIP_TUNING } from "../defs/chips.js";
import { getEnemyDef } from "../defs/enemies.js";
import {
  elapseClasses,
  escapeHtml,
  renderBulletDescription,
  renderHighlightedText,
  renderInventory,
  renderMiniBullet,
  renderTimingStats,
  renderTrackEditor,
  timingLabel,
} from "./intermissionEditor.js";

function getHiddenStoreUids(track, candidateUid) {
  const candidate = candidateUid ? track.findPiece(candidateUid) : null;
  if (!candidate) {
    return new Set();
  }

  if (isElapsePiece(candidate) && candidate.groupId) {
    return new Set(track.getGroupPieces(candidate.groupId).map((piece) => piece.uid));
  }

  return new Set([candidate.uid]);
}

function getHiddenEditorUids(track, ...candidateUids) {
  return candidateUids.reduce((hidden, candidateUid) => {
    getHiddenStoreUids(track, candidateUid).forEach((uid) => hidden.add(uid));
    return hidden;
  }, new Set());
}

function getScrappableCount(track) {
  const seenGroups = new Set();
  return track.allPieces.filter((piece) => {
    if (isElapsePiece(piece) && piece.groupId) {
      if (seenGroups.has(piece.groupId)) {
        return false;
      }
      seenGroups.add(piece.groupId);
    }

    const groupSize = isElapsePiece(piece) && piece.groupId
      ? track.getGroupPieces(piece.groupId).length
      : 1;
    return track.allPieces.length - groupSize > 0;
  }).length;
}

function renderStoreChoice(choice, index, disabled) {
  if (choice.kind === "add-piece") {
    const def = getBulletDef(choice.bulletId);
    return `
      <button
        class="store-choice inventory-card ${disabled ? "is-disabled" : ""}"
        style="--piece-color:${def.color}"
        data-action="choice:${index}"
        ${disabled ? "disabled" : ""}
      >
        <span class="piece-copy">
          <strong>${choice.title}</strong>
          <small>${timingLabel(def.timing)} | lead ${def.leadBeats ?? 0} | follow ${def.followBeats ?? 0}</small>
          <small>${escapeHtml(choice.copy)}</small>
        </span>
        ${renderMiniBullet({ def, color: def.color, disabled: true })}
      </button>
    `;
  }

  return `
    <button class="store-choice choice-button ${disabled ? "is-disabled" : ""}" data-action="choice:${index}" ${disabled ? "disabled" : ""}>
      <span class="choice-name">${escapeHtml(choice.title)}</span>
      <span class="choice-copy">${escapeHtml(choice.copy)}</span>
    </button>
  `;
}

export function renderWhetstoneSlot(track, disabled, forgeCandidateUid = null) {
  const upgradeableCount = track.allPieces.filter((piece) => !piece.upgraded).length;
  const candidate = forgeCandidateUid ? track.findPiece(forgeCandidateUid) : null;
  const candidateDef = candidate ? getBulletDef(candidate.id) : null;
  const canForgeCandidate = Boolean(candidate && !candidate.upgraded && !disabled);
  const description = candidateDef
    ? renderHighlightedText(candidateDef.upgradeDescription, candidateDef.upgradeHighlight)
    : `${upgradeableCount > 0 ? `${upgradeableCount} bullet${upgradeableCount === 1 ? "" : "s"} can be upgraded` : "All bullets upgraded"}`;
  return `
    <div
      class="forgery-slot ${disabled || upgradeableCount === 0 ? "is-disabled" : ""} ${candidate ? "has-candidate" : ""}"
      data-forgery-drop
      ${canForgeCandidate ? `data-action="forge-candidate"` : ""}
    >
      <div class="forgery-slot-copy">
        <strong>${candidate ? `Hone ${escapeHtml(getSlotName(candidate))}` : "Whetstone Slot"}</strong>
        <small>${description}</small>
        ${candidate ? `<small>${canForgeCandidate ? "Click the panel to hone." : "No Whetstone pick available."}</small>` : ""}
      </div>
      <span class="forgery-socket">
        ${candidateDef
          ? renderMiniBullet({
              def: candidateDef,
              color: getSlotColor(candidate),
              uid: candidate.uid,
              source: "forge-candidate",
              disabled: true,
              upgraded: Boolean(candidate.upgraded),
              extraClasses: elapseClasses(candidate),
            }).replace("inventory-token-slot", "inventory-token-slot forgery-token-slot")
              .replace("data-piece-source=\"forge-candidate\"", "data-piece-source=\"forge-candidate\" data-forge-candidate-token")
          : "<span></span>"}
      </span>
    </div>
  `;
}

export const renderForgerySlot = renderWhetstoneSlot;

export function renderWreckerSlot(track, disabled, wreckerCandidateUid = null) {
  const scrappableCount = getScrappableCount(track);
  const candidate = wreckerCandidateUid ? track.findPiece(wreckerCandidateUid) : null;
  const candidateDef = candidate ? getBulletDef(candidate.id) : null;
  const groupSize = candidate && isElapsePiece(candidate) && candidate.groupId
    ? track.getGroupPieces(candidate.groupId).length
    : 1;
  const canWreckCandidate = Boolean(candidate && !disabled && track.allPieces.length - groupSize > 0);
  const description = candidateDef
    ? `Scraps into ${CHIP_TUNING.chipsPerScrap} inert chip${CHIP_TUNING.chipsPerScrap === 1 ? "" : "s"} for later systems.`
    : `${scrappableCount > 0 ? `${scrappableCount} bullet${scrappableCount === 1 ? "" : "s"} can be scrapped` : "Need at least one bullet left after scrapping"}`;

  return `
    <div
      class="forgery-slot wrecker-slot ${disabled || scrappableCount === 0 ? "is-disabled" : ""} ${candidate ? "has-candidate" : ""}"
      data-wrecker-drop
      ${canWreckCandidate ? `data-action="wreck-candidate"` : ""}
    >
      <div class="forgery-slot-copy">
        <strong>${candidate ? `Scrap ${escapeHtml(getSlotName(candidate))}` : "Wrecker Slot"}</strong>
        <small>${description}</small>
        ${candidate ? `<small>${canWreckCandidate ? "Click the panel to scrap." : "No Wrecker pick available."}</small>` : ""}
      </div>
      <span class="forgery-socket">
        ${candidateDef
          ? renderMiniBullet({
              def: candidateDef,
              color: getSlotColor(candidate),
              uid: candidate.uid,
              source: "wrecker-candidate",
              disabled: true,
              upgraded: Boolean(candidate.upgraded),
              extraClasses: elapseClasses(candidate),
            }).replace("inventory-token-slot", "inventory-token-slot forgery-token-slot")
              .replace("data-piece-source=\"wrecker-candidate\"", "data-piece-source=\"wrecker-candidate\" data-wrecker-candidate-token")
          : "<span></span>"}
      </span>
    </div>
  `;
}

function renderScrapChip(chip) {
  return `
    <button
      class="scrap-chip-token"
      draggable="true"
      style="--chip-color:${chip.color};--piece-color:${chip.color}"
      data-chip-uid="${chip.uid}"
      data-chip-source="inventory"
      aria-label="Drag ${escapeHtml(chip.sourceName)} chip"
      title="${escapeHtml(chip.sourceName)} chip"
    >
      <span class="scrap-chip-body"></span>
    </button>
  `;
}

function renderChipTray(scrapChips = []) {
  return `
    <div class="scrap-chip-tray">
      <div class="timeline-head">
        <span>Chips</span>
        <span>inert fragments</span>
      </div>
      <div class="scrap-chip-slot" data-chip-tray-drop>
        ${scrapChips.filter((chip) => !chip.hostUid).length
          ? scrapChips.filter((chip) => !chip.hostUid).map(renderScrapChip).join("")
          : `<p class="scrap-chip-empty">Scrap bullets at the Wrecker to collect chips.</p>`}
      </div>
    </div>
  `;
}

function renderEnemyDraftChoice(choice) {
  const def = getEnemyDef(choice.type);
  const kind = choice.kind ?? "enemy";
  return `
    <button
      class="store-choice choice-button enemy-draft-choice"
      style="--enemy-color:${choice.color ?? def.color}"
      data-action="enemy-choice:${kind}:${choice.type}"
    >
      <span class="choice-name">${choice.title}</span>
      <span class="choice-copy">${choice.copy ?? def.description}</span>
    </button>
  `;
}

export function renderIntermissionPanel({
  isFirst,
  waveIndex,
  track,
  choices,
  pendingUpgrade,
  storeOffer,
  storePicks = 0,
  bankedStorePicks = 0,
  forgeCandidateUid = null,
  wreckerCandidateUid = null,
  scrapChips = [],
  enemyDraft = null,
  debugTools = "",
  message = "",
}) {
  const hasStore = Boolean(storeOffer);
  const hasCredits = storePicks > 0;
  const hasEnemyDraft = Boolean(enemyDraft?.choices?.length);
  const draftKind = enemyDraft?.kind ?? enemyDraft?.choices?.[0]?.kind ?? "enemy";
  const hiddenEditorUids = getHiddenEditorUids(track, forgeCandidateUid, wreckerCandidateUid);
  const selected = track.findPiece(track.selectedUid);
  const selectedDef = selected ? getBulletDef(selected.id) : null;
  const selectedCopy = selected
    ? `${escapeHtml(getSlotName(selected))} | ${renderTimingStats(selected, selectedDef)} | ${renderBulletDescription(selected, selectedDef)}`
    : "Select a bullet to inspect it.";

  const choiceHtml = debugTools
    ? `
      <aside class="store-menu debug-menu">
        ${debugTools}
      </aside>
      `
    : hasEnemyDraft
    ? `
      <aside class="store-menu">
        <div class="store-header">
          <span>Woe</span>
          <small>${
            draftKind === "aspect"
              ? "Pick one unlocked special type to modify future copies."
              : "Pick one enemy type to add to future procedural waves."
          }</small>
          <small>${
            draftKind === "aspect"
              ? `${enemyDraft.aspectGrantors?.length ?? 0} spreading special${(enemyDraft.aspectGrantors?.length ?? 0) === 1 ? "" : "s"} active`
              : `${enemyDraft.unlocked.length - 1} special${enemyDraft.unlocked.length === 2 ? "" : "s"} active`
          }</small>
        </div>
        <div class="store-choice-list">
          ${enemyDraft.choices.map(renderEnemyDraftChoice).join("")}
        </div>
      </aside>
      `
    : hasStore
      ? `
      <aside class="store-menu">
        <div class="store-header">
          <span>${storeOffer?.store.name ?? "Store"}</span>
          <small>${storeOffer?.store.copy ?? "Pick one reward."}</small>
          <small>${storePicks} pick${storePicks === 1 ? "" : "s"} available${bankedStorePicks ? `, ${bankedStorePicks} banked` : ""}</small>
        </div>
        ${storeOffer.store.id === "whetstone"
          ? renderWhetstoneSlot(track, !hasCredits, forgeCandidateUid)
          : storeOffer.store.id === "wrecker"
          ? renderWreckerSlot(track, !hasCredits, wreckerCandidateUid)
          : `
            <div class="store-choice-list">
              ${choices
                .map((choice, index) => renderStoreChoice(choice, index, !hasCredits))
                .join("")}
              ${choices.length === 0 ? `<p class="inventory-empty">Store empty.</p>` : ""}
            </div>
          `}
        ${hasCredits ? `<button class="secondary-button" data-action="skip-store">Skip Store (+${storePicks} next)</button>` : ""}
      </aside>
      `
      : `
      <aside class="store-menu is-empty">
        <div class="store-header">
          <span>${isFirst ? "Ready Check" : "No Store"}</span>
          <small>${isFirst ? "Set your opening track." : "Edit the timeline or start the next wave."}</small>
        </div>
      </aside>
    `;

  return `
    <section class="upgrade-panel intermission-panel">
      <div class="upgrade-heading">
        <div>
          <h2>${isFirst ? "Ready Check" : `Wave ${waveIndex} Clear`}</h2>
          <p>${isFirst ? "Build the beat timeline, then start the first wave." : "Tune the timeline before the next wave."}</p>
        </div>
        <button class="secondary-button" data-action="menu">Menu</button>
      </div>
      <div class="intermission-shell">
        ${choiceHtml}
        <section class="editor-tab" data-inventory-drop>
          <p class="selected-copy">${message || selectedCopy}</p>
          ${renderTrackEditor(track, hiddenEditorUids, scrapChips)}
          ${renderInventory(track, hiddenEditorUids)}
          ${renderChipTray(scrapChips)}
        </section>
      </div>
      <div class="upgrade-actions">
        ${debugTools
          ? `<button class="secondary-button" data-debug-action="toggle-panel">Close Debug</button>`
          : `<button class="primary-button" data-action="start-wave" ${track.placements.length === 0 || hasCredits || hasEnemyDraft ? "disabled" : ""}>Start Wave ${waveIndex + 1}</button>`}
      </div>
    </section>
  `;
}

export function renderGameOverPanel(score, waveIndex) {
  return `
    <section class="upgrade-panel">
      <div class="upgrade-heading">
        <div>
          <h2>Run Over</h2>
          <p>Score ${Math.round(score)}. Cleared ${waveIndex} wave${waveIndex === 1 ? "" : "s"}.</p>
        </div>
        <button class="secondary-button" data-action="menu">Menu</button>
      </div>
      <div class="upgrade-actions">
        <button class="primary-button" data-action="menu">Done</button>
      </div>
    </section>
  `;
}
