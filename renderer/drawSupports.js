/**
 * drawSupports.js — renders support symbols at support joints.
 *
 *   pin    → triangle + ground hatch
 *   roller → triangle + circle + ground hatch
 *   fixed  → solid wall bracket + ground hatch
 *
 * Pure drawing — no engineering calculations.
 */

const SUPPORT_COLOR  = '#4e8c6f';
const REACTION_COLOR = '#7ec8a4';

export function drawSupports(ctx, truss, worldToScreen) {
    for (const joint of truss.joints) {
        if (!joint.support) continue;
        const { x, y } = worldToScreen(joint.x, joint.y);

        if      (joint.support === 'pin')    drawPin(ctx, x, y);
        else if (joint.support === 'roller') drawRoller(ctx, x, y);
        else if (joint.support === 'fixed')  drawFixed(ctx, x, y);

        drawReactionLabel(ctx, joint, x, y);
    }
}

// ── Pin ───────────────────────────────────────────────────────

function drawPin(ctx, x, y) {
    const size = 14;
    ctx.save();
    ctx.strokeStyle = SUPPORT_COLOR;
    ctx.fillStyle   = SUPPORT_COLOR + '33';
    ctx.lineWidth   = 1.5;

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - size, y + size * 1.4);
    ctx.lineTo(x + size, y + size * 1.4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    drawGroundHatch(ctx, x, y + size * 1.4);
    ctx.restore();
}

// ── Roller ────────────────────────────────────────────────────

function drawRoller(ctx, x, y) {
    const size   = 14;
    const radius = 5;
    ctx.save();
    ctx.strokeStyle = SUPPORT_COLOR;
    ctx.fillStyle   = SUPPORT_COLOR + '33';
    ctx.lineWidth   = 1.5;

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - size, y + size * 1.4);
    ctx.lineTo(x + size, y + size * 1.4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(x, y + size * 1.4 + radius + 2, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    drawGroundHatch(ctx, x, y + size * 1.4 + radius * 2 + 4);
    ctx.restore();
}

// ── Fixed ─────────────────────────────────────────────────────
// Standard engineering symbol: vertical wall on the left,
// horizontal bracket lines connecting joint to wall.

function drawFixed(ctx, x, y) {
    const wallX  = x - 22;
    const half   = 14;
    const nLines = 5;

    ctx.save();
    ctx.strokeStyle = SUPPORT_COLOR;
    ctx.fillStyle   = SUPPORT_COLOR + '33';
    ctx.lineWidth   = 1.5;

    // Horizontal connector line from joint to wall
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(wallX, y);
    ctx.stroke();

    // Vertical wall bar
    ctx.beginPath();
    ctx.moveTo(wallX, y - half);
    ctx.lineTo(wallX, y + half);
    ctx.lineWidth = 3;
    ctx.stroke();

    // Hatch lines on the wall (left side)
    ctx.lineWidth = 1;
    const spacing = (half * 2) / (nLines - 1);
    for (let i = 0; i < nLines; i++) {
        const wy = y - half + i * spacing;
        ctx.beginPath();
        ctx.moveTo(wallX, wy);
        ctx.lineTo(wallX - 7, wy + 7);
        ctx.stroke();
    }

    // Small filled square at the joint attachment point
    ctx.fillStyle = SUPPORT_COLOR;
    ctx.fillRect(wallX - 2, y - 2, 4, 4);

    ctx.restore();
}

// ── Ground hatch (shared by pin & roller) ─────────────────────

function drawGroundHatch(ctx, cx, y) {
    ctx.beginPath();
    ctx.moveTo(cx - 24, y);
    ctx.lineTo(cx + 24, y);
    ctx.strokeStyle = SUPPORT_COLOR;
    ctx.lineWidth   = 1.5;
    ctx.stroke();

    for (let i = -3; i <= 3; i++) {
        ctx.beginPath();
        ctx.moveTo(cx + i * 7, y);
        ctx.lineTo(cx + i * 7 - 6, y + 6);
        ctx.stroke();
    }
}

// ── Reaction labels ───────────────────────────────────────────

function drawReactionLabel(ctx, joint, x, y) {
    const parts = [];
    if (Math.abs(joint.rx) > 1e-6) parts.push(`Rx=${joint.rx.toFixed(1)}`);
    if (Math.abs(joint.ry) > 1e-6) parts.push(`Ry=${joint.ry.toFixed(1)}`);
    if (parts.length === 0) return;

    ctx.save();
    ctx.font         = '10px monospace';
    ctx.fillStyle    = REACTION_COLOR;
    ctx.textAlign    = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(parts.join('  '), x + 10, y + 14);
    ctx.restore();
}
