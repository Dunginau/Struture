/**
 * solveTruss.js — master solver controller.
 *
 * Orchestrates the full Method of Joints solution sequence:
 *
 *   1. Validate the truss.
 *   2. Calculate global support reactions.
 *   3. Iteratively find and solve solvable joints (≤ 2 unknowns)
 *      until all member forces are resolved or no progress is made.
 *
 * @param {import('../entities/Truss.js').default} truss
 * @returns {{ success: boolean, message: string }}
 */

import { validateTruss }          from '../utils/validation.js';
import { solveSupportReactions }  from './supportReactions.js';
import { canSolveJoint, solveJoint } from './solveJoint.js';

export function solveTruss(truss) {
    // ── 0. Reset any previous solution ──────────────────────
    truss.resetSolution();

    // ── 1. Validate ──────────────────────────────────────────
    const validation = validateTruss(truss);
    if (!validation.valid) {
        return { success: false, message: validation.message };
    }

    // ── 2. Support reactions ─────────────────────────────────
    solveSupportReactions(truss);

    // ── 3. Method of Joints iteration ───────────────────────
    let progress = true;

    while (progress) {
        progress = false;

        for (const joint of truss.joints) {
            if (canSolveJoint(joint, truss)) {
                const ok = solveJoint(joint, truss);
                if (ok) progress = true;
            }
        }
    }

    // ── 4. Check completeness ────────────────────────────────
    const unsolved = truss.members.filter(m => !m.isSolved);

    if (unsolved.length > 0) {
        return {
            success: false,
            message: `Solver stalled — ${unsolved.length} member(s) could not be resolved.`,
        };
    }

    return { success: true, message: 'Truss solved successfully.' };
}
