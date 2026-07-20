/**
 * canvas.js — canvas setup, coordinate transform, zoom/pan, render loop.
 */

import { drawMembers }  from './drawMembers.js';
import { drawSupports } from './drawSupports.js';
import { drawJoints }   from './drawJoints.js';
import { drawForces }   from './drawForces.js';
import { drawGhost }    from './drawJoints.js';
import state            from '../ui/state.js';

let canvas, ctx;

export const transform = { offsetX: 0, offsetY: 0, scale: 1 };

const SCALE_MIN = 0.2;
const SCALE_MAX = 8;

// ── Init ──────────────────────────────────────────────────────

export function initCanvas(canvasEl) {
    canvas = canvasEl;
    ctx    = canvas.getContext('2d');
    fitToParent();
    window.addEventListener('resize', fitToParent);

    // ── Zoom (wheel) ─────────────────────────────────────────
    canvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        const rect   = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const zoomFactor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
        const newScale   = Math.min(SCALE_MAX, Math.max(SCALE_MIN, transform.scale * zoomFactor));

        // Zoom toward mouse position
        transform.offsetX = mouseX - (mouseX - transform.offsetX) * (newScale / transform.scale);
        transform.offsetY = mouseY - (mouseY - transform.offsetY) * (newScale / transform.scale);
        transform.scale   = newScale;

        // Re-render — need truss ref; stored on window by main.js
        if (window._truss) render(window._truss);
    }, { passive: false });

    // ── Pan (middle-mouse or space+drag) ─────────────────────
    let panning   = false;
    let panStartX = 0;
    let panStartY = 0;
    let panOriginX = 0;
    let panOriginY = 0;
    let spaceHeld  = false;

    window.addEventListener('keydown', (e) => {
        if (e.code === 'Space') { spaceHeld = true; canvas.style.cursor = 'grab'; }
    });
    window.addEventListener('keyup', (e) => {
        if (e.code === 'Space') { spaceHeld = false; canvas.style.cursor = ''; }
    });

    canvas.addEventListener('mousedown', (e) => {
        if (e.button === 1 || spaceHeld) {
            panning    = true;
            panStartX  = e.clientX;
            panStartY  = e.clientY;
            panOriginX = transform.offsetX;
            panOriginY = transform.offsetY;
            canvas.style.cursor = 'grabbing';
            e.preventDefault();
        }
    });

    window.addEventListener('mousemove', (e) => {
        if (!panning) return;
        transform.offsetX = panOriginX + (e.clientX - panStartX);
        transform.offsetY = panOriginY + (e.clientY - panStartY);
        if (window._truss) render(window._truss);
    });

    window.addEventListener('mouseup', (e) => {
        if (panning) {
            panning = false;
            canvas.style.cursor = spaceHeld ? 'grab' : '';
        }
    });
}

function fitToParent() {
    const parent = canvas.parentElement;
    // Only reset offset on first load (scale === 1 and offset === 0)
    const firstLoad = transform.offsetX === 0 && transform.offsetY === 0;
    canvas.width  = parent.clientWidth;
    canvas.height = parent.clientHeight;
    if (firstLoad) {
        transform.offsetX = canvas.width  / 2;
        transform.offsetY = canvas.height / 2;
    }
}

// ── Coordinate helpers ────────────────────────────────────────

export function worldToScreen(wx, wy) {
    return {
        x:  wx * transform.scale + transform.offsetX,
        y: -wy * transform.scale + transform.offsetY,
    };
}

export function screenToWorld(sx, sy) {
    return {
        x:  (sx - transform.offsetX) / transform.scale,
        y: -(sy - transform.offsetY) / transform.scale,
    };
}

// ── Main render ───────────────────────────────────────────────

export function render(truss) {
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawGrid(ctx, canvas, transform);
    drawMembers(ctx, truss, worldToScreen);
    drawSupports(ctx, truss, worldToScreen);
    drawJoints(ctx, truss, worldToScreen);
    drawForces(ctx, truss, worldToScreen);
    if (state.ghostJoint) drawGhost(ctx, state.ghostJoint, truss, worldToScreen);
    drawZoomIndicator(ctx, canvas, transform);
}

function drawZoomIndicator(ctx, canvas, t) {
    const pct = Math.round(t.scale * 100);
    const text = `${pct}%`;
    ctx.save();
    ctx.font         = '10px monospace';
    ctx.fillStyle    = '#2e3450';
    ctx.textAlign    = 'right';
    ctx.textBaseline = 'bottom';
    ctx.fillText(text, canvas.width - 10, canvas.height - 8);
    ctx.restore();
}

// ── Grid ──────────────────────────────────────────────────────

function drawGrid(ctx, canvas, t) {
    const { minorGrid, majorGrid } = state;
    const w = canvas.width;
    const h = canvas.height;

    ctx.save();

    // ── Minor grid ────────────────────────────────────────────
    const minorPx = minorGrid * t.scale;
    if (minorPx >= 4) {          // don't draw when too dense
        ctx.strokeStyle = '#161929';
        ctx.lineWidth   = 0.5;

        const x0 = ((t.offsetX % minorPx) + minorPx) % minorPx;
        const y0 = ((t.offsetY % minorPx) + minorPx) % minorPx;

        for (let x = x0; x < w; x += minorPx) {
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
        }
        for (let y = y0; y < h; y += minorPx) {
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
        }
    }

    // ── Major grid ────────────────────────────────────────────
    const majorPx = majorGrid * t.scale;
    const x0m = ((t.offsetX % majorPx) + majorPx) % majorPx;
    const y0m = ((t.offsetY % majorPx) + majorPx) % majorPx;

    for (let x = x0m; x < w; x += majorPx) {
        const isAxis = Math.abs(x - t.offsetX) < 0.5;
        ctx.strokeStyle = isAxis ? '#2e3860' : '#1d2235';
        ctx.lineWidth   = isAxis ? 1.5 : 1;
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }
    for (let y = y0m; y < h; y += majorPx) {
        const isAxis = Math.abs(y - t.offsetY) < 0.5;
        ctx.strokeStyle = isAxis ? '#2e3860' : '#1d2235';
        ctx.lineWidth   = isAxis ? 1.5 : 1;
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }

    ctx.restore();
}
