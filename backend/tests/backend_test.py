"""Backend API tests for Romanian parenting guide app."""
import os
import time
import uuid
import requests
import pytest

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://app-layout-designer.preview.emergentagent.com').rstrip('/')
API = f"{BASE_URL}/api"

TEST_USER_EMAIL = "test@test.com"
TEST_USER_PASSWORD = "test123"


@pytest.fixture(scope="session")
def token():
    """Login as existing test user and return JWT token."""
    r = requests.post(f"{API}/auth/login", json={"email": TEST_USER_EMAIL, "password": TEST_USER_PASSWORD}, timeout=30)
    if r.status_code != 200:
        # try register
        rr = requests.post(f"{API}/auth/register", json={"email": TEST_USER_EMAIL, "password": TEST_USER_PASSWORD, "name": "Test"}, timeout=30)
        assert rr.status_code in (200, 201), f"Failed to register seed user: {rr.text}"
        return rr.json()["access_token"]
    return r.json()["access_token"]


@pytest.fixture(scope="session")
def auth_headers(token):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


# ===== Auth =====
class TestAuth:
    def test_register_new_user(self):
        email = f"test_{uuid.uuid4().hex[:8]}@example.com"
        r = requests.post(f"{API}/auth/register", json={"email": email, "password": "passw0rd", "name": "TEST User"}, timeout=15)
        assert r.status_code == 200, r.text
        body = r.json()
        assert "access_token" in body
        assert body["user"]["email"] == email
        assert body["user"]["name"] == "TEST User"

    def test_register_duplicate(self):
        r = requests.post(f"{API}/auth/register", json={"email": TEST_USER_EMAIL, "password": "test123", "name": "Test"}, timeout=15)
        assert r.status_code == 400

    def test_login_success(self):
        r = requests.post(f"{API}/auth/login", json={"email": TEST_USER_EMAIL, "password": TEST_USER_PASSWORD}, timeout=15)
        assert r.status_code == 200
        assert "access_token" in r.json()

    def test_login_wrong_password(self):
        r = requests.post(f"{API}/auth/login", json={"email": TEST_USER_EMAIL, "password": "wrong"}, timeout=15)
        assert r.status_code == 401

    def test_me_with_token(self, auth_headers):
        r = requests.get(f"{API}/auth/me", headers=auth_headers, timeout=15)
        assert r.status_code == 200
        assert r.json()["email"] == TEST_USER_EMAIL

    def test_me_without_token(self):
        r = requests.get(f"{API}/auth/me", timeout=15)
        assert r.status_code in (401, 403)


# ===== Categories & Search =====
class TestCategories:
    def test_list_categories(self):
        r = requests.get(f"{API}/categories", timeout=15)
        assert r.status_code == 200
        cats = r.json()["categories"]
        assert len(cats) == 5
        ids = [c["id"] for c in cats]
        assert ids == ["cat-1", "cat-2", "cat-3", "cat-4", "cat-5"]
        # validate subtopics structure
        for c in cats:
            assert "title" in c and "color" in c and "subtopics" in c
            assert len(c["subtopics"]) >= 2
            for s in c["subtopics"]:
                assert "id" in s and "title" in s and "points" in s

    def test_single_category(self):
        r = requests.get(f"{API}/categories/cat-1", timeout=15)
        assert r.status_code == 200
        assert r.json()["id"] == "cat-1"

    def test_single_category_404(self):
        r = requests.get(f"{API}/categories/cat-999", timeout=15)
        assert r.status_code == 404

    def test_search_meltdown(self):
        r = requests.get(f"{API}/search", params={"q": "meltdown"}, timeout=15)
        assert r.status_code == 200
        results = r.json()["results"]
        # "meltdown" appears in cat-5 title "Gestionarea Crizelor (Meltdowns)"
        assert len(results) >= 1
        assert any(res.get("category_id") == "cat-5" for res in results)

    def test_search_empty(self):
        r = requests.get(f"{API}/search", params={"q": ""}, timeout=15)
        assert r.status_code == 200
        assert r.json()["results"] == []


# ===== Bookmarks =====
class TestBookmarks:
    def test_bookmark_crud(self, auth_headers):
        # Create
        payload = {"subtopic_id": "sub-1-1", "title": "Dezvoltare Asincronă", "category_id": "cat-1"}
        r = requests.post(f"{API}/bookmarks", json=payload, headers=auth_headers, timeout=15)
        assert r.status_code == 200, r.text
        # List
        r = requests.get(f"{API}/bookmarks", headers=auth_headers, timeout=15)
        assert r.status_code == 200
        items = r.json()["bookmarks"]
        assert any(b["subtopic_id"] == "sub-1-1" for b in items)
        # Idempotent
        r2 = requests.post(f"{API}/bookmarks", json=payload, headers=auth_headers, timeout=15)
        assert r2.status_code == 200
        # Delete
        rd = requests.delete(f"{API}/bookmarks/sub-1-1", headers=auth_headers, timeout=15)
        assert rd.status_code == 200
        # Verify gone
        r = requests.get(f"{API}/bookmarks", headers=auth_headers, timeout=15)
        assert not any(b["subtopic_id"] == "sub-1-1" for b in r.json()["bookmarks"])

    def test_bookmarks_requires_auth(self):
        r = requests.get(f"{API}/bookmarks", timeout=15)
        assert r.status_code in (401, 403)


# ===== Journal =====
class TestJournal:
    def test_journal_crud(self, auth_headers):
        payload = {"title": "TEST_Entry", "note": "Astăzi a fost o zi bună", "mood": "calm", "triggers": "scoala"}
        r = requests.post(f"{API}/journal", json=payload, headers=auth_headers, timeout=15)
        assert r.status_code == 200, r.text
        entry = r.json()
        assert entry["title"] == "TEST_Entry"
        assert entry["mood"] == "calm"
        entry_id = entry["id"]
        # List
        r = requests.get(f"{API}/journal", headers=auth_headers, timeout=15)
        assert r.status_code == 200
        assert any(e["id"] == entry_id for e in r.json()["entries"])
        # Delete
        rd = requests.delete(f"{API}/journal/{entry_id}", headers=auth_headers, timeout=15)
        assert rd.status_code == 200
        # Verify gone
        r = requests.get(f"{API}/journal", headers=auth_headers, timeout=15)
        assert not any(e["id"] == entry_id for e in r.json()["entries"])


# ===== Article (AI - slow) =====
class TestArticle:
    def test_article_requires_auth(self):
        r = requests.get(f"{API}/article/sub-1-1", timeout=15)
        assert r.status_code in (401, 403)

    def test_article_404_unknown(self, auth_headers):
        r = requests.get(f"{API}/article/sub-999", headers=auth_headers, timeout=15)
        # Cache miss + lookup miss => 404
        assert r.status_code == 404

    def test_article_generation_and_cache(self, auth_headers):
        # First call may take 30-60s; cached call should be instant
        t0 = time.time()
        r = requests.get(f"{API}/article/sub-1-1", headers=auth_headers, timeout=120)
        elapsed1 = time.time() - t0
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["subtopic_id"] == "sub-1-1"
        content = body["content"]
        for key in ("introducere", "puncte_cheie", "sfaturi_practice", "exemplu_situatie", "cand_sa_cer_ajutor"):
            assert key in content, f"Missing key {key} in article content"
        assert isinstance(content["puncte_cheie"], list) and len(content["puncte_cheie"]) >= 3
        # Second call should hit cache
        t0 = time.time()
        r2 = requests.get(f"{API}/article/sub-1-1", headers=auth_headers, timeout=30)
        elapsed2 = time.time() - t0
        assert r2.status_code == 200
        assert elapsed2 < elapsed1, f"Cache not faster: {elapsed1:.2f}s vs {elapsed2:.2f}s"
