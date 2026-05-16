/**
 * inputs.js — reusable form input helpers.
 *
 * Provides small factory functions for building labelled input fields
 * used by panels.js for editing joint/member/force properties.
 *
 * TODO: full UI design pass — layout and styles to be configured later.
 */

/**
 * Create a labelled number input.
 *
 * @param {string}   label
 * @param {number}   value
 * @param {function} onChange  - called with the new number value
 * @returns {HTMLElement}
 */
export function numberInput(label, value, onChange) {
    const wrapper = document.createElement('div');
    wrapper.className = 'input-row';

    const lbl = document.createElement('label');
    lbl.textContent = label;

    const input = document.createElement('input');
    input.type  = 'number';
    input.value = value;
    input.addEventListener('change', () => onChange(parseFloat(input.value)));

    wrapper.appendChild(lbl);
    wrapper.appendChild(input);
    return wrapper;
}

/**
 * Create a labelled select dropdown.
 *
 * @param {string}   label
 * @param {string[]} options
 * @param {string}   current
 * @param {function} onChange  - called with the selected string
 * @returns {HTMLElement}
 */
export function selectInput(label, options, current, onChange) {
    const wrapper = document.createElement('div');
    wrapper.className = 'input-row';

    const lbl = document.createElement('label');
    lbl.textContent = label;

    const select = document.createElement('select');
    for (const opt of options) {
        const el = document.createElement('option');
        el.value       = opt;
        el.textContent = opt || '—';
        if (opt === current) el.selected = true;
        select.appendChild(el);
    }
    select.addEventListener('change', () => onChange(select.value));

    wrapper.appendChild(lbl);
    wrapper.appendChild(select);
    return wrapper;
}

/**
 * Create a section heading.
 * @param {string} text @returns {HTMLElement}
 */
export function sectionHeading(text) {
    const h = document.createElement('h3');
    h.className   = 'panel-heading';
    h.textContent = text;
    return h;
}
