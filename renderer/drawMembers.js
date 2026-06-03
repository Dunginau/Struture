/**
 * drawMembers.js — renders truss members.
 *
 * Solved state: coloured line + T/C arrows + force pill label
 * showAngles:   arc-and-reference-line angle notation at the lower joint
 * showLengths:  length label on the member line
 */

import state from '../ui/state.js';

const COLOR_UNSOLVED    = '#3f4e70';
const COLOR_TENSION     = '#3958ab';
const COLOR_COMPRESSION = '#a03945';
const LABEL_BG_T        = '#bed3ffc8';
const LABEL_BG_C        = '#ffb2c7b8';
const COLOR_ANGLE       = '#c8a96e';
const COLOR_LENGTH      = '#151921';
const LABEL_BG_LENGTH   = '#33374100';

export function drawMembers(ctx, truss, worldToScreen) {
    for (const member of truss.members) {
        const jA = truss.getJoint(member.jointA);
        const jB = truss.getJoint(member.jointB);
        if (!jA || !jB) continue;

        const sA    = worldToScreen(jA.x, jA.y);
        const sB    = worldToScreen(jB.x, jB.y);
        const color = memberColor(member.force);

        // ── Member line ───────────────────────────────────────
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(sA.x, sA.y);
        ctx.lineTo(sB.x, sB.y);
        ctx.strokeStyle = color;
        ctx.lineWidth   = member.force !== null ? 2.5 : 1.5;
        ctx.stroke();
        ctx.restore();

        // ── Length label ──────────────────────────────────────
        if (state.showLengths) {
            drawLengthLabel(ctx, jA, jB, sA, sB);
        }

        // ── Angle notation ────────────────────────────────────
        if (state.showAngles) {
            drawAngleNotation(ctx, jA, jB, worldToScreen);
        }

        if (member.force === null) continue;

        // ── T/C arrows ────────────────────────────────────────
        drawForceArrows(ctx, sA, sB, member.force, color);

        // ── Force pill label ──────────────────────────────────
        drawForceLabel(ctx, sA, sB, member.force, color);
    }
}

// ── Angle notation ────────────────────────────────────────────
//
// Draws an engineering angle symbol at the lower joint (smaller world Y):
//   • A short horizontal reference line extending away from the member
//   • An arc sweeping from the horizontal to the member
//   • The angle value (°) positioned inside the arc
//
// Convention: angle is always from the positive x-axis, [0°, 180°).
// For horizontal members (dy ≈ 0) nothing is drawn.

function drawAngleNotation(ctx, jA, jB, worldToScreen) {
    // Identify lower joint (smaller world Y = physically lower)
    const [jLow, jHigh] = jA.y <= jB.y ? [jA, jB] : [jB, jA];

    const dx = jHigh.x - jLow.x;   // world, may be negative
    const dy = jHigh.y - jLow.y;   // world, always >= 0

    if (Math.abs(dy) < 1e-6) return; // horizontal member — skip

    // World-space angle from +x axis (always in (0°, 180°))
    const angleRad = Math.atan2(dy, dx);
    const angleDeg = angleRad * 180 / Math.PI;

    // Corner on screen
    const corner = worldToScreen(jLow.x, jLow.y);

    // Screen-space direction from lower to upper joint:
    //   screen dx = world dx (x-axis same)
    //   screen dy = -world dy  (y-axis flipped: world up = screen up)
    const screenAngle = Math.atan2(-dy, dx); // always in (-π, 0)

    const arcR    = 28;
    const lineLen = arcR + 10;

    ctx.save();
    ctx.strokeStyle = COLOR_ANGLE;
    ctx.fillStyle   = COLOR_ANGLE;
    ctx.lineWidth   = 1;

    // ── Horizontal reference line ─────────────────────────────
    // Extends in the same x-direction as the member to keep it tidy.
    const refDir = dx >= 0 ? 1 : -1; // right for right-going, left for left-going
    ctx.beginPath();
    ctx.moveTo(corner.x, corner.y);
    ctx.lineTo(corner.x + refDir * lineLen, corner.y);
    ctx.stroke();

    // ── Arc from horizontal reference to the member ───────────
    //
    // Right-going (dx >= 0):
    //   screenAngle ∈ (-π/2, 0)  →  arc from 0 CCW to screenAngle (sweeps upward)
    //   anticlockwise = true
    //
    // Left-going (dx < 0):
    //   screenAngle ∈ (-π, -π/2)  →  arc from π CW to (screenAngle + 2π) (sweeps upward-left)
    //   anticlockwise = false
    //
    let arcStart, arcEnd, arcCCW, bisect;

    if (refDir >= 0) {
        arcStart = 0;
        arcEnd   = screenAngle;       // negative → in the upper screen quadrant
        arcCCW   = true;
        bisect   = screenAngle / 2;   // midpoint, in upper-right area
    } else {
        arcStart = Math.PI;
        arcEnd   = screenAngle + 2 * Math.PI;  // brings (-π,−π/2) into (π, 3π/2)
        arcCCW   = false;
        bisect   = (Math.PI + arcEnd) / 2;     // midpoint in upper-left area
    }

    ctx.beginPath();
    ctx.arc(corner.x, corner.y, arcR, arcStart, arcEnd, arcCCW);
    ctx.stroke();

    // ── Degree label inside the arc ───────────────────────────
    const labelR  = arcR + 13;
    const lx = corner.x + labelR * Math.cos(bisect);
    const ly = corner.y + labelR * Math.sin(bisect);
    const label = `${angleDeg.toFixed(1)}°`;

    ctx.font         = 'bold 12px monospace';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';

    // Subtle background so it reads over members
    const tw = ctx.measureText(label).width + 6;
    ctx.fillStyle = '#0c0e1499';
    ctx.fillRect(lx - tw / 2, ly - 7, tw, 14);

    ctx.fillStyle = COLOR_ANGLE;
    ctx.fillText(label, lx, ly);

    ctx.restore();
}

// ── Length label ──────────────────────────────────────────────
//
// Draws the member length (world units) as a small pill on the member,
// on the same side as the force label (below the member line).

function drawLengthLabel(ctx, jA, jB, sA, sB) {
    const dx = jB.x - jA.x;
    const dy = jB.y - jA.y;
    const worldLen = Math.sqrt(dx * dx + dy * dy);
    const label    = `${worldLen.toFixed(1)}`;

    const mx  = (sA.x + sB.x) / 2;
    const my  = (sA.y + sB.y) / 2;
    const len = Math.hypot(sB.x - sA.x, sB.y - sA.y);
    if (len < 1) return;

    // Perpendicular offset (same side as force label: the "lower" side)
    const px = -(sB.y - sA.y) / len * 14;
    const py =  (sB.x - sA.x) / len * 14;

    // Offset further if force label also present, so they don't overlap
    const extraOffset = 16;
    const ex = -(sB.y - sA.y) / len * extraOffset;
    const ey =  (sB.x - sA.x) / len * extraOffset;

    ctx.save();
    ctx.font         = '12px monospace';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';

    const w = ctx.measureText(label).width + 8;
    const h = 13;
    const ox = mx + px + ex;
    const oy = my + py + ey;

    ctx.fillStyle = LABEL_BG_LENGTH;
    roundRect(ctx, ox - w / 2, oy - h / 2, w, h, 3);
    ctx.fill();

    ctx.fillStyle = COLOR_LENGTH;
    ctx.fillText(label, ox, oy);
    ctx.restore();
}

// ── T/C arrows ────────────────────────────────────────────────

function drawForceArrows(ctx, sA, sB, force, color) {
    const mx  = (sA.x + sB.x) / 2;
    const my  = (sA.y + sB.y) / 2;
    const len = Math.hypot(sB.x - sA.x, sB.y - sA.y);
    if (len < 1) return;

    const ux = (sB.x - sA.x) / len;
    const uy = (sB.y - sA.y) / len;
    const offset = 18, headSize = 6;

    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle   = color;
    ctx.lineWidth   = 1.5;

    if (force > 0) {
        drawArrowHead(ctx, mx + ux * offset, my + uy * offset,  ux,  uy, headSize);
        drawArrowHead(ctx, mx - ux * offset, my - uy * offset, -ux, -uy, headSize);
    } else {
        drawArrowHead(ctx, mx + ux * offset, my + uy * offset, -ux, -uy, headSize);
        drawArrowHead(ctx, mx - ux * offset, my - uy * offset,  ux,  uy, headSize);
    }

    ctx.restore();
}

function drawArrowHead(ctx, x, y, ux, uy, size) {
    const a = Math.atan2(uy, ux);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - size * Math.cos(a - Math.PI / 6), y - size * Math.sin(a - Math.PI / 6));
    ctx.lineTo(x - size * Math.cos(a + Math.PI / 6), y - size * Math.sin(a + Math.PI / 6));
    ctx.closePath();
    ctx.fill();
}

// ── Force label ───────────────────────────────────────────────

function drawForceLabel(ctx, sA, sB, force, color) {
    const mx  = (sA.x + sB.x) / 2;
    const my  = (sA.y + sB.y) / 2;
    const len = Math.hypot(sB.x - sA.x, sB.y - sA.y);
    if (len < 1) return;

    const px = -(sB.y - sA.y) / len * 14;
    const py =  (sB.x - sA.x) / len * 14;

    const label = `${force >= 0 ? '+' : ''}${force.toFixed(1)} ${force >= 0 ? 'T' : 'C'}`;

    ctx.save();
    ctx.font         = 'bold 12px monospace';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';

    const w = ctx.measureText(label).width + 10;
    const h = 14;
    ctx.fillStyle = force >= 0 ? LABEL_BG_T : LABEL_BG_C;
    roundRect(ctx, mx + px - w / 2, my + py - h / 2, w, h, 3);
    ctx.fill();

    ctx.fillStyle = color;
    ctx.fillText(label, mx + px, my + py);
    ctx.restore();
}

// ── Shared utils ──────────────────────────────────────────────

function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
}

function memberColor(force) {
    if (force === null) return COLOR_UNSOLVED;
    return force >= 0 ? COLOR_TENSION : COLOR_COMPRESSION;
}
