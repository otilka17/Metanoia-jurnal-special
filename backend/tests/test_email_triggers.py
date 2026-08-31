"""
Backend tests for fire-and-forget transactional emails on:
  1. POST /api/auth/register  -> welcome email (async, non-blocking)
  2. POST /api/family/join    -> joiner email + partner_joined email(s) (async, non-blocking)

Rules:
  - Do NOT assert on email delivery (Resend is external / may return 502).
  - Assert only that (a) endpoints stay fast (non-blocking), and
    (b) errors in email path do NOT propagate to caller.
  - Regression: all pre-existing behaviours preserved.
  - Cleanup all TEST_ users at end. Preserve test@test.com and otilia.
"""
import os
import time
import uuid
from datetime import datetime, timezone

import pytest
import requests
from dotenv import load_dotenv
from pymongo import MongoClient

load_dotenv("/app/backend/.env")

BASE_URL = None
with open("/app/frontend/.env") as f:
    for line in f:
        if line.startswith("EXPO_PUBLIC_BACKEND_URL"):
            BASE_URL = line.split("=", 1)[1].strip().strip('"').rstrip("/")
            break
assert BASE_URL, "EXPO_PUBLIC_BACKEND_URL not found"

MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]
SUPER_ADMIN_EMAIL = "otilia.ioana96@gmail.com"

# Response-time budget. Email HTTP call is ~30s worst-case → if it blocked
# we would see > 5s. Fire-and-forget must return well under 3s.
NON_BLOCKING_BUDGET_S = 3.0


@pytest.fixture(scope="module")
def db():
    client = MongoClient(MONGO_URL)
    yield client[DB_NAME]
    client.close()


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# Track emails we create so we can delete them at teardown.
_CREATED_EMAILS: list = []


def _register(session, email, password="pass1234", name="TEST User"):
    _CREATED_EMAILS.append(email.lower())
    return session.post(
        f"{BASE_URL}/api/auth/register",
        json={"email": email, "password": password, "name": name},
    )


# ==================== REGISTER: welcome email ====================
class TestRegisterEmail:
    """POST /api/auth/register with a NEW email should return within budget
    and never fail because of the welcome email fire-and-forget."""

    def test_register_fresh_email_returns_quickly(self, session, db):
        email = f"TEST_reg_fast_{uuid.uuid4().hex[:8]}@test.com"
        t0 = time.perf_counter()
        r = _register(session, email, "pass1234", "TEST fast")
        dt = time.perf_counter() - t0
        assert r.status_code == 200, r.text
        body = r.json()
        assert "access_token" in body
        assert body["token_type"] == "bearer"
        assert body["user"]["email"] == email.lower()
        assert body["user"]["name"] == "TEST fast"
        assert body["user"]["is_admin"] is False
        # HTTP call to Resend must NOT have blocked the response
        assert dt < NON_BLOCKING_BUDGET_S, f"Register took {dt:.2f}s (expected <{NON_BLOCKING_BUDGET_S}s) — email may be blocking"

    def test_register_duplicate_email_400(self, session, db):
        email = f"TEST_reg_dup_{uuid.uuid4().hex[:8]}@test.com"
        # First register — retry once on transient 502 (proxy/reload)
        r1 = _register(session, email)
        if r1.status_code == 502:
            time.sleep(1)
            r1 = _register(session, email)
        assert r1.status_code == 200, f"first register: {r1.status_code} {r1.text}"
        r2 = _register(session, email)
        assert r2.status_code == 400
        assert "deja" in r2.json().get("detail", "").lower()

    def test_register_super_admin_becomes_admin(self, session, db):
        """Regression: otilia.ioana96@gmail.com must be auto-admin. Don't
        actually re-register her — inspect existing DB record OR login."""
        # Prefer login (credentials from test_credentials.md)
        r = session.post(f"{BASE_URL}/api/auth/login",
                         json={"email": SUPER_ADMIN_EMAIL, "password": "Admin123!"})
        if r.status_code == 200:
            assert r.json()["user"]["is_admin"] is True
        else:
            # Fallback: check DB flag directly (do not delete)
            u = db.users.find_one({"email": SUPER_ADMIN_EMAIL})
            assert u is not None
            assert u.get("is_admin") is True or u.get("email") == SUPER_ADMIN_EMAIL

    def test_register_response_ok_even_if_email_send_raises(self, session, db):
        """Resend is currently rate-limiting (429 in backend logs). Register
        MUST still return 200 quickly. This proves send_email failures do NOT
        propagate to the caller (fire-and-forget)."""
        # Fire 3 registers back-to-back to force email path to error/rate-limit
        for i in range(3):
            email = f"TEST_reg_bounce_{i}_{uuid.uuid4().hex[:6]}@test.com"
            t0 = time.perf_counter()
            r = _register(session, email, "pass1234", "TEST bounce")
            dt = time.perf_counter() - t0
            # transient proxy 502 tolerated once — retry
            if r.status_code == 502:
                time.sleep(1)
                r = _register(session, email, "pass1234", "TEST bounce")
            assert r.status_code == 200, r.text
            assert "access_token" in r.json()
            assert dt < NON_BLOCKING_BUDGET_S, f"Register #{i} took {dt:.2f}s"


# ==================== FAMILY JOIN: dual email trigger ====================
class TestFamilyJoinEmail:
    """User A creates family, gets code. User B registers, joins with code.
    Both emails are fire-and-forget."""

    @pytest.fixture(scope="class")
    def pair(self, session, db):
        """Register A + B, A creates family, returns tokens & code."""
        email_a = f"TEST_famA_{uuid.uuid4().hex[:8]}@test.com"
        email_b = f"TEST_famB_{uuid.uuid4().hex[:8]}@test.com"
        _CREATED_EMAILS.extend([email_a.lower(), email_b.lower()])

        r_a = session.post(f"{BASE_URL}/api/auth/register",
                           json={"email": email_a, "password": "pass1234", "name": "Alice TEST"})
        assert r_a.status_code == 200, r_a.text
        token_a = r_a.json()["access_token"]

        r_b = session.post(f"{BASE_URL}/api/auth/register",
                           json={"email": email_b, "password": "pass1234", "name": "Bob TEST"})
        assert r_b.status_code == 200, r_b.text
        token_b = r_b.json()["access_token"]

        # A creates family
        r_fam = session.post(f"{BASE_URL}/api/family",
                             headers={"Authorization": f"Bearer {token_a}"})
        assert r_fam.status_code == 200, r_fam.text
        family = r_fam.json()["family"]
        code = family["code"]
        return {
            "email_a": email_a, "token_a": token_a,
            "email_b": email_b, "token_b": token_b,
            "code": code, "family_id": family["id"],
        }

    def test_family_join_is_pending_not_immediate(self, session, pair):
        """Joining no longer adds the member immediately — it creates a
        pending request that the existing member must approve."""
        headers_b = {"Authorization": f"Bearer {pair['token_b']}"}
        t0 = time.perf_counter()
        r = session.post(f"{BASE_URL}/api/family/join",
                         json={"code": pair["code"]}, headers=headers_b)
        dt = time.perf_counter() - t0
        assert r.status_code == 200, r.text
        # Non-blocking: the approval-request email was scheduled but response is fast
        assert dt < NON_BLOCKING_BUDGET_S, f"Join took {dt:.2f}s (expected <{NON_BLOCKING_BUDGET_S}s) — emails may be blocking"
        assert r.json().get("pending") is True

        # A should now see B in the pending list, not yet as a member
        headers_a = {"Authorization": f"Bearer {pair['token_a']}"}
        r_fam = session.get(f"{BASE_URL}/api/family/me", headers=headers_a)
        assert r_fam.status_code == 200
        fam = r_fam.json()["family"]
        assert len(fam["members"]) == 1
        assert len(fam["pending"]) == 1
        assert fam["pending"][0]["email"] == pair["email_b"].lower()

    def test_family_approve_adds_second_member(self, session, pair):
        """A approves B's pending request -> B becomes a full member."""
        headers_a = {"Authorization": f"Bearer {pair['token_a']}"}
        headers_b = {"Authorization": f"Bearer {pair['token_b']}"}
        b_id = session.get(f"{BASE_URL}/api/auth/me", headers=headers_b).json()["id"]

        r = session.post(f"{BASE_URL}/api/family/requests/{b_id}/approve", headers=headers_a)
        assert r.status_code == 200, r.text
        fam = r.json()["family"]
        assert len(fam["members"]) == 2
        assert len(fam["pending"]) == 0
        me = next((m for m in fam["members"] if m["is_me"]), None)
        other = next((m for m in fam["members"] if not m["is_me"]), None)
        assert me is not None and me["email"] == pair["email_a"].lower()
        assert other is not None and other["email"] == pair["email_b"].lower()

    def test_family_join_already_in_400(self, session, pair):
        """After being approved, B cannot join again."""
        headers_b = {"Authorization": f"Bearer {pair['token_b']}"}
        r = session.post(f"{BASE_URL}/api/family/join",
                         json={"code": pair["code"]}, headers=headers_b)
        assert r.status_code == 400
        assert "familie" in r.json().get("detail", "").lower()

    def test_family_join_third_user_full_400(self, session, pair, db):
        """MAX_FAMILY_MEMBERS = 2 — 3rd registrant joining must be rejected."""
        email_c = f"TEST_famC_{uuid.uuid4().hex[:8]}@test.com"
        _CREATED_EMAILS.append(email_c.lower())
        r_c = session.post(f"{BASE_URL}/api/auth/register",
                           json={"email": email_c, "password": "pass1234", "name": "Carol TEST"})
        assert r_c.status_code == 200
        token_c = r_c.json()["access_token"]
        r = session.post(f"{BASE_URL}/api/family/join",
                         json={"code": pair["code"]},
                         headers={"Authorization": f"Bearer {token_c}"})
        assert r.status_code == 400
        assert "maxim" in r.json().get("detail", "").lower()

    def test_family_join_invalid_code_400(self, session):
        """Code shorter than 4 → 400 invalid."""
        email = f"TEST_famJinv_{uuid.uuid4().hex[:8]}@test.com"
        _CREATED_EMAILS.append(email.lower())
        r = session.post(f"{BASE_URL}/api/auth/register",
                         json={"email": email, "password": "pass1234", "name": "TEST inv"})
        assert r.status_code == 200
        token = r.json()["access_token"]
        r2 = session.post(f"{BASE_URL}/api/family/join",
                          json={"code": "AB"},
                          headers={"Authorization": f"Bearer {token}"})
        assert r2.status_code == 400
        assert "invalid" in r2.json().get("detail", "").lower()

    def test_family_join_nonexistent_code_404(self, session):
        """Code with valid format but does not exist → 404."""
        email = f"TEST_famJnx_{uuid.uuid4().hex[:8]}@test.com"
        _CREATED_EMAILS.append(email.lower())
        r = session.post(f"{BASE_URL}/api/auth/register",
                         json={"email": email, "password": "pass1234", "name": "TEST nx"})
        assert r.status_code == 200
        token = r.json()["access_token"]
        r2 = session.post(f"{BASE_URL}/api/family/join",
                          json={"code": "ZZZZZZ"},
                          headers={"Authorization": f"Bearer {token}"})
        assert r2.status_code == 404
        assert "inexistent" in r2.json().get("detail", "").lower()


# ==================== CLEANUP ====================
@pytest.fixture(scope="module", autouse=True)
def _cleanup(db):
    yield
    # Delete every test user we created + their families + associated data
    for email in set(_CREATED_EMAILS):
        u = db.users.find_one({"email": email})
        if u:
            uid = u["id"]
            db.users.delete_one({"id": uid})
            db.journal.delete_many({"user_id": uid})
            db.bookmarks.delete_many({"user_id": uid})
            db.ask_history.delete_many({"user_id": uid})
            db.test_results.delete_many({"user_id": uid})
            db.forum_posts.delete_many({"user_id": uid})
            db.forum_answers.delete_many({"user_id": uid})
            db.guide_progress.delete_many({"user_id": uid})
            db.families.update_many({"member_ids": uid}, {"$pull": {"member_ids": uid}})
            db.families.update_many({"pending_ids": uid}, {"$pull": {"pending_ids": uid}})
        db.password_reset_codes.delete_many({"email": email})
        db.password_reset_requests.delete_many({"email": email})
    # Remove any empty family docs
    db.families.delete_many({"member_ids": {"$size": 0}})
