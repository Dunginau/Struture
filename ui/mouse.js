/**
 * mouse.js — canvas mouse event handling.
 *
 * Routes clicks to the active tool.
 * Joint selection in 'addForce' mode → updates state.selectedJoint.
 */

import state from './state.js';
import { screenToWorld, render } from '../renderer/canvas.js';

const HIT_RADIUS = 14; // world units

/** @param {HTMLCanvasElement} canvas
 *  @param {import('../core/entities/Truss.js').default} truss */
export function initMouse(canvas, truss) {

    canvas.addEventListener('click', (e) => {
        const rect = canvas.getBoundingClientRect();
        const { x, y } = screenToWorld(e.clientX - rect.left, e.clientY - rect.top);
        handleClick(x, y, truss);
        render(truss);
    });

    canvas.addEventListener('mousemove', () => {
        // TODO: hover highlights, rubber-band preview
    });
}

let pendingJointId = null;

function handleClick(wx, wy, truss) {
    const tool = state.activeTool;

    switch (tool) {

        case 'addJoint': {
            const s = snap(wx, wy, 50);
            truss.addJoint(s.x, s.y);
            // Clear any stale solution when geometry changes
            truss.resetSolution();
            state.set({ solveResult: null });
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

        case 'addSupport': {
            const hit = hitJoint(wx, wy, truss);
            // Select joint → panel shows support type picker
            state.set({ selectedJoint: hit || null });
            break;
        }

        case 'addForce': {
            const hit = hitJoint(wx, wy, truss);
            // Select (or deselect) the clicked joint → panel reacts via state
            state.set({ selectedJoint: hit || null });
            break;
        }

        case 'delete': {
            const hit = hitJoint(wx, wy, truss);
            if (hit) {
                if (state.selectedJoint?.id === hit.id) {
                    state.set({ selectedJoint: null });
                }
                truss.removeJoint(hit.id);
                truss.resetSolution();
                state.set({ solveResult: null });
            }
            break;
        }

        case 'select':
        default:
            break;
    }
}

// ── Helpers ──────────────────────────────────────────────────

function snap(x, y, grid) {
    return { x: Math.round(x / grid) * grid, y: Math.round(y / grid) * grid };
}

function hitJoint(wx, wy, truss) {
    for (const joint of truss.joints) {
        const d = Math.hypot(joint.x - wx, joint.y - wy);
        if (d <= HIT_RADIUS) return joint;
    }
    return null;
}
