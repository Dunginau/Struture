/**
 * drawJoints.js — renders joints as circles.
 * Highlights the selected joint (from state.selectedJoint).
 */

import state from '../ui/state.js';

const JOINT_RADIUS = 6;

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {import('../core/entities/Truss.js').default} truss
 * @param {function} worldToScreen
 */
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
        ctx.fillStyle    = selected ? '#4d7cfe' : '#454d68';
        ctx.textAlign    = 'left';
        ctx.textBaseline = 'bottom';
        ctx.fillText(`J${joint.id}`, x + JOINT_RADIUS + 3, y - 2);

        ctx.restore();
    }
}
