from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timedelta, timezone
import jwt
import bcrypt
import hashlib

from emergentintegrations.llm.chat import LlmChat, UserMessage

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_SECRET = os.environ['JWT_SECRET']
JWT_ALGORITHM = os.environ['JWT_ALGORITHM']
JWT_EXPIRE_DAYS = int(os.environ['JWT_EXPIRE_DAYS'])
EMERGENT_LLM_KEY = os.environ['EMERGENT_LLM_KEY']

app = FastAPI()
api_router = APIRouter(prefix="/api")
security = HTTPBearer()

# ============ CATEGORIES (MIND MAP STRUCTURE) ============
CATEGORIES = [
    {
        "id": "cat-1",
        "title": "Înțelegerea Profilului Neurodivergent",
        "subtitle": "Decalaj, supraexcitabilități și dublă excepționalitate",
        "color": "#7A9E9F",
        "icon": "sparkles",
        "subtopics": [
            {"id": "sub-1-1", "title": "Dezvoltare Asincronă", "points": [
                "Decalaj vârstă mentală vs. emoțională",
                "Discrepanță argumentare vs. autocontrol",
                "Gap între vârsta socială și cognitivă"
            ]},
            {"id": "sub-1-2", "title": "Supraexcitabilități (OEs)", "points": [
                "Psihomotorie: Energie debordantă și agitație",
                "Senzorială: Reacții extreme la stimuli externi",
                "Intelectuală: Curiozitate extremă și întrebări",
                "Emoțională: Sensibilitate profundă și justiție",
                "Imaginativă: Lume interioară creativă"
            ]},
            {"id": "sub-1-3", "title": "Dublă Excepționalitate (2e)", "points": [
                "Giftedness combinat cu Neurodivergență",
                "Spikey Profile (Puncte tari vs. slabe)",
                "Vulnerabilitate la stres și PTSD"
            ]},
        ]
    },
    {
        "id": "cat-2",
        "title": "Fundația Atitudinii Părintelui",
        "subtitle": "Autoreglare, calm și conectare",
        "color": "#E8C37C",
        "icon": "heart",
        "subtopics": [
            {"id": "sub-2-1", "title": "Autoreglare și Calm", "points": [
                "Rămânerea calmă pentru de-escaladare",
                "Învățare implicită prin neuronii oglindă",
                "Evitarea proiecției temerilor personale"
            ]},
            {"id": "sub-2-2", "title": "Conectare înainte de Corectare", "points": [
                "Comportamentul ca formă de comunicare",
                "Reducerea rezistenței prin joc și râs",
                "Timp special zilnic pentru relaționare"
            ]},
        ]
    },
    {
        "id": "cat-3",
        "title": "Arhitectura Limitelor Sănătoase",
        "subtitle": "Fermitate, predictibilitate și consecințe",
        "color": "#DE8F6E",
        "icon": "shield-checkmark",
        "subtopics": [
            {"id": "sub-3-1", "title": "Fermitate vs. Control", "points": [
                "Responsabilitate caldă vs. Jocuri de putere",
                "Validarea emoțiilor fără negocierea regulii",
                "Mediu de stabilitate și siguranță"
            ]},
            {"id": "sub-3-2", "title": "Predictibilitate și Rutină", "points": [
                "Rutine: Somn, mese, timp ecrane",
                "Reducerea anxietății prin certitudine"
            ]},
            {"id": "sub-3-3", "title": "Gestionarea Consecințelor", "points": [
                "Evitarea 'tribunalului' verbal (argumente)",
                "Prevenirea atitudinii narcisice",
                "Autonomie prin oferirea de opțiuni",
                "Consecințe logice și rezonabile"
            ]},
        ]
    },
    {
        "id": "cat-4",
        "title": "Managementul Energiei și Învățării",
        "subtitle": "Suport acasă și strategii la școală",
        "color": "#5E8B7E",
        "icon": "flash",
        "subtopics": [
            {"id": "sub-4-1", "title": "Suport Acasă", "points": [
                "Fragmentarea sarcinilor în pași mici",
                "Lăudarea procesului, efortului și strategiei",
                "Transformarea energiei în motivație"
            ]},
            {"id": "sub-4-2", "title": "Strategii la Școală", "points": [
                "Pauze scurte de mișcare (eliberare tensiune)",
                "Instrumente fidget pentru concentrare",
                "Învățare interactivă și scurtă",
                "Stimularea producției de dopamină"
            ]},
        ]
    },
    {
        "id": "cat-5",
        "title": "Gestionarea Crizelor (Meltdowns)",
        "subtitle": "Intervenție și recuperare",
        "color": "#B56B6B",
        "icon": "thunderstorm",
        "subtopics": [
            {"id": "sub-5-1", "title": "Intervenție în Momentul Critic", "points": [
                "Monitorizarea factorilor declanșatori",
                "Siguranță fizică (fără procesare logică)",
                "Menținerea prezenței (Time-in)",
                "Abordare non-punitivă"
            ]},
            {"id": "sub-5-2", "title": "Recuperare și Tehnici", "points": [
                "Exersarea respirației în momente de calm",
                "Tehnica vizualizării 'locului fericit'",
                "Validarea sentimentului de nemulțumire"
            ]},
        ]
    },
]


# ============ MODELS ============
class UserRegister(BaseModel):
    email: EmailStr
    password: str
    name: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserOut(BaseModel):
    id: str
    email: str
    name: str
    created_at: datetime
    is_admin: bool = False

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut

class JournalCreate(BaseModel):
    title: str
    note: str
    mood: str  # calm, agitat, criza, fericit, ingrijorat
    triggers: Optional[str] = ""
    category_id: Optional[str] = ""

class JournalEntry(BaseModel):
    id: str
    user_id: str
    title: str
    note: str
    mood: str
    triggers: str
    category_id: str
    created_at: datetime

class BookmarkCreate(BaseModel):
    subtopic_id: str
    title: str
    category_id: str
    type: str = "article"  # "article" or "explanation"
    point: Optional[str] = ""
    explanation: Optional[str] = ""


# ============ FORUM MODELS ============
class ForumPostCreate(BaseModel):
    category: str
    title: str
    content: str
    is_anonymous: bool = False

class ForumAnswerCreate(BaseModel):
    content: str
    is_anonymous: bool = False


# ============ FAMILY MODELS ============
class FamilyJoinRequest(BaseModel):
    code: str

class TestResultCreate(BaseModel):
    scores: dict          # {"gift": 12, "adhd": 5, "emo": 7}
    profile_title: str
    profile_description: str
    betts_type: Optional[str] = ""
    betts_desc: Optional[str] = ""
    recommendation: str
    profile_color: Optional[str] = ""
    profile_icon: Optional[str] = ""


def generate_family_code(length: int = 6) -> str:
    """Generate a friendly 6-char alphanumeric code (no confusing chars)."""
    import secrets
    alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"  # no I, O, 0, 1
    return "".join(secrets.choice(alphabet) for _ in range(length))


# Fixed forum categories (parenting topics)
FORUM_CATEGORIES = [
    {"id": "somn", "title": "Somn și odihnă", "icon": "moon", "color": "#7A9E9F"},
    {"id": "disciplina", "title": "Disciplină și limite", "icon": "shield-checkmark", "color": "#DE8F6E"},
    {"id": "scoala", "title": "Școală și învățare", "icon": "school", "color": "#5E8B7E"},
    {"id": "emotii", "title": "Emoții și crize", "icon": "thunderstorm", "color": "#B56B6B"},
    {"id": "relatii", "title": "Relații și frați", "icon": "people", "color": "#E8C37C"},
    {"id": "sanatate", "title": "Sănătate și nutriție", "icon": "fitness", "color": "#6E8FD8"},
    {"id": "general", "title": "Discuții generale", "icon": "chatbubbles", "color": "#9B8CC4"},
]


def pseudonym_for(user_id: str) -> str:
    """Deterministic pseudonym from user_id - consistent across all posts."""
    h = hashlib.sha256(user_id.encode()).hexdigest().upper()
    return "Părinte_" + h[:5]


def display_name_for(user_id: str, is_anonymous: bool) -> str:
    return "Anonim" if is_anonymous else pseudonym_for(user_id)


# ============ AUTH UTILS ============
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_token(user_id: str) -> str:
    payload = {
        "user_id": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(days=JWT_EXPIRE_DAYS),
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("user_id")
        if not user_id:
            raise HTTPException(status_code=401, detail="Token invalid")
        user = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
        if not user:
            raise HTTPException(status_code=401, detail="Utilizator inexistent")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expirat")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token invalid")


SUPER_ADMIN_EMAIL = "otilia.ioana96@gmail.com"


def is_super_admin(user: dict) -> bool:
    return bool(user.get("is_admin")) or (user.get("email", "").lower() == SUPER_ADMIN_EMAIL)


async def require_admin(user: dict = Depends(get_current_user)) -> dict:
    if not is_super_admin(user):
        raise HTTPException(status_code=403, detail="Doar administratorii au acces")
    return user


# ============ AUTH ROUTES ============
@api_router.post("/auth/register", response_model=TokenResponse)
async def register(data: UserRegister):
    existing = await db.users.find_one({"email": data.email.lower()})
    if existing:
        raise HTTPException(status_code=400, detail="Email deja înregistrat")
    user_id = str(uuid.uuid4())
    email_lc = data.email.lower()
    user_doc = {
        "id": user_id,
        "email": email_lc,
        "name": data.name.strip(),
        "password": hash_password(data.password),
        "created_at": datetime.now(timezone.utc),
        "is_admin": email_lc == SUPER_ADMIN_EMAIL,
    }
    await db.users.insert_one(user_doc)
    token = create_token(user_id)
    return TokenResponse(
        access_token=token,
        user=UserOut(id=user_id, email=user_doc["email"], name=user_doc["name"], created_at=user_doc["created_at"], is_admin=user_doc["is_admin"]),
    )

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(data: UserLogin):
    user = await db.users.find_one({"email": data.email.lower()})
    if not user or not verify_password(data.password, user["password"]):
        raise HTTPException(status_code=401, detail="Email sau parolă incorecte")
    # Ensure super admin flag is set (idempotent) for the configured email
    if user.get("email", "").lower() == SUPER_ADMIN_EMAIL and not user.get("is_admin"):
        await db.users.update_one({"id": user["id"]}, {"$set": {"is_admin": True}})
        user["is_admin"] = True
    token = create_token(user["id"])
    return TokenResponse(
        access_token=token,
        user=UserOut(id=user["id"], email=user["email"], name=user["name"], created_at=user["created_at"], is_admin=bool(user.get("is_admin"))),
    )

@api_router.get("/auth/me", response_model=UserOut)
async def me(user: dict = Depends(get_current_user)):
    return UserOut(id=user["id"], email=user["email"], name=user["name"], created_at=user["created_at"], is_admin=is_super_admin(user))


# ============ CATEGORIES & SEARCH ============
@api_router.get("/categories")
async def get_categories():
    return {"categories": CATEGORIES}

@api_router.get("/categories/{category_id}")
async def get_category(category_id: str):
    for c in CATEGORIES:
        if c["id"] == category_id:
            return c
    raise HTTPException(status_code=404, detail="Categorie inexistentă")

@api_router.get("/search")
async def search(q: str, category_id: Optional[str] = None):
    q_low = q.lower().strip()
    if not q_low:
        return {"results": []}
    results = []
    for cat in CATEGORIES:
        if category_id and cat["id"] != category_id:
            continue
        if q_low in cat["title"].lower() or q_low in cat["subtitle"].lower():
            results.append({"type": "category", "category_id": cat["id"], "title": cat["title"], "subtitle": cat["subtitle"], "color": cat["color"]})
        for sub in cat["subtopics"]:
            matched = q_low in sub["title"].lower() or any(q_low in p.lower() for p in sub["points"])
            if matched:
                results.append({
                    "type": "subtopic",
                    "category_id": cat["id"],
                    "subtopic_id": sub["id"],
                    "title": sub["title"],
                    "category_title": cat["title"],
                    "color": cat["color"],
                })
    return {"results": results}


# ============ ARTICLE (AI-GENERATED) ============
def find_subtopic(subtopic_id: str):
    for cat in CATEGORIES:
        for sub in cat["subtopics"]:
            if sub["id"] == subtopic_id:
                return cat, sub
    return None, None

@api_router.get("/article/{subtopic_id}")
async def get_article(subtopic_id: str, user: dict = Depends(get_current_user)):
    # Check cache
    cached = await db.articles.find_one({"subtopic_id": subtopic_id}, {"_id": 0})
    if cached:
        return cached

    cat, sub = find_subtopic(subtopic_id)
    if not sub:
        raise HTTPException(status_code=404, detail="Subiect inexistent")

    points_str = "\n".join(f"- {p}" for p in sub["points"])
    system_msg = (
        "Ești un expert în psihologia copilului, specializat în copii supradotați și hiperactivi (ADHD/2e). "
        "Scrii articole educaționale pentru părinți români. Folosești limba română corectă, ton cald, empatic și practic. "
        "Răspunzi strict în format JSON valid, fără text suplimentar."
    )
    prompt = f"""Scrie un articol educațional pentru părinți despre tema: "{sub['title']}" 
(din categoria "{cat['title']}").

Puncte cheie de acoperit:
{points_str}

Răspunde STRICT în format JSON valid (fără markdown, fără ```json), cu structura:
{{
  "introducere": "2-3 paragrafe care explică tema (300-400 cuvinte)",
  "puncte_cheie": [
    {{"titlu": "...", "explicatie": "1-2 propoziții"}},
    ... (4-6 elemente)
  ],
  "sfaturi_practice": [
    "sfat concret aplicabil acasă",
    ... (4-5 sfaturi)
  ],
  "exemplu_situatie": "Un exemplu concret de situație + cum reacționează părintele (100-150 cuvinte)",
  "cand_sa_cer_ajutor": "Când părintele ar trebui să consulte un specialist (2-3 propoziții)"
}}"""

    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"article-{subtopic_id}",
            system_message=system_msg,
        ).with_model("anthropic", "claude-sonnet-4-5-20250929")
        response_text = await chat.send_message(UserMessage(text=prompt))

        # Parse JSON
        import json, re
        cleaned = response_text.strip()
        if cleaned.startswith("```"):
            cleaned = re.sub(r"^```(?:json)?\n?", "", cleaned)
            cleaned = re.sub(r"\n?```$", "", cleaned)
        try:
            content = json.loads(cleaned)
        except json.JSONDecodeError:
            # Fallback: extract first {...} block
            m = re.search(r"\{[\s\S]*\}", cleaned)
            if not m:
                raise
            content = json.loads(m.group(0))
    except Exception as e:
        logger.exception("LLM generation failed")
        raise HTTPException(status_code=500, detail=f"Nu am putut genera articolul: {str(e)}")

    article = {
        "id": str(uuid.uuid4()),
        "subtopic_id": subtopic_id,
        "category_id": cat["id"],
        "title": sub["title"],
        "category_title": cat["title"],
        "color": cat["color"],
        "content": content,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.articles.insert_one(article.copy())
    article.pop("_id", None)
    return article


# ============ BOOKMARKS ============
@api_router.get("/bookmarks")
async def list_bookmarks(user: dict = Depends(get_current_user)):
    items = await db.bookmarks.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return {"bookmarks": items}

@api_router.post("/bookmarks")
async def add_bookmark(data: BookmarkCreate, user: dict = Depends(get_current_user)):
    existing = await db.bookmarks.find_one({"user_id": user["id"], "subtopic_id": data.subtopic_id})
    if existing:
        return {"ok": True, "already": True}
    doc = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "subtopic_id": data.subtopic_id,
        "title": data.title,
        "category_id": data.category_id,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.bookmarks.insert_one(doc.copy())
    doc.pop("_id", None)
    return {"ok": True, "bookmark": doc}

@api_router.delete("/bookmarks/{subtopic_id}")
async def remove_bookmark(subtopic_id: str, user: dict = Depends(get_current_user)):
    await db.bookmarks.delete_one({"user_id": user["id"], "subtopic_id": subtopic_id})
    return {"ok": True}


async def _get_family_user_ids(user_id: str) -> List[str]:
    """Return list of user_ids in same family (incl. self) or just [user_id] if no family."""
    fam = await db.families.find_one({"member_ids": user_id}, {"_id": 0})
    if not fam:
        return [user_id]
    return fam.get("member_ids", [user_id])


# ============ JOURNAL ============
@api_router.get("/journal")
async def list_journal(user: dict = Depends(get_current_user)):
    user_ids = await _get_family_user_ids(user["id"])
    items = await db.journal.find({"user_id": {"$in": user_ids}}, {"_id": 0}).sort("created_at", -1).to_list(500)
    # Enrich with author_name (cache lookups)
    name_cache: dict = {}
    out = []
    for it in items:
        uid = it.get("user_id")
        if uid not in name_cache:
            u = await db.users.find_one({"id": uid}, {"_id": 0, "name": 1})
            name_cache[uid] = (u or {}).get("name", "Părinte")
        out.append({
            **it,
            "author_name": name_cache[uid],
            "is_mine": uid == user["id"],
        })
    return {"entries": out}

@api_router.post("/journal", response_model=JournalEntry)
async def create_journal(data: JournalCreate, user: dict = Depends(get_current_user)):
    doc = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "title": data.title,
        "note": data.note,
        "mood": data.mood,
        "triggers": data.triggers or "",
        "category_id": data.category_id or "",
        "created_at": datetime.now(timezone.utc),
    }
    await db.journal.insert_one(doc.copy())
    return JournalEntry(**doc)

@api_router.get("/journal/stats")
async def journal_stats(user: dict = Depends(get_current_user)):
    # last 30 days mood counts + category counts (FAMILY-WIDE)
    user_ids = await _get_family_user_ids(user["id"])
    since = datetime.now(timezone.utc) - timedelta(days=30)
    cursor = db.journal.find({"user_id": {"$in": user_ids}, "created_at": {"$gte": since}}, {"_id": 0})
    items = await cursor.to_list(1000)
    mood_counts: dict = {}
    cat_counts: dict = {}
    for it in items:
        mood_counts[it["mood"]] = mood_counts.get(it["mood"], 0) + 1
        cid = it.get("category_id") or ""
        if cid:
            cat_counts[cid] = cat_counts.get(cid, 0) + 1
    total = len(items)
    return {"total": total, "moods": mood_counts, "categories": cat_counts}

@api_router.delete("/journal/{entry_id}")
async def delete_journal(entry_id: str, user: dict = Depends(get_current_user)):
    await db.journal.delete_one({"id": entry_id, "user_id": user["id"]})
    return {"ok": True}


class QuickExplainRequest(BaseModel):
    point: str
    subtopic_title: str
    category_title: str

@api_router.post("/quick-explain")
async def quick_explain(data: QuickExplainRequest, user: dict = Depends(get_current_user)):
    cache_key = f"{data.subtopic_title}::{data.point}"
    cached = await db.quick_explains.find_one({"key": cache_key}, {"_id": 0})
    if cached:
        return {"explanation": cached["explanation"]}
    system_msg = (
        "Ești expert în psihologia copilului. Scrii explicații scurte (2-3 propoziții) "
        "în română, ton cald și practic, pentru părinții copiilor supradotați/hiperactivi."
    )
    prompt = (
        f"Categorie: {data.category_title}\nTemă: {data.subtopic_title}\nConcept: \"{data.point}\"\n\n"
        f"Explică în 2-3 propoziții ce înseamnă acest concept și de ce contează. "
        f"Răspunde cu text simplu, fără markdown, fără titluri."
    )
    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"qe-{uuid.uuid4()}",
            system_message=system_msg,
        ).with_model("anthropic", "claude-sonnet-4-5-20250929")
        text = await chat.send_message(UserMessage(text=prompt))
        explanation = text.strip()
        await db.quick_explains.insert_one({"key": cache_key, "explanation": explanation})
        return {"explanation": explanation}
    except Exception as e:
        logger.exception("quick-explain failed")
        raise HTTPException(status_code=500, detail=str(e))


class AskRequest(BaseModel):
    question: str

@api_router.post("/ask")
async def ask_specialist(data: AskRequest, user: dict = Depends(get_current_user)):
    if not data.question.strip():
        raise HTTPException(status_code=400, detail="Întrebarea este goală")
    system_msg = (
        "Ești un psiholog specializat în copii supradotați și hiperactivi (ADHD/2e). "
        "Răspunzi în română, cald, empatic, practic. Răspunsuri 3-5 paragrafe scurte. "
        "Dacă întrebarea cere diagnostic, sugerezi consult psihologic profesional. "
        "Eviți să dai sfaturi medicale specifice."
    )
    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"ask-{uuid.uuid4()}",
            system_message=system_msg,
        ).with_model("anthropic", "claude-sonnet-4-5-20250929")
        answer = await chat.send_message(UserMessage(text=data.question))
    except Exception as e:
        logger.exception("ask failed")
        raise HTTPException(status_code=500, detail=str(e))
    doc = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "question": data.question.strip(),
        "answer": answer.strip(),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.ask_history.insert_one(doc.copy())
    doc.pop("_id", None)
    return doc

@api_router.get("/ask/history")
async def ask_history(user: dict = Depends(get_current_user)):
    items = await db.ask_history.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return {"items": items}

@api_router.delete("/ask/{ask_id}")
async def delete_ask(ask_id: str, user: dict = Depends(get_current_user)):
    await db.ask_history.delete_one({"id": ask_id, "user_id": user["id"]})
    return {"ok": True}

@api_router.get("/journal/patterns")
async def journal_patterns(user: dict = Depends(get_current_user)):
    since = datetime.now(timezone.utc) - timedelta(days=30)
    cursor = db.journal.find({"user_id": user["id"], "created_at": {"$gte": since}}, {"_id": 0}).sort("created_at", 1)
    items = await cursor.to_list(500)
    if len(items) < 3:
        return {"insight": "Adaugă cel puțin 3 însemnări în jurnal pentru a primi o analiză AI a tiparelor.", "count": len(items)}

    summary_lines = []
    for it in items:
        date_str = it["created_at"].strftime("%d %b") if hasattr(it["created_at"], "strftime") else str(it["created_at"])[:10]
        weekday = it["created_at"].strftime("%A") if hasattr(it["created_at"], "strftime") else ""
        summary_lines.append(f"{date_str} ({weekday}) - stare: {it['mood']}, titlu: {it['title'][:80]}, declanșatori: {it.get('triggers','-')}")
    summary = "\n".join(summary_lines)

    system_msg = (
        "Ești psiholog specializat în copii supradotați/hiperactivi. Analizezi jurnalul unui părinte "
        "din ultimele 30 zile și identifici tipare comportamentale. Răspunzi în română, empatic și practic."
    )
    prompt = (
        f"Iată ultimele {len(items)} însemnări din jurnalul părintelui:\n\n{summary}\n\n"
        f"Analizează și identifică 3-5 tipare importante (zile/momente cu crize, declanșatori repetitivi, "
        f"perioade calme). Răspunde scurt (3-4 paragrafe), cu observații concrete și 2 sfaturi practice. "
        f"Nu folosi markdown."
    )
    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"patterns-{user['id']}-{datetime.now(timezone.utc).strftime('%Y%m%d')}",
            system_message=system_msg,
        ).with_model("anthropic", "claude-sonnet-4-5-20250929")
        text = await chat.send_message(UserMessage(text=prompt))
    except Exception as e:
        logger.exception("patterns failed")
        raise HTTPException(status_code=500, detail=str(e))
    return {"insight": text.strip(), "count": len(items)}


@api_router.get("/")
async def root():
    return {"message": "Ghid Părinte API"}


# ============ USER OWN STATS ============
@api_router.get("/me/stats")
async def my_stats(user: dict = Depends(get_current_user)):
    """Personal dashboard stats for the current user."""
    uid = user["id"]
    now = datetime.now(timezone.utc)
    since_30 = now - timedelta(days=30)
    since_7 = now - timedelta(days=7)

    # Journal
    journal_total = await db.journal.count_documents({"user_id": uid})
    journal_30 = await db.journal.count_documents({"user_id": uid, "created_at": {"$gte": since_30}})
    journal_7 = await db.journal.count_documents({"user_id": uid, "created_at": {"$gte": since_7}})

    # Bookmarks
    bookmarks_total = await db.bookmarks.count_documents({"user_id": uid})

    # Ask AI
    ask_total = await db.ask_history.count_documents({"user_id": uid})
    ask_30 = await db.ask_history.count_documents({"user_id": uid, "created_at": {"$gte": since_30.isoformat()}})

    # Forum
    forum_posts = await db.forum_posts.count_documents({"user_id": uid})
    forum_answers = await db.forum_answers.count_documents({"user_id": uid})

    # Test result
    latest_test = await db.test_results.find_one({"user_id": uid}, {"_id": 0, "profile_title": 1, "created_at": 1}, sort=[("created_at", -1)])

    # Family
    fam = await db.families.find_one({"member_ids": uid}, {"_id": 0, "code": 1, "member_ids": 1})
    family_info = None
    if fam:
        family_info = {"code": fam["code"], "member_count": len(fam.get("member_ids", []))}

    # Guide progress
    gp = await db.guide_progress.find_one({"user_id": uid}, {"_id": 0, "read_chapters": 1}) or {}
    read_chapters = len(gp.get("read_chapters", []))

    return {
        "journal": {"total": journal_total, "last_30_days": journal_30, "last_7_days": journal_7},
        "bookmarks_total": bookmarks_total,
        "ask_ai": {"total": ask_total, "last_30_days": ask_30},
        "forum": {"posts": forum_posts, "answers": forum_answers},
        "test_result": latest_test,
        "family": family_info,
        "guide_read_chapters": read_chapters,
        "member_since": user.get("created_at"),
    }


# ============ SUPER ADMIN ============
@api_router.get("/admin/stats")
async def admin_stats(admin: dict = Depends(require_admin)):
    """Global stats for the super admin."""
    now = datetime.now(timezone.utc)
    since_1 = now - timedelta(days=1)
    since_7 = now - timedelta(days=7)
    since_30 = now - timedelta(days=30)

    users_total = await db.users.count_documents({})
    users_new_7 = await db.users.count_documents({"created_at": {"$gte": since_7}})
    users_new_30 = await db.users.count_documents({"created_at": {"$gte": since_30}})

    # Active users (posted anything in last 7 days) — approximate via journal or forum
    active_uids_7 = set()
    async for j in db.journal.find({"created_at": {"$gte": since_7}}, {"_id": 0, "user_id": 1}):
        active_uids_7.add(j["user_id"])
    async for a in db.ask_history.find({"created_at": {"$gte": since_7.isoformat()}}, {"_id": 0, "user_id": 1}):
        active_uids_7.add(a["user_id"])

    journal_total = await db.journal.count_documents({})
    journal_1 = await db.journal.count_documents({"created_at": {"$gte": since_1}})

    ask_total = await db.ask_history.count_documents({})
    ask_1 = await db.ask_history.count_documents({"created_at": {"$gte": since_1.isoformat()}})

    tests_total = await db.test_results.count_documents({})
    families_total = await db.families.count_documents({})
    forum_posts_total = await db.forum_posts.count_documents({})
    forum_answers_total = await db.forum_answers.count_documents({})
    flagged_posts = await db.forum_posts.count_documents({"flagged_by.0": {"$exists": True}})

    # Distribution of profile titles from tests
    profile_dist: dict = {}
    async for t in db.test_results.find({}, {"_id": 0, "profile_title": 1}):
        pt = t.get("profile_title", "Necunoscut")
        profile_dist[pt] = profile_dist.get(pt, 0) + 1

    return {
        "users": {"total": users_total, "new_last_7_days": users_new_7, "new_last_30_days": users_new_30, "active_last_7_days": len(active_uids_7)},
        "journal": {"total": journal_total, "last_24h": journal_1},
        "ask_ai": {"total": ask_total, "last_24h": ask_1},
        "tests": {"total": tests_total, "profile_distribution": profile_dist},
        "families_total": families_total,
        "forum": {"posts_total": forum_posts_total, "answers_total": forum_answers_total, "flagged_posts": flagged_posts},
    }


@api_router.get("/admin/users")
async def admin_list_users(limit: int = 200, skip: int = 0, q: Optional[str] = None, admin: dict = Depends(require_admin)):
    """List all users with per-user activity counts."""
    query: dict = {}
    if q:
        query["$or"] = [
            {"email": {"$regex": q, "$options": "i"}},
            {"name": {"$regex": q, "$options": "i"}},
        ]
    cursor = db.users.find(query, {"_id": 0, "password": 0}).sort("created_at", -1).skip(skip).limit(limit)
    users = await cursor.to_list(limit)
    out = []
    for u in users:
        uid = u["id"]
        journal_count = await db.journal.count_documents({"user_id": uid})
        ask_count = await db.ask_history.count_documents({"user_id": uid})
        forum_count = await db.forum_posts.count_documents({"user_id": uid})
        last_j = await db.journal.find_one({"user_id": uid}, {"_id": 0, "created_at": 1}, sort=[("created_at", -1)])
        out.append({
            "id": u["id"],
            "email": u.get("email"),
            "name": u.get("name"),
            "created_at": u.get("created_at"),
            "is_admin": bool(u.get("is_admin")) or (u.get("email", "").lower() == SUPER_ADMIN_EMAIL),
            "journal_count": journal_count,
            "ask_count": ask_count,
            "forum_count": forum_count,
            "last_activity": last_j.get("created_at") if last_j else None,
        })
    return {"users": out, "total": await db.users.count_documents(query)}


@api_router.delete("/admin/users/{user_id}")
async def admin_delete_user(user_id: str, admin: dict = Depends(require_admin)):
    if user_id == admin["id"]:
        raise HTTPException(status_code=400, detail="Nu poți șterge propriul cont din admin")
    target = await db.users.find_one({"id": user_id})
    if not target:
        raise HTTPException(status_code=404, detail="Utilizator inexistent")
    # Cascade delete
    await db.users.delete_one({"id": user_id})
    await db.journal.delete_many({"user_id": user_id})
    await db.bookmarks.delete_many({"user_id": user_id})
    await db.ask_history.delete_many({"user_id": user_id})
    await db.test_results.delete_many({"user_id": user_id})
    await db.forum_posts.delete_many({"user_id": user_id})
    await db.forum_answers.delete_many({"user_id": user_id})
    await db.guide_progress.delete_many({"user_id": user_id})
    # Remove from family
    await db.families.update_many({"member_ids": user_id}, {"$pull": {"member_ids": user_id}})
    # Delete empty families
    await db.families.delete_many({"member_ids": {"$size": 0}})
    return {"ok": True}


@api_router.post("/admin/users/{user_id}/toggle-admin")
async def admin_toggle_admin(user_id: str, admin: dict = Depends(require_admin)):
    target = await db.users.find_one({"id": user_id})
    if not target:
        raise HTTPException(status_code=404, detail="Utilizator inexistent")
    if target.get("email", "").lower() == SUPER_ADMIN_EMAIL:
        raise HTTPException(status_code=400, detail="Super-adminul nu poate fi modificat")
    new_val = not bool(target.get("is_admin"))
    await db.users.update_one({"id": user_id}, {"$set": {"is_admin": new_val}})
    return {"ok": True, "is_admin": new_val}


@api_router.get("/admin/forum/flagged")
async def admin_list_flagged(admin: dict = Depends(require_admin)):
    """List forum posts and answers that have been flagged at least once."""
    posts_cursor = db.forum_posts.find({"flagged_by.0": {"$exists": True}}, {"_id": 0}).sort("created_at", -1).limit(100)
    posts = await posts_cursor.to_list(100)
    posts_out = [{
        "id": p["id"], "category": p["category"], "title": p["title"], "content": p["content"],
        "display_name": p["display_name"], "flag_count": len(p.get("flagged_by", [])),
        "created_at": p["created_at"],
    } for p in posts]

    answers_cursor = db.forum_answers.find({"flagged_by.0": {"$exists": True}}, {"_id": 0}).sort("created_at", -1).limit(100)
    answers = await answers_cursor.to_list(100)
    answers_out = [{
        "id": a["id"], "post_id": a["post_id"], "content": a["content"],
        "display_name": a["display_name"], "flag_count": len(a.get("flagged_by", [])),
        "created_at": a["created_at"],
    } for a in answers]

    return {"flagged_posts": posts_out, "flagged_answers": answers_out}


@api_router.delete("/admin/forum/posts/{post_id}")
async def admin_delete_forum_post(post_id: str, admin: dict = Depends(require_admin)):
    result = await db.forum_posts.delete_one({"id": post_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Postare inexistentă")
    await db.forum_answers.delete_many({"post_id": post_id})
    return {"ok": True}


@api_router.delete("/admin/forum/answers/{answer_id}")
async def admin_delete_forum_answer(answer_id: str, admin: dict = Depends(require_admin)):
    a = await db.forum_answers.find_one({"id": answer_id})
    if not a:
        raise HTTPException(status_code=404, detail="Răspuns inexistent")
    await db.forum_answers.delete_one({"id": answer_id})
    await db.forum_posts.update_one({"id": a["post_id"]}, {"$inc": {"answer_count": -1}})
    return {"ok": True}


# ============ FAMILY (Share with partner) ============
MAX_FAMILY_MEMBERS = 2


async def _family_for(user_id: str):
    return await db.families.find_one({"member_ids": user_id}, {"_id": 0})


async def _enrich_family(fam: dict, current_user_id: str) -> dict:
    if not fam:
        return None
    members = []
    for uid in fam.get("member_ids", []):
        u = await db.users.find_one({"id": uid}, {"_id": 0, "id": 1, "name": 1, "email": 1})
        if u:
            members.append({
                "id": u["id"],
                "name": u.get("name", "Părinte"),
                "email": u.get("email", ""),
                "is_me": uid == current_user_id,
            })
    return {
        "id": fam["id"],
        "code": fam["code"],
        "members": members,
        "created_at": fam.get("created_at"),
    }


@api_router.get("/family/me")
async def family_me(user: dict = Depends(get_current_user)):
    fam = await _family_for(user["id"])
    if not fam:
        return {"family": None}
    return {"family": await _enrich_family(fam, user["id"])}


@api_router.post("/family")
async def family_create(user: dict = Depends(get_current_user)):
    existing = await _family_for(user["id"])
    if existing:
        raise HTTPException(status_code=400, detail="Ești deja într-o familie")
    # generate unique code (retry up to 10 times)
    for _ in range(10):
        code = generate_family_code(6)
        clash = await db.families.find_one({"code": code})
        if not clash:
            break
    else:
        raise HTTPException(status_code=500, detail="Nu am putut genera cod unic")
    doc = {
        "id": str(uuid.uuid4()),
        "code": code,
        "member_ids": [user["id"]],
        "created_by": user["id"],
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.families.insert_one(doc.copy())
    doc.pop("_id", None)
    return {"family": await _enrich_family(doc, user["id"])}


@api_router.post("/family/join")
async def family_join(data: FamilyJoinRequest, user: dict = Depends(get_current_user)):
    existing = await _family_for(user["id"])
    if existing:
        raise HTTPException(status_code=400, detail="Ești deja într-o familie. Părăsește-o întâi.")
    code = data.code.strip().upper()
    if not code or len(code) < 4:
        raise HTTPException(status_code=400, detail="Cod invalid")
    fam = await db.families.find_one({"code": code})
    if not fam:
        raise HTTPException(status_code=404, detail="Cod inexistent")
    members = fam.get("member_ids", [])
    if user["id"] in members:
        raise HTTPException(status_code=400, detail="Deja faci parte din această familie")
    if len(members) >= MAX_FAMILY_MEMBERS:
        raise HTTPException(status_code=400, detail="Familia are deja numărul maxim de membri")
    await db.families.update_one({"id": fam["id"]}, {"$addToSet": {"member_ids": user["id"]}})
    fresh = await db.families.find_one({"id": fam["id"]}, {"_id": 0})
    return {"family": await _enrich_family(fresh, user["id"])}


@api_router.delete("/family/leave")
async def family_leave(user: dict = Depends(get_current_user)):
    fam = await _family_for(user["id"])
    if not fam:
        raise HTTPException(status_code=404, detail="Nu ești într-o familie")
    new_members = [m for m in fam.get("member_ids", []) if m != user["id"]]
    if not new_members:
        # Delete family entirely + cascade test results owned by family creation
        await db.families.delete_one({"id": fam["id"]})
    else:
        await db.families.update_one({"id": fam["id"]}, {"$set": {"member_ids": new_members}})
    return {"ok": True}


# ============ TEST RESULT (Shared with family) ============
@api_router.post("/test/result")
async def save_test_result(data: TestResultCreate, user: dict = Depends(get_current_user)):
    doc = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "scores": data.scores,
        "profile_title": data.profile_title,
        "profile_description": data.profile_description,
        "betts_type": data.betts_type or "",
        "betts_desc": data.betts_desc or "",
        "recommendation": data.recommendation,
        "profile_color": data.profile_color or "",
        "profile_icon": data.profile_icon or "",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.test_results.insert_one(doc.copy())
    doc.pop("_id", None)
    return {"ok": True, "result": doc}


@api_router.get("/test/result")
async def get_latest_test_result(user: dict = Depends(get_current_user)):
    user_ids = await _get_family_user_ids(user["id"])
    cursor = db.test_results.find({"user_id": {"$in": user_ids}}, {"_id": 0}).sort("created_at", -1).limit(1)
    items = await cursor.to_list(1)
    if not items:
        return {"result": None}
    it = items[0]
    u = await db.users.find_one({"id": it["user_id"]}, {"_id": 0, "name": 1})
    it["author_name"] = (u or {}).get("name", "Părinte")
    it["is_mine"] = it["user_id"] == user["id"]
    return {"result": it}


# ============ FORUM (Comunitate) ============
@api_router.get("/forum/categories")
async def forum_categories():
    return {"categories": FORUM_CATEGORIES}


@api_router.get("/forum/me")
async def forum_me(user: dict = Depends(get_current_user)):
    """Returns the user's consistent pseudonym."""
    return {"pseudonym": pseudonym_for(user["id"])}


@api_router.get("/forum/posts")
async def list_posts(category: Optional[str] = None, limit: int = 50, skip: int = 0, user: dict = Depends(get_current_user)):
    q: dict = {}
    if category and category != "all":
        q["category"] = category
    cursor = db.forum_posts.find(q, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit)
    items = await cursor.to_list(limit)
    # Add computed fields per user
    out = []
    for it in items:
        liked_by = it.get("liked_by", [])
        flagged_by = it.get("flagged_by", [])
        # Hide if flagged 3+ times (soft moderation) unless it's user's own
        if len(flagged_by) >= 3 and it.get("user_id") != user["id"]:
            continue
        out.append({
            "id": it["id"],
            "category": it["category"],
            "title": it["title"],
            "content": it["content"],
            "display_name": it["display_name"],
            "is_anonymous": it.get("is_anonymous", False),
            "likes": len(liked_by),
            "liked_by_me": user["id"] in liked_by,
            "flagged_by_me": user["id"] in flagged_by,
            "is_mine": it.get("user_id") == user["id"],
            "answer_count": it.get("answer_count", 0),
            "created_at": it["created_at"],
        })
    return {"posts": out}


@api_router.post("/forum/posts")
async def create_post(data: ForumPostCreate, user: dict = Depends(get_current_user)):
    title = data.title.strip()
    content = data.content.strip()
    if not title or len(title) < 5:
        raise HTTPException(status_code=400, detail="Titlul trebuie să aibă minim 5 caractere")
    if not content or len(content) < 10:
        raise HTTPException(status_code=400, detail="Conținutul trebuie să aibă minim 10 caractere")
    if not any(c["id"] == data.category for c in FORUM_CATEGORIES):
        raise HTTPException(status_code=400, detail="Categorie inexistentă")
    doc = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "category": data.category,
        "title": title[:200],
        "content": content[:5000],
        "is_anonymous": data.is_anonymous,
        "display_name": display_name_for(user["id"], data.is_anonymous),
        "liked_by": [],
        "flagged_by": [],
        "answer_count": 0,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.forum_posts.insert_one(doc.copy())
    doc.pop("_id", None)
    return {"ok": True, "post": doc}


@api_router.get("/forum/posts/{post_id}")
async def get_post(post_id: str, user: dict = Depends(get_current_user)):
    post = await db.forum_posts.find_one({"id": post_id}, {"_id": 0})
    if not post:
        raise HTTPException(status_code=404, detail="Postare inexistentă")
    answers_cursor = db.forum_answers.find({"post_id": post_id}, {"_id": 0}).sort("created_at", 1)
    answers_raw = await answers_cursor.to_list(500)
    answers = []
    for a in answers_raw:
        liked_by = a.get("liked_by", [])
        flagged_by = a.get("flagged_by", [])
        if len(flagged_by) >= 3 and a.get("user_id") != user["id"]:
            continue
        answers.append({
            "id": a["id"],
            "content": a["content"],
            "display_name": a["display_name"],
            "is_anonymous": a.get("is_anonymous", False),
            "likes": len(liked_by),
            "liked_by_me": user["id"] in liked_by,
            "flagged_by_me": user["id"] in flagged_by,
            "is_mine": a.get("user_id") == user["id"],
            "created_at": a["created_at"],
        })
    post_out = {
        "id": post["id"],
        "category": post["category"],
        "title": post["title"],
        "content": post["content"],
        "display_name": post["display_name"],
        "is_anonymous": post.get("is_anonymous", False),
        "likes": len(post.get("liked_by", [])),
        "liked_by_me": user["id"] in post.get("liked_by", []),
        "flagged_by_me": user["id"] in post.get("flagged_by", []),
        "is_mine": post.get("user_id") == user["id"],
        "answer_count": len(answers),
        "created_at": post["created_at"],
    }
    return {"post": post_out, "answers": answers}


@api_router.post("/forum/posts/{post_id}/answers")
async def create_answer(post_id: str, data: ForumAnswerCreate, user: dict = Depends(get_current_user)):
    post = await db.forum_posts.find_one({"id": post_id})
    if not post:
        raise HTTPException(status_code=404, detail="Postare inexistentă")
    content = data.content.strip()
    if not content or len(content) < 3:
        raise HTTPException(status_code=400, detail="Răspunsul este prea scurt")
    doc = {
        "id": str(uuid.uuid4()),
        "post_id": post_id,
        "user_id": user["id"],
        "content": content[:3000],
        "is_anonymous": data.is_anonymous,
        "display_name": display_name_for(user["id"], data.is_anonymous),
        "liked_by": [],
        "flagged_by": [],
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.forum_answers.insert_one(doc.copy())
    await db.forum_posts.update_one({"id": post_id}, {"$inc": {"answer_count": 1}})
    doc.pop("_id", None)
    return {"ok": True, "answer": doc}


@api_router.post("/forum/posts/{post_id}/like")
async def toggle_post_like(post_id: str, user: dict = Depends(get_current_user)):
    post = await db.forum_posts.find_one({"id": post_id}, {"_id": 0, "liked_by": 1})
    if not post:
        raise HTTPException(status_code=404, detail="Postare inexistentă")
    liked_by = post.get("liked_by", [])
    if user["id"] in liked_by:
        await db.forum_posts.update_one({"id": post_id}, {"$pull": {"liked_by": user["id"]}})
        liked = False
    else:
        await db.forum_posts.update_one({"id": post_id}, {"$addToSet": {"liked_by": user["id"]}})
        liked = True
    fresh = await db.forum_posts.find_one({"id": post_id}, {"_id": 0, "liked_by": 1})
    return {"ok": True, "liked": liked, "likes": len(fresh.get("liked_by", []))}


@api_router.post("/forum/answers/{answer_id}/like")
async def toggle_answer_like(answer_id: str, user: dict = Depends(get_current_user)):
    a = await db.forum_answers.find_one({"id": answer_id}, {"_id": 0, "liked_by": 1})
    if not a:
        raise HTTPException(status_code=404, detail="Răspuns inexistent")
    liked_by = a.get("liked_by", [])
    if user["id"] in liked_by:
        await db.forum_answers.update_one({"id": answer_id}, {"$pull": {"liked_by": user["id"]}})
        liked = False
    else:
        await db.forum_answers.update_one({"id": answer_id}, {"$addToSet": {"liked_by": user["id"]}})
        liked = True
    fresh = await db.forum_answers.find_one({"id": answer_id}, {"_id": 0, "liked_by": 1})
    return {"ok": True, "liked": liked, "likes": len(fresh.get("liked_by", []))}


@api_router.post("/forum/posts/{post_id}/flag")
async def flag_post(post_id: str, user: dict = Depends(get_current_user)):
    post = await db.forum_posts.find_one({"id": post_id})
    if not post:
        raise HTTPException(status_code=404, detail="Postare inexistentă")
    await db.forum_posts.update_one({"id": post_id}, {"$addToSet": {"flagged_by": user["id"]}})
    return {"ok": True}


@api_router.post("/forum/answers/{answer_id}/flag")
async def flag_answer(answer_id: str, user: dict = Depends(get_current_user)):
    a = await db.forum_answers.find_one({"id": answer_id})
    if not a:
        raise HTTPException(status_code=404, detail="Răspuns inexistent")
    await db.forum_answers.update_one({"id": answer_id}, {"$addToSet": {"flagged_by": user["id"]}})
    return {"ok": True}


@api_router.delete("/forum/posts/{post_id}")
async def delete_post(post_id: str, user: dict = Depends(get_current_user)):
    post = await db.forum_posts.find_one({"id": post_id})
    if not post:
        raise HTTPException(status_code=404, detail="Postare inexistentă")
    if post.get("user_id") != user["id"]:
        raise HTTPException(status_code=403, detail="Nu poți șterge postările altor utilizatori")
    await db.forum_posts.delete_one({"id": post_id})
    await db.forum_answers.delete_many({"post_id": post_id})
    return {"ok": True}


@api_router.delete("/forum/answers/{answer_id}")
async def delete_answer(answer_id: str, user: dict = Depends(get_current_user)):
    a = await db.forum_answers.find_one({"id": answer_id})
    if not a:
        raise HTTPException(status_code=404, detail="Răspuns inexistent")
    if a.get("user_id") != user["id"]:
        raise HTTPException(status_code=403, detail="Nu poți șterge răspunsurile altor utilizatori")
    await db.forum_answers.delete_one({"id": answer_id})
    await db.forum_posts.update_one({"id": a["post_id"]}, {"$inc": {"answer_count": -1}})
    return {"ok": True}


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
