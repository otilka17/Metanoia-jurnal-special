"""
Backend tests for Family + Test Result endpoints.

Tests against the public preview URL using EXPO_PUBLIC_BACKEND_URL from /app/frontend/.env
"""
import os
import sys
import time
import uuid
import json
import re
from pathlib import Path

import requests


# ---- Resolve backend URL from frontend/.env ----
def _load_backend_url() -> str:
    env_path = Path("/app/frontend/.env")
    url = None
    for line in env_path.read_text().splitlines():
        if line.startswith("EXPO_PUBLIC_BACKEND_URL="):
            url = line.split("=", 1)[1].strip().strip('"').strip("'")
            break
    if not url:
        raise RuntimeError("EXPO_PUBLIC_BACKEND_URL not found in /app/frontend/.env")
    return url.rstrip("/")


BASE = _load_backend_url() + "/api"
print(f"Testing against: {BASE}")


# ---- Helpers ----
class TestRunner:
    def __init__(self):
        self.passed = 0
        self.failed = 0
        self.failures: list[str] = []

    def check(self, name: str, condition: bool, detail: str = ""):
        if condition:
            self.passed += 1
            print(f"  ✅ {name}")
        else:
            self.failed += 1
            msg = f"❌ {name}: {detail}"
            self.failures.append(msg)
            print(f"  {msg}")

    def report(self):
        print("\n" + "=" * 60)
        print(f"PASSED: {self.passed}  FAILED: {self.failed}")
        if self.failures:
            print("\nFAILURES:")
            for f in self.failures:
                print("  ", f)
        print("=" * 60)
        return self.failed == 0


t = TestRunner()


def post(path, json_body=None, token=None, expect=None):
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    r = requests.post(f"{BASE}{path}", json=json_body or {}, headers=headers, timeout=30)
    if expect is not None and r.status_code != expect:
        print(f"     POST {path} returned {r.status_code}: {r.text[:300]}")
    return r


def get(path, token=None, expect=None):
    headers = {}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    r = requests.get(f"{BASE}{path}", headers=headers, timeout=30)
    if expect is not None and r.status_code != expect:
        print(f"     GET {path} returned {r.status_code}: {r.text[:300]}")
    return r


def delete(path, token=None, expect=None):
    headers = {}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    r = requests.delete(f"{BASE}{path}", headers=headers, timeout=30)
    if expect is not None and r.status_code != expect:
        print(f"     DELETE {path} returned {r.status_code}: {r.text[:300]}")
    return r


def login(email, password):
    r = post("/auth/login", {"email": email, "password": password})
    if r.status_code != 200:
        return None, None
    j = r.json()
    return j["access_token"], j["user"]


def register(email, password, name):
    r = post("/auth/register", {"email": email, "password": password, "name": name})
    if r.status_code != 200:
        return None, None
    j = r.json()
    return j["access_token"], j["user"]


def leave_family_safe(token):
    """Attempt to leave family; ignore 404."""
    r = delete("/family/leave", token=token)
    return r.status_code in (200, 404)


# ============================================================
# SETUP: Login user A (test@test.com)
# ============================================================
print("\n## Setup: Authenticate user A (test@test.com)")
token_a, user_a = login("test@test.com", "test123")
t.check("Login as test@test.com succeeds", token_a is not None,
        "Could not login; check test_credentials.md")
if not token_a:
    t.report()
    sys.exit(1)
print(f"     User A id: {user_a['id']}, name: {user_a['name']}")

# Cleanup pre-existing family membership
leave_family_safe(token_a)


# ============================================================
# 1. GET /family/me — initially null
# ============================================================
print("\n## 1. GET /family/me (initially null)")
r = get("/family/me", token=token_a, expect=200)
t.check("GET /family/me returns 200", r.status_code == 200, f"got {r.status_code}")
if r.status_code == 200:
    j = r.json()
    t.check("Initially returns {family: null}", j.get("family") is None,
            f"got {j}")


# ============================================================
# 2. POST /family — create family
# ============================================================
print("\n## 2. POST /family — create family")
r = post("/family", token=token_a, expect=200)
t.check("POST /family returns 200", r.status_code == 200, f"got {r.status_code}: {r.text[:200]}")
saved_code = None
family_id = None
if r.status_code == 200:
    fam = r.json().get("family", {})
    family_id = fam.get("id")
    saved_code = fam.get("code", "")
    t.check("Family has id", bool(family_id))
    t.check("Family has code", bool(saved_code))
    t.check("Code is 6 chars long", len(saved_code) == 6, f"got '{saved_code}'")
    t.check("Code uppercase alphanumeric (no I/O/0/1)",
            bool(re.fullmatch(r"[A-HJ-NP-Z2-9]{6}", saved_code)),
            f"got '{saved_code}'")
    members = fam.get("members", [])
    t.check("Family has exactly 1 member", len(members) == 1, f"got {len(members)}")
    if members:
        t.check("members[0].is_me === true", members[0].get("is_me") is True,
                f"got is_me={members[0].get('is_me')}")
        t.check("members[0].id matches user A",
                members[0].get("id") == user_a["id"],
                f"got {members[0].get('id')}")

# Calling POST /family again -> 400
print("\n## 2b. POST /family again -> 400 'Ești deja într-o familie'")
r = post("/family", token=token_a)
t.check("Second POST /family returns 400", r.status_code == 400, f"got {r.status_code}")
if r.status_code == 400:
    detail = r.json().get("detail", "")
    t.check("Error message contains 'deja într-o familie'",
            "deja într-o familie" in detail.lower(), f"got '{detail}'")


# ============================================================
# 3. POST /family/join — original creator should get 400
# ============================================================
print("\n## 3. POST /family/join from creator -> 400")
if saved_code:
    r = post("/family/join", {"code": saved_code}, token=token_a)
    t.check("Creator joining own family returns 400", r.status_code == 400,
            f"got {r.status_code}: {r.text[:200]}")
    if r.status_code == 400:
        detail = r.json().get("detail", "")
        t.check("Error mentions 'Deja faci parte' or 'deja într-o familie'",
                "deja" in detail.lower(), f"got '{detail}'")


# ============================================================
# Register user B (partner)
# ============================================================
print("\n## Register partner user B")
suffix = uuid.uuid4().hex[:8]
partner_email = f"partner_{suffix}@test.com"
partner_pwd = "Pass123!"
token_b, user_b = register(partner_email, partner_pwd, "Maria Popescu")
t.check("Register partner succeeds", token_b is not None, "registration failed")
if not token_b:
    t.report()
    sys.exit(1)
print(f"     User B id: {user_b['id']}, name: {user_b['name']}")


# ============================================================
# 3b. Invalid/empty codes for partner
# ============================================================
print("\n## 3b. Invalid / empty join codes")
r = post("/family/join", {"code": "XXXX99"}, token=token_b)
t.check("Invalid code 'XXXX99' returns 404", r.status_code == 404,
        f"got {r.status_code}: {r.text[:200]}")

r = post("/family/join", {"code": ""}, token=token_b)
t.check("Empty code returns 400", r.status_code == 400, f"got {r.status_code}")


# ============================================================
# 3c. Partner joins with saved code -> success
# ============================================================
print("\n## 3c. Partner joins with saved code")
if saved_code:
    r = post("/family/join", {"code": saved_code}, token=token_b, expect=200)
    t.check("Partner join returns 200", r.status_code == 200,
            f"got {r.status_code}: {r.text[:200]}")
    if r.status_code == 200:
        fam = r.json().get("family", {})
        members = fam.get("members", [])
        t.check("Family now has 2 members", len(members) == 2,
                f"got {len(members)} members")
        me_count = sum(1 for m in members if m.get("is_me"))
        t.check("Exactly one member has is_me=True for partner", me_count == 1,
                f"got {me_count}")
        for m in members:
            if m.get("id") == user_b["id"]:
                t.check("Partner's is_me=True for self", m.get("is_me") is True)


# ============================================================
# 4. GET /family/me from both users
# ============================================================
print("\n## 4. GET /family/me from both users")
r_a = get("/family/me", token=token_a, expect=200)
r_b = get("/family/me", token=token_b, expect=200)
if r_a.status_code == 200 and r_b.status_code == 200:
    fam_a = r_a.json().get("family") or {}
    fam_b = r_b.json().get("family") or {}
    t.check("Both users see same family id",
            fam_a.get("id") == fam_b.get("id") == family_id,
            f"A={fam_a.get('id')} B={fam_b.get('id')}")
    t.check("Both have 2 members",
            len(fam_a.get("members", [])) == 2 and len(fam_b.get("members", [])) == 2)

    # is_me accuracy per user
    a_me = [m for m in fam_a.get("members", []) if m.get("is_me")]
    b_me = [m for m in fam_b.get("members", []) if m.get("is_me")]
    t.check("A: exactly 1 member with is_me=True (= A)",
            len(a_me) == 1 and a_me[0].get("id") == user_a["id"])
    t.check("B: exactly 1 member with is_me=True (= B)",
            len(b_me) == 1 and b_me[0].get("id") == user_b["id"])


# ============================================================
# 5. Journal cross-visibility
# ============================================================
print("\n## 5. Journal cross-visibility")
r = post("/journal",
         {"title": "Test A", "note": "Some note long enough", "mood": "happy"},
         token=token_a)
t.check("User A posts journal entry", r.status_code == 200, f"got {r.status_code}: {r.text[:200]}")
journal_a_id = r.json().get("id") if r.status_code == 200 else None

r = post("/journal",
         {"title": "Test B", "note": "Partner note long", "mood": "sad"},
         token=token_b)
t.check("User B posts journal entry", r.status_code == 200, f"got {r.status_code}: {r.text[:200]}")
journal_b_id = r.json().get("id") if r.status_code == 200 else None

# GET /journal from A -> both entries
r = get("/journal", token=token_a, expect=200)
if r.status_code == 200:
    entries = r.json().get("entries", [])
    ids = {e.get("id") for e in entries}
    t.check("A sees both family entries", journal_a_id in ids and journal_b_id in ids,
            f"got ids={ids}")
    # author_name + is_mine accuracy
    for e in entries:
        if e.get("id") == journal_a_id:
            t.check("A's own entry: is_mine=True", e.get("is_mine") is True)
            t.check("A's own entry: author_name == user A name",
                    e.get("author_name") == user_a["name"],
                    f"got '{e.get('author_name')}' vs '{user_a['name']}'")
        if e.get("id") == journal_b_id:
            t.check("B's entry visible to A: is_mine=False",
                    e.get("is_mine") is False)
            t.check("B's entry author_name == user B name",
                    e.get("author_name") == user_b["name"],
                    f"got '{e.get('author_name')}' vs '{user_b['name']}'")

# GET /journal from B -> both entries
r = get("/journal", token=token_b, expect=200)
if r.status_code == 200:
    entries = r.json().get("entries", [])
    ids = {e.get("id") for e in entries}
    t.check("B also sees both family entries",
            journal_a_id in ids and journal_b_id in ids, f"got ids={ids}")

# GET /journal/stats -> aggregates both
r = get("/journal/stats", token=token_a, expect=200)
if r.status_code == 200:
    j = r.json()
    t.check("journal/stats total >= 2", j.get("total", 0) >= 2,
            f"got total={j.get('total')}")
    moods = j.get("moods", {})
    t.check("journal/stats has both 'happy' and 'sad' moods",
            moods.get("happy", 0) >= 1 and moods.get("sad", 0) >= 1,
            f"moods={moods}")


# ============================================================
# Try a 3rd user joining (max 2)
# ============================================================
print("\n## 3d. Third user tries to join (max 2 members)")
suffix2 = uuid.uuid4().hex[:8]
third_email = f"third_{suffix2}@test.com"
token_c, user_c = register(third_email, "Pass123!", "Andrei Ionescu")
t.check("Register third user succeeds", token_c is not None)
if token_c and saved_code:
    r = post("/family/join", {"code": saved_code}, token=token_c)
    t.check("Third join returns 400 (max members)", r.status_code == 400,
            f"got {r.status_code}: {r.text[:200]}")
    if r.status_code == 400:
        detail = r.json().get("detail", "")
        t.check("Error mentions 'număr maxim' or 'maxim'",
                "maxim" in detail.lower(), f"got '{detail}'")


# ============================================================
# 6. DELETE /family/leave
# ============================================================
print("\n## 6a. Partner (B) leaves the family")
r = delete("/family/leave", token=token_b, expect=200)
t.check("Partner leaves -> 200", r.status_code == 200, f"got {r.status_code}: {r.text[:200]}")

r = get("/family/me", token=token_b, expect=200)
if r.status_code == 200:
    t.check("Partner's GET /family/me -> null after leaving",
            r.json().get("family") is None)

# A still in family
r = get("/family/me", token=token_a, expect=200)
if r.status_code == 200:
    fam = r.json().get("family") or {}
    t.check("A still in family with 1 member", len(fam.get("members", [])) == 1,
            f"got {len(fam.get('members', []))}")

# Partner now only sees own entries
r = get("/journal", token=token_b, expect=200)
if r.status_code == 200:
    entries = r.json().get("entries", [])
    ids = {e.get("id") for e in entries}
    t.check("After leaving, B sees only own journal entry",
            journal_b_id in ids and journal_a_id not in ids,
            f"got ids={ids}")

print("\n## 6b. Original user (A) leaves -> family deleted")
r = delete("/family/leave", token=token_a, expect=200)
t.check("A leaves -> 200", r.status_code == 200, f"got {r.status_code}")

r = get("/family/me", token=token_a, expect=200)
if r.status_code == 200:
    t.check("GET /family/me -> null after A leaves (family deleted)",
            r.json().get("family") is None,
            f"got {r.json()}")


# ============================================================
# 7. Test result endpoints
# ============================================================
print("\n## 7a. POST /api/test/result")
test_payload = {
    "scores": {"gift": 12, "adhd": 5, "emo": 8},
    "profile_title": "Profil de Supradotare",
    "profile_description": "Copilul tău arată semne clare de supradotare intelectuală.",
    "betts_type": "Tip VI",
    "betts_desc": "Învățătorul autonom",
    "recommendation": "Recomandăm evaluare psihologică completă.",
    "profile_color": "#5E8B7E",
    "profile_icon": "sparkles",
}
r = post("/test/result", test_payload, token=token_a, expect=200)
t.check("POST /test/result -> 200", r.status_code == 200, f"got {r.status_code}: {r.text[:200]}")
if r.status_code == 200:
    j = r.json()
    t.check("Response has ok=True", j.get("ok") is True)
    t.check("Response has 'result' object", isinstance(j.get("result"), dict))
    res = j.get("result", {})
    t.check("Result has scores == sent scores",
            res.get("scores") == test_payload["scores"], f"got {res.get('scores')}")
    t.check("Result has profile_title preserved",
            res.get("profile_title") == "Profil de Supradotare")

print("\n## 7b. GET /api/test/result")
r = get("/test/result", token=token_a, expect=200)
if r.status_code == 200:
    res = r.json().get("result") or {}
    t.check("Returned result has author_name", "author_name" in res,
            f"keys={list(res.keys())}")
    t.check("Returned result author_name == user A name",
            res.get("author_name") == user_a["name"], f"got '{res.get('author_name')}'")
    t.check("Returned result is_mine == True", res.get("is_mine") is True)
    t.check("Returned result profile_title matches",
            res.get("profile_title") == "Profil de Supradotare")

print("\n## 7c. New family — cross-user test result visibility")
# A and B create a new family
r = post("/family", token=token_a, expect=200)
t.check("A creates new family", r.status_code == 200, f"got {r.status_code}")
new_code = r.json().get("family", {}).get("code") if r.status_code == 200 else None

if new_code:
    r = post("/family/join", {"code": new_code}, token=token_b, expect=200)
    t.check("B joins new family", r.status_code == 200, f"got {r.status_code}")

    # A saves a new test result
    test_payload2 = dict(test_payload)
    test_payload2["profile_title"] = "Profil dual ADHD/Gift"
    r = post("/test/result", test_payload2, token=token_a, expect=200)
    t.check("A saves a new test result in shared family", r.status_code == 200)

    # B fetches it
    r = get("/test/result", token=token_b, expect=200)
    if r.status_code == 200:
        res = r.json().get("result") or {}
        t.check("B sees A's latest test result",
                res.get("profile_title") == "Profil dual ADHD/Gift",
                f"got '{res.get('profile_title')}'")
        t.check("B: is_mine=False on shared test", res.get("is_mine") is False)
        t.check("B: author_name == user A name",
                res.get("author_name") == user_a["name"],
                f"got '{res.get('author_name')}' vs '{user_a['name']}'")


# ============================================================
# 8. Authentication required
# ============================================================
print("\n## 8. Auth required (no Bearer)")
for method, path in [
    ("GET", "/family/me"),
    ("POST", "/family"),
    ("POST", "/family/join"),
    ("DELETE", "/family/leave"),
    ("POST", "/test/result"),
    ("GET", "/test/result"),
]:
    if method == "GET":
        r = requests.get(f"{BASE}{path}", timeout=15)
    elif method == "POST":
        r = requests.post(f"{BASE}{path}", json={}, timeout=15)
    else:
        r = requests.delete(f"{BASE}{path}", timeout=15)
    t.check(f"{method} {path} without auth -> 401/403",
            r.status_code in (401, 403),
            f"got {r.status_code}")


# ============================================================
# CLEANUP: ensure user A no longer in any family
# ============================================================
print("\n## Cleanup")
leave_family_safe(token_a)
leave_family_safe(token_b)

r = get("/family/me", token=token_a)
if r.status_code == 200:
    t.check("Cleanup: A is not in any family",
            r.json().get("family") is None,
            f"got {r.json()}")


# ============================================================
ok = t.report()
sys.exit(0 if ok else 1)
