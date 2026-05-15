import {
  getBulletDef,
  getElapseHalf,
  getSlotColor,
  getSlotFollowBeats,
  getSlotName,
  isElapsePiece,
} from "../defs/bullets.js";
import { getEnemyDef } from "../defs/enemies.js";
import { getTimelineDomainMetrics, timelineLeft } from "./timelineMetrics.js";

function timingLabel(timing) {
  if (timing === "beat") {
    return "on";
  }

  if (timing === "offbeat") {
    return "off";
  }

  return "on/off";
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderHighlightedText(text, highlight) {
  const safeText = String(text ?? "");
  const marker = String(highlight ?? "");
  if (!marker || !safeText.includes(marker)) {
    return escapeHtml(safeText);
  }

  const index = safeText.indexOf(marker);
  return [
    escapeHtml(safeText.slice(0, index)),
    `<span class="upgrade-highlight">${escapeHtml(marker)}</span>`,
    escapeHtml(safeText.slice(index + marker.length)),
  ].join("");
}

function renderTimingStats(piece, def) {
  const follow = getSlotFollowBeats(piece);
  const text = `${timingLabel(def.timing)} | lead ${def.leadBeats ?? 0} | follow ${follow}`;
  if (piece.upgraded && piece.id === "pair") {
    return renderHighlightedText(text, "follow 0");
  }

  return escapeHtml(text);
}

function renderBulletDescription(piece, def) {
  if (piece.upgraded && def.upgradeDescription) {
    return renderHighlightedText(def.upgradeDescription, def.upgradeHighlight);
  }

  return escapeHtml(def.description ?? "");
}

function timingClass(def) {
  return `is-timing-${def.timing}`;
}

function elapseClasses(piece) {
  if (!isElapsePiece(piece)) {
    return "";
  }

  return `is-elapse-half is-elapse-${getElapseHalf(piece)}`;
}

function renderBulletGlyph(def) {
  return `
    <span class="bullet-glyph ${timingClass(def)}">
      <span class="bullet-glyph-main"></span>
    </span>
  `;
}

function renderMiniBullet({
  def,
  color,
  draggable = false,
  uid = "",
  source = "inventory",
  disabled = false,
  upgraded = false,
  extraClasses = "",
  domainMetrics,
}) {
  const style = `--piece-color:${color}`;
  const domainAttrs = domainMetrics
    ? `data-domain-width="${domainMetrics.width}" data-domain-offset="${domainMetrics.offset}"`
    : "";
  const classes = [
    "inventory-token",
    timingClass(def),
    extraClasses,
    upgraded ? "is-upgraded" : "",
    disabled ? "is-disabled" : "",
  ]
    .filter(Boolean)
    .join(" ");
  const token = draggable
    ? `
        <button
          class="${classes}"
          draggable="true"
          style="${style}"
          data-piece-uid="${uid}"
          data-piece-source="${source}"
          ${domainAttrs}
          data-action="select-piece:${uid}"
          aria-label="Drag bullet"
        >
          ${renderBulletGlyph(def)}
        </button>
      `
    : `
        <span
          class="${classes}"
          style="${style}"
          ${uid ? `data-piece-uid="${uid}" data-piece-source="${source}"` : ""}
          ${domainAttrs}
        >
          ${renderBulletGlyph(def)}
        </span>
      `;

  return `
    <span class="inventory-token-slot">
      ${token}
    </span>
  `;
}

function renderBulletCard({ piece, domainMetrics, onTrack = false, action = "", choiceIndex = null, disabled = false }) {
  const def = piece.def ?? getBulletDef(piece.id);
  const name = piece.name ?? getSlotName(piece);
  const color = piece.color ?? getSlotColor(piece);
  const classes = [
    "inventory-card",
    onTrack ? "is-on-track" : "",
    piece.upgraded ? "is-upgraded" : "",
    disabled ? "is-disabled" : "",
  ]
    .filter(Boolean)
    .join(" ");
  const actionAttr = action ? `data-action="${action}:${choiceIndex}"` : `data-action="select-piece:${piece.uid}"`;
  const buttonDisabled = disabled ? "disabled" : "";

  return `
    <div class="${classes}" style="--piece-color:${color}">
      <button class="inventory-card-main" ${actionAttr} ${buttonDisabled}>
        <span class="piece-copy">
          <strong>${name}</strong>
          <small>${renderTimingStats(piece, def)}</small>
          <small>${renderBulletDescription(piece, def)}</small>
        </span>
      </button>
      ${renderMiniBullet({
        def,
        color,
        draggable: !onTrack && !disabled && Boolean(piece.uid),
        uid: piece.uid,
        source: "inventory",
        disabled: onTrack || disabled,
        upgraded: Boolean(piece.upgraded),
        extraClasses: elapseClasses(piece),
        domainMetrics,
      })}
    </div>
  `;
}

function renderElapseInventoryCard(track, pieces) {
  const left = pieces.find((piece) => getElapseHalf(piece) === "left");
  const right = pieces.find((piece) => getElapseHalf(piece) === "right");
  const representative = left ?? right;
  const def = getBulletDef("elapse");
  const inventoryIds = new Set(track.inventory.map((piece) => piece.uid));
  const allOnTrack = pieces.every((piece) => !inventoryIds.has(piece.uid));
  const upgraded = pieces.some((piece) => piece.upgraded);
  const classes = [
    "inventory-card",
    "is-elapse-card",
    allOnTrack ? "is-on-track" : "",
    upgraded ? "is-upgraded" : "",
  ].filter(Boolean).join(" ");
  const renderHalf = (piece) => {
    if (!piece) {
      return "";
    }

    const halfDef = getBulletDef(piece.id);
    const inInventory = inventoryIds.has(piece.uid);
    return renderMiniBullet({
      def: halfDef,
      color: getSlotColor(piece),
      draggable: inInventory,
      uid: piece.uid,
      source: "inventory",
      disabled: !inInventory,
      upgraded: Boolean(piece.upgraded),
      extraClasses: elapseClasses(piece),
      domainMetrics: getTimelineDomainMetrics(
        track.getDomain(piece, 0.5),
        track.cycleBeats,
        0.5,
      ),
    });
  };

  return `
    <div class="${classes}" style="--piece-color:${def.color}">
      <button class="inventory-card-main" data-action="select-piece:${representative?.uid ?? ""}">
        <span class="piece-copy">
          <strong>${def.name}</strong>
          <small>off | lead 0.5 | follow 0.5</small>
          <small>${upgraded
            ? renderHighlightedText(def.upgradeDescription, def.upgradeHighlight)
            : escapeHtml(def.description)
          }</small>
        </span>
      </button>
      <span class="elapse-token-pair">
        ${renderHalf(left)}
        ${renderHalf(right)}
      </span>
    </div>
  `;
}

function renderTrackEditor(track) {
  const placementViews = track.getPlacementViews();
  const marks = track
    .getTimelineMarks()
    .map(
      (mark) => `
        <span class="timeline-mark ${mark.isBeat ? "is-beat" : "is-off"}" style="left:${timelineLeft(mark.beat, track.cycleBeats)}%">
          ${mark.isBeat ? `<span>${mark.beat}</span>` : ""}
        </span>
      `,
    )
    .join("");

  const drops = track
    .getTimelineMarks()
    .map(
      (mark) => `
        <button
          class="timeline-drop"
          style="left:${timelineLeft(mark.beat, track.cycleBeats)}%"
          data-drop-beat="${mark.beat}"
          aria-label="Place at beat ${mark.beat}"
        ></button>
      `,
    )
    .join("");

  const elapseGroups = new Map();
  placementViews.forEach((entry) => {
    if (!isElapsePiece(entry) || !entry.groupId) {
      return;
    }

    const group = elapseGroups.get(entry.groupId) ?? {};
    group[getElapseHalf(entry)] = entry;
    elapseGroups.set(entry.groupId, group);
  });
  const elapseLinks = [...elapseGroups.values()]
    .map((group) => {
      const left = group.left;
      const right = group.right;
      if (!left || !right || right.position <= left.position) {
        return "";
      }

      const leftPercent = timelineLeft(left.position, track.cycleBeats);
      const rightPercent = timelineLeft(right.position, track.cycleBeats);
      return `
        <span
          class="timeline-elapse-link ${left.elapseActive && right.elapseActive ? "" : "is-elapse-inactive"}"
          style="left:${leftPercent}%;width:${rightPercent - leftPercent}%;--piece-color:${left.color}"
        ></span>
      `;
    })
    .join("");

  const placements = placementViews
    .map((entry) => {
      const bulletLeft = timelineLeft(entry.position, track.cycleBeats);
      const domainMetrics = getTimelineDomainMetrics(entry.domain, track.cycleBeats, entry.position);
      const selected = entry.uid === track.selectedUid ? " is-selected" : "";
      const pieceClasses = [
        timingClass(entry.def),
        elapseClasses(entry),
        entry.elapseActive ? "" : "is-elapse-inactive",
        entry.upgraded ? "is-upgraded" : "",
        selected,
      ].filter(Boolean).join(" ");
      return `
        <span
          class="timeline-domain ${entry.elapseActive ? "" : "is-elapse-inactive"}"
          style="left:${domainMetrics.left}%;width:${domainMetrics.width}%;--piece-color:${entry.color}"
        ></span>
        <button
          class="timeline-piece ${pieceClasses}"
          draggable="true"
          style="left:${bulletLeft}%;--piece-color:${entry.color}"
          data-piece-uid="${entry.uid}"
          data-piece-source="track"
          data-domain-width="${domainMetrics.width}"
          data-domain-offset="${domainMetrics.offset}"
          data-action="select-piece:${entry.uid}"
          title="${entry.name} | ${timingLabel(entry.def.timing)} beat"
        >
          ${renderBulletGlyph(entry.def)}
        </button>
      `;
    })
    .join("");

  return `
    <div class="timeline-editor" data-timeline>
      <div class="timeline-head">
        <span>Track</span>
        <span>${track.cycleBeats} beats</span>
      </div>
      <div class="timeline-body">
        ${marks}
        ${drops}
        ${elapseLinks}
        ${placements}
      </div>
    </div>
  `;
}

function renderInventory(track) {
  const inventoryIds = new Set(track.inventory.map((piece) => piece.uid));
  const owned = track.allPieces.map((piece) => ({
    ...piece,
    def: getBulletDef(piece.id),
    name: getSlotName(piece),
    color: getSlotColor(piece),
  }));
  const renderedElapseGroups = new Set();
  const contents = owned.length
    ? owned
        .map((piece) => {
          if (isElapsePiece(piece) && piece.groupId) {
            if (renderedElapseGroups.has(piece.groupId)) {
              return "";
            }

            renderedElapseGroups.add(piece.groupId);
            return renderElapseInventoryCard(
              track,
              owned.filter((candidate) => candidate.groupId === piece.groupId),
            );
          }

          return renderBulletCard({
            piece,
            domainMetrics: getTimelineDomainMetrics(track.getDomain(piece, 0), track.cycleBeats, 0),
            onTrack: !inventoryIds.has(piece.uid),
          });
        })
        .join("")
    : `<p class="inventory-empty">Inventory empty.</p>`;

  return `
    <div class="inventory-panel" data-inventory-drop>
      <div class="timeline-head">
        <span>Inventory</span>
        <span>drag bullets here to remove them</span>
      </div>
      <div class="inventory-list">${contents}</div>
    </div>
  `;
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

export function renderForgerySlot(track, disabled, forgeCandidateUid = null) {
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
        <strong>${candidate ? `Forge ${escapeHtml(getSlotName(candidate))}` : "Forgery Slot"}</strong>
        <small>${description}</small>
        ${candidate ? `<small>${canForgeCandidate ? "Click the panel to upgrade." : "No forge pick available."}</small>` : ""}
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

function renderEnemyDraftChoice(choice) {
  const def = getEnemyDef(choice.type);
  return `
    <button
      class="store-choice choice-button enemy-draft-choice"
      style="--enemy-color:${choice.color ?? def.color}"
      data-action="enemy-choice:${choice.type}"
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
  enemyDraft = null,
  debugTools = "",
  message = "",
}) {
  const hasStore = Boolean(storeOffer);
  const hasCredits = storePicks > 0;
  const hasEnemyDraft = Boolean(enemyDraft?.choices?.length);
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
          <span>Enemy Pool</span>
          <small>Pick one enemy type to add to future procedural waves.</small>
          <small>${enemyDraft.unlocked.length - 1} special${enemyDraft.unlocked.length === 2 ? "" : "s"} active</small>
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
        ${storeOffer.store.id === "forgery"
          ? renderForgerySlot(track, !hasCredits, forgeCandidateUid)
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
          ${renderTrackEditor(track)}
          ${renderInventory(track)}
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
