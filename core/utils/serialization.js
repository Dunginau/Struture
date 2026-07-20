/**
 * serialization.js — Save/Load functionality.
 */

import { distance } from './geometry.js';

/**
 * Converts the current truss state into a comprehensive JSON string.
 * Includes geometry, applied loads, and solved results.
 *
 * @param {import('../entities/Truss.js').default} truss
 * @returns {string}
 */
export function serializeTruss(truss) {
    const data = {
        version: "1.0",
        timestamp: new Date().toISOString(),
        joints: truss.joints.map(j => ({
            id: j.id,
            x: j.x,
            y: j.y,
            support: j.support,
            reactions: {
                rx: j.rx || 0,
                ry: j.ry || 0
            }
        })),
        members: truss.members.map(m => {
            const jA = truss.getJoint(m.jointA);
            const jB = truss.getJoint(m.jointB);

            // Vector from A to B
            const dx = jB.x - jA.x;
            const dy = jB.y - jA.y;

            const len = distance(jA.x, jA.y, jB.x, jB.y);

            // Angle to x-positive (in degrees, 0-360)
            let angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI;
            if (angleDeg < 0) angleDeg += 360;

            return {
                id: m.id,
                jointA: m.jointA,
                jointB: m.jointB,
                length: parseFloat(len.toFixed(4)),
                vector: { x: parseFloat(dx.toFixed(4)), y: parseFloat(dy.toFixed(4)) },
                angle:  parseFloat(angleDeg.toFixed(2)),
                force:  m.force !== null ? parseFloat(m.force.toFixed(4)) : null,
                state:  m.force === null ? null : (m.force >= 0 ? 'tension' : 'compression')
            };
        }),
        forces: truss.forces.map(f => ({
            id: f.id,
            jointId: f.jointId,
            vector: {
                fx: f.fx,
                fy: f.fy
            }
        }))
    };

    return JSON.stringify(data, null, 2);
}

/**
 * Triggers a browser download for the truss data.
 *
 * @param {import('../entities/Truss.js').default} truss
 */
export function downloadTruss(truss) {
    const json = serializeTruss(truss);
    const blob = new Blob([json], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `truss_design_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    URL.revokeObjectURL(url);
}

/**
 * Reconstructs a truss from a JSON string.
 *
 * @param {import('../entities/Truss.js').default} truss
 * @param {string} jsonString
 */
export function deserializeTruss(truss, jsonString) {
    const data = JSON.parse(jsonString);

    // Start with a clean slate
    truss.clear();

    // Map old IDs from JSON -> new IDs in the live Truss object
    const idMap = new Map();

    // 1. Reconstruct Joints
    if (Array.isArray(data.joints)) {
        for (const j of data.joints) {
            const newJoint = truss.addJoint(j.x, j.y, j.support);
            idMap.set(j.id, newJoint.id);
        }
    }

    // 2. Reconstruct Members
    if (Array.isArray(data.members)) {
        for (const m of data.members) {
            const jAId = idMap.get(m.jointA);
            const jBId = idMap.get(m.jointB);

            if (jAId !== undefined && jBId !== undefined) {
                truss.addMember(jAId, jBId);
            }
        }
    }

    // 3. Forces are explicitly ignored per requirements to "keep all forces value empty"
}
