"""
equations.py

Consolidates what were THREE separate JS files:
    core/math/vectors.js
    core/math/equations.js
    core/solver/jointEquations.js

geometry.js itself is deliberately NOT ported here — per the project
decision, it stays client-side only, since it's shared with the renderer
for coordinate transforms that have no backend equivalent. This module
re-implements the one piece of vector math the solver actually needs
(unit vectors between two points), using numpy for the linear algebra.
"""

import numpy as np


# ── Vector helpers (mirrors core/math/vectors.js + the unitVector portion
#    of core/utils/geometry.js, which the solver depends on) ────────────

def unit_vector(x1, y1, x2, y2):
    """
    Unit vector from (x1,y1) toward (x2,y2).
    Returns (0, 0) if the two points coincide (caller must guard),
    mirroring geometry.js:unitVector.
    """
    dx = x2 - x1
    dy = y2 - y1
    mag = (dx ** 2 + dy ** 2) ** 0.5
    if mag < 1e-12:
        return 0.0, 0.0
    return dx / mag, dy / mag


# ── Linear system solver (mirrors core/math/equations.js) ──────────────
#
# The original JS used hand-rolled Gaussian elimination with partial
# pivoting. Numpy's LAPACK-backed solver is a drop-in replacement that's
# both faster and more numerically robust, while preserving the same
# "return None on singular" contract as the JS "return null".

def solve_linear_system(A, b):
    """
    Solve A·x = b.

    Args:
        A: n×n coefficient matrix (list of lists)
        b: right-hand side vector, length n

    Returns:
        list[float] solution vector, or None if the system is singular.
    """
    try:
        A_np = np.asarray(A, dtype=float)
        b_np = np.asarray(b, dtype=float)
        x = np.linalg.solve(A_np, b_np)
        return x.tolist()
    except np.linalg.LinAlgError:
        return None


# ── Joint equation assembly (mirrors core/solver/jointEquations.js) ────

def build_joint_equations(joint, joints_by_id, members, forces):
    """
    Build the ΣFx = 0 / ΣFy = 0 equation row for one joint.

    Args:
        joint:        dict {id, x, y, support, rx, ry}
        joints_by_id: dict {id: joint dict}, for looking up the "other" end
                      of each connected member
        members:      full list of member dicts {id, jointA, jointB, force}
        forces:       full list of external force dicts {id, jointId, fx, fy}

    Returns dict with:
        unknowns          — member dicts whose force is still None
        coeffs_x/coeffs_y — unit-vector components for each unknown member
        rhs_x/rhs_y       — right-hand side (knowns moved to the other side)
    """
    connected = [
        m for m in members
        if m['jointA'] == joint['id'] or m['jointB'] == joint['id']
    ]
    joint_forces = [f for f in forces if f['jointId'] == joint['id']]

    unknowns, coeffs_x, coeffs_y = [], [], []

    # ── Accumulate known right-hand side ─────────────────────
    # Start with external forces and support reactions (moved to RHS).
    rhs_x = -(sum(f['fx'] for f in joint_forces) + joint.get('rx', 0.0))
    rhs_y = -(sum(f['fy'] for f in joint_forces) + joint.get('ry', 0.0))

    for member in connected:
        other_id = member['jointB'] if member['jointA'] == joint['id'] else member['jointA']
        other = joints_by_id[other_id]

        # Unit vector pointing FROM this joint TO the other
        ux, uy = unit_vector(joint['x'], joint['y'], other['x'], other['y'])

        if member['force'] is not None:
            # Already known — move contribution to RHS
            rhs_x -= member['force'] * ux
            rhs_y -= member['force'] * uy
        else:
            # Unknown — becomes a column in the matrix
            unknowns.append(member)
            coeffs_x.append(ux)
            coeffs_y.append(uy)

    return {
        'unknowns': unknowns,
        'coeffs_x': coeffs_x,
        'coeffs_y': coeffs_y,
        'rhs_x': rhs_x,
        'rhs_y': rhs_y,
    }
