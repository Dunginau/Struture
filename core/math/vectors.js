/**
 * vectors.js — low-level 2D vector operations.
 *
 * All functions work on plain {x, y} objects.
 * None of these know anything about trusses.
 */

/** @param {{x,y}} a @param {{x,y}} b @returns {{x,y}} */
export function add(a, b) {
    return { x: a.x + b.x, y: a.y + b.y };
}

/** @param {{x,y}} a @param {{x,y}} b @returns {{x,y}} */
export function sub(a, b) {
    return { x: a.x - b.x, y: a.y - b.y };
}

/** @param {{x,y}} v @param {number} s @returns {{x,y}} */
export function scale(v, s) {
    return { x: v.x * s, y: v.y * s };
}

/** @param {{x,y}} v @returns {number} */
export function magnitude(v) {
    return Math.sqrt(v.x ** 2 + v.y ** 2);
}

/**
 * Unit vector of v.
 * Returns {x:0, y:0} for zero vectors (caller must guard).
 * @param {{x,y}} v @returns {{x,y}}
 */
export function normalize(v) {
    const mag = magnitude(v);
    if (mag === 0) return { x: 0, y: 0 };
    return { x: v.x / mag, y: v.y / mag };
}

/** @param {{x,y}} a @param {{x,y}} b @returns {number} */
export function dot(a, b) {
    return a.x * b.x + a.y * b.y;
}

/**
 * Sum an array of vectors.
 * @param {{x,y}[]} vectors @returns {{x,y}}
 */
export function sumVectors(vectors) {
    return vectors.reduce(add, { x: 0, y: 0 });
}
