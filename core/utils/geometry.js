/**
 * geometry.js — coordinate and vector helper functions.
 *
 * Not truss-specific. Works on raw numbers.
 * Always derive directions from coordinates — never store angles.
 */

/**
 * Euclidean distance between two points.
 * @param {number} x1 @param {number} y1
 * @param {number} x2 @param {number} y2
 * @returns {number}
 */
export function distance(x1, y1, x2, y2) {
    return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

/**
 * Raw direction vector from (x1,y1) to (x2,y2).
 * @returns {{x: number, y: number}}
 */
export function directionVector(x1, y1, x2, y2) {
    return { x: x2 - x1, y: y2 - y1 };
}

/**
 * Unit vector from (x1,y1) toward (x2,y2).
 * Returns {x:0, y:0} if the two points are identical.
 * @returns {{x: number, y: number}}
 */
export function unitVector(x1, y1, x2, y2) {
    const dx  = x2 - x1;
    const dy  = y2 - y1;
    const mag = Math.sqrt(dx * dx + dy * dy);
    if (mag < 1e-12) return { x: 0, y: 0 };
    return { x: dx / mag, y: dy / mag };
}

/**
 * Midpoint between two points.
 * @returns {{x: number, y: number}}
 */
export function midpoint(x1, y1, x2, y2) {
    return { x: (x1 + x2) / 2, y: (y1 + y2) / 2 };
}

/**
 * Project vector v onto unit vector u.
 * @param {{x,y}} v @param {{x,y}} u @returns {number}
 */
export function projectVector(v, u) {
    return v.x * u.x + v.y * u.y;
}

/**
 * Check whether two points are closer than a given threshold.
 * Used by validation to detect zero-length members.
 * @param {number} x1 @param {number} y1
 * @param {number} x2 @param {number} y2
 * @param {number} [eps=1e-6]
 * @returns {boolean}
 */
export function isSamePoint(x1, y1, x2, y2, eps = 1e-6) {
    return distance(x1, y1, x2, y2) < eps;
}
