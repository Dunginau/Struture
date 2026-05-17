/**
 * validation.js
 *
 * Checks whether the truss is physically valid before solving.
 * Based on the solvability condition from the tutorial:
 *
 *   m + r = 2j
 *
 * where m = members, r = reaction components, j = joints.
 *
 * Returns { valid: boolean, message: string }.
 */

import { isSamePoint } from './geometry.js';

/**
 * @param {import('../entities/Truss.js').default} truss
 * @returns {{ valid: boolean, message: string }}
 */
export function validateTruss(truss) {
    // ── 1. Minimum size ───────────────────────────────────────
    if (truss.joints.length < 2) {
        return fail('Truss needs at least 2 joints.');
    }
    if (truss.members.length < 1) {
        return fail('Truss needs at least 1 member.');
    }

    // ── 2. Zero-length members ────────────────────────────────
    for (const member of truss.members) {
        const jA = truss.getJoint(member.jointA);
        const jB = truss.getJoint(member.jointB);
        if (!jA || !jB) {
            return fail(`Member ${member.id} references a missing joint.`);
        }
        if (isSamePoint(jA.x, jA.y, jB.x, jB.y)) {
            return fail(`Member ${member.id} has zero length (joints overlap).`);
        }
    }

    // ── 3. Floating joints (no connected members) ─────────────
    for (const joint of truss.joints) {
        if (truss.membersAtJoint(joint.id).length === 0) {
            return fail(`Joint ${joint.id} is floating (no connected members).`);
        }
    }

    // ── 4. Supports ───────────────────────────────────────────
    const supports = truss.joints.filter(j => j.support !== null);
    if (supports.length < 1) {
        return fail('Truss must have at least one support joint.');
    }

    const totalReactions = supports.reduce((s, j) => s + reactionCount(j.support), 0);
    if (totalReactions < 3) {
        return fail(
            `Only ${totalReactions} reaction component(s) — need exactly 3 to be determinate. ` +
            'Try: one pin + one roller'
        );
    }
    if (totalReactions > 3) {
        return fail(
            `${totalReactions} reaction components — truss is statically indeterminate ` +
            'for the Method of Joints. Reduce supports.'
        );
    }

    // ── 5. Determinacy check: m + r = 2j ─────────────────────
    const m = truss.members.length;
    const j = truss.joints.length;
    const r = supports.reduce((sum, s) => sum + reactionCount(s.support), 0);

    if (m + r < 2 * j) {
        return fail(
            `Truss is a mechanism (m+r < 2j): ${m}+${r} < ${2 * j}. Add more members or supports.`
        );
    }
    if (m + r > 2 * j) {
        return fail(
            `Truss is statically indeterminate (m+r > 2j): ${m}+${r} > ${2 * j}. ` +
            'The Method of Joints cannot solve indeterminate structures.'
        );
    }

    return { valid: true, message: 'OK' };
}

// ── Helpers ──────────────────────────────────────────────────

function fail(message) {
    return { valid: false, message };
}

/** Number of force reaction components provided by each support type.
 *  Fixed provides Rx + Ry as force reactions (moment reaction is
 *  separate and doesn't enter the Method of Joints). */
function reactionCount(supportType) {
    switch (supportType) {
        case 'pin':    return 2; // Rx, Ry
        case 'roller': return 1; // Ry only
        case 'fixed':  return 2; // Rx, Ry  (moment handled globally)
        default:       return 0;
    }
}
