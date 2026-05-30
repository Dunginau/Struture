/**
 * Converts a 1-based index to an alphabetic label (A, B, ..., Z, AA, AB, ...).
 * @param {number} n - 1-based index
 * @returns {string}
 */
export function getAlphabetLabel(n) {
    let label = '';
    while (n > 0) {
        let remainder = (n - 1) % 26;
        label = String.fromCharCode(65 + remainder) + label;
        n = Math.floor((n - 1) / 26);
    }
    return label;
}
