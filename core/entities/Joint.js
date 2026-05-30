/**
 * Joint entity — pure data, no calculations.
 *
 * @property {number} id
 * @property {string} label    - Alphabetic label (A, B, C...)
 * @property {number} x        - canvas/world x coordinate
 * @property {number} y        - canvas/world y coordinate
 * @property {string|null} support  - 'pin' | 'roller' | null
 *
 * Reactions (populated by supportReactions.js after solving):
 * @property {number} rx       - reaction force x-component
 * @property {number} ry       - reaction force y-component
 */
export default class Joint {
    /**
     * @param {number} id
     * @param {string} label
     * @param {number} x
     * @param {number} y
     * @param {string|null} [support=null]
     */
    constructor(id, label, x, y, support = null) {
        this.id      = id;
        this.label   = label;
        this.x       = x;
        this.y       = y;
        this.support = support; // 'pin' | 'roller' | null

        // Reaction components — set by solver
        this.rx = 0;
        this.ry = 0;
    }
}
