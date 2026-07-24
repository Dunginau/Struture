"""
app.py — FastAPI server exposing the truss solver as a JSON API.

Run locally:
    pip install -r requirements.txt
    uvicorn app:app --reload --port 8000

Endpoint:
    POST /api/solve
        Body:  { "joints": [...], "members": [...], "forces": [...] }
        Reply: { "success": bool, "message": str,
                 "member_forces": {id: force}, "reactions": {id: {rx, ry}} }

This mirrors the wire format the JS Truss entity already produces —
see core/utils/serialization.js on the frontend. The frontend's
core/client/solverClient.js sends the live truss here instead of calling
the (now-removed) in-browser solveTruss().
"""

from typing import List, Optional

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from core.solver import solve_truss

app = FastAPI(title="Truss Solver API")

# Allow the JS frontend (served from a dev server or file://) to call this API.
# Tighten allow_origins to your actual frontend origin before deploying.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Request schema ───────────────────────────────────────────────────────

class JointIn(BaseModel):
    id: int
    x: float
    y: float
    support: Optional[str] = None  # 'pin' | 'roller' | 'fixed' | None


class MemberIn(BaseModel):
    id: int
    jointA: int
    jointB: int


class ForceIn(BaseModel):
    id: int
    jointId: int
    fx: float
    fy: float


class TrussIn(BaseModel):
    joints: List[JointIn]
    members: List[MemberIn]
    forces: List[ForceIn] = []


# ── Routes ────────────────────────────────────────────────────────────────

@app.post("/api/solve")
def solve(truss: TrussIn):
    joints = [j.model_dump() for j in truss.joints]
    members = [m.model_dump() for m in truss.members]
    forces = [f.model_dump() for f in truss.forces]

    return solve_truss(joints, members, forces)


@app.get("/health")
def health():
    return {"status": "ok"}
