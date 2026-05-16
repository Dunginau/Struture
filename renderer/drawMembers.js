/**
 * drawMembers.js — renders truss members with T/C force indicators.
 *
 * Unsolved  → dim grey line
 * Tension   → blue line + outward arrows (member is being pulled)
 * Compression → red line + inward arrows (member is being pushed)
 */

const COLOR_UNSOLVED    = '#2a3048';
const COLOR_TENSION     = '#4d7cfe';
const COLOR_COMPRESSION = '#e05060';
const LABEL_BG_T        = '#0d1c3d';
const LABEL_BG_C        = '#200d12';

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {import('../core/entities/Truss.js').default} truss
 * @param {function} worldToScreen
 */
export function drawMembers(ctx, truss, worldToScreen) {
    for (const member of truss.members) {
        const jA = truss.getJoint(member.jointA);
        const jB = truss.getJoint(member.jointB);
        if (!jA || !jB) continue;

        const sA    = worldToScreen(jA.x, jA.y);
        const sB    = worldToScreen(jB.x, jB.y);
        const color = memberColor(member.force);

        // ── Line ─────────────────────────────────────────────
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(sA.x, sA.y);
        ctx.lineTo(sB.x, sB.y);
        ctx.strokeStyle = color;
        ctx.lineWidth   = member.force !== null ? 2.5 : 1.5;
        ctx.stroke();
        ctx.restore();

        if (member.force === null) continue;

        // ── T/C directional arrows ────────────────────────────
        drawForceArrows(ctx, sA, sB, member.force, color);

        // ── Force label ───────────────────────────────────────
        drawForceLabel(ctx, sA, sB, member.force, color);
    }
}

/**
 * Draw small directional arrows at the midpoint:
 *   Tension     → arrows pointing outward (away from mid)
 *   Compression → arrows pointing inward  (toward mid)
 */
function drawForceArrows(ctx, sA, sB, force, color) {
    const mx  = (sA.x + sB.x) / 2;
    const my  = (sA.y + sB.y) / 2;
    const len = Math.hypot(sB.x - sA.x, sB.y - sA.y);
    if (len < 1) return;

    // Unit vector along the member
    const ux = (sB.x - sA.x) / len;
    const uy = (sB.y - sA.y) / len;

    const offset   = 18;   // px from midpoint
    const headSize = 6;

    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle   = color;
    ctx.lineWidth   = 1.5;

    if (force > 0) {
        // Tension — arrows point outward from midpoint
        drawArrowHead(ctx, mx + ux * offset, my + uy * offset, ux, uy, headSize);
        drawArrowHead(ctx, mx - ux * offset, my - uy * offset, -ux, -uy, headSize);
    } else {
        // Compression — arrows point inward toward midpoint
        drawArrowHead(ctx, mx + ux * offset, my + uy * offset, -ux, -uy, headSize);
        drawArrowHead(ctx, mx - ux * offset, my - uy * offset, ux, uy, headSize);
    }

    ctx.restore();
}

function drawArrowHead(ctx, x, y, ux, uy, size) {
    const angle = Math.atan2(uy, ux);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(
        x - size * Math.cos(angle - Math.PI / 6),
        y - size * Math.sin(angle - Math.PI / 6)
    );
    ctx.lineTo(
        x - size * Math.cos(angle + Math.PI / 6),
        y - size * Math.sin(angle + Math.PI / 6)
    );
    ctx.closePath();
    ctx.fill();
}

/**
 * Draw the force magnitude + sign label at midpoint, perpendicular offset.
 */
function drawForceLabel(ctx, sA, sB, force, color) {
    const mx  = (sA.x + sB.x) / 2;
    const my  = (sA.y + sB.y) / 2;
    const len = Math.hypot(sB.x - sA.x, sB.y - sA.y);
    if (len < 1) return;

    // Perpendicular offset
    const px = -(sB.y - sA.y) / len * 14;
    const py =  (sB.x - sA.x) / len * 14;

    const text  = `${force >= 0 ? '+' : ''}${force.toFixed(1)}`;
    const label = `${text} ${force >= 0 ? 'T' : 'C'}`;

    ctx.save();
    ctx.font         = 'bold 10px monospace';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';

    // Pill background
    const w = ctx.measureText(label).width + 10;
    const h = 14;
    ctx.fillStyle = force >= 0 ? LABEL_BG_T : LABEL_BG_C;
    roundRect(ctx, mx + px - w / 2, my + py - h / 2, w, h, 3);
    ctx.fill();

    ctx.fillStyle = color;
    ctx.fillText(label, mx + px, my + py);
    ctx.restore();
}

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
