"""
Backend tests for Forum (Comunitate) endpoints.
Tests all 11 new endpoints under /api/forum/*
"""
import os
import sys
import uuid
import requests
from pathlib import Path

# Load EXPO_PUBLIC_BACKEND_URL from frontend/.env
FRONTEND_ENV = Path("/app/frontend/.env")
BACKEND_URL = None
for line in FRONTEND_ENV.read_text().splitlines():
    if line.startswith("EXPO_PUBLIC_BACKEND_URL="):
        BACKEND_URL = line.split("=", 1)[1].strip().strip('"')
        break

if not BACKEND_URL:
    print("ERROR: EXPO_PUBLIC_BACKEND_URL not found in frontend/.env")
    sys.exit(1)

API = f"{BACKEND_URL}/api"
print(f"Using API base: {API}\n")

# ---------- Result tracking ----------
RESULTS = []  # list of (name, passed, detail)

def record(name, passed, detail=""):
    RESULTS.append((name, passed, detail))
    status = "PASS" if passed else "FAIL"
    print(f"[{status}] {name}" + (f" — {detail}" if detail else ""))


# ---------- Helpers ----------
def auth_headers(token):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


def login(email, password):
    r = requests.post(f"{API}/auth/login", json={"email": email, "password": password}, timeout=30)
    if r.status_code != 200:
        return None, r
    return r.json()["access_token"], r


def register(email, password, name):
    r = requests.post(f"{API}/auth/register", json={"email": email, "password": password, "name": name}, timeout=30)
    if r.status_code != 200:
        return None, r
    return r.json()["access_token"], r


def get_or_create(email, password, name):
    tok, r = login(email, password)
    if tok:
        return tok
    tok, r = register(email, password, name)
    if tok:
        return tok
    raise RuntimeError(f"Could not get token for {email}: {r.status_code} {r.text}")


# ---------- Set up test users ----------
print("=== Authentication setup ===")
TEST_EMAIL = "test@test.com"
TEST_PASSWORD = "test123"

main_token = get_or_create(TEST_EMAIL, TEST_PASSWORD, "Test")
print(f"main_token acquired for {TEST_EMAIL}")

# Make 3 flagger users + 1 different user for visibility check
unique = uuid.uuid4().hex[:6]
flagger_emails = [f"flagger1_{unique}@test.com", f"flagger2_{unique}@test.com", f"flagger3_{unique}@test.com"]
flagger_tokens = []
for i, e in enumerate(flagger_emails, 1):
    t = get_or_create(e, "Pass123!", f"Flagger{i}")
    flagger_tokens.append(t)
    print(f"flagger{i} ({e}) acquired")

other_email = f"other_{unique}@test.com"
other_token = get_or_create(other_email, "Pass123!", "Other")
print(f"other ({other_email}) acquired\n")


# ============================================================
# 1) GET /api/forum/categories (no auth needed)
# ============================================================
print("=== Test 1: GET /api/forum/categories (no auth) ===")
r = requests.get(f"{API}/forum/categories", timeout=15)
if r.status_code == 200:
    data = r.json()
    cats = data.get("categories", [])
    expected_ids = {"somn", "disciplina", "scoala", "emotii", "relatii", "sanatate", "general"}
    actual_ids = {c.get("id") for c in cats}
    has_fields = all({"id", "title", "icon", "color"}.issubset(c.keys()) for c in cats)
    if actual_ids == expected_ids and has_fields and len(cats) == 7:
        record("GET /forum/categories returns 7 fixed categories", True, f"ids={sorted(actual_ids)}")
    else:
        record("GET /forum/categories returns 7 fixed categories", False, f"got ids={actual_ids}, fields ok={has_fields}, len={len(cats)}")
else:
    record("GET /forum/categories returns 7 fixed categories", False, f"HTTP {r.status_code}: {r.text}")


# ============================================================
# 2) GET /api/forum/me — pseudonym is deterministic
# ============================================================
print("\n=== Test 2: GET /api/forum/me ===")
r1 = requests.get(f"{API}/forum/me", headers=auth_headers(main_token), timeout=15)
r2 = requests.get(f"{API}/forum/me", headers=auth_headers(main_token), timeout=15)
main_pseudonym = None
if r1.status_code == 200 and r2.status_code == 200:
    p1 = r1.json().get("pseudonym")
    p2 = r2.json().get("pseudonym")
    main_pseudonym = p1
    if p1 and p1 == p2 and p1.startswith("Părinte_"):
        record("GET /forum/me deterministic pseudonym", True, f"pseudonym={p1}")
    else:
        record("GET /forum/me deterministic pseudonym", False, f"p1={p1}, p2={p2}")
else:
    record("GET /forum/me deterministic pseudonym", False, f"HTTP r1={r1.status_code} r2={r2.status_code}")

# Auth required check
r_noauth = requests.get(f"{API}/forum/me", timeout=15)
if r_noauth.status_code in (401, 403):
    record("GET /forum/me requires auth", True, f"HTTP {r_noauth.status_code}")
else:
    record("GET /forum/me requires auth", False, f"HTTP {r_noauth.status_code}")


# ============================================================
# 3) POST /api/forum/posts — validation + creation
# ============================================================
print("\n=== Test 3: POST /api/forum/posts validation + creation ===")

# 3a) title < 5 chars → 400
r = requests.post(f"{API}/forum/posts", headers=auth_headers(main_token),
                  json={"category": "somn", "title": "Hi", "content": "Valid content here.", "is_anonymous": False}, timeout=15)
record("POST /forum/posts title<5 -> 400", r.status_code == 400, f"HTTP {r.status_code}")

# 3b) content < 10 chars → 400
r = requests.post(f"{API}/forum/posts", headers=auth_headers(main_token),
                  json={"category": "somn", "title": "Titlu valid", "content": "scurt", "is_anonymous": False}, timeout=15)
record("POST /forum/posts content<10 -> 400", r.status_code == 400, f"HTTP {r.status_code}")

# 3c) invalid category → 400
r = requests.post(f"{API}/forum/posts", headers=auth_headers(main_token),
                  json={"category": "nonexistent", "title": "Titlu valid", "content": "Conținut suficient de lung.", "is_anonymous": False}, timeout=15)
record("POST /forum/posts invalid category -> 400", r.status_code == 400, f"HTTP {r.status_code}")

# 3d) Create post with is_anonymous=False — display_name should match pseudonym
r = requests.post(f"{API}/forum/posts", headers=auth_headers(main_token),
                  json={"category": "somn", "title": "Cum îmi ajut copilul să doarmă",
                        "content": "Băiatul meu de 7 ani are dificultăți să adoarmă seara. Aveți sfaturi?",
                        "is_anonymous": False}, timeout=15)
post_id_pseudonym = None
if r.status_code == 200:
    post = r.json().get("post", {})
    post_id_pseudonym = post.get("id")
    if post.get("display_name") == main_pseudonym:
        record("POST /forum/posts is_anonymous=False shows pseudonym", True, f"display_name={post.get('display_name')}")
    else:
        record("POST /forum/posts is_anonymous=False shows pseudonym", False,
               f"expected={main_pseudonym}, got={post.get('display_name')}")
else:
    record("POST /forum/posts is_anonymous=False shows pseudonym", False, f"HTTP {r.status_code}: {r.text}")

# 3e) Create post with is_anonymous=True — display_name should be "Anonim"
r = requests.post(f"{API}/forum/posts", headers=auth_headers(main_token),
                  json={"category": "emotii", "title": "Crize de furie repetate",
                        "content": "Fetița mea face crize zilnice și nu știu cum să reacționez.",
                        "is_anonymous": True}, timeout=15)
post_id_anon = None
if r.status_code == 200:
    post = r.json().get("post", {})
    post_id_anon = post.get("id")
    if post.get("display_name") == "Anonim":
        record("POST /forum/posts is_anonymous=True shows 'Anonim'", True)
    else:
        record("POST /forum/posts is_anonymous=True shows 'Anonim'", False, f"got={post.get('display_name')}")
else:
    record("POST /forum/posts is_anonymous=True shows 'Anonim'", False, f"HTTP {r.status_code}: {r.text}")


# ============================================================
# 4) GET /api/forum/posts — listing + is_mine + filter
# ============================================================
print("\n=== Test 4: GET /api/forum/posts listing + filtering ===")

r = requests.get(f"{API}/forum/posts", headers=auth_headers(main_token), timeout=15)
if r.status_code == 200:
    posts = r.json().get("posts", [])
    own_posts = [p for p in posts if p.get("id") in (post_id_pseudonym, post_id_anon)]
    all_mine = all(p.get("is_mine") for p in own_posts)
    record("GET /forum/posts lists my posts with is_mine=true",
           len(own_posts) == 2 and all_mine,
           f"found {len(own_posts)}/2 own posts, all is_mine={all_mine}")
else:
    record("GET /forum/posts lists my posts with is_mine=true", False, f"HTTP {r.status_code}")

# Filter by category=somn
r = requests.get(f"{API}/forum/posts?category=somn", headers=auth_headers(main_token), timeout=15)
if r.status_code == 200:
    posts = r.json().get("posts", [])
    all_somn = all(p.get("category") == "somn" for p in posts)
    contains_target = any(p.get("id") == post_id_pseudonym for p in posts)
    not_contains_emotii = not any(p.get("id") == post_id_anon for p in posts)
    record("GET /forum/posts?category=somn filters correctly",
           all_somn and contains_target and not_contains_emotii,
           f"all somn={all_somn}, has target={contains_target}, excludes emotii={not_contains_emotii}")
else:
    record("GET /forum/posts?category=somn filters correctly", False, f"HTTP {r.status_code}")

# Auth required
r = requests.get(f"{API}/forum/posts", timeout=15)
record("GET /forum/posts requires auth", r.status_code in (401, 403), f"HTTP {r.status_code}")


# ============================================================
# 5) GET /api/forum/posts/{id}
# ============================================================
print("\n=== Test 5: GET /api/forum/posts/{id} ===")
r = requests.get(f"{API}/forum/posts/{post_id_pseudonym}", headers=auth_headers(main_token), timeout=15)
if r.status_code == 200:
    data = r.json()
    post = data.get("post", {})
    answers = data.get("answers", [])
    ok = post.get("id") == post_id_pseudonym and isinstance(answers, list) and len(answers) == 0
    record("GET /forum/posts/{id} returns post + empty answers", ok,
           f"post.id matches={post.get('id') == post_id_pseudonym}, answers={len(answers)}")
else:
    record("GET /forum/posts/{id} returns post + empty answers", False, f"HTTP {r.status_code}")

# 404 for nonexistent
r = requests.get(f"{API}/forum/posts/nope-{uuid.uuid4().hex}", headers=auth_headers(main_token), timeout=15)
record("GET /forum/posts/{id} returns 404 for nonexistent", r.status_code == 404, f"HTTP {r.status_code}")


# ============================================================
# 6) POST /api/forum/posts/{id}/answers — validation + creation
# ============================================================
print("\n=== Test 6: POST /api/forum/posts/{id}/answers ===")
# Validation: content<3 -> 400
r = requests.post(f"{API}/forum/posts/{post_id_pseudonym}/answers", headers=auth_headers(other_token),
                  json={"content": "ok", "is_anonymous": False}, timeout=15)
record("POST /forum/answers content<3 -> 400", r.status_code == 400, f"HTTP {r.status_code}")

# Create 2 answers (one anon by other, one with pseudonym by flagger1)
answer_id_anon = None
answer_id_pseudo = None
r = requests.post(f"{API}/forum/posts/{post_id_pseudonym}/answers", headers=auth_headers(other_token),
                  json={"content": "Eu am avut o situație similară, încearcă o rutină fixă.", "is_anonymous": True}, timeout=15)
if r.status_code == 200:
    a = r.json().get("answer", {})
    answer_id_anon = a.get("id")
    record("POST anon answer created", a.get("display_name") == "Anonim", f"display_name={a.get('display_name')}")
else:
    record("POST anon answer created", False, f"HTTP {r.status_code}: {r.text}")

r = requests.post(f"{API}/forum/posts/{post_id_pseudonym}/answers", headers=auth_headers(flagger_tokens[0]),
                  json={"content": "La noi a funcționat baia caldă seara plus citit împreună.", "is_anonymous": False}, timeout=15)
if r.status_code == 200:
    a = r.json().get("answer", {})
    answer_id_pseudo = a.get("id")
    has_pseudo = a.get("display_name", "").startswith("Părinte_") and a.get("display_name") != main_pseudonym
    record("POST pseudonym answer created", has_pseudo, f"display_name={a.get('display_name')}")
else:
    record("POST pseudonym answer created", False, f"HTTP {r.status_code}: {r.text}")

# Verify GET post shows answer_count=2 and answers
r = requests.get(f"{API}/forum/posts/{post_id_pseudonym}", headers=auth_headers(main_token), timeout=15)
if r.status_code == 200:
    data = r.json()
    post = data.get("post", {})
    answers = data.get("answers", [])
    ok = post.get("answer_count") == 2 and len(answers) == 2
    record("GET post after 2 answers: answer_count=2, len(answers)=2", ok,
           f"answer_count={post.get('answer_count')}, len={len(answers)}")
else:
    record("GET post after 2 answers", False, f"HTTP {r.status_code}")


# ============================================================
# 7) POST /api/forum/posts/{id}/like — toggle behavior
# ============================================================
print("\n=== Test 7: POST /api/forum/posts/{id}/like toggle ===")
# Use other_token to like main's post (so we don't conflict with main's liked_by_me view)
r1 = requests.post(f"{API}/forum/posts/{post_id_pseudonym}/like", headers=auth_headers(other_token), timeout=15)
if r1.status_code == 200:
    d1 = r1.json()
    ok1 = d1.get("liked") is True and d1.get("likes") == 1
    record("POST /forum/posts/{id}/like first call: liked=true, likes=1", ok1, str(d1))
else:
    record("POST /forum/posts/{id}/like first call", False, f"HTTP {r1.status_code}")

r2 = requests.post(f"{API}/forum/posts/{post_id_pseudonym}/like", headers=auth_headers(other_token), timeout=15)
if r2.status_code == 200:
    d2 = r2.json()
    ok2 = d2.get("liked") is False and d2.get("likes") == 0
    record("POST /forum/posts/{id}/like second call: liked=false, likes=0", ok2, str(d2))
else:
    record("POST /forum/posts/{id}/like second call", False, f"HTTP {r2.status_code}")

# Like again and verify liked_by_me on GET post by 'other'
requests.post(f"{API}/forum/posts/{post_id_pseudonym}/like", headers=auth_headers(other_token), timeout=15)
r = requests.get(f"{API}/forum/posts/{post_id_pseudonym}", headers=auth_headers(other_token), timeout=15)
if r.status_code == 200:
    post = r.json().get("post", {})
    record("GET post shows liked_by_me=true for liker", post.get("liked_by_me") is True, f"liked_by_me={post.get('liked_by_me')}, likes={post.get('likes')}")
else:
    record("GET post shows liked_by_me=true", False, f"HTTP {r.status_code}")

# main (non-liker) should see liked_by_me=false
r = requests.get(f"{API}/forum/posts/{post_id_pseudonym}", headers=auth_headers(main_token), timeout=15)
if r.status_code == 200:
    post = r.json().get("post", {})
    record("GET post shows liked_by_me=false for non-liker", post.get("liked_by_me") is False,
           f"liked_by_me={post.get('liked_by_me')}")
else:
    record("GET post shows liked_by_me=false for non-liker", False, f"HTTP {r.status_code}")


# ============================================================
# 8) POST /api/forum/answers/{id}/like — toggle
# ============================================================
print("\n=== Test 8: POST /api/forum/answers/{id}/like toggle ===")
r1 = requests.post(f"{API}/forum/answers/{answer_id_pseudo}/like", headers=auth_headers(main_token), timeout=15)
if r1.status_code == 200:
    d1 = r1.json()
    ok = d1.get("liked") is True and d1.get("likes") == 1
    record("POST /forum/answers/{id}/like first call: liked=true, likes=1", ok, str(d1))
else:
    record("POST /forum/answers/{id}/like first call", False, f"HTTP {r1.status_code}")

r2 = requests.post(f"{API}/forum/answers/{answer_id_pseudo}/like", headers=auth_headers(main_token), timeout=15)
if r2.status_code == 200:
    d2 = r2.json()
    ok = d2.get("liked") is False and d2.get("likes") == 0
    record("POST /forum/answers/{id}/like second call: liked=false, likes=0", ok, str(d2))
else:
    record("POST /forum/answers/{id}/like second call", False, f"HTTP {r2.status_code}")


# ============================================================
# 9) POST /api/forum/posts/{id}/flag — idempotent, doesn't hide from author
# ============================================================
print("\n=== Test 9: POST /api/forum/posts/{id}/flag idempotent ===")
# Note: we will flag post_id_anon (main's anonymous post). Other user flags it.
r1 = requests.post(f"{API}/forum/posts/{post_id_anon}/flag", headers=auth_headers(other_token), timeout=15)
record("POST /forum/posts/{id}/flag first call", r1.status_code == 200, f"HTTP {r1.status_code}")
r2 = requests.post(f"{API}/forum/posts/{post_id_anon}/flag", headers=auth_headers(other_token), timeout=15)
record("POST /forum/posts/{id}/flag second call (idempotent)", r2.status_code == 200, f"HTTP {r2.status_code}")


# ============================================================
# 10) Flag-hiding behavior (3+ flags)
# ============================================================
print("\n=== Test 10: Flag-hiding behavior (3+ flags) ===")
# Need 3 unique flaggers. We already have 3 flagger_tokens. Flag post_id_anon by all 3.
for i, ft in enumerate(flagger_tokens, 1):
    rr = requests.post(f"{API}/forum/posts/{post_id_anon}/flag", headers=auth_headers(ft), timeout=15)
    if rr.status_code != 200:
        print(f"  flagger{i} flag failed: HTTP {rr.status_code}")

# 4th different user (other_token) — GET /forum/posts should NOT include flagged post
r = requests.get(f"{API}/forum/posts", headers=auth_headers(other_token), timeout=15)
if r.status_code == 200:
    posts = r.json().get("posts", [])
    ids = [p["id"] for p in posts]
    hidden_from_other = post_id_anon not in ids
    record("Flagged post hidden from non-author (3+ flags)", hidden_from_other,
           f"post_id_anon in list = {post_id_anon in ids}")
else:
    record("Flagged post hidden from non-author", False, f"HTTP {r.status_code}")

# Original author (main_token) SHOULD still see it
r = requests.get(f"{API}/forum/posts", headers=auth_headers(main_token), timeout=15)
if r.status_code == 200:
    posts = r.json().get("posts", [])
    ids = [p["id"] for p in posts]
    visible_to_author = post_id_anon in ids
    record("Flagged post still visible to author", visible_to_author,
           f"post_id_anon in author list = {visible_to_author}")
else:
    record("Flagged post still visible to author", False, f"HTTP {r.status_code}")

# Direct GET /forum/posts/{id} should work for everyone
r1 = requests.get(f"{API}/forum/posts/{post_id_anon}", headers=auth_headers(other_token), timeout=15)
r2 = requests.get(f"{API}/forum/posts/{post_id_anon}", headers=auth_headers(main_token), timeout=15)
record("Direct GET /forum/posts/{id} works for non-author of flagged post", r1.status_code == 200, f"HTTP {r1.status_code}")
record("Direct GET /forum/posts/{id} works for author of flagged post", r2.status_code == 200, f"HTTP {r2.status_code}")


# ============================================================
# 11) DELETE /api/forum/posts/{id} — owner only
# ============================================================
print("\n=== Test 11: DELETE /api/forum/posts/{id} ===")
# non-owner -> 403
r = requests.delete(f"{API}/forum/posts/{post_id_pseudonym}", headers=auth_headers(other_token), timeout=15)
record("DELETE /forum/posts/{id} non-owner -> 403", r.status_code == 403, f"HTTP {r.status_code}")

# owner -> 200
r = requests.delete(f"{API}/forum/posts/{post_id_pseudonym}", headers=auth_headers(main_token), timeout=15)
record("DELETE /forum/posts/{id} owner -> 200", r.status_code == 200, f"HTTP {r.status_code}")

# Verify post gone
r = requests.get(f"{API}/forum/posts/{post_id_pseudonym}", headers=auth_headers(main_token), timeout=15)
record("Deleted post returns 404", r.status_code == 404, f"HTTP {r.status_code}")

# Verify associated answers are also deleted: try to like answer_id_pseudo -> should be 404
r = requests.post(f"{API}/forum/answers/{answer_id_pseudo}/like", headers=auth_headers(main_token), timeout=15)
record("Associated answers deleted with post", r.status_code == 404, f"HTTP {r.status_code}")


# ============================================================
# 12) DELETE /api/forum/answers/{id} — owner only
# ============================================================
print("\n=== Test 12: DELETE /api/forum/answers/{id} ===")
# Create a new post + answer for this test
r = requests.post(f"{API}/forum/posts", headers=auth_headers(main_token),
                  json={"category": "scoala", "title": "Probleme la școală cu temele",
                        "content": "Copilul refuză temele zilnic, ce să fac?", "is_anonymous": False}, timeout=15)
new_post_id = r.json()["post"]["id"] if r.status_code == 200 else None

r = requests.post(f"{API}/forum/posts/{new_post_id}/answers", headers=auth_headers(other_token),
                  json={"content": "Încearcă să faci temele într-un loc liniștit.", "is_anonymous": False}, timeout=15)
new_answer_id = r.json()["answer"]["id"] if r.status_code == 200 else None

# Non-owner deletion -> 403
r = requests.delete(f"{API}/forum/answers/{new_answer_id}", headers=auth_headers(main_token), timeout=15)
record("DELETE /forum/answers/{id} non-owner -> 403", r.status_code == 403, f"HTTP {r.status_code}")

# Owner deletes -> 200
r = requests.delete(f"{API}/forum/answers/{new_answer_id}", headers=auth_headers(other_token), timeout=15)
record("DELETE /forum/answers/{id} owner -> 200", r.status_code == 200, f"HTTP {r.status_code}")

# Cleanup created post (best effort)
requests.delete(f"{API}/forum/posts/{new_post_id}", headers=auth_headers(main_token), timeout=15)
# Cleanup anon post
requests.delete(f"{API}/forum/posts/{post_id_anon}", headers=auth_headers(main_token), timeout=15)


# ============================================================
# 13) Auth requirements on protected forum endpoints
# ============================================================
print("\n=== Test 13: Auth required on protected endpoints ===")
endpoints = [
    ("GET", "/forum/me"),
    ("GET", "/forum/posts"),
    ("POST", "/forum/posts"),
    ("GET", f"/forum/posts/{uuid.uuid4()}"),
    ("POST", f"/forum/posts/{uuid.uuid4()}/answers"),
    ("POST", f"/forum/posts/{uuid.uuid4()}/like"),
    ("POST", f"/forum/answers/{uuid.uuid4()}/like"),
    ("POST", f"/forum/posts/{uuid.uuid4()}/flag"),
    ("POST", f"/forum/answers/{uuid.uuid4()}/flag"),
    ("DELETE", f"/forum/posts/{uuid.uuid4()}"),
    ("DELETE", f"/forum/answers/{uuid.uuid4()}"),
]
all_protected = True
detail_failures = []
for method, path in endpoints:
    r = requests.request(method, f"{API}{path}", json={} if method == "POST" else None, timeout=15)
    if r.status_code not in (401, 403):
        all_protected = False
        detail_failures.append(f"{method} {path}=>{r.status_code}")
record("All protected forum endpoints require auth", all_protected, "; ".join(detail_failures) or "all 401/403")


# ============================================================
# SUMMARY
# ============================================================
print("\n" + "=" * 60)
print("SUMMARY")
print("=" * 60)
passed = sum(1 for _, p, _ in RESULTS if p)
failed = sum(1 for _, p, _ in RESULTS if not p)
print(f"Total: {len(RESULTS)} | Passed: {passed} | Failed: {failed}\n")
if failed:
    print("FAILED tests:")
    for n, p, d in RESULTS:
        if not p:
            print(f"  - {n}: {d}")
sys.exit(0 if failed == 0 else 1)
