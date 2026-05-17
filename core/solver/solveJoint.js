/**
 * solveJoint.js — heart of the Method of Joints solver.
 *
 * At each call:
 *   1. Build the ΣFx = 0 / ΣFy = 0 equation system for the joint.
 *   2. Solve the 2×2 (or 1×1) linear system.
 *   3. Write solved force values back onto the Member objects.
 *
 * Convention (from the tutorial):
 *   Positive result → tension
 *   Negative result → compression
 */

import { buildJointEquations } from './jointEquations.js';
import { solveLinearSystem }   from '../math/equations.js';

/**
 * Returns true if this joint has exactly 1 or 2 unknown member forces
 * (the maximum the Method of Joints can solve at once).
 *
 * @param {import('../entities/Joint.js').default} joint
 * @param {import('../entities/Truss.js').default} truss
 * @returns {boolean}
 */
export function canSolveJoint(joint, truss) {
    const unknownCount = truss.membersAtJoint(joint.id)
        .filter(m => !m.isSolved)
        .length;
    return unknownCount >= 1 && unknownCount <= 2;
}

/**
 * Solve all unknown member forces at the given joint.
 * Mutates the Member objects in-place.
 *
 * @param {import('../entities/Joint.js').default} joint
 * @param {import('../entities/Truss.js').default} truss
 * @returns {boolean} true if solved successfully
 */
export function solveJoint(joint, truss) {
    const { unknowns, coeffsX, coeffsY, rhsX, rhsY } =
        buildJointEquations(joint, truss);

    if (unknowns.length === 0) return true; // Nothing to do

    let solution;

    if (unknowns.length === 1) {
        // 1 unknown: pick the equation with the larger coefficient for stability
        const useX  = Math.abs(coeffsX[0]) >= Math.abs(coeffsY[0]);
        const coeff = useX ? coeffsX[0] : coeffsY[0];
        const rhs   = useX ? rhsX       : rhsY;

        if (Math.abs(coeff) < 1e-12) return false;
        solution = [rhs / coeff];

    } else if (unknowns.length === 2) {
        // 2 unknowns: standard 2×2 system
        const A = [
            [coeffsX[0], coeffsX[1]],
            [coeffsY[0], coeffsY[1]],
        ];
        const b = [rhsX, rhsY];
        solution = solveLinearSystem(A, b);

        if (!solution) return false;

    } else {
        return false; // Over-constrained for this method
    }

    // Write results back
    unknowns.forEach((member, i) => {
        member.force = solution[i];
    });

    return true;
}
