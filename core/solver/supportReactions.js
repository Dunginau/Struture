/**
 * supportReactions.js
 *
 * Calculates support reactions by treating the entire truss as a single
 * rigid body and solving the 3 global equilibrium equations:
 *
 *   ΣFx = 0
 *   ΣFy = 0
 *   ΣM  = 0  (about the first support joint as origin)
 *
 * Handles any statically determinate combination of:
 *   pin    → unknowns: Rx, Ry
 *   roller → unknown:  Ry  (Rx = 0)
 *   fixed  → unknowns: Rx, Ry  (moment reaction M is implicit in the
 *             indeterminate sense — for a truss with pin+fixed the
 *             system is indeterminate; validation blocks this case)
 *
 * The standard determinate combinations are:
 *   pin + roller          → 3 unknowns, 3 equations ✓
 *   roller + roller       → 2 unknowns, underdetermined (blocked by validation)
 *   pin + pin             → 4 unknowns, overdetermined (blocked)
 *
 * @param {import('../entities/Truss.js').default} truss
 */

import { solveLinearSystem } from '../math/equations.js';

export function solveSupportReactions(truss) {
    const supports = truss.joints.filter(j => j.support !== null);

    // ── Build the list of unknowns ────────────────────────────
    // Each unknown is { joint, component: 'rx'|'ry' }
    const unknowns = [];

    for (const j of supports) {
        if (j.support === 'pin' || j.support === 'fixed') {
            unknowns.push({ joint: j, comp: 'rx' });
            unknowns.push({ joint: j, comp: 'ry' });
        } else if (j.support === 'roller') {
            unknowns.push({ joint: j, comp: 'ry' });
        }
    }

    const n = unknowns.length;
    if (n !== 3) {
        console.warn(`supportReactions: expected 3 reaction unknowns, got ${n}.`);
        return;
    }

    // ── Net external load ─────────────────────────────────────
    const totalFx = truss.forces.reduce((s, f) => s + f.fx, 0);
    const totalFy = truss.forces.reduce((s, f) => s + f.fy, 0);

    // Moment reference point: first support joint
    const ref = supports[0];

    // Moment from external forces about ref
    const momentExt = truss.forces.reduce((s, f) => {
        const jt = truss.getJoint(f.jointId);
        if (!jt) return s;
        const dx = jt.x - ref.x;
        const dy = jt.y - ref.y;
        // M = r × F  (2D: dx*Fy - dy*Fx)
        return s + dx * f.fy - dy * f.fx;
    }, 0);

    // ── Assemble 3×3 system  [A]{x} = {b} ────────────────────
    // Row 0: ΣFx = 0
    // Row 1: ΣFy = 0
    // Row 2: ΣM  = 0  about ref
    const A = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
    const b = [-totalFx, -totalFy, -momentExt];

    for (let i = 0; i < n; i++) {
        const { joint, comp } = unknowns[i];
        if (comp === 'rx') {
            A[0][i] = 1;                                    // ΣFx contribution
            // Moment: Rx acts horizontally; moment arm = -(joint.y - ref.y)
            A[2][i] = -(joint.y - ref.y);
        } else {
            A[1][i] = 1;                                    // ΣFy contribution
            // Moment: Ry acts vertically; moment arm = +(joint.x - ref.x)
            A[2][i] = (joint.x - ref.x);
        }
    }

    const solution = solveLinearSystem(A, b);
    if (!solution) {
        console.warn('supportReactions: singular system — supports may be collinear.');
        return;
    }

    // ── Zero out all reactions first ──────────────────────────
    supports.forEach(j => { j.rx = 0; j.ry = 0; });

    // ── Write back ────────────────────────────────────────────
    for (let i = 0; i < n; i++) {
        const { joint, comp } = unknowns[i];
        joint[comp] = solution[i];
    }
}
