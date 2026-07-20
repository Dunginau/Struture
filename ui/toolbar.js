/**
 * toolbar.js — left toolbar buttons.
 *
 * Tool buttons update state.activeTool.
 * Solve and Clear buttons are at the bottom.
 */

import state from './state.js';
import { render } from '../renderer/canvas.js';
import { downloadTruss, deserializeTruss } from '../core/utils/serialization.js';

const TOOLS = [
    { id: 'select',     label: '↖',  title: 'Select'       },
    { id: 'addJoint',   label: '●',  title: 'Add Joint'    },
    { id: 'addMember',  label: '╱',  title: 'Add Member'   },
    { id: 'addSupport', label: '△',  title: 'Add Support'  },
    { id: 'addForce',   label: '↓F', title: 'Add Force'    },
    { id: 'delete',     label: '✕',  title: 'Delete'       },
];

let toolBtns = [];

/** @param {import('../core/entities/Truss.js').default} truss */
export function initToolbar(truss) {
    const toolbar = document.getElementById('toolbar');
    if (!toolbar) return;

    // ── Tool buttons ──────────────────────────────────────────
    for (const tool of TOOLS) {
        const btn = document.createElement('button');
        btn.textContent  = tool.label;
        btn.title        = tool.title;
        btn.className    = 'tool-btn';
        btn.dataset.tool = tool.id;

        btn.addEventListener('click', () => {
            state.set({ activeTool: tool.id, selectedJoint: null });
        });

        toolbar.appendChild(btn);
        toolBtns.push(btn);
    }

    // Sync active class when tool changes
    state.on('activeTool', (tool) => {
        toolBtns.forEach(b => b.classList.toggle('active', b.dataset.tool === tool));
    });

    // Set default active
    toolBtns[0].classList.add('active');

    // ── Divider ───────────────────────────────────────────────
    const div1 = document.createElement('div');
    div1.className = 'toolbar-divider';
    toolbar.appendChild(div1);

    // ── Solve ─────────────────────────────────────────────────
    const solveBtn = document.createElement('button');
    solveBtn.innerHTML  = '⚡';
    solveBtn.title      = 'Solve Truss';
    solveBtn.className  = 'tool-btn solve-btn';
    solveBtn.addEventListener('click', () => window.onSolve?.());
    toolbar.appendChild(solveBtn);

    // ── Save ──────────────────────────────────────────────────
    const saveBtn = document.createElement('button');
    saveBtn.innerHTML  = '💾';
    saveBtn.title      = 'Save to File';
    saveBtn.className  = 'tool-btn';
    saveBtn.style.color = 'var(--accent)';
    saveBtn.addEventListener('click', () => downloadTruss(truss));
    toolbar.appendChild(saveBtn);

    // ── Load ──────────────────────────────────────────────────
    const loadBtn = document.createElement('button');
    loadBtn.innerHTML = '📂';
    loadBtn.title     = 'Load from File';
    loadBtn.className = 'tool-btn';

    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.json';
    fileInput.style.display = 'none';

    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                deserializeTruss(truss, event.target.result);
                state.set({ selectedJoint: null, solveResult: null });
                render(truss);
            } catch (err) {
                console.error("Failed to load truss:", err);
                alert("Invalid truss file.");
            }
        };
        reader.readAsText(file);
        fileInput.value = ''; // Reset
    });

    loadBtn.addEventListener('click', () => fileInput.click());
    toolbar.appendChild(loadBtn);
    toolbar.appendChild(fileInput);

    // ── Divider ───────────────────────────────────────────────
    const div2 = document.createElement('div');
    div2.className = 'toolbar-divider';
    toolbar.appendChild(div2);

    // ── Clear ─────────────────────────────────────────────────
    const clearBtn = document.createElement('button');
    clearBtn.innerHTML = '⊘';
    clearBtn.title     = 'Clear All';
    clearBtn.className = 'tool-btn';
    clearBtn.addEventListener('click', () => {
        truss.clear();
        state.set({ selectedJoint: null, solveResult: null });
        render(truss);
    });
    toolbar.appendChild(clearBtn);
}
