import Joint  from './Joint.js';
import Member from './Member.js';
import Force  from './Force.js';

/**
 * Truss — top-level container for the entire model.
 *
 * Owns joints, members, and external forces.
 * All IDs are auto-incremented internally.
 * No calculations live here — pure data + convenience accessors.
 */
export default class Truss {
    constructor() {
        this.joints  = [];
        this.members = [];
        this.forces  = [];

        this._nextJointId  = 1;
        this._nextMemberId = 1;
        this._nextForceId  = 1;
    }

    // ── Joints ───────────────────────────────────────────────

    /**
     * @param {number} x
     * @param {number} y
     * @param {string|null} [support=null]
     * @returns {Joint}
     */
    addJoint(x, y, support = null) {
        const joint = new Joint(this._nextJointId++, x, y, support);
        this.joints.push(joint);
        return joint;
    }

    /** @param {number} id @returns {Joint|undefined} */
    getJoint(id) {
        return this.joints.find(j => j.id === id);
    }

    /** @param {number} id */
    removeJoint(id) {
        this.joints   = this.joints.filter(j => j.id !== id);
        this.members  = this.members.filter(m => m.jointA !== id && m.jointB !== id);
        this.forces   = this.forces.filter(f => f.jointId !== id);
    }

    // ── Members ──────────────────────────────────────────────

    /**
     * @param {number} jointAId
     * @param {number} jointBId
     * @returns {Member}
     */
    addMember(jointAId, jointBId) {
        const member = new Member(this._nextMemberId++, jointAId, jointBId);
        this.members.push(member);
        return member;
    }

    /** @param {number} id @returns {Member|undefined} */
    getMember(id) {
        return this.members.find(m => m.id === id);
    }

    /** @param {number} id */
    removeMember(id) {
        this.members = this.members.filter(m => m.id !== id);
    }

    /** Returns all members connected to a given joint id. */
    membersAtJoint(jointId) {
        return this.members.filter(
            m => m.jointA === jointId || m.jointB === jointId
        );
    }

    // ── Forces ───────────────────────────────────────────────

    /**
     * @param {number} jointId
     * @param {number} fx
     * @param {number} fy
     * @returns {Force}
     */
    addForce(jointId, fx, fy) {
        const force = new Force(this._nextForceId++, jointId, fx, fy);
        this.forces.push(force);
        return force;
    }

    /** Returns all forces applied to a given joint id. */
    forcesAtJoint(jointId) {
        return this.forces.filter(f => f.jointId === jointId);
    }

    // ── Reset ────────────────────────────────────────────────

    /** Clear all solved results without discarding geometry/loads. */
    resetSolution() {
        this.members.forEach(m => { m.force = null; });
        this.joints.forEach(j  => { j.rx = 0; j.ry = 0; });
    }

    /** Wipe the entire model. */
    clear() {
        this.joints  = [];
        this.members = [];
        this.forces  = [];
        this._nextJointId  = 1;
        this._nextMemberId = 1;
        this._nextForceId  = 1;
    }
}
