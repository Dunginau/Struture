import Truss  from './core/entities/Truss.js';
import { initCanvas, render } from './renderer/canvas.js';
import { initMouse }    from './ui/mouse.js';
import { initToolbar }  from './ui/toolbar.js';
import { initPanels }   from './ui/panels.js';
import { solveTrussRemote } from './core/client/solverClient.js';
import state            from './ui/state.js';

// ── Bootstrap ────────────────────────────────────────────────
const canvas = document.getElementById('truss-canvas');
const truss  = new Truss();
window._truss = truss;  // needed by canvas.js zoom/pan handler

initCanvas(canvas);
initToolbar(truss);
initPanels(truss);
initMouse(canvas, truss);

render(truss);

// ── Solve ─────────────────────────────────────────────────────
// Solving now happens server-side (backend/core/solver.py). This just
// sends the truss over the wire and applies whatever comes back.
window.onSolve = async () => {
    const result = await solveTrussRemote(truss);
    state.set({ solveResult: result });
    render(truss);
};
