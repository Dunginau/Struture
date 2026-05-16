/**
 * Member entity — pure data, no calculations.
 *
 * @property {number}      id
 * @property {number}      jointA  - id of first joint
 * @property {number}      jointB  - id of second joint
 * @property {number|null} force   - solved force magnitude (+ tension, − compression)
 */
export default class Member {
    /**
     * @param {number} id
     * @param {number} jointA  - Joint id
     * @param {number} jointB  - Joint id
     */
    constructor(id, jointA, jointB) {
        this.id     = id;
        this.jointA = jointA;
        this.jointB = jointB;

        // Populated by solver
        this.force  = null;
    }

    /** Whether this member has been solved. */
    get isSolved() {
        return this.force !== null;
    }
}
