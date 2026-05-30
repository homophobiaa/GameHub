import { getBulletDef, getElapseHalf, getSlotColor, getSlotName, isElapsePiece } from "../defs/bullets.js";
import { CHIP_TUNING, getChunkCountForSource } from "../defs/chips.js";
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

function getStoreCandidateName(candidate) {
  if (isElapsePiece(candidate)) {
    const def = getBulletDef("elapse");
    return candidate.upgraded ? def.upgradeName : def.name;
  }

  return getSlotName(candidate);
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

function addTokenClass(html, className) {
  return html.replace("inventory-token-slot", `inventory-token-slot ${className}`);
}

function addCandidateTokenAttr(html, source, tokenAttr) {
  return html.replace(`data-piece-source="${source}"`, `data-piece-source="${source}" ${tokenAttr}`);
}

function renderSlotCandidateToken({ piece, source, tokenAttr }) {
  const def = getBulletDef(piece.id);
  return addCandidateTokenAttr(
    addTokenClass(
      renderMiniBullet({
        def,
        color: getSlotColor(piece),
        uid: piece.uid,
        source,
        disabled: true,
        upgraded: Boolean(piece.upgraded),
        extraClasses: elapseClasses(piece),
      }),
      "slot-store-token-slot",
    ),
    source,
    tokenAttr,
  );
}

function renderSlotCandidateVisual({ track, candidate, source, tokenAttr }) {
  if (!candidate) {
    return `<span class="slot-store-placeholder"></span>`;
  }

  if (isElapsePiece(candidate) && candidate.groupId) {
    const group = track.getGroupPieces(candidate.groupId);
    const left = group.find((piece) => getElapseHalf(piece) === "left");
    const right = group.find((piece) => getElapseHalf(piece) === "right");
    const renderHalf = (piece) => piece
      ? renderSlotCandidateToken({ piece, source, tokenAttr })
      : "";

    return `
      <span class="elapse-token-pair slot-store-elapse-pair">
        ${renderHalf(left)}
        ${renderHalf(right)}
      </span>
    `;
  }

  return renderSlotCandidateToken({ piece: candidate, source, tokenAttr });
}

export function renderWhetstoneSlot(track, disabled, whetstoneCandidateUid = null) {
  const upgradeableCount = track.allPieces.filter((piece) => !piece.upgraded).length;
  const candidate = whetstoneCandidateUid ? track.findPiece(whetstoneCandidateUid) : null;
  const candidateDef = candidate ? getBulletDef(candidate.id) : null;
  const canHoneCandidate = Boolean(candidate && !candidate.upgraded && !disabled);
  const description = candidateDef
    ? renderHighlightedText(candidateDef.upgradeDescription, candidateDef.upgradeHighlight)
    : `${upgradeableCount > 0 ? `${upgradeableCount} bullet${upgradeableCount === 1 ? "" : "s"} can be upgraded` : "All bullets upgraded"}`;
  return `
    <div
      class="slot-store whetstone-slot ${disabled || upgradeableCount === 0 ? "is-disabled" : ""} ${candidate ? "has-candidate" : ""}"
      data-whetstone-drop
      ${canHoneCandidate ? `data-action="hone-candidate"` : ""}
    >
      <div class="slot-store-copy">
        <strong>${candidate ? `Hone ${escapeHtml(getStoreCandidateName(candidate))}` : "Whetstone Slot"}</strong>
        <small>${description}</small>
        ${candidate ? `<small>${canHoneCandidate ? "Click the panel to hone." : "No Whetstone pick available."}</small>` : ""}
      </div>
      <span class="slot-store-socket ${isElapsePiece(candidate) ? "is-elapse-socket" : ""}">
        ${candidateDef
          ? renderSlotCandidateVisual({
              track,
              candidate,
              source: "whetstone-candidate",
              tokenAttr: "data-whetstone-candidate-token",
            })
          : `<span class="slot-store-placeholder"></span>`}
      </span>
    </div>
  `;
}

export function renderWreckerSlot(track, disabled, wreckerCandidateUid = null) {
  const scrappableCount = getScrappableCount(track);
  const candidate = wreckerCandidateUid ? track.findPiece(wreckerCandidateUid) : null;
  const candidateDef = candidate ? getBulletDef(candidate.id) : null;
  const groupSize = candidate && isElapsePiece(candidate) && candidate.groupId
    ? track.getGroupPieces(candidate.groupId).length
    : 1;
  const canWreckCandidate = Boolean(candidate && !disabled && track.allPieces.length - groupSize > 0);
  const chunkCount = candidate ? getChunkCountForSource(candidate.id) : CHIP_TUNING.chipsPerScrap;
  const description = candidateDef
    ? `scraps into ${chunkCount} chunk${chunkCount === 1 ? "" : "s"} that can give its effect to another bullet.`
    : `${scrappableCount > 0 ? `${scrappableCount} bullet${scrappableCount === 1 ? "" : "s"} can be scrapped` : "Need at least one bullet left after scrapping"}`;

  return `
    <div
      class="slot-store wrecker-slot ${disabled || scrappableCount === 0 ? "is-disabled" : ""} ${candidate ? "has-candidate" : ""}"
      data-wrecker-drop
      ${canWreckCandidate ? `data-action="wreck-candidate"` : ""}
    >
      <div class="slot-store-copy">
        <strong>${candidate ? `Scrap ${escapeHtml(getStoreCandidateName(candidate))}` : "Wrecker Slot"}</strong>
        <small>${description}</small>
        ${candidate ? `<small>${canWreckCandidate ? "Click the panel to scrap." : "No Wrecker pick available."}</small>` : ""}
      </div>
      <span class="slot-store-socket ${isElapsePiece(candidate) ? "is-elapse-socket" : ""}">
        ${candidateDef
          ? renderSlotCandidateVisual({
              track,
              candidate,
              source: "wrecker-candidate",
              tokenAttr: "data-wrecker-candidate-token",
            })
          : `<span class="slot-store-placeholder"></span>`}
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
      aria-label="Drag ${escapeHtml(chip.sourceName)} chunk"
      title="${escapeHtml(chip.sourceName)} chunk"
    >
      <span class="scrap-chip-body"></span>
    </button>
  `;
}

function renderChipTray(scrapChips = []) {
  return `
    <div class="scrap-chip-tray">
      <div class="timeline-head">
        <span>Chunks</span>
        <span>inert fragments</span>
      </div>
      <div class="scrap-chip-slot" data-chip-tray-drop>
        ${scrapChips.filter((chip) => !chip.hostUid).length
          ? scrapChips.filter((chip) => !chip.hostUid).map(renderScrapChip).join("")
          : `<p class="scrap-chip-empty">Scrap bullets at the Wrecker to collect chunks.</p>`}
      </div>
    </div>
  `;
}

function renderWoeChoice(choice) {
  const def = getEnemyDef(choice.type);
  const kind = choice.kind ?? "enemy";
  return `
    <button
      class="store-choice choice-button woe-choice"
      style="--enemy-color:${choice.color ?? def.color}"
      data-action="woe-choice:${kind}:${choice.type}"
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
  whetstoneCandidateUid = null,
  wreckerCandidateUid = null,
  scrapChips = [],
  woeDraft = null,
  debugTools = "",
  message = "",
  tutorial = null,
}) {
  const hasStore = Boolean(storeOffer);
  const hasCredits = storePicks > 0;
  const hasWoeDraft = Boolean(woeDraft?.choices?.length);
  const draftKind = woeDraft?.kind ?? woeDraft?.choices?.[0]?.kind ?? "enemy";
  const hiddenEditorUids = getHiddenEditorUids(track, whetstoneCandidateUid, wreckerCandidateUid);
  const selected = track.findPiece(track.selectedUid);
  const selectedDef = selected ? getBulletDef(selected.id) : null;
  const selectedCopy = selected
    ? `${escapeHtml(getSlotName(selected))} | ${renderTimingStats(selected, selectedDef)} | ${renderBulletDescription(selected, selectedDef)}`
    : "Select a bullet to inspect it.";
  const isReadyCheck = isFirst && !debugTools && !hasStore && !hasWoeDraft;
  const tutorialNotes = tutorial?.enabled && tutorial.notes?.length
    ? `
      <div class="tutorial-note-list">
        ${tutorial.notes.map((note) => `<p>${escapeHtml(note)}</p>`).join("")}
      </div>
    `
    : "";

  const choiceHtml = isReadyCheck
    ? ""
    : debugTools
    ? `
      <aside class="store-menu debug-menu">
        ${debugTools}
      </aside>
      `
    : hasWoeDraft
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
              ? `${woeDraft.aspectGrantors?.length ?? 0} spreading special${(woeDraft.aspectGrantors?.length ?? 0) === 1 ? "" : "s"} active`
              : `${woeDraft.unlocked.length - 1} special${woeDraft.unlocked.length === 2 ? "" : "s"} active`
          }</small>
        </div>
        <div class="store-choice-list">
          ${woeDraft.choices.map(renderWoeChoice).join("")}
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
          ? renderWhetstoneSlot(track, !hasCredits, whetstoneCandidateUid)
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
    <section class="upgrade-panel intermission-panel ${isReadyCheck ? "is-ready-check" : ""}">
      <div class="upgrade-heading">
        <div>
          <h2>${isFirst ? "Ready Check" : `Wave ${waveIndex} Clear`}</h2>
          <p>${isFirst ? "Build the beat timeline, then start the first wave." : "Tune the timeline before the next wave."}</p>
        </div>
        <button class="secondary-button" data-action="menu">Menu</button>
      </div>
      <div class="intermission-shell ${isReadyCheck ? "is-ready-check" : ""}">
        ${choiceHtml}
        <section class="editor-tab ${isReadyCheck ? "is-ready-check" : ""}" data-inventory-drop>
          ${tutorialNotes}
          ${isReadyCheck ? "" : `<p class="selected-copy">${message || selectedCopy}</p>`}
          ${renderTrackEditor(track, hiddenEditorUids, scrapChips)}
          ${renderInventory(track, hiddenEditorUids)}
          ${isReadyCheck ? "" : renderChipTray(scrapChips)}
        </section>
      </div>
      <div class="upgrade-actions">
        ${debugTools
          ? `<button class="secondary-button" data-debug-action="toggle-panel">Close Debug</button>`
          : `<button class="primary-button" data-action="start-wave" ${track.placements.length === 0 || hasCredits || hasWoeDraft ? "disabled" : ""}>Start Wave ${waveIndex + 1}</button>`}
      </div>
    </section>
  `;
}

export function renderGameOverPanel(score, waveIndex, scoreSave = null) {
  const scoreLine = scoreSave
    ? `${scoreSave.tag} | ${scoreSave.isNewBest ? "New best" : "Best"} ${scoreSave.best}`
    : "";
  return `
    <section class="upgrade-panel">
      <div class="upgrade-heading">
        <div>
          <h2>Run Over</h2>
          <p>Score ${Math.round(score)}. Cleared ${waveIndex} wave${waveIndex === 1 ? "" : "s"}.</p>
          ${scoreLine ? `<p>${scoreLine}</p>` : ""}
        </div>
        <button class="secondary-button" data-action="menu">Menu</button>
      </div>
      <div class="upgrade-actions">
        <button class="primary-button" data-action="menu">Done</button>
      </div>
    </section>
  `;
}
