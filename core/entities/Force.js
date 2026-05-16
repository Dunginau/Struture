/**
 * Force entity — an external load applied at a joint.
 *
 * Uses Cartesian components (not magnitude + angle) to stay
 * consistent with the vector-based solver throughout the app.
 *
 * @property {number} id
 * @property {number} jointId  - target joint
 * @property {number} fx       - x-component (positive = right)
 * @property {number} fy       - y-component (positive = up)
 */
export default class Force {
    /**
     * @param {number} id
     * @param {number} jointId
     * @param {number} fx
     * @param {number} fy
     */
    constructor(id, jointId, fx, fy) {
        this.id      = id;
        this.jointId = jointId;
        this.fx      = fx;
        this.fy      = fy;
    }

    /** Magnitude of the force vector. */
    get magnitude() {
        return Math.sqrt(this.fx ** 2 + this.fy ** 2);
    }
}
