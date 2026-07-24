# Structure.2 — Project Context (AI-Optimized)

## Purpose
Interactive 2D truss analysis tool. Users draw trusses on a canvas, assign supports/forces, solve via Method of Joints (Python backend), and visualize tension/compression results.

---

## Tech Stack

| Layer | Technology | Constraint |
|-------|-----------|------------|
| Frontend | Vanilla JS (ES modules) | No npm, no bundlers, no frameworks |
| Rendering | Canvas 2D API | `getContext('2d')`, manual render loop |
| Backend | Python 3 + FastAPI | uvicorn on port 8000 |
| Solver | NumPy | Linear algebra for equilibrium eqns |
| Validation | Pydantic | Request/response schemas |

---

## Critical Architecture Rules

### Entity Model (core/entities/)
- **Truss**: Container. Owns `joints[]`, `members[]`, `forces[]`. Auto-increment IDs. Methods: `addJoint`, `getJoint`, `removeJoint` (cascading → removes connected members+forces), `addMember`, `removeMember`, `membersAtJoint`, `addForce`, `forcesAtJoint`, `resetSolution` (clears force/rx/ry), `clear` (wipes all).
- **Joint**: `id`, `x`, `y`, `support` (null | 'pin' | 'roller'), `rx`/`ry` (solver-populated).
- **Member**: `id`, `jointA`, `jointB`, `force` (null = unsolved, + = tension, - = compression). `isSolved` getter.
- **Force**: `id`, `jointId`, `fx`, `fy`. `magnitude` getter.
- No calculations in entities. Pure data only.

### State Management (ui/state.js)
- Singleton reactive object. Observer pattern: `on(key, fn)` to subscribe, `set(patch)` to update + notify listeners.
- Key properties: `activeTool`, `selectedJoint`, `solveResult`, `ghostJoint`, `showAngles`, `showLengths`, `snapToGrid`.
- Modules subscribe to state changes (e.g., `state.on('activeTool', ...)`).

### Canvas Coordinate System
- World: Y-up. Screen: Y-down.
- Transform functions in `renderer/canvas.js`:
  - `worldToScreen(wx, wy)` → `{x, y}`: `x = wx * scale + offsetX`, `y = -wy * scale + offsetY`.
  - `screenToWorld(sx, sy)` → `{x, y}`: `x = (sx - offsetX) / scale`, `y = -(sy - offsetY) / scale`.
- `transform` object: `{ offsetX, offsetY, scale }` — exported singleton.

### Render Pipeline
- `render(truss)`: clear canvas → drawGrid → drawMembers → drawSupports → drawJoints → drawForces → drawGhost → drawZoomIndicator.
- No dirty tracking. Full redraw every frame.

### Wire Format (POST /api/solve)
```typescript
// Request
{ joints: [{id, x, y, support}], members: [{id, jointA, jointB}], forces: [{id, jointId, fx, fy}] }
// Response success
{ success: true, message: string, member_forces: {[id]: number}, reactions: {[id]: {rx, ry}} }
// Response failure
{ success: false, message: string }
```

### Solver Algorithm (backend/core/solver.py)
1. `solve_truss(joints, members, forces)` → creates fresh copies, validates, solves support reactions, iterates Method of Joints, returns result.
2. `solve_support_reactions()` → rigid-body equilibrium (ΣFx, ΣFy, ΣM=0). 3×3 linear system for pin+roller (3 unknowns).
3. `solve_joint()` → 1 or 2 unknown member forces per joint. For 1 unknown: pick eqn with larger coefficient. For 2: solve 2×2 system.
4. Determinacy check: `m + r = 2j`. Indeterminate or mechanism → reject.

---

## File-by-File Reference

### Entry Points
| File | Role |
|------|------|
| `index.html` | Loads `main.js` as module. 3-column grid layout: `<aside#toolbar>` + `<main#canvas-area>` + `<aside#panel>`. |
| `main.js` | Bootstrap: creates `new Truss()`, stores as `window._truss`, calls initCanvas/initToolbar/initPanels/initMouse, defines `window.onSolve` (async → sends to backend). |
| `style.css` | Dark theme CSS custom properties. 3-column grid. All component styles (toolbar, panel, force form, support form, results table). |

### Core Entities (core/entities/)
| File | Details |
|------|---------|
| `Truss.js` | Top-level container. `_nextJointId`, `_nextMemberId`, `_nextForceId` auto-increment. See [Entity Model](#entity-model-coreentities) above. |
| `Joint.js` | Constructor: `(id, x, y, support=null)`. Sets `rx=0`, `ry=0`. |
| `Member.js` | Constructor: `(id, jointA, jointB)`. Sets `force=null`. `isSolved` getter. |
| `Force.js` | Constructor: `(id, jointId, fx, fy)`. `magnitude` getter. |

### Client (core/client/)
| File | Details |
|------|---------|
| `solverClient.js` | `solveTrussRemote(truss)`. Sends POST to `http://localhost:8000/api/solve`. On success, maps `result.member_forces[id]` → `member.force` and `result.reactions[id]` → `joint.rx/ry`. Resets solution first. Returns `{success, message}`. |

### Utilities (core/utils/)
| File | Details |
|------|---------|
| `geometry.js` | Pure math: `distance`, `directionVector`, `unitVector` (returns zero-vector if same point), `midpoint`, `projectVector`, `isSamePoint` (epsilon = 1e-6). |
| `serialization.js` | `serializeTruss(truss)` → JSON string. `downloadTruss(truss)` → browser download. `deserializeTruss(truss, json)` → loads from file (forces explicitly skipped). |
| `validation.js` | Client-side checks: min 2 joints, min 1 member, no zero-length members, no floating joints, ≥1 support, exactly 3 reaction components, `m+r=2j`. Returns `{valid, message}`. |

### UI Layer (ui/)
| File | Details |
|------|---------|
| `state.js` | Singleton. `on(key, fn)`, `set(patch)`. See [State Management](#state-management-uistatejs). |
| `toolbar.js` | Creates toolbar buttons from `TOOLS` array. Each button sets `state.activeTool`. Adds Solve (calls `window.onSolve`), Save (`downloadTruss`), Load (hidden file input → `deserializeTruss`), Clear (`truss.clear()`). |
| `panels.js` | Right panel. Builds DOM based on `activeTool` + `selectedJoint` + `solveResult`. Contexts: support form (radio buttons + assign/remove), force form (Fx/Fy inputs + apply + list), display toggles, solve button, results table. |
| `mouse.js` | Canvas event handlers: mousemove (ghost update), click (tool-specific action). Tools: addJoint (place with grid snap), addMember (two-click), addSupport/addForce (select joint), delete (remove + cascade). Hit radius = 14 world units. |
| `inputs.js` | Helpers: `numberInput(label, value, onChange)`, `selectInput(label, options, current, onChange)`, `sectionHeading(text)`. |

### Renderer (renderer/)
| File | Details |
|------|---------|
| `canvas.js` | Init: `fitToParent()` on load/resize. Zoom: wheel event, scale 0.2–8x, zoom toward cursor. Pan: middle-click or Space+click. Grid: minor (10px world), major (50px world), axis lines. Render loop: `render(truss)` calls all draw modules. Exports `transform`, `worldToScreen`, `screenToWorld`, `render`. |
| `drawJoints.js` | Joint: circle (radius 6), glow ring if selected (radius 11), inner dot (radius 2), label `J{id}`. Ghost: dashed reach circles (radius 200 world units) around existing joints, ghost dot, snap cross, coordinate tooltip. Color: selected=blue `#4d7cfe`, default= `#3a5fd9`. |
| `drawMembers.js` | Line colors: unsolved=`#8a9abf`, tension=`#4d7cfe` (blue), compression=`#e05060` (red). T/C arrows: tension=outward opposing, compression=inward opposing. Force pill label: `+12.5 T` or `-8.3 C`. Angle notation (toggleable): arc + ref line at lower joint. Length label (toggleable). |
| `drawSupports.js` | Support symbols below joint (larger screen Y). Pin: triangle + ground hatch. Roller: triangle + circle + ground hatch. Fixed: wall bracket + connector + hatch lines. Reaction labels: `Rx=-5.0 Ry=10.2` (only if non-zero). Color: green `#4e8c6f`. |
| `drawForces.js` | Force arrows: tail at force tip direction (force acts ON joint). Magnitude label centered. Color: orange `#f5a623`. Scale factor: 0.05 px/unit force, min arrow length 30 px. |

### Backend (backend/)
| File | Details |
|------|---------|
| `app.py` | FastAPI app, CORS allow all. Endpoints: `POST /api/solve` (accepts TrussIn, calls `solve_truss`), `GET /health`. Pydantic schemas: JointIn, MemberIn, ForceIn, TrussIn. |
| `requirements.txt` | `fastapi==0.115.0`, `uvicorn[standard]==0.30.6`, `numpy==1.26.4`, `pydantic==2.9.2`. |
| `core/solver.py` | See [Solver Algorithm](#solver-algorithm-backendcoresolverpy). |
| `core/equations.py` | `build_joint_equations(joint, joints_by_id, members, forces)` → returns `{unknowns, coeffs_x, coeffs_y, rhs_x, rhs_y}`. |
| `core/validation.py` | Server-side validation (mirrors frontend). Returns `{valid, message}`. |

---

## Coding Standards

### JS Conventions
- **No external dependencies.** Vanilla JS only.
- **ES modules.** `import`/`export`, `type="module"` on script tag.
- **JSDoc annotations** on all exported functions and classes. Use `@param`, `@returns`.
- **Naming:** Files = camelCase (`solverClient.js`). Classes = PascalCase (`Truss`, `Joint`). Functions/variables = camelCase (`addJoint`, `worldToScreen`). Constants = UPPER_SNAKE_CASE (`HIT_RADIUS`, `MAX_REACH`).
- **Error handling:** Return error objects `{success: false, message: string}`. Never throw. Use `alert()` for file load errors, `console.error()` for debugging.
- **State mutations:** Use `state.set(patch)` to update state (triggers listeners). Direct mutation only within entity methods.
- **Truss ref stored on window:** `window._truss` for canvas zoom/pan handler. `window.onSolve` for toolbar/panel solve button.

### Python Conventions
- **Type hints** on all function signatures.
- **Docstrings** on all public functions.
- **NumPy** for linear algebra. No other external solver libraries.
- **All solver functions** accept/return plain dicts (not objects). Mutate dicts in place for efficiency.

### CSS Conventions
- Custom properties in `:root` for all colors/dimensions. No hardcoded color values in component styles.
- Class naming: lowercase with hyphens (`tool-btn`, `panel-header`, `force-chip-del`, `support-radio-name`).
- Layout: CSS Grid for main app (3 columns). Flexbox for components.
- Dark theme only. No light mode.

---

## Color Reference

| Token | Hex | Use |
|-------|-----|-----|
| `--bg` | `#0c0e14` | Canvas bg |
| `--surface` | `#13161f` | Toolbar/panel bg |
| `--border` | `#222639` | Subtle borders |
| `--text` | `#c8cfdf` | Primary text |
| `--text-muted` | `#454d68` | Muted text |
| `--accent` | `#4d7cfe` | Primary accent (blue) |
| `--tension` | `#4d7cfe` | Tension member color |
| `--compression` | `#e05060` | Compression member color |
| `--force-clr` | `#f5a623` | Force arrow color (orange) |
| `--green` | `#3ecf8e` | Support/success indicators |

---

## Key Behaviors to Preserve

- **addJoint ghost:** Shows dashed reach circles (200 world units) around existing joints. Ghost dot turns red if outside all circles. Placement still allowed even if outside reach (no clamping).
- **Grid snap:** Snaps to `minorGrid/2` (5 world units by default). Controlled by `state.snapToGrid`.
- **addMember:** Two-click. First click stores `pendingJointId`. Second click creates member. Clicking same joint twice cancels.
- **removeJoint cascading:** Also removes all members connected to that joint AND all forces applied to that joint.
- **resetSolution:** Called before every solve and every geometry/load change (clears `force` on members, `rx`/`ry` on joints).
- **Solve button:** Both toolbar and panel have solve buttons. Both call `window.onSolve()`.
- **Backend must be running (port 8000)** for solve to work. Frontend handles network errors gracefully.
- **Load from file:** Clears existing truss, rebuilds joints and members. Forces are NOT loaded (design decision).