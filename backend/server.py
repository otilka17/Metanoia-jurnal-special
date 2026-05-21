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


# ============ AUTH ROUTES ============
@api_router.post("/auth/register", response_model=TokenResponse)
async def register(data: UserRegister):
    existing = await db.users.find_one({"email": data.email.lower()})
    if existing:
        raise HTTPException(status_code=400, detail="Email deja înregistrat")
    user_id = str(uuid.uuid4())
    user_doc = {
        "id": user_id,
        "email": data.email.lower(),
        "name": data.name.strip(),
        "password": hash_password(data.password),
        "created_at": datetime.now(timezone.utc),
    }
    await db.users.insert_one(user_doc)
    token = create_token(user_id)
    return TokenResponse(
        access_token=token,
        user=UserOut(id=user_id, email=user_doc["email"], name=user_doc["name"], created_at=user_doc["created_at"]),
    )

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(data: UserLogin):
    user = await db.users.find_one({"email": data.email.lower()})
    if not user or not verify_password(data.password, user["password"]):
        raise HTTPException(status_code=401, detail="Email sau parolă incorecte")
    token = create_token(user["id"])
    return TokenResponse(
        access_token=token,
        user=UserOut(id=user["id"], email=user["email"], name=user["name"], created_at=user["created_at"]),
    )

@api_router.get("/auth/me", response_model=UserOut)
async def me(user: dict = Depends(get_current_user)):
    return UserOut(**user)


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


# ============ JOURNAL ============
@api_router.get("/journal")
async def list_journal(user: dict = Depends(get_current_user)):
    items = await db.journal.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return {"entries": items}

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
    # last 30 days mood counts + category counts
    since = datetime.now(timezone.utc) - timedelta(days=30)
    cursor = db.journal.find({"user_id": user["id"], "created_at": {"$gte": since}}, {"_id": 0})
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
