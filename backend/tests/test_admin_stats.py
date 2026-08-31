"""Backend API tests for admin + personal stats endpoints (Jurnal Părinte)."""
import os
import uuid
import requests
import pytest

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://app-layout-designer.preview.emergentagent.com').rstrip('/')
API = f"{BASE_URL}/api"

SUPER_ADMIN_EMAIL = "otilia.ioana96@gmail.com"
SUPER_ADMIN_PASSWORD = "Admin123!"

REGULAR_EMAIL = "test@test.com"
REGULAR_PASSWORD = "test123"


# ---------- helpers ----------
def _register(email, password, name):
    return requests.post(f"{API}/auth/register", json={"email": email, "password": password, "name": name}, timeout=30)

def _login(email, password):
    return requests.post(f"{API}/auth/login", json={"email": email, "password": password}, timeout=30)

def _ensure_user(email, password, name):
    """Return a valid token for email; register if missing."""
    r = _login(email, password)
    if r.status_code == 200:
        return r.json()["access_token"], r.json()["user"]
    rr = _register(email, password, name)
    assert rr.status_code == 200, f"cannot register {email}: {rr.status_code} {rr.text}"
    return rr.json()["access_token"], rr.json()["user"]


@pytest.fixture(scope="session")
def admin_ctx():
    token, user = _ensure_user(SUPER_ADMIN_EMAIL, SUPER_ADMIN_PASSWORD, "Otilia")
    return {
        "token": token,
        "user": user,
        "headers": {"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
    }

@pytest.fixture(scope="session")
def user_ctx():
    token, user = _ensure_user(REGULAR_EMAIL, REGULAR_PASSWORD, "Test")
    return {
        "token": token,
        "user": user,
        "headers": {"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
    }


# =============================================================
# Personal stats /api/me/stats
# =============================================================
class TestMeStats:
    def test_requires_auth(self):
        r = requests.get(f"{API}/me/stats", timeout=15)
        assert r.status_code in (401, 403)

    def test_stats_shape(self, user_ctx):
        r = requests.get(f"{API}/me/stats", headers=user_ctx["headers"], timeout=15)
        assert r.status_code == 200, r.text
        b = r.json()
        # Required top-level keys
        for k in ("journal", "ask_ai", "bookmarks_total", "forum", "test_result", "family",
                  "guide_read_chapters", "member_since"):
            assert k in b, f"missing key {k} in /me/stats response: {b.keys()}"
        # Nested shape
        for k in ("total", "last_30_days", "last_7_days"):
            assert k in b["journal"]
        for k in ("total", "last_30_days"):
            assert k in b["ask_ai"]
        assert "posts" in b["forum"] and "answers" in b["forum"]
        # Types
        assert isinstance(b["bookmarks_total"], int)
        assert isinstance(b["guide_read_chapters"], int)


# =============================================================
# Auth: super admin flagging
# =============================================================
class TestSuperAdminAuth:
    def test_super_admin_flag_on_login(self, admin_ctx):
        # /auth/me should carry is_admin=True (idempotent regardless of registration path)
        r = requests.get(f"{API}/auth/me", headers=admin_ctx["headers"], timeout=15)
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["email"].lower() == SUPER_ADMIN_EMAIL
        assert body.get("is_admin") is True, f"is_admin missing/false for super admin: {body}"

    def test_regular_user_not_admin(self, user_ctx):
        r = requests.get(f"{API}/auth/me", headers=user_ctx["headers"], timeout=15)
        assert r.status_code == 200
        # A regular user should not be admin
        assert r.json().get("is_admin") is False

    def test_super_admin_idempotent_login_sets_flag(self):
        """Login again — is_admin should still be true (idempotent)."""
        r = _login(SUPER_ADMIN_EMAIL, SUPER_ADMIN_PASSWORD)
        assert r.status_code == 200
        assert r.json()["user"]["is_admin"] is True


# =============================================================
# 403 gating on /admin/*
# =============================================================
class TestAdminAccessGating:
    @pytest.mark.parametrize("path", [
        "/admin/stats",
        "/admin/users",
        "/admin/forum/flagged",
    ])
    def test_non_admin_forbidden(self, user_ctx, path):
        r = requests.get(f"{API}{path}", headers=user_ctx["headers"], timeout=15)
        assert r.status_code == 403, f"{path} allowed for non-admin: {r.status_code} {r.text}"

    def test_non_admin_forbidden_delete(self, user_ctx):
        r = requests.delete(f"{API}/admin/users/{user_ctx['user']['id']}", headers=user_ctx["headers"], timeout=15)
        assert r.status_code == 403


# =============================================================
# /api/admin/stats
# =============================================================
class TestAdminStats:
    def test_stats_shape(self, admin_ctx):
        r = requests.get(f"{API}/admin/stats", headers=admin_ctx["headers"], timeout=20)
        assert r.status_code == 200, r.text
        b = r.json()
        for k in ("users", "journal", "ask_ai", "tests", "families_total", "forum"):
            assert k in b, f"missing key {k}: {list(b.keys())}"
        for k in ("total", "new_last_7_days", "new_last_30_days", "active_last_7_days"):
            assert k in b["users"]
        assert "profile_distribution" in b["tests"]
        assert isinstance(b["tests"]["profile_distribution"], dict)
        for k in ("posts_total", "answers_total", "flagged_posts"):
            assert k in b["forum"]
        assert isinstance(b["users"]["total"], int)
        assert b["users"]["total"] >= 1


# =============================================================
# /api/admin/users  (list + search + delete cascade + toggle-admin)
# =============================================================
class TestAdminUsers:
    def test_list_users(self, admin_ctx, user_ctx):
        r = requests.get(f"{API}/admin/users", headers=admin_ctx["headers"], timeout=20)
        assert r.status_code == 200, r.text
        b = r.json()
        assert "users" in b and "total" in b
        assert isinstance(b["users"], list) and len(b["users"]) >= 2
        # Each user must expose count fields
        for u in b["users"]:
            for k in ("id", "email", "name", "created_at", "is_admin",
                      "journal_count", "ask_count", "forum_count", "last_activity"):
                assert k in u, f"user missing key {k}: {u.keys()}"
        # super admin present with is_admin true
        admin = next((u for u in b["users"] if u["email"].lower() == SUPER_ADMIN_EMAIL), None)
        assert admin is not None
        assert admin["is_admin"] is True

    def test_search_by_email_case_insensitive(self, admin_ctx):
        r = requests.get(f"{API}/admin/users", params={"q": "OTILIA"}, headers=admin_ctx["headers"], timeout=15)
        assert r.status_code == 200
        emails = [u["email"].lower() for u in r.json()["users"]]
        assert any(SUPER_ADMIN_EMAIL in e for e in emails), f"search 'OTILIA' didn't match: {emails}"

    def test_search_by_name(self, admin_ctx):
        r = requests.get(f"{API}/admin/users", params={"q": "Test"}, headers=admin_ctx["headers"], timeout=15)
        assert r.status_code == 200
        # There should be at least one match (the seed test user has name 'Test')
        assert len(r.json()["users"]) >= 1

    def test_cannot_delete_self(self, admin_ctx):
        r = requests.delete(f"{API}/admin/users/{admin_ctx['user']['id']}", headers=admin_ctx["headers"], timeout=15)
        assert r.status_code == 400, r.text

    def test_delete_user_cascade(self, admin_ctx):
        # Create a burnable user with journal + bookmark + ask history + forum post
        burn_email = f"TEST_burn_{uuid.uuid4().hex[:6]}@example.com"
        rr = _register(burn_email, "passw0rd", "TEST_Burn")
        assert rr.status_code == 200, rr.text
        burn_user = rr.json()["user"]
        burn_headers = {"Authorization": f"Bearer {rr.json()['access_token']}", "Content-Type": "application/json"}
        burn_id = burn_user["id"]

        # Seed some data owned by this user
        r = requests.post(f"{API}/journal", json={"title": "TEST_J", "note": "n", "mood": "ok", "triggers": ""}, headers=burn_headers, timeout=15)
        assert r.status_code == 200
        r = requests.post(f"{API}/bookmarks", json={"subtopic_id": "sub-1-1", "title": "t", "category_id": "cat-1"}, headers=burn_headers, timeout=15)
        assert r.status_code == 200
        r = requests.post(f"{API}/forum/posts", json={
            "category": "general", "title": "TEST_ForumPost_Burn", "content": "conținut de test pentru forum", "is_anonymous": False,
        }, headers=burn_headers, timeout=15)
        assert r.status_code == 200, r.text
        post_id = r.json()["post"]["id"]

        # Delete via admin
        dr = requests.delete(f"{API}/admin/users/{burn_id}", headers=admin_ctx["headers"], timeout=20)
        assert dr.status_code == 200, dr.text
        assert dr.json().get("ok") is True

        # Verify cascade — the login should now fail
        lr = _login(burn_email, "passw0rd")
        assert lr.status_code in (401, 404), f"user still logs in after delete: {lr.status_code}"

        # Verify user not in listing
        lr = requests.get(f"{API}/admin/users", params={"q": burn_email}, headers=admin_ctx["headers"], timeout=15)
        assert lr.status_code == 200
        assert not any(u["email"].lower() == burn_email.lower() for u in lr.json()["users"])

        # Forum post should be gone (public forum listing should not return it)
        fr = requests.get(f"{API}/forum/posts", params={"category": "general"}, headers=admin_ctx["headers"], timeout=15)
        assert fr.status_code == 200
        assert not any(p["id"] == post_id for p in fr.json()["posts"])

    def test_delete_missing_user_404(self, admin_ctx):
        r = requests.delete(f"{API}/admin/users/does-not-exist-{uuid.uuid4().hex[:6]}", headers=admin_ctx["headers"], timeout=15)
        assert r.status_code == 404

    def test_toggle_admin_flow(self, admin_ctx):
        # Create fresh user, toggle -> admin, toggle again -> non-admin, cleanup
        email = f"TEST_toggle_{uuid.uuid4().hex[:6]}@example.com"
        rr = _register(email, "passw0rd", "TEST_Toggle")
        assert rr.status_code == 200
        uid = rr.json()["user"]["id"]

        r1 = requests.post(f"{API}/admin/users/{uid}/toggle-admin", headers=admin_ctx["headers"], timeout=15)
        assert r1.status_code == 200, r1.text
        assert r1.json()["is_admin"] is True

        r2 = requests.post(f"{API}/admin/users/{uid}/toggle-admin", headers=admin_ctx["headers"], timeout=15)
        assert r2.status_code == 200
        assert r2.json()["is_admin"] is False

        # Cleanup
        requests.delete(f"{API}/admin/users/{uid}", headers=admin_ctx["headers"], timeout=15)

    def test_toggle_admin_super_admin_forbidden(self, admin_ctx):
        r = requests.post(f"{API}/admin/users/{admin_ctx['user']['id']}/toggle-admin", headers=admin_ctx["headers"], timeout=15)
        assert r.status_code == 400, r.text

    def test_toggle_admin_missing_user_404(self, admin_ctx):
        r = requests.post(f"{API}/admin/users/does-not-exist/toggle-admin", headers=admin_ctx["headers"], timeout=15)
        assert r.status_code == 404


# =============================================================
# /api/admin/forum/*  moderation
# =============================================================
class TestAdminForumModeration:
    def test_flagged_empty_shape(self, admin_ctx):
        r = requests.get(f"{API}/admin/forum/flagged", headers=admin_ctx["headers"], timeout=15)
        assert r.status_code == 200, r.text
        b = r.json()
        assert "flagged_posts" in b and "flagged_answers" in b
        assert isinstance(b["flagged_posts"], list)
        assert isinstance(b["flagged_answers"], list)

    def test_flag_then_admin_delete_post_and_answer(self, admin_ctx, user_ctx):
        # user_ctx creates a post + answer, admin flags them, admin lists flagged, admin deletes
        # 1. user creates post
        r = requests.post(f"{API}/forum/posts", json={
            "category": "general", "title": "TEST_ModPost", "content": "content long enough for validation",
            "is_anonymous": False,
        }, headers=user_ctx["headers"], timeout=15)
        assert r.status_code == 200, r.text
        post_id = r.json()["post"]["id"]

        # 2. user posts an answer to their own post
        r = requests.post(f"{API}/forum/posts/{post_id}/answers", json={"content": "TEST_answer content", "is_anonymous": False},
                          headers=user_ctx["headers"], timeout=15)
        assert r.status_code == 200, r.text
        answer_id = r.json()["answer"]["id"]

        # 3. admin flags both
        fp = requests.post(f"{API}/forum/posts/{post_id}/flag", headers=admin_ctx["headers"], timeout=15)
        assert fp.status_code == 200
        fa = requests.post(f"{API}/forum/answers/{answer_id}/flag", headers=admin_ctx["headers"], timeout=15)
        assert fa.status_code == 200

        # 4. admin lists flagged - both must appear with flag_count>=1
        lr = requests.get(f"{API}/admin/forum/flagged", headers=admin_ctx["headers"], timeout=15)
        assert lr.status_code == 200
        body = lr.json()
        found_post = next((p for p in body["flagged_posts"] if p["id"] == post_id), None)
        found_ans = next((a for a in body["flagged_answers"] if a["id"] == answer_id), None)
        assert found_post is not None, f"post not in flagged list: {[p['id'] for p in body['flagged_posts']]}"
        assert found_post["flag_count"] >= 1
        assert found_ans is not None
        assert found_ans["flag_count"] >= 1

        # 5. admin deletes the answer -> post answer_count should decrement
        # Grab the post's answer_count BEFORE delete
        gr = requests.get(f"{API}/forum/posts/{post_id}", headers=admin_ctx["headers"], timeout=15)
        assert gr.status_code == 200
        before_count = gr.json()["post"]["answer_count"]

        dar = requests.delete(f"{API}/admin/forum/answers/{answer_id}", headers=admin_ctx["headers"], timeout=15)
        assert dar.status_code == 200, dar.text

        gr2 = requests.get(f"{API}/forum/posts/{post_id}", headers=admin_ctx["headers"], timeout=15)
        assert gr2.status_code == 200
        after_count = gr2.json()["post"]["answer_count"]
        assert after_count == before_count - 1, f"answer_count not decremented: {before_count}->{after_count}"

        # 6. admin deletes the post -> post is gone (404 on GET)
        dpr = requests.delete(f"{API}/admin/forum/posts/{post_id}", headers=admin_ctx["headers"], timeout=15)
        assert dpr.status_code == 200

        gr3 = requests.get(f"{API}/forum/posts/{post_id}", headers=admin_ctx["headers"], timeout=15)
        assert gr3.status_code == 404

    def test_delete_missing_forum_post(self, admin_ctx):
        r = requests.delete(f"{API}/admin/forum/posts/does-not-exist", headers=admin_ctx["headers"], timeout=15)
        assert r.status_code == 404

    def test_delete_missing_forum_answer(self, admin_ctx):
        r = requests.delete(f"{API}/admin/forum/answers/does-not-exist", headers=admin_ctx["headers"], timeout=15)
        assert r.status_code == 404
