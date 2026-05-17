/**
 * mouse.js — canvas mouse event handling.
 *
 * addJoint tool:
 *   - Ghost previews the resolved position on every mousemove.
 *   - resolvePosition always clamps to the nearest joint's MAX_REACH circle
 *     when cursor is outside it, so placement is always within reach.
 *   - Grid snap (minor grid) is applied AFTER reach clamping.
 *   - First joint (no existing joints) has no reach constraint.
 */

import state from './state.js';
import { screenToWorld, render } from '../renderer/canvas.js';

const HIT_RADIUS = 14;   // world units — joint hit test
const MAX_REACH  = 200;  // world units — maximum joint spacing

let trussRef = null;

export function initMouse(canvas, truss) {
    trussRef = truss;

    canvas.addEventListener('mousemove', (e) => {
        if (state.activeTool !== 'addJoint') {
            if (state.ghostJoint) state.set({ ghostJoint: null });
            return;
        }
        const { x, y } = toWorld(e, canvas);
        updateGhost(x, y);
        render(truss);
    });

    canvas.addEventListener('mouseleave', () => {
        if (state.ghostJoint) {
            state.set({ ghostJoint: null });
            render(truss);
        }
    });

    canvas.addEventListener('click', (e) => {
        if (e.button !== 0) return;
        const { x, y } = toWorld(e, canvas);
        handleClick(x, y, truss);
        render(truss);
    });
}

state.on('activeTool', (tool) => {
    if (tool !== 'addJoint' && state.ghostJoint) state.set({ ghostJoint: null });
});

let pendingJointId = null;

function handleClick(wx, wy, truss) {
    switch (state.activeTool) {

        case 'addJoint': {
            const pos = resolvePosition(wx, wy);
            truss.addJoint(pos.x, pos.y);
            truss.resetSolution();
            state.set({ solveResult: null });
            updateGhost(wx, wy); // keep ghost live at same cursor
            break;
        }

        case 'addMember': {
            const hit = hitJoint(wx, wy, truss);
            if (!hit) break;
            if (pendingJointId === null) {
                pendingJointId = hit.id;
            } else {
                if (pendingJointId !== hit.id) {
                    truss.addMember(pendingJointId, hit.id);
                    truss.resetSolution();
                    state.set({ solveResult: null });
                }
                pendingJointId = null;
            }
            break;
        }

        case 'addSupport':
        case 'addForce': {
            const hit = hitJoint(wx, wy, truss);
            state.set({ selectedJoint: hit || null });
            break;
        }

        case 'delete': {
            const hit = hitJoint(wx, wy, truss);
            if (hit) {
                if (state.selectedJoint?.id === hit.id) state.set({ selectedJoint: null });
                truss.removeJoint(hit.id);
                truss.resetSolution();
                state.set({ solveResult: null });
            }
            break;
        }
    }
}

// ── Ghost ─────────────────────────────────────────────────────

function updateGhost(wx, wy) {
    const pos = resolvePosition(wx, wy);
    state.set({
        ghostJoint: {
            x:       pos.x,
            y:       pos.y,
            snapped: state.snapToGrid,
            // Always within reach after clamping — colour stays green
            withinReach: true,
        }
    });
}

// ── Position resolution ───────────────────────────────────────

/**
 * Final world position for joint placement.
 *
 * Steps:
 *   1. If existing joints, clamp raw cursor to the nearest joint's MAX_REACH circle.
 *   2. If snap-to-grid, snap the (possibly clamped) position to minorGrid.
 */
function resolvePosition(wx, wy) {
    let x = wx;
    let y = wy;

    if (trussRef.joints.length > 0) {
        const nearest = nearestJoint(wx, wy);
        const dist    = Math.hypot(wx - nearest.x, wy - nearest.y);

        if (dist > MAX_REACH) {
            // Project onto the reach circle of the nearest joint
            const angle = Math.atan2(wy - nearest.y, wx - nearest.x);
            x = nearest.x + MAX_REACH * Math.cos(angle);
            y = nearest.y + MAX_REACH * Math.sin(angle);
        }
    }

    if (state.snapToGrid) {
        const g = state.minorGrid;
        x = Math.round(x / g) * g;
        y = Math.round(y / g) * g;
    }

    return { x, y };
}

function nearestJoint(wx, wy) {
    let best = null, minDist = Infinity;
    for (const j of trussRef.joints) {
        const d = Math.hypot(j.x - wx, j.y - wy);
        if (d < minDist) { minDist = d; best = j; }
    }
    return best;
}

// ── Helpers ───────────────────────────────────────────────────

function toWorld(e, canvas) {
    const rect = canvas.getBoundingClientRect();
    return screenToWorld(e.clientX - rect.left, e.clientY - rect.top);
}

function hitJoint(wx, wy, truss) {
    for (const j of truss.joints) {
        if (Math.hypot(j.x - wx, j.y - wy) <= HIT_RADIUS) return j;
    }
    return null;
}
