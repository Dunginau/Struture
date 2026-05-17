/**
 * panels.js — right-hand side panel.
 *
 * Reacts to state changes:
 *   state.selectedJoint  → shows force input form
 *   state.solveResult    → shows member forces + reactions
 */

import state from './state.js';
import { render } from '../renderer/canvas.js';

let trussRef = null;

/** @param {import('../core/entities/Truss.js').default} truss */
export function initPanels(truss) {
    trussRef = truss;

    const panel = document.getElementById('panel');
    if (!panel) return;

    panel.innerHTML = `
        <div class="panel-header">
            <span class="panel-header-title">Inspector</span>
            <span class="panel-header-badge" id="panel-badge">—</span>
        </div>
        <div class="panel-body" id="panel-body"></div>
    `;

    // React to state changes
    state.on('selectedJoint', () => updatePanel());
    state.on('solveResult',   () => updatePanel());
    state.on('activeTool',    () => updatePanel());

    updatePanel();
}

function updatePanel() {
    const body    = document.getElementById('panel-body');
    const badge   = document.getElementById('panel-badge');
    if (!body || !trussRef) return;

    body.innerHTML = '';

    const joint  = state.selectedJoint;
    const result = state.solveResult;
    const tool   = state.activeTool;

    // ── Support tool ──────────────────────────────────────────
    if (tool === 'addSupport' && joint) {
        badge.textContent = `J${joint.id}`;
        body.appendChild(buildSupportForm(joint, trussRef));

    } else if (tool === 'addSupport' && !joint) {
        badge.textContent = '—';
        body.appendChild(emptyState('△', 'Select a joint\non the canvas\nto assign a support.'));

    // ── Force tool + joint selected → force input form ────────
    } else if (tool === 'addForce' && joint) {
        badge.textContent = `J${joint.id}`;
        body.appendChild(buildForceForm(joint, trussRef));

    } else if (tool === 'addForce' && !joint) {
        badge.textContent = '—';
        body.appendChild(emptyState('↓F', 'Select a joint\non the canvas\nto add a force.'));

    } else {
        badge.textContent = '—';
    }

    // ── Display options (always visible) ─────────────────────
    body.appendChild(buildDisplaySection());

    // ── Solve button always visible ───────────────────────────
    const solveBtn = document.createElement('button');
    solveBtn.className   = 'solve-panel-btn';
    solveBtn.innerHTML   = '⚡&nbsp; Solve Truss';
    solveBtn.addEventListener('click', () => window.onSolve?.());

    const solveSection = document.createElement('div');
    solveSection.className = 'panel-section';
    solveSection.appendChild(solveBtn);
    body.appendChild(solveSection);

    // ── Results ───────────────────────────────────────────────
    if (result) {
        body.appendChild(buildResults(result, trussRef));
    } else if (tool !== 'addForce') {
        body.appendChild(emptyState('◈', 'Build your truss,\nadd forces, then\nclick Solve.'));
    }
}

// ── Display Options Section ───────────────────────────────────

function buildDisplaySection() {
    const section = div('panel-section');
    section.appendChild(el('span', 'section-label', 'Display'));

    const rows = div('');

    // ── Show angles toggle ────────────────────────────────────
    rows.appendChild(toggleRow(
        'Member angles',
        state.showAngles,
        (val) => {
            state.set({ showAngles: val });
            if (trussRef) render(trussRef);
        }
    ));

    // ── Show lengths toggle ───────────────────────────────────
    rows.appendChild(toggleRow(
        'Member lengths',
        state.showLengths,
        (val) => {
            state.set({ showLengths: val });
            if (trussRef) render(trussRef);
        }
    ));

    // ── Snap to grid toggle ───────────────────────────────────
    rows.appendChild(toggleRow(
        'Snap to grid',
        state.snapToGrid,
        (val) => { state.set({ snapToGrid: val }); }
    ));

    section.appendChild(rows);
    return section;
}

function toggleRow(label, checked, onChange) {
    const row = div('toggle-row');
    row.appendChild(el('span', 'toggle-label', label));

    const wrapper = div('toggle-switch');
    const input   = document.createElement('input');
    input.type    = 'checkbox';
    input.checked = checked;
    input.addEventListener('change', () => onChange(input.checked));

    const track = div('toggle-track');
    wrapper.append(input, track);
    row.appendChild(wrapper);
    return row;
}

// ── Support Form ──────────────────────────────────────────────

const SUPPORT_TYPES = [
    {
        id:   'pin',
        name: 'Pin',
        desc: 'Rx + Ry  ·  allows rotation',
    },
    {
        id:   'roller',
        name: 'Roller',
        desc: 'Ry only  ·  allows rotation + horizontal slide',
    },
    {
        id:   'fixed',
        name: 'Fixed',
        desc: 'Rx + Ry + M  ·  no movement, no rotation',
    },
];

function buildSupportForm(joint, truss) {
    const section = div('panel-section');
    section.appendChild(el('span', 'section-label', 'Support Condition'));

    const form = div('force-form');

    // Joint badge
    form.appendChild(el('span', 'joint-badge', `● Joint ${joint.id}  (${joint.x}, ${joint.y})`));

    // Current status
    const currentWrap = div('');
    if (joint.support) {
        const chip = el('span', 'current-support-chip',
            `△ ${joint.support.charAt(0).toUpperCase() + joint.support.slice(1)} assigned`);
        currentWrap.appendChild(chip);
    } else {
        currentWrap.appendChild(el('span', 'no-support-chip', 'No support assigned'));
    }
    form.appendChild(currentWrap);

    // Radio options
    const optionsWrap = div('support-options');
    let selectedType = joint.support || 'pin';

    const radioEls = [];

    for (const type of SUPPORT_TYPES) {
        const label = document.createElement('label');
        label.className = 'support-radio' + (selectedType === type.id ? ' selected' : '');

        const radio = document.createElement('input');
        radio.type  = 'radio';
        radio.name  = `support-j${joint.id}`;
        radio.value = type.id;
        radio.checked = selectedType === type.id;

        radio.addEventListener('change', () => {
            selectedType = type.id;
            radioEls.forEach(({ el, id }) =>
                el.classList.toggle('selected', id === selectedType)
            );
        });

        const info = div('support-radio-info');
        info.appendChild(el('span', 'support-radio-name', type.name));
        info.appendChild(el('span', 'support-radio-desc', type.desc));

        label.append(radio, info);
        optionsWrap.appendChild(label);
        radioEls.push({ el: label, id: type.id });
    }
    form.appendChild(optionsWrap);

    // Apply / Remove buttons
    const btnRow = div('btn-row');

    const applyBtn = document.createElement('button');
    applyBtn.className   = 'btn btn-primary';
    applyBtn.textContent = 'Assign';
    applyBtn.addEventListener('click', () => {
        joint.support = selectedType;
        truss.resetSolution();
        state.set({ solveResult: null });
        render(truss);
        updatePanel();
    });

    const removeBtn = document.createElement('button');
    removeBtn.className   = 'btn btn-danger';
    removeBtn.textContent = 'Remove';
    removeBtn.disabled    = !joint.support;
    removeBtn.addEventListener('click', () => {
        joint.support = null;
        joint.rx = 0;
        joint.ry = 0;
        truss.resetSolution();
        state.set({ solveResult: null });
        render(truss);
        updatePanel();
    });

    btnRow.append(applyBtn, removeBtn);
    form.appendChild(btnRow);
    section.appendChild(form);
    return section;
}

// ── Force Form ────────────────────────────────────────────────

function buildForceForm(joint, truss) {
    const section = div('panel-section');

    const label = el('span', 'section-label', 'External Force');
    section.appendChild(label);

    const form = div('force-form');

    // Joint badge
    const badge = el('span', 'joint-badge', `● Joint ${joint.id}  (${joint.x}, ${joint.y})`);
    form.appendChild(badge);

    // Fx input
    const fxRow = div('input-row');
    fxRow.appendChild(el('label', '', 'Fx  (→ positive)'));
    const fxInput = document.createElement('input');
    fxInput.type  = 'number';
    fxInput.value = '0';
    fxInput.placeholder = '0';
    fxRow.appendChild(fxInput);
    form.appendChild(fxRow);

    // Fy input
    const fyRow = div('input-row');
    fyRow.appendChild(el('label', '', 'Fy  (↑ positive)'));
    const fyInput = document.createElement('input');
    fyInput.type  = 'number';
    fyInput.value = '0';
    fyInput.placeholder = '0';
    fyRow.appendChild(fyInput);
    form.appendChild(fyRow);

    const hint = el('span', 'input-hint', '+ tension convention  ·  − compression');
    form.appendChild(hint);

    // Apply button
    const btnRow = div('btn-row');
    const applyBtn = document.createElement('button');
    applyBtn.className   = 'btn btn-primary';
    applyBtn.textContent = 'Apply Force';
    applyBtn.addEventListener('click', () => {
        const fx = parseFloat(fxInput.value) || 0;
        const fy = parseFloat(fyInput.value) || 0;
        truss.addForce(joint.id, fx, fy);
        truss.resetSolution();
        state.set({ solveResult: null });
        render(truss);
        fxInput.value = '0';
        fyInput.value = '0';
        // Refresh the applied forces list
        updatePanel();
    });
    btnRow.appendChild(applyBtn);
    form.appendChild(btnRow);

    section.appendChild(form);

    // Applied forces on this joint
    const jointForces = truss.forcesAtJoint(joint.id);
    if (jointForces.length > 0) {
        section.appendChild(buildForceList(joint, truss));
    }

    return section;
}

function buildForceList(joint, truss) {
    const section = div('panel-section');
    section.appendChild(el('span', 'section-label', `Applied at J${joint.id}`));

    const list = div('force-list');

    for (const force of truss.forcesAtJoint(joint.id)) {
        const chip = div('force-chip');
        const dot  = div('force-chip-dot');
        const lbl  = el('span', 'force-chip-label', `F${force.id}`);
        const val  = el('span', 'force-chip-val',
            `(${signed(force.fx)}, ${signed(force.fy)})`);

        const delBtn = document.createElement('button');
        delBtn.className   = 'force-chip-del';
        delBtn.textContent = '×';
        delBtn.title       = 'Remove force';
        delBtn.addEventListener('click', () => {
            truss.forces = truss.forces.filter(f => f.id !== force.id);
            truss.resetSolution();
            state.set({ solveResult: null });
            render(truss);
            updatePanel();
        });

        chip.append(dot, lbl, val, delBtn);
        list.appendChild(chip);
    }

    section.appendChild(list);
    return section;
}

// ── Results ───────────────────────────────────────────────────

function buildResults(result, truss) {
    const section = div('panel-section');

    // Status banner
    const status = div('result-status ' + (result.success ? 'success' : 'error'));
    status.textContent = result.success ? '✓  ' + result.message : '✕  ' + result.message;
    section.appendChild(status);

    if (!result.success) return section;

    // ── Member forces table ───────────────────────────────────
    section.appendChild(el('span', 'section-label', 'Member Forces'));

    const table = document.createElement('table');
    table.className = 'results-table';
    const thead = table.createTHead();
    const hrow  = thead.insertRow();
    ['Member', 'Force', 'State'].forEach(t => {
        const th = document.createElement('th');
        th.textContent = t;
        hrow.appendChild(th);
    });

    const tbody = table.createTBody();
    for (const m of truss.members) {
        if (m.force === null) continue;
        const row   = tbody.insertRow();
        const state = m.force >= 0 ? 'T' : 'C';

        const tdId    = row.insertCell(); tdId.className = 'member-id';
        tdId.textContent = `M${m.id}`;

        const tdF = row.insertCell();
        tdF.textContent = `${m.force >= 0 ? '+' : ''}${m.force.toFixed(2)}`;
        tdF.style.color = m.force >= 0 ? 'var(--tension)' : 'var(--compression)';

        const tdS = row.insertCell();
        tdS.innerHTML = `<span class="badge-${state}">${state === 'T' ? 'Tension' : 'Compres'}</span>`;
    }

    section.appendChild(table);

    // ── Reactions ─────────────────────────────────────────────
    const supports = truss.joints.filter(j => j.support);
    if (supports.length > 0) {
        section.appendChild(el('span', 'section-label', 'Reactions'));
        const rlist = div('');
        for (const j of supports) {
            if (Math.abs(j.rx) > 1e-6) {
                rlist.appendChild(reactionRow(`J${j.id}  Rx`, j.rx));
            }
            if (Math.abs(j.ry) > 1e-6) {
                rlist.appendChild(reactionRow(`J${j.id}  Ry`, j.ry));
            }
        }
        section.appendChild(rlist);
    }

    return section;
}

function reactionRow(label, val) {
    const row = div('reaction-row');
    row.appendChild(el('span', 'reaction-label', label));
    row.appendChild(el('span', 'reaction-val', `${val >= 0 ? '+' : ''}${val.toFixed(2)}`));
    return row;
}

// ── Empty state ───────────────────────────────────────────────

function emptyState(icon, msg) {
    const d = div('panel-empty');
    d.innerHTML = `<span class="panel-empty-icon">${icon}</span>${msg.replace(/\n/g, '<br>')}`;
    return d;
}

// ── DOM helpers ───────────────────────────────────────────────

function div(cls) {
    const d = document.createElement('div');
    if (cls) d.className = cls;
    return d;
}

function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls)  e.className   = cls;
    if (text) e.textContent = text;
    return e;
}

function signed(n) {
    return (n >= 0 ? '+' : '') + n;
}
