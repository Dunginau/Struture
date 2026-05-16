/**
 * state.js — shared UI state.
 *
 * Single source of truth for:
 *   - which tool is active
 *   - which joint is selected
 *   - last solver result
 *
 * Components import and mutate this object, then call
 * state.emit() so subscribers can react.
 */

const listeners = {};

const state = {
    activeTool:    'select',   // 'select' | 'addJoint' | 'addMember' | 'addForce' | 'delete'
    selectedJoint: null,       // Joint object | null
    solveResult:   null,       // { success, message } | null

    /**
     * Subscribe to a state key change.
     * @param {string}   key
     * @param {function} fn
     */
    on(key, fn) {
        if (!listeners[key]) listeners[key] = [];
        listeners[key].push(fn);
    },

    /**
     * Update one or more keys and notify subscribers.
     * @param {object} patch
     */
    set(patch) {
        Object.assign(state, patch);
        for (const key of Object.keys(patch)) {
            (listeners[key] || []).forEach(fn => fn(state[key]));
        }
    },
};

export default state;
