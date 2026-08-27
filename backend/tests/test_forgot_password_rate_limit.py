"""
Retest for the fixed rate-limit on POST /api/auth/forgot-password.

Fix summary: a new collection `password_reset_requests` is used as an
audit-log for rate-limit checks (never deleted mid-flow). The
`password_reset_codes` collection is still deleted+reinserted per call.

Tests here:
  1. 4 rapid calls for existing user → 3 succeed (code created), 4th silently
     no-ops (no new code, no request-log growth beyond 4 audit entries).
  2. password_reset_requests should have exactly 4 audit entries after 4 calls.
  3. password_reset_codes should have exactly 1 entry (most recent).
  4. Rate-limit applies to non-existent emails too (anti-enumeration).
  5. Simulated old (>15min) entries in password_reset_requests do NOT count;
     a fresh request after aging out old entries should create a new code.
"""
import os
import hashlib
import uuid
from datetime import datetime, timedelta, timezone

import pytest
import requests
from dotenv import load_dotenv
from pymongo import MongoClient

load_dotenv("/app/backend/.env")

# Read backend URL from frontend/.env
BASE_URL = None
with open("/app/frontend/.env") as f:
    for line in f:
        if line.startswith("EXPO_PUBLIC_BACKEND_URL"):
            BASE_URL = line.split("=", 1)[1].strip().strip('"').rstrip("/")
            break
assert BASE_URL, "EXPO_PUBLIC_BACKEND_URL not found"

MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]

TEST_USER_EMAIL = "test@test.com"
NONEXISTENT_EMAIL = f"TEST_nx_{uuid.uuid4().hex[:8]}@nowhere.example"


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


def _clean(db, email):
    db.password_reset_codes.delete_many({"email": email.lower()})
    db.password_reset_requests.delete_many({"email": email.lower()})


class TestRateLimitFix:
    """Verify the audit-log based rate-limit."""

    def test_4_rapid_calls_existing_user_third_is_last_to_create_code(self, session, db):
        _clean(db, TEST_USER_EMAIL)
        # Fire 4 rapid calls
        responses = []
        for _ in range(4):
            r = session.post(f"{BASE_URL}/api/auth/forgot-password",
                             json={"email": TEST_USER_EMAIL})
            responses.append(r)

        # All 4 should return generic 200
        for i, r in enumerate(responses):
            assert r.status_code == 200, f"Call {i+1} status: {r.status_code} body={r.text}"
            body = r.json()
            assert body.get("ok") is True
            assert "există" in body.get("message", "") or "primi" in body.get("message", "")

        # AUDIT LOG: should have exactly 4 entries
        audit_count = db.password_reset_requests.count_documents({"email": TEST_USER_EMAIL})
        assert audit_count == 4, f"Expected 4 audit entries, got {audit_count}"

        # RESET CODES: only 1 entry (delete_many before insert), and it was created
        # by the 3rd call — NOT the 4th (which should be silently skipped)
        code_count = db.password_reset_codes.count_documents({"email": TEST_USER_EMAIL})
        assert code_count == 1, f"Expected 1 reset code, got {code_count}"

        # Cleanup
        _clean(db, TEST_USER_EMAIL)

    def test_4th_call_does_not_create_new_code(self, session, db):
        """Prove the 4th call is a no-op: capture the code doc after call #3,
        then confirm it is unchanged after call #4."""
        _clean(db, TEST_USER_EMAIL)
        # 3 calls
        for _ in range(3):
            r = session.post(f"{BASE_URL}/api/auth/forgot-password",
                             json={"email": TEST_USER_EMAIL})
            assert r.status_code == 200
        code_after_3 = db.password_reset_codes.find_one({"email": TEST_USER_EMAIL})
        assert code_after_3 is not None
        code_id_before = code_after_3["id"]
        code_hash_before = code_after_3["code_hash"]
        created_before = code_after_3["created_at"]

        # 4th call
        r = session.post(f"{BASE_URL}/api/auth/forgot-password",
                         json={"email": TEST_USER_EMAIL})
        assert r.status_code == 200

        # The code doc should be unchanged (same id / same hash / same created_at)
        code_after_4 = db.password_reset_codes.find_one({"email": TEST_USER_EMAIL})
        assert code_after_4 is not None
        assert code_after_4["id"] == code_id_before, "4th call should NOT create a new code"
        assert code_after_4["code_hash"] == code_hash_before
        assert code_after_4["created_at"] == created_before

        # And the audit-log should show 4 attempts
        assert db.password_reset_requests.count_documents({"email": TEST_USER_EMAIL}) == 4

        _clean(db, TEST_USER_EMAIL)

    def test_rate_limit_applies_to_nonexistent_email(self, session, db):
        """Anti-enumeration: rate limit MUST also apply to non-existent emails.
        Otherwise attacker can distinguish real vs fake by behaviour."""
        _clean(db, NONEXISTENT_EMAIL)
        for i in range(4):
            r = session.post(f"{BASE_URL}/api/auth/forgot-password",
                             json={"email": NONEXISTENT_EMAIL})
            assert r.status_code == 200
            assert r.json().get("ok") is True

        # Audit-log MUST contain all 4 attempts (even for non-existent user)
        audit_count = db.password_reset_requests.count_documents({"email": NONEXISTENT_EMAIL.lower()})
        assert audit_count == 4, (
            f"Rate-limit audit log must record attempts for non-existent emails too. "
            f"Got {audit_count}, expected 4"
        )

        # No reset code should ever be created for a non-existent user
        code_count = db.password_reset_codes.count_documents({"email": NONEXISTENT_EMAIL.lower()})
        assert code_count == 0, f"No reset code should exist for non-existent user, got {code_count}"

        _clean(db, NONEXISTENT_EMAIL)

    def test_old_entries_do_not_count_after_15min_window(self, session, db):
        """Simulate: 3 requests happened >15 min ago. A fresh request should
        succeed (create a new code) since only entries within the 15min window
        count toward the rate limit."""
        _clean(db, TEST_USER_EMAIL)

        # Seed 3 OLD audit entries (>15 min ago)
        old_time = datetime.now(timezone.utc) - timedelta(minutes=30)
        db.password_reset_requests.insert_many([
            {"email": TEST_USER_EMAIL, "created_at": old_time},
            {"email": TEST_USER_EMAIL, "created_at": old_time + timedelta(seconds=1)},
            {"email": TEST_USER_EMAIL, "created_at": old_time + timedelta(seconds=2)},
        ])

        # Now make a fresh request — should succeed because old entries are outside window
        r = session.post(f"{BASE_URL}/api/auth/forgot-password",
                         json={"email": TEST_USER_EMAIL})
        assert r.status_code == 200
        assert r.json().get("ok") is True

        # Audit log should now have 4 total (3 old + 1 new), but code should be created
        assert db.password_reset_requests.count_documents({"email": TEST_USER_EMAIL}) == 4
        code = db.password_reset_codes.find_one({"email": TEST_USER_EMAIL})
        assert code is not None, "Fresh request after 15min window should create a new code"

        # Verify only the NEW entry is within the 15min window
        since = datetime.now(timezone.utc) - timedelta(minutes=15)
        recent = db.password_reset_requests.count_documents({
            "email": TEST_USER_EMAIL,
            "created_at": {"$gte": since},
        })
        assert recent == 1, f"Only 1 request should be within 15min window, got {recent}"

        _clean(db, TEST_USER_EMAIL)

    def test_mixed_old_and_new_boundary(self, session, db):
        """2 old + 2 new = only 2 recent → 3rd new request should still succeed
        (recent count = 2, allowed since <3)."""
        _clean(db, TEST_USER_EMAIL)

        # 2 old (won't count)
        old_time = datetime.now(timezone.utc) - timedelta(minutes=30)
        db.password_reset_requests.insert_many([
            {"email": TEST_USER_EMAIL, "created_at": old_time},
            {"email": TEST_USER_EMAIL, "created_at": old_time + timedelta(seconds=1)},
        ])

        # 2 real new calls
        for _ in range(2):
            r = session.post(f"{BASE_URL}/api/auth/forgot-password",
                             json={"email": TEST_USER_EMAIL})
            assert r.status_code == 200

        # Snapshot code from 2nd call
        code_before = db.password_reset_codes.find_one({"email": TEST_USER_EMAIL})
        assert code_before is not None
        code_id_2nd = code_before["id"]

        # 3rd new call — recent count at THIS moment is 2 (from the 2 new calls) → still allowed
        r = session.post(f"{BASE_URL}/api/auth/forgot-password",
                         json={"email": TEST_USER_EMAIL})
        assert r.status_code == 200

        # Because recent<3, a new code should have been generated (different id)
        code_after = db.password_reset_codes.find_one({"email": TEST_USER_EMAIL})
        assert code_after is not None
        assert code_after["id"] != code_id_2nd, "3rd new call should regenerate code"

        # 4th new call — now recent count = 3 → should be silently skipped
        r = session.post(f"{BASE_URL}/api/auth/forgot-password",
                         json={"email": TEST_USER_EMAIL})
        assert r.status_code == 200
        code_after4 = db.password_reset_codes.find_one({"email": TEST_USER_EMAIL})
        assert code_after4["id"] == code_after["id"], "4th new call should be silently skipped"

        _clean(db, TEST_USER_EMAIL)


@pytest.fixture(scope="module", autouse=True)
def _final_cleanup(db):
    """Guarantee that no test data lingers for test@test.com or the fake email."""
    yield
    _clean(db, TEST_USER_EMAIL)
    _clean(db, NONEXISTENT_EMAIL)
    # Ensure test@test.com password is unchanged — this suite never touches the users collection.
