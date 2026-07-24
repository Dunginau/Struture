/**
 * solverClient.js — talks to the Python solver backend.
 *
 * Replaces the old in-browser solveTruss() call. Sends the live Truss's
 * joints/members/forces to POST /api/solve and applies the returned
 * member forces + support reactions back onto the Truss entities, so
 * the renderer (drawMembers.js, drawSupports.js) needs no changes.
 *
 * Wire format sent/received matches backend/app.py's TrussIn schema.
 */

const API_URL = 'http://localhost:8000/api/solve';

/**
 * @param {import('../entities/Truss.js').default} truss
 * @returns {Promise<{success: boolean, message: string}>}
 */
export async function solveTrussRemote(truss) {
    const payload = {
        joints: truss.joints.map(j => ({
            id: j.id,
            x: j.x,
            y: j.y,
            support: j.support,
        })),
        members: truss.members.map(m => ({
            id: m.id,
            jointA: m.jointA,
            jointB: m.jointB,
        })),
        forces: truss.forces.map(f => ({
            id: f.id,
            jointId: f.jointId,
            fx: f.fx,
            fy: f.fy,
        })),
    };

    let result;
    try {
        const res = await fetch(API_URL, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify(payload),
        });

        if (!res.ok) {
            const detail = await res.text();
            return { success: false, message: `Solver backend error: ${detail}` };
        }
        result = await res.json();
    } catch (err) {
        return { success: false, message: `Could not reach solver backend: ${err.message}` };
    }

    // Reset solution before applying — mirrors the old truss.resetSolution()
    truss.members.forEach(m => { m.force = null; });
    truss.joints.forEach(j  => { j.rx = 0; j.ry = 0; });

    if (result.success) {
        for (const member of truss.members) {
            if (member.id in result.member_forces) {
                member.force = result.member_forces[member.id];
            }
        }
        for (const joint of truss.joints) {
            const r = result.reactions?.[joint.id];
            if (r) {
                joint.rx = r.rx;
                joint.ry = r.ry;
            }
        }
    }

    return { success: result.success, message: result.message };
}
