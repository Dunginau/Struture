/**
 * jointEquations.js
 *
 * Converts member directions into equation coefficients for a joint.
 *
 * At joint k, the equilibrium contribution of member ij is:
 *
 *   F_ij × û_ij   where û is the unit vector pointing AWAY from k
 *
 * This file builds the coefficient arrays that solveJoint.js assembles
 * into the matrix system.
 */

import { unitVector } from '../utils/geometry.js';

/**
 * Build the ΣFx = 0 and ΣFy = 0 equation rows for one joint.
 *
 * Returns:
 *   { unknowns, coeffsX, coeffsY, rhsX, rhsY }
 *
 * where:
 *   unknowns  — array of Member objects whose force is still null
 *   coeffsX   — x-direction unit vector component for each unknown member
 *   coeffsY   — y-direction unit vector component for each unknown member
 *   rhsX/rhsY — right-hand side (known forces moved to the other side)
 *
 * @param {import('../entities/Joint.js').default}  joint
 * @param {import('../entities/Truss.js').default}  truss
 */
export function buildJointEquations(joint, truss) {
    const connectedMembers = truss.membersAtJoint(joint.id);

    const unknowns = [];
    const coeffsX  = [];
    const coeffsY  = [];

    // ── Accumulate known right-hand side ─────────────────────
    // Start with external forces and support reactions (moved to RHS).
    let rhsX = -(truss.forcesAtJoint(joint.id).reduce((s, f) => s + f.fx, 0) + joint.rx);
    let rhsY = -(truss.forcesAtJoint(joint.id).reduce((s, f) => s + f.fy, 0) + joint.ry);

    for (const member of connectedMembers) {

        // Identify the "other" joint of this member
        const otherJointId = member.jointA === joint.id ? member.jointB : member.jointA;
        const otherJoint   = truss.getJoint(otherJointId);

        // Unit vector pointing FROM this joint TO the other
        const u = unitVector(joint.x, joint.y, otherJoint.x, otherJoint.y);

        if (member.isSolved) {
            // Already known — move contribution to RHS
            rhsX -= member.force * u.x;
            rhsY -= member.force * u.y;
        } else {
            // Unknown — becomes a column in the matrix
            unknowns.push(member);
            coeffsX.push(u.x);
            coeffsY.push(u.y);
        }
    }

    return { unknowns, coeffsX, coeffsY, rhsX, rhsY };
}
