/**
 * state.js — shared UI state.
 */

const listeners = {};

const state = {
    activeTool:    'select',
    selectedJoint: null,       // Joint | null
    solveResult:   null,       // { success, message } | null

    // Ghost joint for drag-preview (addJoint tool)
    ghostJoint:    null,       // { x, y, snapped, withinReach } | null

    // Display toggles
    showAngles:    false,
    showLengths:   false,

    // Grid settings (world units)
    minorGrid:     10,
    majorGrid:     50,
    snapToGrid:    true,       // false = free placement

    on(key, fn) {
        if (!listeners[key]) listeners[key] = [];
        listeners[key].push(fn);
    },

    set(patch) {
        Object.assign(state, patch);
        for (const key of Object.keys(patch)) {
            (listeners[key] || []).forEach(fn => fn(state[key]));
        }
    },
};

export default state;
