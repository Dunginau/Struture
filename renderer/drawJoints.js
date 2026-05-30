/**
 * drawJoints.js — renders joints and ghost joint preview.
 */

import state from '../ui/state.js';

const JOINT_RADIUS   = 6;
const MAX_REACH      = 200; // world units

export function drawJoints(ctx, truss, worldToScreen) {
    const selectedId = state.selectedJoint?.id ?? null;

    for (const joint of truss.joints) {
        const { x, y } = worldToScreen(joint.x, joint.y);
        const selected  = joint.id === selectedId;

        ctx.save();

        // Glow ring for selected
        if (selected) {
            ctx.beginPath();
            ctx.arc(x, y, JOINT_RADIUS + 5, 0, Math.PI * 2);
            ctx.strokeStyle = '#4d7cfe55';
            ctx.lineWidth   = 3;
            ctx.stroke();
        }

        // Main circle
        ctx.beginPath();
        ctx.arc(x, y, JOINT_RADIUS, 0, Math.PI * 2);
        ctx.fillStyle   = selected ? '#4d7cfe' : '#3a5fd9';
        ctx.strokeStyle = selected ? '#7aabff' : '#0c0e14';
        ctx.lineWidth   = 1.5;
        ctx.fill();
        ctx.stroke();

        // Inner dot
        ctx.beginPath();
        ctx.arc(x, y, 2, 0, Math.PI * 2);
        ctx.fillStyle = selected ? '#fff' : '#8ab0ff';
        ctx.fill();

        // Label
        ctx.font         = '10px monospace';
        ctx.fillStyle    = selected ? '#4d7cfe' : '#bfc5d6';
        ctx.textAlign    = 'left';
        ctx.textBaseline = 'bottom';
        ctx.fillText(`${joint.label}`, x + JOINT_RADIUS + 3, y - 2);

        ctx.restore();
    }
}

/**
 * Draw ghost joint preview during drag (addJoint tool).
 *
 * Shows:
 *   - Dashed reach circles (200 world units) around all existing joints
 *   - A ghost dot at the candidate position
 *   - A snap indicator if snapping is active
 *   - Red tint if outside all reach circles (visual warning only, placement allowed)
 */
export function drawGhost(ctx, ghost, truss, worldToScreen) {
    const { x, y, withinReach, snapped } = ghost;
    const { x: sx, y: sy } = worldToScreen(x, y);
    const scale = worldToScreen(MAX_REACH, 0).x - worldToScreen(0, 0).x; // px per world unit

    ctx.save();

    // ── Reach circles around existing joints ──────────────────
    if (truss.joints.length > 0) {
        ctx.setLineDash([4, 4]);
        ctx.lineWidth = 1;

        for (const joint of truss.joints) {
            const sj = worldToScreen(joint.x, joint.y);
            const reachPx = MAX_REACH * (worldToScreen(1, 0).x - worldToScreen(0, 0).x);

            ctx.beginPath();
            ctx.arc(sj.x, sj.y, reachPx, 0, Math.PI * 2);
            // Increased opacity for red warning (44 instead of 22)
            ctx.strokeStyle = withinReach ? '#3ecf8e22' : '#e0506044';
            ctx.stroke();
        }

        ctx.setLineDash([]);
    }

    // ── Ghost dot ─────────────────────────────────────────────
    const color = truss.joints.length === 0
        ? '#3ecf8e'                         // first joint — always valid
        : withinReach ? '#3ecf8e' : '#e05060';

    // Outer ring
    ctx.beginPath();
    ctx.arc(sx, sy, JOINT_RADIUS + 4, 0, Math.PI * 2);
    ctx.strokeStyle = color + '55';
    ctx.lineWidth   = 2;
    ctx.stroke();

    // Fill
    ctx.beginPath();
    ctx.arc(sx, sy, JOINT_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle   = color + '88';
    ctx.strokeStyle = color;
    ctx.lineWidth   = 1.5;
    ctx.fill();
    ctx.stroke();

    // ── Snap indicator cross ──────────────────────────────────
    if (snapped) {
        const arm = 10;
        ctx.strokeStyle = color + 'aa';
        ctx.lineWidth   = 1;
        ctx.beginPath();
        ctx.moveTo(sx - arm, sy); ctx.lineTo(sx + arm, sy);
        ctx.moveTo(sx, sy - arm); ctx.lineTo(sx, sy + arm);
        ctx.stroke();
    }

    // ── Coordinates tooltip ───────────────────────────────────
    ctx.font         = '10px monospace';
    ctx.fillStyle    = color;
    ctx.textAlign    = 'left';
    ctx.textBaseline = 'bottom';
    ctx.fillText(`(${Math.round(x)}, ${Math.round(y)})`, sx + 10, sy - 4);

    ctx.restore();
}
