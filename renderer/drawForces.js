/**
 * drawForces.js — renders external forces as arrows.
 *
 * Pure drawing — no engineering calculations.
 */

const FORCE_COLOR   = '#f5a623';
const SCALE_FACTOR  = 0.05;   // pixels per unit force — tune as needed
const MIN_ARROW_LEN = 30;     // px

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {import('../core/entities/Truss.js').default} truss
 * @param {function} worldToScreen
 */
export function drawForces(ctx, truss, worldToScreen) {
    for (const force of truss.forces) {
        const joint = truss.getJoint(force.jointId);
        if (!joint) continue;

        const { x, y } = worldToScreen(joint.x, joint.y);

        // Scale the force vector for display
        const mag = Math.sqrt(force.fx ** 2 + force.fy ** 2);
        if (mag < 1e-10) continue;

        const displayLen = Math.max(MIN_ARROW_LEN, mag * SCALE_FACTOR);
        const ux = force.fx / mag;
        const uy = force.fy / mag;

        // Arrow points FROM the tip TOWARD the joint (force acts on joint)
        const tipX   = x;
        const tipY   = y;
        const tailX  = x - ux * displayLen;
        const tailY  = y + uy * displayLen;  // y-flip

        drawArrow(ctx, tailX, tailY, tipX, tipY, FORCE_COLOR);

        // Label
        ctx.save();
        ctx.font         = '10px monospace';
        ctx.fillStyle    = FORCE_COLOR;
        ctx.textAlign    = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${mag.toFixed(0)}`, (tailX + tipX) / 2 - 14, (tailY + tipY) / 2);
        ctx.restore();
    }
}

/**
 * Draw an arrow from (x1,y1) to (x2,y2).
 */
function drawArrow(ctx, x1, y1, x2, y2, color) {
    const headLen   = 10;
    const angle     = Math.atan2(y2 - y1, x2 - x1);

    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle   = color;
    ctx.lineWidth   = 2;

    // Shaft
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    // Head
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(
        x2 - headLen * Math.cos(angle - Math.PI / 6),
        y2 - headLen * Math.sin(angle - Math.PI / 6)
    );
    ctx.lineTo(
        x2 - headLen * Math.cos(angle + Math.PI / 6),
        y2 - headLen * Math.sin(angle + Math.PI / 6)
    );
    ctx.closePath();
    ctx.fill();

    ctx.restore();
}
