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

class JournalEntry(BaseModel):
    id: str
    user_id: str
    title: str
    note: str
    mood: str
    triggers: str
    created_at: datetime

class BookmarkCreate(BaseModel):
    subtopic_id: str
    title: str
    category_id: str


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
async def search(q: str):
    q_low = q.lower().strip()
    if not q_low:
        return {"results": []}
    results = []
    for cat in CATEGORIES:
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
        content = json.loads(cleaned)
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
        "created_at": datetime.now(timezone.utc),
    }
    await db.journal.insert_one(doc.copy())
    return JournalEntry(**doc)

@api_router.delete("/journal/{entry_id}")
async def delete_journal(entry_id: str, user: dict = Depends(get_current_user)):
    await db.journal.delete_one({"id": entry_id, "user_id": user["id"]})
    return {"ok": True}


@api_router.get("/")
async def root():
    return {"message": "Ghid Părinte API"}


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
