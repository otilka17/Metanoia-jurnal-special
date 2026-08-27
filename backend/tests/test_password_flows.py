"""
Backend tests for change-password + forgot-password + reset-password flows.
Uses direct MongoDB access to insert/inspect password_reset_codes when needed
because the real reset code is only ever sent via email.
"""
import os
import hashlib
import uuid
import time
from datetime import datetime, timedelta, timezone

import pytest
import requests
from dotenv import load_dotenv
from pymongo import MongoClient

load_dotenv("/app/backend/.env")

BASE_URL = os.environ["EXPO_PUBLIC_BACKEND_URL"].rstrip("/") if os.environ.get("EXPO_PUBLIC_BACKEND_URL") else None
if not BASE_URL:
    # Fallback: read from frontend/.env
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("EXPO_PUBLIC_BACKEND_URL"):
                BASE_URL = line.split("=", 1)[1].strip().strip('"').rstrip("/")
                break

MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]

TEST_USER_EMAIL = "test@test.com"
TEST_USER_PASSWORD = "test123"


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


def _login(session, email, password):
    r = session.post(f"{BASE_URL}/api/auth/login", json={"email": email, "password": password})
    return r


def _register_temp_user(session, email, password, name="Temp"):
    return session.post(f"{BASE_URL}/api/auth/register", json={"email": email, "password": password, "name": name})


# ==================== CHANGE PASSWORD ====================
class TestChangePassword:
    """Change password (authenticated)."""

    def test_change_password_no_auth(self, session):
        r = session.post(f"{BASE_URL}/api/auth/change-password",
                         json={"old_password": "x", "new_password": "yyyyyy"})
        assert r.status_code in (401, 403), f"Expected 401/403 got {r.status_code}: {r.text}"

    def test_change_password_flow_and_edge_cases(self, session, db):
        # Register a fresh user for isolated testing
        email = f"TEST_chpwd_{uuid.uuid4().hex[:8]}@test.com"
        pwd = "orig123"
        r = _register_temp_user(session, email, pwd, name="TEST chpwd")
        assert r.status_code == 200, r.text
        token = r.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # Case: wrong old password
        r = session.post(f"{BASE_URL}/api/auth/change-password",
                         json={"old_password": "WRONG", "new_password": "newpass1"}, headers=headers)
        assert r.status_code == 401
        assert "actuală" in r.json().get("detail", "") or "actual" in r.json().get("detail", "").lower()

        # Case: new password too short
        r = session.post(f"{BASE_URL}/api/auth/change-password",
                         json={"old_password": pwd, "new_password": "abc"}, headers=headers)
        assert r.status_code == 400
        assert "minim 6" in r.json().get("detail", "")

        # Case: same as old
        r = session.post(f"{BASE_URL}/api/auth/change-password",
                         json={"old_password": pwd, "new_password": pwd}, headers=headers)
        assert r.status_code == 400
        assert "diferită" in r.json().get("detail", "")

        # Case: success
        new_pwd = "brandnew1"
        r = session.post(f"{BASE_URL}/api/auth/change-password",
                         json={"old_password": pwd, "new_password": new_pwd}, headers=headers)
        assert r.status_code == 200, r.text
        assert r.json().get("ok") is True

        # Cannot login with old
        r = _login(session, email, pwd)
        assert r.status_code == 401
        # Can login with new
        r = _login(session, email, new_pwd)
        assert r.status_code == 200

        # Cleanup: delete user + related data
        db.users.delete_one({"email": email.lower()})
        db.password_reset_codes.delete_many({"email": email.lower()})


# ==================== FORGOT PASSWORD ====================
class TestForgotPassword:
    """Forgot password (public)."""

    def test_forgot_password_nonexistent_email_generic_response(self, session, db):
        # Ensure no leftover code
        db.password_reset_codes.delete_many({"email": "nosuch_TEST@nowhere.example"})
        r = session.post(f"{BASE_URL}/api/auth/forgot-password",
                         json={"email": "nosuch_TEST@nowhere.example"})
        assert r.status_code == 200
        body = r.json()
        assert body.get("ok") is True
        assert "există" in body.get("message", "") or "primi" in body.get("message", "")
        # No code should have been created for a non-existent user
        cnt = db.password_reset_codes.count_documents({"email": "nosuch_test@nowhere.example"})
        assert cnt == 0

    def test_forgot_password_existing_user_creates_code(self, session, db):
        # Clean prior codes
        db.password_reset_codes.delete_many({"email": TEST_USER_EMAIL})
        r = session.post(f"{BASE_URL}/api/auth/forgot-password",
                         json={"email": TEST_USER_EMAIL})
        assert r.status_code == 200
        assert r.json().get("ok") is True
        # Verify a record was persisted
        rec = db.password_reset_codes.find_one({"email": TEST_USER_EMAIL, "used": False})
        assert rec is not None, "Expected a password_reset_codes record for test user"
        assert "code_hash" in rec and len(rec["code_hash"]) == 64
        assert rec.get("attempts") == 0
        assert rec.get("used") is False
        assert rec.get("expires_at") is not None
        # Cleanup
        db.password_reset_codes.delete_many({"email": TEST_USER_EMAIL})

    def test_forgot_password_rate_limit_3_codes(self, session, db):
        # FIX (iteration 4): Rate limit uses a separate audit-log collection
        # `password_reset_requests` that is never wiped mid-flow. After 3 calls
        # within 15 min, the 4th is silently skipped (no new code, no email).
        db.password_reset_codes.delete_many({"email": TEST_USER_EMAIL})
        db.password_reset_requests.delete_many({"email": TEST_USER_EMAIL})
        # 3 calls succeed
        for _ in range(3):
            r = session.post(f"{BASE_URL}/api/auth/forgot-password",
                             json={"email": TEST_USER_EMAIL})
            assert r.status_code == 200
        # Snapshot: code exists (from 3rd call) and audit-log has 3 entries
        code_after_3 = db.password_reset_codes.find_one({"email": TEST_USER_EMAIL})
        assert code_after_3 is not None
        code_id_3rd = code_after_3["id"]
        assert db.password_reset_requests.count_documents({"email": TEST_USER_EMAIL}) == 3
        # 4th call is silently rate-limited → same code doc, audit-log grows to 4
        r = session.post(f"{BASE_URL}/api/auth/forgot-password",
                         json={"email": TEST_USER_EMAIL})
        assert r.status_code == 200
        assert r.json().get("ok") is True
        code_after_4 = db.password_reset_codes.find_one({"email": TEST_USER_EMAIL})
        assert code_after_4["id"] == code_id_3rd, "4th call must NOT create a new code"
        assert db.password_reset_requests.count_documents({"email": TEST_USER_EMAIL}) == 4
        # Cleanup
        db.password_reset_codes.delete_many({"email": TEST_USER_EMAIL})
        db.password_reset_requests.delete_many({"email": TEST_USER_EMAIL})


# ==================== RESET PASSWORD ====================
class TestResetPassword:
    """Reset password using code (public)."""

    def _seed_code(self, db, email, code, minutes_ttl=15, attempts=0, used=False):
        code_hash = hashlib.sha256(code.encode()).hexdigest()
        now = datetime.now(timezone.utc)
        doc = {
            "id": str(uuid.uuid4()),
            "email": email.lower(),
            "code_hash": code_hash,
            "created_at": now,
            "expires_at": now + timedelta(minutes=minutes_ttl),
            "used": used,
            "attempts": attempts,
        }
        db.password_reset_codes.delete_many({"email": email.lower()})
        db.password_reset_codes.insert_one(doc)
        return doc

    def test_reset_password_invalid_format_non_digit(self, session):
        r = session.post(f"{BASE_URL}/api/auth/reset-password",
                         json={"email": TEST_USER_EMAIL, "code": "abcdef",
                               "new_password": "newpass1"})
        assert r.status_code == 400
        assert "6 cifre" in r.json().get("detail", "")

    def test_reset_password_invalid_format_too_short(self, session):
        r = session.post(f"{BASE_URL}/api/auth/reset-password",
                         json={"email": TEST_USER_EMAIL, "code": "12345",
                               "new_password": "newpass1"})
        assert r.status_code == 400

    def test_reset_password_new_pwd_too_short(self, session):
        r = session.post(f"{BASE_URL}/api/auth/reset-password",
                         json={"email": TEST_USER_EMAIL, "code": "123456",
                               "new_password": "abc"})
        assert r.status_code == 400
        assert "minim 6" in r.json().get("detail", "")

    def test_reset_password_no_code_record(self, session, db):
        db.password_reset_codes.delete_many({"email": TEST_USER_EMAIL})
        r = session.post(f"{BASE_URL}/api/auth/reset-password",
                         json={"email": TEST_USER_EMAIL, "code": "123456",
                               "new_password": "somenew1"})
        assert r.status_code == 400
        assert "inexistent" in r.json().get("detail", "").lower() or "expirat" in r.json().get("detail", "").lower()

    def test_reset_password_wrong_code_increments_attempts(self, session, db):
        # Setup: register a temp user + seed a code
        email = f"TEST_reset_wc_{uuid.uuid4().hex[:8]}@test.com"
        r = _register_temp_user(session, email, "orig123", name="TEST reset")
        assert r.status_code == 200
        self._seed_code(db, email, code="654321")
        # Attempt with wrong code
        r = session.post(f"{BASE_URL}/api/auth/reset-password",
                         json={"email": email, "code": "111111",
                               "new_password": "newpass1"})
        assert r.status_code == 400
        assert "incorect" in r.json().get("detail", "").lower()
        rec = db.password_reset_codes.find_one({"email": email.lower()})
        assert rec.get("attempts") == 1
        # Cleanup
        db.users.delete_one({"email": email.lower()})
        db.password_reset_codes.delete_many({"email": email.lower()})

    def test_reset_password_expired_code(self, session, db):
        email = f"TEST_reset_exp_{uuid.uuid4().hex[:8]}@test.com"
        r = _register_temp_user(session, email, "orig123", name="TEST reset exp")
        assert r.status_code == 200
        # Seed expired code (expires_at in past)
        db.password_reset_codes.delete_many({"email": email.lower()})
        now = datetime.now(timezone.utc)
        db.password_reset_codes.insert_one({
            "id": str(uuid.uuid4()),
            "email": email.lower(),
            "code_hash": hashlib.sha256("123456".encode()).hexdigest(),
            "created_at": now - timedelta(minutes=20),
            "expires_at": now - timedelta(minutes=5),
            "used": False,
            "attempts": 0,
        })
        r = session.post(f"{BASE_URL}/api/auth/reset-password",
                         json={"email": email, "code": "123456",
                               "new_password": "newpass1"})
        assert r.status_code == 400
        assert "expirat" in r.json().get("detail", "").lower()
        # Cleanup
        db.users.delete_one({"email": email.lower()})
        db.password_reset_codes.delete_many({"email": email.lower()})

    def test_reset_password_too_many_attempts(self, session, db):
        email = f"TEST_reset_max_{uuid.uuid4().hex[:8]}@test.com"
        r = _register_temp_user(session, email, "orig123", name="TEST reset max")
        assert r.status_code == 200
        self._seed_code(db, email, code="123456", attempts=5)
        r = session.post(f"{BASE_URL}/api/auth/reset-password",
                         json={"email": email, "code": "123456",
                               "new_password": "newpass1"})
        assert r.status_code == 400
        assert "încercări" in r.json().get("detail", "") or "incercari" in r.json().get("detail", "").lower()
        # Cleanup
        db.users.delete_one({"email": email.lower()})
        db.password_reset_codes.delete_many({"email": email.lower()})

    def test_reset_password_happy_path(self, session, db):
        # Register a temp user, seed a known code, reset, and login with new pwd
        email = f"TEST_reset_ok_{uuid.uuid4().hex[:8]}@test.com"
        orig_pwd = "orig123"
        r = _register_temp_user(session, email, orig_pwd, name="TEST reset ok")
        assert r.status_code == 200, r.text
        self._seed_code(db, email, code="123456")
        # Reset
        new_pwd = "newpass1"
        r = session.post(f"{BASE_URL}/api/auth/reset-password",
                         json={"email": email, "code": "123456",
                               "new_password": new_pwd})
        assert r.status_code == 200, r.text
        assert r.json().get("ok") is True
        # Old login fails
        r = _login(session, email, orig_pwd)
        assert r.status_code == 401
        # New login works
        r = _login(session, email, new_pwd)
        assert r.status_code == 200
        # Code marked used or deleted
        remaining = db.password_reset_codes.count_documents({"email": email.lower(), "used": False})
        assert remaining == 0
        # Cleanup
        db.users.delete_one({"email": email.lower()})
        db.password_reset_codes.delete_many({"email": email.lower()})

    def test_reset_password_code_reuse_denied(self, session, db):
        # After successful reset, code cannot be reused
        email = f"TEST_reset_reuse_{uuid.uuid4().hex[:8]}@test.com"
        r = _register_temp_user(session, email, "orig123", name="TEST reset reuse")
        assert r.status_code == 200
        self._seed_code(db, email, code="222333")
        r = session.post(f"{BASE_URL}/api/auth/reset-password",
                         json={"email": email, "code": "222333",
                               "new_password": "reuse123"})
        assert r.status_code == 200
        # Try again
        r = session.post(f"{BASE_URL}/api/auth/reset-password",
                         json={"email": email, "code": "222333",
                               "new_password": "reuse456"})
        assert r.status_code == 400
        # Cleanup
        db.users.delete_one({"email": email.lower()})
        db.password_reset_codes.delete_many({"email": email.lower()})


# ==================== INTEGRATION: change→login preserves test@test.com ====================
class TestPreserveTestUser:
    """Ensure test@test.com password remains test123 for future test runs."""

    def test_restore_test_user_password(self, session, db):
        # Ensure test@test.com login still works with 'test123'
        r = _login(session, TEST_USER_EMAIL, TEST_USER_PASSWORD)
        if r.status_code != 200:
            # Reset via bcrypt directly
            import bcrypt
            new_hash = bcrypt.hashpw(TEST_USER_PASSWORD.encode(), bcrypt.gensalt()).decode()
            db.users.update_one({"email": TEST_USER_EMAIL}, {"$set": {"password": new_hash}})
            r = _login(session, TEST_USER_EMAIL, TEST_USER_PASSWORD)
        assert r.status_code == 200, "test@test.com must remain accessible with test123"
        # Cleanup any lingering reset codes for this user
        db.password_reset_codes.delete_many({"email": TEST_USER_EMAIL})
