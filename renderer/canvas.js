/**
 * canvas.js — canvas setup and main render orchestrator.
 */

import { drawMembers }  from './drawMembers.js';
import { drawSupports } from './drawSupports.js';
import { drawJoints }   from './drawJoints.js';
import { drawForces }   from './drawForces.js';

let canvas, ctx;

export const transform = { offsetX: 0, offsetY: 0, scale: 1 };

export function initCanvas(canvasEl) {
    canvas = canvasEl;
    ctx    = canvas.getContext('2d');
    fitToParent();
    window.addEventListener('resize', () => { fitToParent(); });
}

function fitToParent() {
    const parent     = canvas.parentElement;
    canvas.width     = parent.clientWidth;
    canvas.height    = parent.clientHeight;
    transform.offsetX = canvas.width  / 2;
    transform.offsetY = canvas.height / 2;
}

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

export function render(truss) {
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawGrid(ctx, canvas, transform);
    drawMembers(ctx, truss, worldToScreen);
    drawSupports(ctx, truss, worldToScreen);
    drawJoints(ctx, truss, worldToScreen);
    drawForces(ctx, truss, worldToScreen);
}

function drawGrid(ctx, canvas, t) {
    const spacing = 50 * t.scale;
    const w = canvas.width, h = canvas.height;

    ctx.save();
    ctx.strokeStyle = '#181c27';
    ctx.lineWidth   = 1;

    // Axis lines slightly brighter
    const drawLine = (x1, y1, x2, y2, bright) => {
        ctx.strokeStyle = bright ? '#222840' : '#181c27';
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
    };

    for (let x = t.offsetX % spacing; x < w; x += spacing) {
        drawLine(x, 0, x, h, Math.abs(x - t.offsetX) < 0.5);
    }
    for (let y = t.offsetY % spacing; y < h; y += spacing) {
        drawLine(0, y, w, y, Math.abs(y - t.offsetY) < 0.5);
    }

    ctx.restore();
}
