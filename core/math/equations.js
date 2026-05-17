/**
 * equations.js — linear system solver.
 *
 * Solves  A·x = b  using Gaussian elimination with partial pivoting.
 * Returns the solution vector x, or null if the system is singular.
 *
 * Used by solveJoint.js to resolve the ΣFx = 0 / ΣFy = 0 system
 * at each joint.
 */

/**
 * Solve A·x = b via Gaussian elimination (partial pivoting).
 *
 * @param {number[][]} A  - n×n coefficient matrix
 * @param {number[]}   b  - right-hand side vector (length n)
 * @returns {number[]|null} solution vector x, or null if singular
 */
export function solveLinearSystem(A, b) {
    const n = b.length;

    // Build augmented matrix [A | b]
    const M = A.map((row, i) => [...row, b[i]]);

    for (let col = 0; col < n; col++) {

        // ── Partial pivot ────────────────────────────────────
        let maxRow  = col;
        let maxVal  = Math.abs(M[col][col]);

        for (let row = col + 1; row < n; row++) {
            if (Math.abs(M[row][col]) > maxVal) {
                maxVal = Math.abs(M[row][col]);
                maxRow = row;
            }
        }

        [M[col], M[maxRow]] = [M[maxRow], M[col]];

        // ── Check singularity ────────────────────────────────
        if (Math.abs(M[col][col]) < 1e-12) return null;

        // ── Eliminate below ──────────────────────────────────
        for (let row = col + 1; row < n; row++) {
            const factor = M[row][col] / M[col][col];
            for (let k = col; k <= n; k++) {
                M[row][k] -= factor * M[col][k];
            }
        }
    }

    // ── Back-substitution ────────────────────────────────────
    const x = new Array(n).fill(0);

    for (let i = n - 1; i >= 0; i--) {
        let sum = M[i][n];
        for (let j = i + 1; j < n; j++) {
            sum -= M[i][j] * x[j];
        }
        x[i] = sum / M[i][i];
    }

    return x;
}
