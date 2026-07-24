"""
validation.py

Python port of core/utils/validation.js.

This is an intentional DUPLICATE, not a shared module — the JS copy still
runs client-side for instant UX feedback (fail fast before a network round
trip), while this copy is the authoritative check the backend runs before
it ever touches the solver. Keep both in sync if the rules change.

Checks the solvability condition from the tutorial:

    m + r = 2j

where m = members, r = reaction components, j = joints.
"""

import math


def _distance(x1, y1, x2, y2):
    return math.hypot(x2 - x1, y2 - y1)


def _is_same_point(x1, y1, x2, y2, eps=1e-6):
    """Mirrors geometry.js:isSamePoint."""
    return _distance(x1, y1, x2, y2) < eps


def _reaction_count(support_type):
    """Number of force reaction components provided by each support type.
    Fixed provides Rx + Ry as force reactions (moment reaction is separate
    and doesn't enter the Method of Joints) — mirrors validation.js."""
    return {'pin': 2, 'roller': 1, 'fixed': 2}.get(support_type, 0)


def _members_at_joint(joint_id, members):
    return [m for m in members if m['jointA'] == joint_id or m['jointB'] == joint_id]


def _fail(message):
    return {'valid': False, 'message': message}


def validate_truss(joints, members):
    """
    Args:
        joints:  list of dicts {id, x, y, support}
        members: list of dicts {id, jointA, jointB}

    Returns:
        {'valid': bool, 'message': str}
    """
    # ── 1. Minimum size ───────────────────────────────────────
    if len(joints) < 2:
        return _fail('Truss needs at least 2 joints.')
    if len(members) < 1:
        return _fail('Truss needs at least 1 member.')

    joints_by_id = {j['id']: j for j in joints}

    # ── 2. Zero-length members ────────────────────────────────
    for member in members:
        jA = joints_by_id.get(member['jointA'])
        jB = joints_by_id.get(member['jointB'])
        if jA is None or jB is None:
            return _fail(f"Member {member['id']} references a missing joint.")
        if _is_same_point(jA['x'], jA['y'], jB['x'], jB['y']):
            return _fail(f"Member {member['id']} has zero length (joints overlap).")

    # ── 3. Floating joints (no connected members) ─────────────
    for joint in joints:
        if len(_members_at_joint(joint['id'], members)) == 0:
            return _fail(f"Joint {joint['id']} is floating (no connected members).")

    # ── 4. Supports ───────────────────────────────────────────
    supports = [j for j in joints if j.get('support')]
    if len(supports) < 1:
        return _fail('Truss must have at least one support joint.')

    total_reactions = sum(_reaction_count(j['support']) for j in supports)
    if total_reactions < 3:
        return _fail(
            f'Only {total_reactions} reaction component(s) — need exactly 3 to be determinate. '
            'Try: one pin + one roller'
        )
    if total_reactions > 3:
        return _fail(
            f'{total_reactions} reaction components — truss is statically indeterminate '
            'for the Method of Joints. Reduce supports.'
        )

    # ── 5. Determinacy check: m + r = 2j ─────────────────────
    m = len(members)
    j = len(joints)
    r = total_reactions

    if m + r < 2 * j:
        return _fail(
            f'Truss is a mechanism (m+r < 2j): {m}+{r} < {2 * j}. Add more members or supports.'
        )
    if m + r > 2 * j:
        return _fail(
            f'Truss is statically indeterminate (m+r > 2j): {m}+{r} > {2 * j}. '
            'The Method of Joints cannot solve indeterminate structures.'
        )

    return {'valid': True, 'message': 'OK'}
