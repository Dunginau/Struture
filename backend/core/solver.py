"""
solver.py

Consolidates what were THREE separate JS files:
    core/solver/solveTruss.js       (master orchestrator)
    core/solver/supportReactions.js (global rigid-body equilibrium)
    core/solver/solveJoint.js       (Method of Joints, per-joint solve)

Convention (unchanged from the JS version):
    Positive member force → tension
    Negative member force → compression
"""

from .equations import build_joint_equations, solve_linear_system
from .validation import validate_truss


# ── Support reactions (mirrors supportReactions.js) ─────────────────────
#
# Treats the entire truss as one rigid body and solves the 3 global
# equilibrium equations:
#     ΣFx = 0
#     ΣFy = 0
#     ΣM  = 0   (moment about the first support joint)
#
# Handles the same determinate combinations as the JS version:
#     pin + roller → 3 unknowns, 3 equations ✓
# (roller+roller / pin+pin are blocked upstream by validation.py)

def solve_support_reactions(joints, forces):
    """Mutates joint['rx'] / joint['ry'] in place for every support joint."""
    supports = [j for j in joints if j.get('support')]

    # Each unknown is (joint, 'rx'|'ry')
    unknowns = []
    for j in supports:
        if j['support'] in ('pin', 'fixed'):
            unknowns.append((j, 'rx'))
            unknowns.append((j, 'ry'))
        elif j['support'] == 'roller':
            unknowns.append((j, 'ry'))

    n = len(unknowns)
    if n != 3:
        # validation.py should already have blocked this case upstream
        return

    total_fx = sum(f['fx'] for f in forces)
    total_fy = sum(f['fy'] for f in forces)

    # Moment reference point: first support joint
    ref = supports[0]
    joints_by_id = {j['id']: j for j in joints}

    # Moment from external forces about ref:  M = r × F = dx*Fy - dy*Fx
    moment_ext = 0.0
    for f in forces:
        jt = joints_by_id.get(f['jointId'])
        if jt is None:
            continue
        dx = jt['x'] - ref['x']
        dy = jt['y'] - ref['y']
        moment_ext += dx * f['fy'] - dy * f['fx']

    # ── Assemble 3×3 system [A]{x} = {b} ─────────────────────
    A = [[0.0, 0.0, 0.0] for _ in range(3)]
    b = [-total_fx, -total_fy, -moment_ext]

    for i, (joint, comp) in enumerate(unknowns):
        if comp == 'rx':
            A[0][i] = 1.0                          # ΣFx contribution
            A[2][i] = -(joint['y'] - ref['y'])     # moment arm
        else:
            A[1][i] = 1.0                          # ΣFy contribution
            A[2][i] = (joint['x'] - ref['x'])      # moment arm

    solution = solve_linear_system(A, b)
    if solution is None:
        # Singular system — supports may be collinear; caller reports failure
        return

    # ── Zero out, then write back ────────────────────────────
    for j in supports:
        j['rx'] = 0.0
        j['ry'] = 0.0

    for i, (joint, comp) in enumerate(unknowns):
        joint[comp] = solution[i]


# ── Method of Joints (mirrors solveJoint.js) ────────────────────────────

def _unknown_count(joint, members):
    return sum(
        1 for m in members
        if (m['jointA'] == joint['id'] or m['jointB'] == joint['id']) and m['force'] is None
    )


def can_solve_joint(joint, members):
    """True if this joint has exactly 1 or 2 unknown member forces —
    the maximum the Method of Joints can solve at once."""
    n = _unknown_count(joint, members)
    return 1 <= n <= 2


def solve_joint(joint, joints_by_id, members, forces):
    """Solve all unknown member forces at the given joint.
    Mutates the member dicts in-place. Returns True if solved successfully."""
    eq = build_joint_equations(joint, joints_by_id, members, forces)
    unknowns = eq['unknowns']

    if len(unknowns) == 0:
        return True  # Nothing to do

    if len(unknowns) == 1:
        # 1 unknown: pick the equation with the larger coefficient for stability
        use_x = abs(eq['coeffs_x'][0]) >= abs(eq['coeffs_y'][0])
        coeff = eq['coeffs_x'][0] if use_x else eq['coeffs_y'][0]
        rhs = eq['rhs_x'] if use_x else eq['rhs_y']

        if abs(coeff) < 1e-12:
            return False
        solution = [rhs / coeff]

    elif len(unknowns) == 2:
        # 2 unknowns: standard 2×2 system
        A = [
            [eq['coeffs_x'][0], eq['coeffs_x'][1]],
            [eq['coeffs_y'][0], eq['coeffs_y'][1]],
        ]
        b = [eq['rhs_x'], eq['rhs_y']]
        solution = solve_linear_system(A, b)
        if solution is None:
            return False

    else:
        return False  # Over-constrained for this method

    # Write results back
    for member, force in zip(unknowns, solution):
        member['force'] = force

    return True


# ── Master orchestrator (mirrors solveTruss.js) ─────────────────────────

def solve_truss(joints, members, forces):
    """
    Args:
        joints:  list of dicts {id, x, y, support}
        members: list of dicts {id, jointA, jointB}
        forces:  list of dicts {id, jointId, fx, fy}

    Returns:
        {
          'success': bool,
          'message': str,
          'member_forces': {member_id: force},   # only present on success
          'reactions':     {joint_id: {rx, ry}}, # only present on success
        }
    """
    # ── 0. Fresh working copies (mirrors truss.resetSolution()) ─
    joints = [dict(j, rx=0.0, ry=0.0) for j in joints]
    members = [dict(m, force=None) for m in members]

    # ── 1. Validate ──────────────────────────────────────────
    validation = validate_truss(joints, members)
    if not validation['valid']:
        return {'success': False, 'message': validation['message']}

    # ── 2. Support reactions ─────────────────────────────────
    solve_support_reactions(joints, forces)

    # ── 3. Method of Joints iteration ───────────────────────
    joints_by_id = {j['id']: j for j in joints}
    progress = True
    while progress:
        progress = False
        for joint in joints:
            if can_solve_joint(joint, members):
                if solve_joint(joint, joints_by_id, members, forces):
                    progress = True

    # ── 4. Check completeness ────────────────────────────────
    unsolved = [m for m in members if m['force'] is None]
    if unsolved:
        return {
            'success': False,
            'message': f'Solver stalled — {len(unsolved)} member(s) could not be resolved.',
        }

    return {
        'success': True,
        'message': 'Truss solved successfully.',
        'member_forces': {m['id']: m['force'] for m in members},
        'reactions': {
            j['id']: {'rx': j['rx'], 'ry': j['ry']}
            for j in joints if j.get('support')
        },
    }
