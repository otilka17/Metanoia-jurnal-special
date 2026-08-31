from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo.errors import DuplicateKeyError
import os
import asyncio
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timedelta, timezone
import jwt
import bcrypt
import hashlib
import secrets as py_secrets
import re as _re
import ipaddress as _ipaddress
import httpx
from html import escape as html_escape
from html.parser import HTMLParser
from urllib.parse import urlparse as _urlparse

import anthropic
from comparison_tables import COMPARISON_TABLES, COMPARISON_MAP

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_SECRET = os.environ['JWT_SECRET']
JWT_ALGORITHM = os.environ['JWT_ALGORITHM']
JWT_EXPIRE_DAYS = int(os.environ['JWT_EXPIRE_DAYS'])

CLAUDE_MODEL = "claude-sonnet-4-5-20250929"
_anthropic_client = anthropic.AsyncAnthropic(api_key=os.environ['ANTHROPIC_API_KEY'])


async def call_claude(system_message: str, messages: list, max_tokens: int = 3000) -> str:
    resp = await _anthropic_client.messages.create(
        model=CLAUDE_MODEL,
        max_tokens=max_tokens,
        system=system_message,
        messages=messages,
    )
    return "".join(block.text for block in resp.content if getattr(block, "type", None) == "text")


GOOGLE_API_KEY = os.environ.get('GOOGLE_API_KEY', '')
GEMINI_IMAGE_MODEL = "gemini-2.5-flash-image"


async def generate_topic_image(prompt: str) -> Optional[dict]:
    """Generates an illustrative image via Gemini. Returns {data, mime_type} or None on any failure.
    Retries on 429 (rate limit) and 5xx (transient server errors) with backoff."""
    if not GOOGLE_API_KEY:
        return None
    backoff_seconds = [20, 40]
    for attempt in range(len(backoff_seconds) + 1):
        try:
            async with httpx.AsyncClient(timeout=60) as client:
                resp = await client.post(
                    f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_IMAGE_MODEL}:generateContent",
                    headers={"x-goog-api-key": GOOGLE_API_KEY, "Content-Type": "application/json"},
                    json={
                        "contents": [{"parts": [{"text": prompt}]}],
                        "generationConfig": {"responseModalities": ["IMAGE"]},
                    },
                )
                if resp.status_code == 429 or resp.status_code >= 500:
                    logger.warning(f"Image generation retryable HTTP {resp.status_code} (attempt {attempt + 1}): {resp.text[:500]}")
                    if attempt < len(backoff_seconds):
                        await asyncio.sleep(backoff_seconds[attempt])
                        continue
                    return None
                if resp.status_code >= 400:
                    logger.error(f"Image generation HTTP {resp.status_code}: {resp.text[:2000]}")
                resp.raise_for_status()
                data = resp.json()
            parts = data["candidates"][0]["content"]["parts"]
            for part in parts:
                inline = part.get("inlineData") or part.get("inline_data")
                if inline:
                    return {
                        "data": inline.get("data"),
                        "mime_type": inline.get("mimeType") or inline.get("mime_type") or "image/png",
                    }
            return None
        except Exception:
            logger.exception("Image generation failed")
            return None
    return None


app = FastAPI()
api_router = APIRouter(prefix="/api")
security = HTTPBearer()

# Shared instruction appended to every AI system prompt: LLMs default to English
# capitalization habits (Title Case in headings, capitalized days/months/languages)
# which read as errors in Romanian, where only sentence-start and proper nouns take
# a capital letter.
RO_CAPITALIZATION_RULE = (
    "\n\nCAPITALIZARE: scrii în română, NU aplica regulile de capitalizare din engleză. "
    "În română se scrie cu literă mică: zilele săptămânii (luni, marți...), lunile "
    "(ianuarie, februarie...), limbile și naționalitățile (română, românesc, englez), "
    "precum și titlurile sau subtitlurile — NU folosi Title Case (scrii 'Ce se poate "
    "întâmpla', nu 'Ce Se Poate Întâmpla'). Majusculă doar la începutul propoziției și "
    "la nume proprii."
)

# ============ CATEGORIES (MIND MAP STRUCTURE) ============
CATEGORIES = [
    {
        "id": "cat-1",
        "title": "Înțelegerea Profilului Neurodivergent",
        "subtitle": "Decalaj, supraexcitabilități și dublă excepționalitate",
        "color": "#7A9E9F",
        "icon": "sparkles",
        "profiles": ["supradotat", "adhd", "autism"],
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
        "profiles": ["supradotat", "adhd", "autism", "sensibil"],
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
        "profiles": ["supradotat", "adhd", "autism", "sensibil"],
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
        "profiles": ["adhd", "supradotat"],
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
        "profiles": ["autism", "sensibil", "adhd"],
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
    {
        "id": "cat-6",
        "title": "Exerciții Practice pentru Copil",
        "subtitle": "Pași concreți, de exersat acasă",
        "hidden_from_mindmap": True,
        "color": "#6B8CB5",
        "icon": "body",
        "profiles": ["supradotat", "adhd", "autism", "sensibil"],
        "subtopics": [
            {"id": "sub-6-1", "title": "Exerciții de Respirație și Calm", "points": [
                "Tehnici de respirație adaptate vârstei",
                "Relaxare musculară progresivă simplă",
                "Rutină de \"resetare\" în momente de tensiune"
            ]},
            {"id": "sub-6-2", "title": "Exerciții de Concentrare și Atenție", "points": [
                "Joc de atenție susținută, pas cu pas",
                "Mindfulness scurt, potrivit pentru copii",
                "Fragmentarea unei sarcini în pași mici"
            ]},
            {"id": "sub-6-3", "title": "Exerciții Senzoriale", "points": [
                "Activitate de reglare senzorială ghidată",
                "Exercițiu de conștientizare corporală",
                "Tehnică de presiune profundă/greutate"
            ]},
            {"id": "sub-6-4", "title": "Exerciții de Comunicare Emoțională", "points": [
                "Exercițiu de identificare a emoțiilor",
                "Joc de exprimare prin cuvinte simple",
                "Tehnică de ascultare activă părinte-copil"
            ]},
        ]
    },
]


# ============ MODELS ============
class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    name: str
    referral_code: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserOut(BaseModel):
    id: str
    email: str
    name: str
    created_at: datetime
    is_admin: bool = False
    assistant_name: Optional[str] = None
    referral_code: Optional[str] = None

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


# ============ REVIEW MODELS ============
class ReviewCreate(BaseModel):
    rating: int = Field(ge=1, le=5)
    comment: str = ""


# ============ FEEDBACK MODELS ============
class FeedbackCreate(BaseModel):
    how_found: str = ""
    role: str  # "parinte" | "specialist" | "altceva"
    role_other: str = ""
    is_useful: str  # "da" | "partial" | "nu"
    is_useful_reason: str = ""
    usage_context: str  # "copil_propriu" | "altii" | "ambele"
    would_recommend: str = ""  # "da" | "nu" | ""
    improvement: str = ""
    most_useful: List[str] = []


# ============ SPECIALISTS (admin-editable directory) ============
class SpecialistCreate(BaseModel):
    name: str
    title: str = ""
    specialization: str = ""
    calendly_url: str
    photo_url: str = ""


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


class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    email: EmailStr
    code: str
    new_password: str


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
        now = datetime.utcnow()  # naive UTC, matches how Mongo returns stored dates (no tz_aware client)
        last_seen = user.get("last_seen")
        if not last_seen or (now - last_seen).total_seconds() > 60:
            await db.users.update_one({"id": user_id}, {"$set": {"last_seen": now}})
            user["last_seen"] = now
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expirat")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token invalid")


SUPER_ADMIN_EMAIL = "otilia.ioana96@gmail.com"

# ============ EMAIL (Resend) ============
RESEND_API_KEY = os.environ.get("RESEND_API_KEY", "")
EMAIL_FROM_NAME = os.environ.get("EMAIL_FROM_NAME", "Ghid Părinte")
EMAIL_FROM_ADDRESS = os.environ.get("EMAIL_FROM_ADDRESS", "salut@hategalternativ.ro")

_SHORTENERS = ("bit.ly", "tinyurl.com", "t.co", "is.gd", "cutt.ly", "goo.gl", "rebrand.ly")
_CRED_ASK = ("reply with your password", "reply with the code", "send your password", "cvv",
             "send us your password", "enter your password below", "confirm your card number",
             "your full card number", "seed phrase", "recovery phrase", "verify your card",
             "social security number", "confirm your bank details",
             "trimite parola", "trimite-ne parola", "răspunde cu parola")
_HOSTISH = _re.compile(r"\b(?:https?://)?((?:[a-z0-9-]+\.)+[a-z]{2,})", _re.I)


def _host_ok(host: str) -> bool:
    if not host or "xn--" in host:
        return False
    try:
        _ipaddress.ip_address(host)
        return False
    except ValueError:
        pass
    return not any(host == s or host.endswith("." + s) for s in _SHORTENERS)


def _same_site(shown: str, real: str) -> bool:
    return shown == real or real.endswith("." + shown) or shown.endswith("." + real)


class _EmailScan(HTMLParser):
    def __init__(self):
        super().__init__()
        self.tags, self.urls, self.anchors = set(), [], []
        self._href, self._text = None, []
    def handle_starttag(self, tag, attrs):
        self.tags.add(tag.lower())
        self.urls += [v for k, v in attrs if k.lower() in ("href", "src") and v]
        if tag.lower() == "a":
            self._href = dict((k.lower(), v) for k, v in attrs).get("href")
            self._text = []
    def handle_data(self, data):
        if self._href is not None:
            self._text.append(data)
    def handle_endtag(self, tag):
        if tag.lower() == "a" and self._href is not None:
            self.anchors.append((self._href, "".join(self._text)))
            self._href, self._text = None, []


def _assert_safe_email(subject: str, html: str) -> None:
    scan = _EmailScan(); scan.feed(html)
    if scan.tags & {"form", "input", "textarea", "select"}:
        raise ValueError("No forms or input fields in email (G2)")
    body = f"{subject}\n{html}".lower()
    for p in _CRED_ASK:
        if p in body:
            raise ValueError(f"Email asks the recipient for credentials: {p!r} (G2)")
    for url in scan.urls:
        low = url.strip().lower()
        if low.startswith(("mailto:", "tel:", "cid:", "#")):
            continue
        if not low.startswith("https://"):
            raise ValueError(f"Email links/assets must be absolute https: {url!r} (G3)")
        host = _urlparse(low).hostname or ""
        if not _host_ok(host) or _urlparse(low).username is not None:
            raise ValueError(f"Shortened, numeric-host or credential-bearing URL: {url!r} (G3)")
    for href, text in scan.anchors:
        real = _urlparse(href.strip().lower()).hostname or ""
        if not real:
            continue
        for m in _HOSTISH.finditer(text):
            if not _same_site(m.group(1).lower(), real):
                raise ValueError(f"Anchor text {m.group(1)!r} ≠ real link host {real!r} (G3)")


async def send_email(*, to: str, subject: str, html: str) -> Optional[str]:
    _assert_safe_email(subject, html)
    payload = {
        "from": f"{EMAIL_FROM_NAME} <{EMAIL_FROM_ADDRESS}>",
        "to": [to],
        "subject": subject,
        "html": html,
    }
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                "https://api.resend.com/emails",
                headers={"Authorization": f"Bearer {RESEND_API_KEY}"},
                json=payload,
            )
        resp.raise_for_status()
        return resp.json().get("id")
    except httpx.HTTPStatusError as e:
        logger.error(f"Email send failed: {e.response.status_code} {e.response.text}")
        return None
    except Exception as e:
        logger.error(f"Email send error: {str(e)}")
        return None


def _email_shell(inner_html: str) -> str:
    """Wraps content in the standard branded email shell."""
    return (
        f'<table role="presentation" width="100%" style="background:#f7f5f0"><tr><td align="center" style="padding:24px">'
        f'<table role="presentation" width="480" style="background:#ffffff;border-radius:12px;font-family:Arial,sans-serif;color:#2f2f33">'
        f'<tr><td style="padding:28px 32px">'
        f'{inner_html}'
        f'<hr style="border:none;border-top:1px solid #eee;margin:24px 0">'
        f'<p style="margin:0;font-size:11px;color:#999">Acest mesaj a fost trimis de {html_escape(EMAIL_FROM_NAME)}. Nu vom cere niciodată parola sau codul prin email.</p>'
        f'</td></tr></table></td></tr></table>'
    )


async def send_welcome_email(to: str, name: str) -> None:
    safe_name = html_escape(name or "Părinte")
    inner = (
        f'<h1 style="margin:0 0 8px;color:#7A9E9F;font-size:22px">Bun venit, {safe_name}! 🌱</h1>'
        f'<p style="margin:0 0 16px;font-size:14px;line-height:20px">Ne bucurăm că te alături comunității <strong>{html_escape(EMAIL_FROM_NAME)}</strong> — un ghid practic pentru părinții copiilor supradotați, hiperactivi sau sensibili emoțional.</p>'
        f'<p style="margin:0 0 12px;font-size:14px;line-height:20px">Iată ce poți descoperi în aplicație:</p>'
        f'<ul style="margin:0 0 20px;padding-left:20px;font-size:13px;color:#555;line-height:22px">'
        f'<li>📖 <strong>Ghidul Specialistului</strong> — 20 capitole practice</li>'
        f'<li>🧠 <strong>Mind Map interactiv</strong> — teme cheie ale parentingului</li>'
        f'<li>📝 <strong>Jurnal cu analiză AI</strong> — descoperă tipare</li>'
        f'<li>🧩 <strong>Test profil copil</strong> — 12 întrebări → recomandări</li>'
        f'<li>💬 <strong>Comunitate anonimă</strong> — întreabă alți părinți</li>'
        f'<li>👨‍👩‍👧 <strong>Familie partajată</strong> — cu partenerul tău</li>'
        f'</ul>'
        f'<p style="margin:0 0 8px;font-size:13px;color:#666;line-height:19px">Deschide aplicația și începe cu <strong>Testul profil copil</strong> — durează 3 minute și îți oferă direcție.</p>'
        f'<p style="margin:0;font-size:13px;color:#666">Cu drag,<br>Echipa {html_escape(EMAIL_FROM_NAME)}</p>'
    )
    await send_email(to=to, subject=f"Bun venit la {EMAIL_FROM_NAME}! 🌱", html=_email_shell(inner))


async def send_family_join_notice(to: str, addressee_name: str, other_name: str, code: str, kind: str) -> None:
    """kind = 'joined' (I joined a family) or 'partner_joined' (someone joined MY family)."""
    safe_addressee = html_escape(addressee_name or "Părinte")
    safe_other = html_escape(other_name or "Partenerul tău")
    safe_code = html_escape(code)
    if kind == "joined":
        title = "Te-ai alăturat familiei! 👨‍👩‍👧"
        body = (
            f'<p style="margin:0 0 16px;font-size:14px;line-height:20px">Salut, {safe_addressee}!</p>'
            f'<p style="margin:0 0 16px;font-size:14px;line-height:20px">Te-ai alăturat cu succes familiei lui <strong>{safe_other}</strong> (cod <strong>{safe_code}</strong>) în {html_escape(EMAIL_FROM_NAME)}.</p>'
            f'<p style="margin:0 0 16px;font-size:14px;line-height:20px">De acum, vedeți împreună:</p>'
            f'<ul style="margin:0 0 20px;padding-left:20px;font-size:13px;color:#555;line-height:22px">'
            f'<li>📝 Toate însemnările din <strong>Jurnal</strong> (cu autorul vizibil)</li>'
            f'<li>🧩 Cel mai recent <strong>Test profil copil</strong></li>'
            f'<li>📊 <strong>Statistici lunare</strong> combinate</li>'
            f'</ul>'
        )
    else:  # partner_joined
        title = "Un partener s-a alăturat familiei tale 👨‍👩‍👧"
        body = (
            f'<p style="margin:0 0 16px;font-size:14px;line-height:20px">Salut, {safe_addressee}!</p>'
            f'<p style="margin:0 0 16px;font-size:14px;line-height:20px"><strong>{safe_other}</strong> tocmai a intrat în familia ta (cod <strong>{safe_code}</strong>) în {html_escape(EMAIL_FROM_NAME)}.</p>'
            f'<p style="margin:0 0 16px;font-size:14px;line-height:20px">De acum, partenerul tău poate vedea Jurnalul, Testul profil copil și statisticile — la fel cum tu vezi observațiile lui/ei.</p>'
        )
    inner = f'<h1 style="margin:0 0 12px;color:#7A9E9F;font-size:20px">{title}</h1>{body}'
    await send_email(to=to, subject=title, html=_email_shell(inner))


MOOD_LABELS = {"calm": "calm", "agitat": "agitat", "criza": "cu momente de criză", "fericit": "fericit", "ingrijorat": "îngrijorat"}


async def _send_weekly_recap_for_user(u: dict, since: datetime) -> None:
    uid = u["id"]
    journal_items = await db.journal.find({"user_id": uid, "created_at": {"$gte": since}}, {"_id": 0, "mood": 1}).to_list(200)
    ask_count = await db.ask_history.count_documents({"user_id": uid, "created_at": {"$gte": since.isoformat()}})
    forum_count = (
        await db.forum_posts.count_documents({"user_id": uid, "created_at": {"$gte": since.isoformat()}})
        + await db.forum_answers.count_documents({"user_id": uid, "created_at": {"$gte": since.isoformat()}})
    )
    if not journal_items and not ask_count and not forum_count:
        return  # skip inactive users, don't spam
    mood_counts: dict = {}
    for it in journal_items:
        mood_counts[it["mood"]] = mood_counts.get(it["mood"], 0) + 1
    top_mood = max(mood_counts, key=mood_counts.get) if mood_counts else None
    safe_name = html_escape(u.get("name") or "Părinte")
    items_html = []
    if journal_items:
        n = len(journal_items)
        items_html.append(f'<li>📝 <strong>{n}</strong> {"însemnare" if n == 1 else "însemnări"} în jurnal</li>')
        if top_mood:
            items_html.append(f'<li>😊 Starea predominantă: <strong>{html_escape(MOOD_LABELS.get(top_mood, top_mood))}</strong></li>')
    if ask_count:
        items_html.append(f'<li>💬 <strong>{ask_count}</strong> {"întrebare" if ask_count == 1 else "întrebări"} către asistentul AI</li>')
    if forum_count:
        items_html.append(f'<li>👥 <strong>{forum_count}</strong> {"contribuție" if forum_count == 1 else "contribuții"} în comunitate</li>')
    inner = (
        f'<h1 style="margin:0 0 12px;color:#7A9E9F;font-size:20px">Recapitularea ta săptămânală 🌱</h1>'
        f'<p style="margin:0 0 16px;font-size:14px;line-height:20px">Salut, {safe_name}! Iată ce ai făcut săptămâna aceasta în {html_escape(EMAIL_FROM_NAME)}:</p>'
        f'<ul style="margin:0 0 20px;padding-left:20px;font-size:13px;color:#555;line-height:22px">{"".join(items_html)}</ul>'
        f'<p style="margin:0;font-size:13px;color:#666">Continuă tot așa — fiecare notă contează.</p>'
    )
    await send_email(to=u["email"], subject=f"Recapitularea ta săptămânală — {EMAIL_FROM_NAME}", html=_email_shell(inner))


async def _maybe_send_weekly_recaps() -> None:
    now = datetime.now(timezone.utc)
    if now.weekday() != 0 or now.hour != 8:  # Monday, 08:00 UTC
        return
    week_key = now.strftime("%G-W%V")
    since = now - timedelta(days=7)
    async for u in db.users.find({}, {"_id": 0, "id": 1, "email": 1, "name": 1, "last_weekly_recap_week": 1}):
        if u.get("last_weekly_recap_week") == week_key:
            continue
        try:
            await _send_weekly_recap_for_user(u, since)
        except Exception as e:
            logger.error(f"weekly recap failed for {u.get('email')}: {e}")
        await db.users.update_one({"id": u["id"]}, {"$set": {"last_weekly_recap_week": week_key}})


async def _weekly_recap_loop() -> None:
    while True:
        try:
            await _maybe_send_weekly_recaps()
        except Exception as e:
            logger.error(f"weekly recap loop error: {e}")
        await asyncio.sleep(3600)



def is_super_admin(user: dict) -> bool:
    return bool(user.get("is_admin")) or (user.get("email", "").lower() == SUPER_ADMIN_EMAIL)


async def require_admin(user: dict = Depends(get_current_user)) -> dict:
    if not is_super_admin(user):
        raise HTTPException(status_code=403, detail="Doar administratorii au acces")
    return user


# ============ AUTH ROUTES ============
async def generate_referral_code() -> str:
    alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"  # no 0/O/1/I to avoid confusion
    for _ in range(10):
        code = "".join(py_secrets.choice(alphabet) for _ in range(6))
        if not await db.users.find_one({"referral_code": code}):
            return code
    return str(uuid.uuid4())[:8].upper()

@api_router.post("/auth/register", response_model=TokenResponse)
async def register(data: UserRegister):
    existing = await db.users.find_one({"email": data.email.lower()})
    if existing:
        raise HTTPException(status_code=400, detail="Email deja înregistrat")
    user_id = str(uuid.uuid4())
    email_lc = data.email.lower()
    referral_code = await generate_referral_code()
    referrer = None
    if data.referral_code:
        referrer = await db.users.find_one({"referral_code": data.referral_code.strip().upper()})
    user_doc = {
        "id": user_id,
        "email": email_lc,
        "name": data.name.strip(),
        "password": hash_password(data.password),
        "created_at": datetime.now(timezone.utc),
        "is_admin": email_lc == SUPER_ADMIN_EMAIL,
        "referral_code": referral_code,
        "referred_by": referrer["id"] if referrer else None,
    }
    try:
        await db.users.insert_one(user_doc)
    except DuplicateKeyError:
        raise HTTPException(status_code=400, detail="Email deja înregistrat")
    if referrer:
        await db.referrals.insert_one({
            "id": str(uuid.uuid4()),
            "referrer_id": referrer["id"],
            "referred_id": user_id,
            "referred_name": user_doc["name"],
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
    # Fire-and-forget welcome email
    try:
        asyncio.create_task(send_welcome_email(user_doc["email"], user_doc["name"]))
    except Exception as e:
        logger.warning(f"welcome email schedule failed: {e}")
    token = create_token(user_id)
    return TokenResponse(
        access_token=token,
        user=UserOut(id=user_id, email=user_doc["email"], name=user_doc["name"], created_at=user_doc["created_at"], is_admin=user_doc["is_admin"], referral_code=referral_code),
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
    if not user.get("referral_code"):
        user["referral_code"] = await generate_referral_code()
        await db.users.update_one({"id": user["id"]}, {"$set": {"referral_code": user["referral_code"]}})
    token = create_token(user["id"])
    return TokenResponse(
        access_token=token,
        user=UserOut(id=user["id"], email=user["email"], name=user["name"], created_at=user["created_at"], is_admin=bool(user.get("is_admin")), assistant_name=user.get("assistant_name"), referral_code=user.get("referral_code")),
    )

@api_router.get("/auth/me", response_model=UserOut)
async def me(user: dict = Depends(get_current_user)):
    referral_code = user.get("referral_code")
    if not referral_code:
        referral_code = await generate_referral_code()
        await db.users.update_one({"id": user["id"]}, {"$set": {"referral_code": referral_code}})
    return UserOut(id=user["id"], email=user["email"], name=user["name"], created_at=user["created_at"], is_admin=is_super_admin(user), assistant_name=user.get("assistant_name"), referral_code=referral_code)


@api_router.get("/referrals/me")
async def my_referrals(user: dict = Depends(get_current_user)):
    referral_code = user.get("referral_code")
    if not referral_code:
        referral_code = await generate_referral_code()
        await db.users.update_one({"id": user["id"]}, {"$set": {"referral_code": referral_code}})
    items = await db.referrals.find({"referrer_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return {"code": referral_code, "count": len(items), "referred": items}


class AssistantNameRequest(BaseModel):
    name: str


@api_router.post("/auth/assistant-name", response_model=UserOut)
async def set_assistant_name(data: AssistantNameRequest, user: dict = Depends(get_current_user)):
    name = data.name.strip()[:30]
    if not name:
        raise HTTPException(status_code=400, detail="Numele nu poate fi gol")
    await db.users.update_one({"id": user["id"]}, {"$set": {"assistant_name": name}})
    return UserOut(id=user["id"], email=user["email"], name=user["name"], created_at=user["created_at"], is_admin=is_super_admin(user), assistant_name=name)


@api_router.post("/auth/change-password")
async def change_password(data: ChangePasswordRequest, user: dict = Depends(get_current_user)):
    if len(data.new_password) < 6:
        raise HTTPException(status_code=400, detail="Parola nouă trebuie să aibă minim 6 caractere")
    fresh = await db.users.find_one({"id": user["id"]})
    if not fresh or not verify_password(data.old_password, fresh["password"]):
        raise HTTPException(status_code=401, detail="Parola actuală este incorectă")
    if data.old_password == data.new_password:
        raise HTTPException(status_code=400, detail="Parola nouă trebuie să fie diferită de cea veche")
    await db.users.update_one({"id": user["id"]}, {"$set": {"password": hash_password(data.new_password)}})
    # Invalidate any pending reset codes for this user
    await db.password_reset_codes.delete_many({"email": user["email"]})
    return {"ok": True, "message": "Parola a fost schimbată cu succes"}


@api_router.post("/auth/forgot-password")
async def forgot_password(data: ForgotPasswordRequest):
    """Send a 6-digit reset code to the email. Always returns generic OK to avoid user enumeration."""
    email_lc = data.email.lower()
    generic_response = {"ok": True, "message": "Dacă emailul există, vei primi în scurt timp un cod de resetare."}

    # Rate limit BEFORE any DB writes: use a separate audit log that is never cleaned mid-flow
    now = datetime.now(timezone.utc)
    since = now - timedelta(minutes=15)
    recent = await db.password_reset_requests.count_documents({"email": email_lc, "created_at": {"$gte": since}})
    # Always record the attempt (rate-limit audit) — even for non-existent emails, to prevent enumeration via timing
    await db.password_reset_requests.insert_one({"email": email_lc, "created_at": now})
    if recent >= 3:
        return generic_response

    user = await db.users.find_one({"email": email_lc})
    if not user:
        return generic_response

    # Generate 6-digit code
    code = f"{py_secrets.randbelow(1000000):06d}"
    code_hash = hashlib.sha256(code.encode()).hexdigest()
    expires_at = now + timedelta(minutes=15)

    # Invalidate previous codes and insert new one
    await db.password_reset_codes.delete_many({"email": email_lc})
    await db.password_reset_codes.insert_one({
        "id": str(uuid.uuid4()),
        "email": email_lc,
        "code_hash": code_hash,
        "created_at": now,
        "expires_at": expires_at,
        "used": False,
        "attempts": 0,
    })

    # Send email (Romanian). Server-side template; no user-supplied HTML.
    safe_name = html_escape(user.get("name", "Părinte"))
    html = (
        f'<table role="presentation" width="100%" style="background:#f7f5f0"><tr><td align="center" style="padding:24px">'
        f'<table role="presentation" width="480" style="background:#ffffff;border-radius:12px;font-family:Arial,sans-serif;color:#2f2f33">'
        f'<tr><td style="padding:28px 32px">'
        f'<h1 style="margin:0 0 8px;color:#7A9E9F;font-size:22px">Resetare parolă</h1>'
        f'<p style="margin:0 0 16px;font-size:14px">Bună, {safe_name}!</p>'
        f'<p style="margin:0 0 20px;font-size:14px;line-height:20px">Ai solicitat resetarea parolei pentru contul tău {html_escape(EMAIL_FROM_NAME)}. Codul tău de resetare este:</p>'
        f'<div style="text-align:center;background:#f7f5f0;padding:20px;border-radius:8px;margin:0 0 20px">'
        f'<div style="font-size:36px;font-weight:800;letter-spacing:10px;color:#7A9E9F">{code}</div></div>'
        f'<p style="margin:0 0 12px;font-size:13px;color:#666">Codul expiră în 15 minute. Deschide aplicația și introdu codul pe ecranul de resetare.</p>'
        f'<p style="margin:0 0 12px;font-size:13px;color:#666">Dacă nu ai solicitat această resetare, poți ignora acest email — parola ta rămâne neschimbată.</p>'
        f'<hr style="border:none;border-top:1px solid #eee;margin:24px 0">'
        f'<p style="margin:0;font-size:11px;color:#999">Acest mesaj a fost trimis de {html_escape(EMAIL_FROM_NAME)}. Nu vom cere niciodată parola sau codul prin email.</p>'
        f'</td></tr></table></td></tr></table>'
    )
    await send_email(to=email_lc, subject=f"Cod de resetare parolă — {EMAIL_FROM_NAME}", html=html)
    return generic_response


@api_router.post("/auth/reset-password")
async def reset_password(data: ResetPasswordRequest):
    if len(data.new_password) < 6:
        raise HTTPException(status_code=400, detail="Parola nouă trebuie să aibă minim 6 caractere")
    email_lc = data.email.lower()
    code = data.code.strip()
    if not _re.fullmatch(r"\d{6}", code):
        raise HTTPException(status_code=400, detail="Cod invalid — trebuie 6 cifre")
    code_hash = hashlib.sha256(code.encode()).hexdigest()

    record = await db.password_reset_codes.find_one({"email": email_lc, "used": False})
    if not record:
        raise HTTPException(status_code=400, detail="Cod inexistent sau expirat")

    # Check expiry (support both aware & naive datetimes in Mongo)
    exp = record.get("expires_at")
    if isinstance(exp, datetime):
        exp_aware = exp if exp.tzinfo else exp.replace(tzinfo=timezone.utc)
    else:
        exp_aware = datetime.now(timezone.utc) - timedelta(seconds=1)
    if datetime.now(timezone.utc) > exp_aware:
        await db.password_reset_codes.delete_one({"id": record["id"]})
        raise HTTPException(status_code=400, detail="Cod expirat. Te rog cere un cod nou.")

    # Track attempts (max 5)
    attempts = int(record.get("attempts", 0))
    if attempts >= 5:
        await db.password_reset_codes.delete_one({"id": record["id"]})
        raise HTTPException(status_code=400, detail="Prea multe încercări. Te rog cere un cod nou.")

    if record["code_hash"] != code_hash:
        await db.password_reset_codes.update_one({"id": record["id"]}, {"$inc": {"attempts": 1}})
        raise HTTPException(status_code=400, detail="Cod incorect")

    user = await db.users.find_one({"email": email_lc})
    if not user:
        # very unlikely — was deleted between forgot & reset
        await db.password_reset_codes.delete_one({"id": record["id"]})
        raise HTTPException(status_code=400, detail="Cont inexistent")

    await db.users.update_one({"id": user["id"]}, {"$set": {"password": hash_password(data.new_password)}})
    await db.password_reset_codes.update_one({"id": record["id"]}, {"$set": {"used": True}})
    # Cleanup
    await db.password_reset_codes.delete_many({"email": email_lc})
    return {"ok": True, "message": "Parola a fost resetată. Te poți autentifica cu noua parolă."}


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

# ============ ARTICLE (AI-GENERATED) ============
def find_subtopic(subtopic_id: str):
    for cat in CATEGORIES:
        for sub in cat["subtopics"]:
            if sub["id"] == subtopic_id:
                return cat, sub
    return None, None

async def generate_article(subtopic_id: str) -> dict:
    """Generates (via Claude) and caches the article for one subtopic. Raises on failure."""
    cat, sub = find_subtopic(subtopic_id)
    if not sub:
        raise HTTPException(status_code=404, detail="Subiect inexistent")

    if cat["id"] == "cat-6":
        points_str = "\n".join(f"- {p}" for p in sub["points"])
        system_msg = (
            "Ești un expert în psihologia copilului, specializat în copii supradotați și hiperactivi (ADHD/2e). "
            "Scrii instrucțiuni pentru părinți români. Folosești limba română corectă, ton cald, empatic și practic. "
            "Răspunzi strict în format JSON valid, fără text suplimentar."
        ) + RO_CAPITALIZATION_RULE
        prompt = f"""Scrie pașii unui exercițiu practic, ghidat, pe care un părinte îl poate face cu copilul, pe tema: "{sub['title']}"
(din categoria "{cat['title']}").

Aspecte de acoperit:
{points_str}

Răspunde STRICT în format JSON valid (fără markdown, fără ```json), cu structura:
{{
  "sfaturi_practice": [
    "Pasul 1 al exercițiului, ca instrucțiune directă și concretă",
    ... (5-7 pași, STRICT în ordinea în care se fac, fiecare un singur pas, fără numerotare în text)
  ]
}}"""
        sfaturi_practice = []
        try:
            response_text = await call_claude(system_msg, [{"role": "user", "content": prompt}])
            import json, re
            cleaned = response_text.strip()
            if cleaned.startswith("```"):
                cleaned = re.sub(r"^```(?:json)?\n?", "", cleaned)
                cleaned = re.sub(r"\n?```$", "", cleaned)
            try:
                parsed = json.loads(cleaned)
            except json.JSONDecodeError:
                m = re.search(r"\{[\s\S]*\}", cleaned)
                if not m:
                    raise
                parsed = json.loads(m.group(0))
            sfaturi_practice = parsed.get("sfaturi_practice", [])
        except Exception:
            logger.exception("Exercise steps generation failed")

        content = {
            "introducere": "", "puncte_cheie": [], "sfaturi_practice": sfaturi_practice,
            "exemplu_situatie": "", "cand_sa_cer_ajutor": "",
        }
        image_prompt = (
            f"O ilustrație caldă, simplă, tip desen plat (flat illustration), care arată un părinte și un copil "
            f"făcând exercițiul: \"{sub['title']}\". Stil prietenos, culori calme, fără text în imagine."
        )
        image = await generate_topic_image(image_prompt)
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
        if image:
            article["image_data"] = image["data"]
            article["image_mime"] = image["mime_type"]
        await db.articles.insert_one(article.copy())
        article.pop("_id", None)
        return article

    points_str = "\n".join(f"- {p}" for p in sub["points"])
    system_msg = (
        "Ești un expert în psihologia copilului, specializat în copii supradotați și hiperactivi (ADHD/2e). "
        "Scrii articole educaționale pentru părinți români. Folosești limba română corectă, ton cald, empatic și practic. "
        "Răspunzi strict în format JSON valid, fără text suplimentar."
    ) + RO_CAPITALIZATION_RULE

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
        response_text = await call_claude(system_msg, [{"role": "user", "content": prompt}])

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


@api_router.get("/article/{subtopic_id}")
async def get_article(subtopic_id: str, user: dict = Depends(get_current_user)):
    cached = await db.articles.find_one({"subtopic_id": subtopic_id}, {"_id": 0})
    if cached:
        return cached
    return await generate_article(subtopic_id)


async def _pregenerate_all_articles():
    all_subtopic_ids = [sub["id"] for cat in CATEGORIES for sub in cat["subtopics"]]
    cached_ids = set(await db.articles.distinct("subtopic_id", {"subtopic_id": {"$in": all_subtopic_ids}}))
    missing = [sid for sid in all_subtopic_ids if sid not in cached_ids]
    logger.info(f"Pre-generating {len(missing)} of {len(all_subtopic_ids)} articles (rest already cached)")
    for sid in missing:
        try:
            await generate_article(sid)
            logger.info(f"Pre-generated article for {sid}")
        except Exception:
            logger.exception(f"Pre-generation failed for {sid}")


async def _clear_old_format_exercise_articles():
    """One-time migration: cat-6 used to carry full AI-written text; now it's image+steps.
    Drops any article still in the old full-text format so it regenerates via the current path."""
    result = await db.articles.delete_many({"category_id": "cat-6", "content.introducere": {"$ne": ""}})
    if result.deleted_count:
        logger.info(f"Cleared {result.deleted_count} old-format exercise articles for regeneration")


async def _backfill_exercise_steps():
    """Fills in sfaturi_practice for cat-6 articles generated during the image-only phase,
    without touching their already-generated image (avoids re-spending on the image call)."""
    exercise_subtopics = {sub["id"]: sub for sub in next(c for c in CATEGORIES if c["id"] == "cat-6")["subtopics"]}
    docs = await db.articles.find(
        {"subtopic_id": {"$in": list(exercise_subtopics.keys())}, "content.sfaturi_practice": {"$in": [None, []]}},
        {"_id": 0, "subtopic_id": 1},
    ).to_list(100)
    if not docs:
        return
    logger.info(f"Backfilling steps for {len(docs)} exercise articles")
    system_msg = (
        "Ești un expert în psihologia copilului, specializat în copii supradotați și hiperactivi (ADHD/2e). "
        "Scrii instrucțiuni pentru părinți români. Folosești limba română corectă, ton cald, empatic și practic. "
        "Răspunzi strict în format JSON valid, fără text suplimentar."
    ) + RO_CAPITALIZATION_RULE
    for doc in docs:
        sid = doc["subtopic_id"]
        sub = exercise_subtopics.get(sid)
        if not sub:
            continue
        points_str = "\n".join(f"- {p}" for p in sub["points"])
        prompt = f"""Scrie pașii unui exercițiu practic, ghidat, pe care un părinte îl poate face cu copilul, pe tema: "{sub['title']}".

Aspecte de acoperit:
{points_str}

Răspunde STRICT în format JSON valid (fără markdown, fără ```json), cu structura:
{{
  "sfaturi_practice": [
    "Pasul 1 al exercițiului, ca instrucțiune directă și concretă",
    ... (5-7 pași, STRICT în ordinea în care se fac, fiecare un singur pas, fără numerotare în text)
  ]
}}"""
        try:
            response_text = await call_claude(system_msg, [{"role": "user", "content": prompt}])
            import json, re
            cleaned = response_text.strip()
            if cleaned.startswith("```"):
                cleaned = re.sub(r"^```(?:json)?\n?", "", cleaned)
                cleaned = re.sub(r"\n?```$", "", cleaned)
            try:
                parsed = json.loads(cleaned)
            except json.JSONDecodeError:
                m = re.search(r"\{[\s\S]*\}", cleaned)
                if not m:
                    raise
                parsed = json.loads(m.group(0))
            steps = parsed.get("sfaturi_practice", [])
            if steps:
                await db.articles.update_one({"subtopic_id": sid}, {"$set": {"content.sfaturi_practice": steps}})
                logger.info(f"Backfilled steps for {sid}")
        except Exception:
            logger.exception(f"Step backfill failed for {sid}")


async def _backfill_exercise_images():
    """Fills in image_data for cat-6 (Exerciții) articles that got cached before GOOGLE_API_KEY was set,
    or whose image generation failed earlier. Never re-generates the text."""
    exercise_subtopics = {sub["id"]: sub for sub in next(c for c in CATEGORIES if c["id"] == "cat-6")["subtopics"]}
    docs = await db.articles.find(
        {"subtopic_id": {"$in": list(exercise_subtopics.keys())}, "image_data": {"$in": [None, ""]}},
        {"_id": 0, "subtopic_id": 1},
    ).to_list(100)
    if not docs:
        return
    logger.info(f"Backfilling images for {len(docs)} exercise articles")
    for i, doc in enumerate(docs):
        if i > 0:
            await asyncio.sleep(15)  # spread requests out, this model's quota is per-minute
        sid = doc["subtopic_id"]
        sub = exercise_subtopics.get(sid)
        if not sub:
            continue
        image_prompt = (
            f"O ilustrație caldă, simplă, tip desen plat (flat illustration), care arată un părinte și un copil "
            f"făcând exercițiul: \"{sub['title']}\". Stil prietenos, culori calme, fără text în imagine."
        )
        image = await generate_topic_image(image_prompt)
        if image:
            await db.articles.update_one(
                {"subtopic_id": sid},
                {"$set": {"image_data": image["data"], "image_mime": image["mime_type"]}},
            )
            logger.info(f"Backfilled image for {sid}")
        else:
            logger.warning(f"Image backfill still failing for {sid} (check GOOGLE_API_KEY)")


@api_router.post("/admin/articles/pregenerate")
async def admin_pregenerate_articles(admin: dict = Depends(require_admin)):
    """Kicks off (in the background) generating+caching every subtopic article that isn't cached yet,
    plus backfilling any missing exercise images."""
    await _clear_old_format_exercise_articles()
    all_subtopic_ids = [sub["id"] for cat in CATEGORIES for sub in cat["subtopics"]]
    cached_ids = set(await db.articles.distinct("subtopic_id", {"subtopic_id": {"$in": all_subtopic_ids}}))
    missing_count = len(all_subtopic_ids) - len(cached_ids)
    asyncio.create_task(_pregenerate_all_articles())
    asyncio.create_task(_backfill_exercise_images())
    asyncio.create_task(_backfill_exercise_steps())
    return {"ok": True, "total": len(all_subtopic_ids), "already_cached": len(cached_ids), "generating": missing_count}


class BroadcastEmailRequest(BaseModel):
    subject: str = Field(min_length=1, max_length=200)
    body: str = Field(min_length=1, max_length=5000)


async def _send_broadcast_email(subject: str, body: str):
    users = await db.users.find({}, {"_id": 0, "email": 1}).to_list(10000)
    paragraphs = "".join(
        f'<p style="margin:0 0 14px;font-size:14px;line-height:20px">{html_escape(line)}</p>'
        for line in body.split("\n") if line.strip()
    )
    html = _email_shell(paragraphs)
    sent = 0
    for i, u in enumerate(users):
        if i > 0:
            await asyncio.sleep(0.5)
        try:
            if await send_email(to=u["email"], subject=subject, html=html):
                sent += 1
        except Exception:
            logger.exception(f"Broadcast email failed for {u.get('email')}")
    logger.info(f"Broadcast email sent to {sent}/{len(users)} users")


@api_router.post("/admin/broadcast-email")
async def admin_broadcast_email(data: BroadcastEmailRequest, admin: dict = Depends(require_admin)):
    """Sends the given subject/body (as an email, one paragraph per line) to every registered user, in the background."""
    count = await db.users.count_documents({})
    asyncio.create_task(_send_broadcast_email(data.subject, data.body))
    return {"ok": True, "recipients": count}


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
    ) + RO_CAPITALIZATION_RULE
    prompt = (
        f"Categorie: {data.category_title}\nTemă: {data.subtopic_title}\nConcept: \"{data.point}\"\n\n"
        f"Explică în 2-3 propoziții ce înseamnă acest concept și de ce contează. "
        f"Răspunde cu text simplu, fără markdown, fără titluri."
    )
    try:
        text = await call_claude(system_msg, [{"role": "user", "content": prompt}], max_tokens=300)
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
        "Ești asistent AI de PSIHOEDUCAȚIE și SUPORT pentru părinți în aplicația 'Ghid Părinte / "
        "Metanoia'. Domeniu: copii cu profile atipice — supradotați, ADHD (inclusiv ADHD invizibil "
        "la fete), sensibilitate emoțională, dublu excepționali (2e), tulburări de ticuri, anxietate, "
        "depresie, tulburări de spectru autist. Vorbești ROMÂNĂ.\n\n"
        "TON: cald, accesibil, empatic. EVIȚI jargonul clinic rigid. Vorbești ca un om care ține la "
        "părinte și la copil, NU ca un dicționar sau ca DSM.\n\n"
        "⚠️ NU ESTE OPȚIONAL — TREBUIE să respecți TOATE regulile de mai jos SIMULTAN în FIECARE răspuns:\n\n"
        "1) ZERO DIAGNOSTIC. Nu spui 'copilul are X'. Reformulezi: 'Ceea ce descrieți POATE SEMĂNA cu X, "
        "dar doar un psiholog clinician / pediatru / psihiatru pediatru poate confirma printr-o "
        "evaluare completă.'\n\n"
        "2) DESCHIZI CU VALIDARE (obligatoriu, nu opțional). Exemple pe care le poți adapta:\n"
        "   • 'Este de înțeles să fiți îngrijorată când observați...'\n"
        "   • 'Faptul că vă opriți să observați acest comportament e deja un semn de grijă atentă.'\n"
        "   • 'Vă simțiți epuizată — asta e absolut firesc când ai în îngrijire un copil cu nevoi intense.'\n\n"
        "3) EXPLICAȚI PRIN ANALOGII CONCRETE, nu prin definiții clinice. Exemple orientative:\n"
        "   • Hiperkinezia: 'seamănă cu un motor pornit continuu — copilul se foiește, nu are stare, "
        "aleargă fără scop'\n"
        "   • Ticul: 'un gest precis, repetitiv (o clipire deasă, o ridicare din umeri, un dres de "
        "voce), adesea precedat de o senzație de tensiune internă'\n"
        "   • ADHD la fete: 'ca și cum ai avea 10 ferestre deschise în minte simultan — pe dinafară "
        "pare visătoare/calmă, dar interior e haos și oboseală constantă'\n"
        "   • Sensibilitate emoțională: 'copilul simte lumea ca și cum ar avea antenele pe volum maxim'\n\n"
        "4) OFERI 2–3 REPERE CONCRETE DE OBSERVARE ACASĂ (părintele să știe CE să urmărească). "
        "Ex: 'Notați într-un jurnal când apar aceste mișcări, în ce context (după școală? seara? "
        "când e obosit?), cât durează, ce le calmează.' Trimite părintele către funcția Jurnal a "
        "aplicației dacă e potrivit.\n\n"
        "5) OFERI 1–2 ATITUDINI PARENTALE CALME (nu prescripții medicale). Ex: 'discutați deschis, "
        "fără să dramatizați; validați emoția; oferiți structură blândă cu liste vizuale și "
        "pauze scurte'.\n\n"
        "6) ÎNDRUMI EXPLICIT către un specialist dacă simptomele persistă, sunt intense sau afectează "
        "funcționarea copilului (somnul, școala, prieteniile, mâncarea). Menționează CE TIP de "
        "specialist (psiholog clinician pediatric / psihiatru pediatru / medic pediatru / logoped).\n\n"
        "7) ÎNCHEI CU O ÎNTREBARE DE FOLLOW-UP care scoate părintele din pasivitate. Alege UNA "
        "personalizată contextului, ex.:\n"
        "   • 'Cum se manifestă asta la voi în familie — pe cine afectează mai mult?'\n"
        "   • 'În ce moment al zilei observați cel mai des acest comportament?'\n"
        "   • 'Ce ați încercat deja și ce a părut să ajute puțin, chiar dacă temporar?'\n"
        "   • 'Când simțiți că cedați ca părinte? Ce vă declanșează frustarea?'\n"
        "   • 'Ce simțiți când citiți despre ADHD la Gabor Maté sau la alți autori?'\n\n"
        "🔴 ATENȚIE SPECIALĂ — ADHD LA FETE (submenționat clinic, adesea confundat cu anxietate/depresie):\n"
        "Din 2024 tot mai multe adolescente și tinere sunt diagnosticate cu anxietate/depresie când "
        "de fapt au ADHD inatentiv nedetectat în copilărie. Semnele 'liniștite' de urmărit la fete:\n"
        "  • visare cu ochii deschiși, minte 'pierdută'\n"
        "  • dezorganizare cronică (uită temele, obiectele, pașii)\n"
        "  • perfecționism epuizant, autocritică severă ('nu sunt destul de bună')\n"
        "  • oboseală emoțională disproporționată\n"
        "  • hipersensibilitate socială, evită conflicte, se retrage\n"
        "  • ADHD mascat ca 'timiditate' sau 'copil bun/cuminte'\n"
        "Dacă părintele descrie o fată cu asemenea semne, MENȚIONEAZĂ această posibilitate ca "
        "IPOTEZĂ DE EXPLORAT cu un specialist, nu ca diagnostic. Poți sugera o comparație "
        "'ADHD la băieți vs ADHD la fete' pentru claritate.\n\n"
        "STRUCTURĂ (max 400 cuvinte, ton natural — CURG paragraful în paragraf, "
        "FĂRĂ să anunți secțiuni în titluri, FĂRĂ etichete tip [Validare] sau **Validare** sau ** Ce se poate întâmpla**. "
        "REGULĂ STRICTĂ DE FORMATARE: nicio linie sau paragraf NU poate ÎNCEPE cu un cuvânt sau o "
        "sintagmă îngroșată urmată de rând nou — asta e tot un titlu deghizat, chiar fără paranteze. "
        "GREȘIT: '**Validare**\\n\\nEste de înțeles...' sau '**Ce se poate întâmpla — analogie concretă**\\n\\nHipervigilența...'. "
        "CORECT: 'Este de înțeles să vă simțiți...' (fără nimic bold înainte, textul curge direct). "
        "**bold** se folosește STRICT în interiorul unei propoziții, pentru 1-3 cuvinte cheie (ex: 'seamănă cu un "
        "**motor pornit continuu**'), NICIODATĂ ca prim element al unui paragraf. "
        "Ordinea INTERNĂ pe care o urmezi, dar nu o anunți și nu o marchezi vizual în niciun fel:):\n"
        "1) Un paragraf de validare emoțională (începe cu un verb caldă: 'Îmi pare rău', 'Este de înțeles', "
        "'Faptul că observați...' — dar NU pune titlu 'Validare')\n"
        "2) Explicație caldă cu analogie concretă — direct, ca și cum ai continua conversația\n"
        "3) O secțiune de repere concrete (poți folosi bullet-uri '- ' pentru claritate)\n"
        "4) Îndrumare specialist + 1-2 atitudini parentale (curge natural, nu ca titlu)\n"
        "5) O întrebare finală de follow-up (poți începe cu 'Aș fi curioasă...' sau 'Ce credeți...' sau "
        "direct întrebarea, dar FĂRĂ să scrii 'Întrebarea mea pentru voi:')\n\n"
        "Nu ascunde că ești AI. Dar oferi ghidaj cu suflet — părinții copiilor cu ADHD cercetează "
        "MULT cu AI-ul, iar diferența dintre AI generic și AI cald e ce face părintele să revină.\n\n"
        "CONVERSAȚIE CONTINUĂ: aceasta e o conversație cu memorie — părintele poate reveni cu întrebări "
        "de follow-up, iar tu vezi istoricul. STRUCTURA de mai sus (validare → analogie → repere → "
        "îndrumare → întrebare finală) se aplică integral doar PRIMULUI mesaj dintr-o conversație. "
        "La un mesaj de follow-up, răspunzi natural, ca într-un dialog real care continuă — NU repeți "
        "validarea de la zero, NU reiei structura completă, doar continui firul: răspunzi direct la ce "
        "a întrebat acum, ținând cont de tot ce ați discutat până acum."
    ) + RO_CAPITALIZATION_RULE
    assistant_name = user.get("assistant_name")
    if assistant_name:
        system_msg += (
            f"\n\nNUME: părintele te-a numit '{assistant_name}'. Dacă vine natural în context (ex. "
            f"părintele te salută sau te întreabă cum te cheamă), te poți referi la tine cu acest nume — "
            f"dar NU îl repeta forțat sau în fiecare mesaj."
        )
    # Reconstruct recent conversation so Claude sees prior turns (last 6 exchanges, oldest first)
    history_docs = await db.ask_history.find(
        {"user_id": user["id"]}, {"_id": 0, "question": 1, "answer": 1}
    ).sort("created_at", -1).to_list(6)
    history_docs.reverse()
    messages = []
    for h in history_docs:
        messages.append({"role": "user", "content": h["question"]})
        messages.append({"role": "assistant", "content": h["answer"]})
    messages.append({"role": "user", "content": data.question})

    try:
        answer = await call_claude(system_msg, messages, max_tokens=1200)
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
    ) + RO_CAPITALIZATION_RULE
    prompt = (
        f"Iată ultimele {len(items)} însemnări din jurnalul părintelui:\n\n{summary}\n\n"
        f"Analizează și identifică 3-5 tipare importante (zile/momente cu crize, declanșatori repetitivi, "
        f"perioade calme). Răspunde scurt (3-4 paragrafe), cu observații concrete și 2 sfaturi practice. "
        f"Nu folosi markdown."
    )
    try:
        text = await call_claude(system_msg, [{"role": "user", "content": prompt}], max_tokens=800)
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

    # Streak: consecutive days (grace period for today) with at least one journal entry
    journal_dates = await db.journal.find({"user_id": uid}, {"_id": 0, "created_at": 1}).sort("created_at", -1).to_list(400)
    days_with_entry = {d["created_at"].date() for d in journal_dates}
    streak_days = 0
    cursor_day = now.date()
    if cursor_day not in days_with_entry:
        cursor_day -= timedelta(days=1)
    while cursor_day in days_with_entry:
        streak_days += 1
        cursor_day -= timedelta(days=1)

    journal_badges = []
    if journal_total >= 1:
        journal_badges.append("first_entry")
    if journal_total >= 30:
        journal_badges.append("entries_30")
    if journal_total >= 100:
        journal_badges.append("entries_100")
    if streak_days >= 7:
        journal_badges.append("streak_7")
    if streak_days >= 30:
        journal_badges.append("streak_30")

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
        "journal": {"total": journal_total, "last_30_days": journal_30, "last_7_days": journal_7, "streak_days": streak_days, "badges": journal_badges},
        "bookmarks_total": bookmarks_total,
        "ask_ai": {"total": ask_total, "last_30_days": ask_30},
        "forum": {"posts": forum_posts, "answers": forum_answers},
        "test_result": latest_test,
        "family": family_info,
        "guide_read_chapters": read_chapters,
        "member_since": user.get("created_at"),
    }


# ============ NOTIFICATIONS ============
@api_router.get("/notifications")
async def list_notifications(user: dict = Depends(get_current_user)):
    items = await db.notifications.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(50)
    unread = await db.notifications.count_documents({"user_id": user["id"], "is_read": False})
    return {"notifications": items, "unread_count": unread}


@api_router.post("/notifications/{notif_id}/read")
async def mark_notification_read(notif_id: str, user: dict = Depends(get_current_user)):
    await db.notifications.update_one({"id": notif_id, "user_id": user["id"]}, {"$set": {"is_read": True}})
    return {"ok": True}


@api_router.post("/notifications/read-all")
async def mark_all_notifications_read(user: dict = Depends(get_current_user)):
    await db.notifications.update_many({"user_id": user["id"], "is_read": False}, {"$set": {"is_read": True}})
    return {"ok": True}


# ============ SUPER ADMIN ============
@api_router.get("/admin/stats")
async def admin_stats(admin: dict = Depends(require_admin)):
    """Global stats for the super admin."""
    now = datetime.now(timezone.utc)
    since_1 = now - timedelta(days=1)
    since_7 = now - timedelta(days=7)
    since_30 = now - timedelta(days=30)

    async def distinct_user_ids(collection, filt):
        return await collection.distinct("user_id", filt)

    async def profile_distribution():
        dist: dict = {}
        async for t in db.test_results.find({}, {"_id": 0, "profile_title": 1}):
            pt = t.get("profile_title", "Necunoscut")
            dist[pt] = dist.get(pt, 0) + 1
        return dist

    (
        users_total, users_new_7, users_new_30,
        journal_uids_7, ask_uids_7,
        journal_total, journal_1,
        ask_total, ask_1,
        tests_total, families_total, forum_posts_total, forum_answers_total, flagged_posts,
        profile_dist,
    ) = await asyncio.gather(
        db.users.count_documents({}),
        db.users.count_documents({"created_at": {"$gte": since_7}}),
        db.users.count_documents({"created_at": {"$gte": since_30}}),
        distinct_user_ids(db.journal, {"created_at": {"$gte": since_7}}),
        distinct_user_ids(db.ask_history, {"created_at": {"$gte": since_7.isoformat()}}),
        db.journal.count_documents({}),
        db.journal.count_documents({"created_at": {"$gte": since_1}}),
        db.ask_history.count_documents({}),
        db.ask_history.count_documents({"created_at": {"$gte": since_1.isoformat()}}),
        db.test_results.count_documents({}),
        db.families.count_documents({}),
        db.forum_posts.count_documents({}),
        db.forum_answers.count_documents({}),
        db.forum_posts.count_documents({"flagged_by.0": {"$exists": True}}),
        profile_distribution(),
    )
    active_uids_7 = set(journal_uids_7) | set(ask_uids_7)
    online_now = await db.users.count_documents({"last_seen": {"$gte": now - timedelta(minutes=5)}})

    return {
        "users": {"total": users_total, "new_last_7_days": users_new_7, "new_last_30_days": users_new_30, "active_last_7_days": len(active_uids_7), "online_now": online_now},
        "journal": {"total": journal_total, "last_24h": journal_1},
        "ask_ai": {"total": ask_total, "last_24h": ask_1},
        "tests": {"total": tests_total, "profile_distribution": profile_dist},
        "families_total": families_total,
        "forum": {"posts_total": forum_posts_total, "answers_total": forum_answers_total, "flagged_posts": flagged_posts},
    }


@api_router.get("/admin/analytics")
async def admin_analytics(admin: dict = Depends(require_admin)):
    """30-day trend + category popularity, for the admin analytics dashboard."""
    now = datetime.now(timezone.utc)
    since_30 = now - timedelta(days=30)

    async def per_day_counts(collection):
        pipeline = [
            {"$match": {"created_at": {"$gte": since_30}}},
            {"$group": {"_id": {"$dateToString": {"format": "%Y-%m-%d", "date": "$created_at"}}, "count": {"$sum": 1}}},
        ]
        return {row["_id"]: row["count"] async for row in collection.aggregate(pipeline)}

    signups_by_day, journal_by_day = await asyncio.gather(
        per_day_counts(db.users),
        per_day_counts(db.journal),
    )

    days = []
    for i in range(29, -1, -1):
        d = (now - timedelta(days=i)).strftime("%Y-%m-%d")
        days.append({"date": d, "signups": signups_by_day.get(d, 0), "journal_entries": journal_by_day.get(d, 0)})

    cat_pipeline = [
        {"$match": {"created_at": {"$gte": since_30}, "category_id": {"$ne": ""}}},
        {"$group": {"_id": "$category_id", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
    ]
    cat_title_map = {c["id"]: c["title"] for c in CATEGORIES}
    category_popularity = [
        {"category_id": row["_id"], "title": cat_title_map.get(row["_id"], row["_id"]), "count": row["count"]}
        async for row in db.journal.aggregate(cat_pipeline)
    ]

    return {"days": days, "category_popularity": category_popularity}


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
    uids = [u["id"] for u in users]

    async def counts_by_user(collection, uids):
        pipeline = [{"$match": {"user_id": {"$in": uids}}}, {"$group": {"_id": "$user_id", "n": {"$sum": 1}}}]
        return {row["_id"]: row["n"] async for row in collection.aggregate(pipeline)}

    async def last_activity_by_user(collection, uids):
        pipeline = [{"$match": {"user_id": {"$in": uids}}}, {"$group": {"_id": "$user_id", "last": {"$max": "$created_at"}}}]
        return {row["_id"]: row["last"] async for row in collection.aggregate(pipeline)}

    journal_counts, ask_counts, forum_counts, last_activity = await asyncio.gather(
        counts_by_user(db.journal, uids),
        counts_by_user(db.ask_history, uids),
        counts_by_user(db.forum_posts, uids),
        last_activity_by_user(db.journal, uids),
    )
    online_cutoff = datetime.utcnow() - timedelta(minutes=5)  # naive UTC, matches last_seen as stored

    out = [{
        "id": u["id"],
        "email": u.get("email"),
        "name": u.get("name"),
        "created_at": u.get("created_at"),
        "is_admin": bool(u.get("is_admin")) or (u.get("email", "").lower() == SUPER_ADMIN_EMAIL),
        "journal_count": journal_counts.get(u["id"], 0),
        "ask_count": ask_counts.get(u["id"], 0),
        "forum_count": forum_counts.get(u["id"], 0),
        "last_activity": last_activity.get(u["id"]),
        "last_seen": u.get("last_seen"),
        "is_online": bool(u.get("last_seen")) and u["last_seen"] >= online_cutoff,
    } for u in users]
    return {"users": out, "total": await db.users.count_documents(query)}


@api_router.get("/admin/users/{user_id}/ask-history")
async def admin_user_ask_history(user_id: str, admin: dict = Depends(require_admin)):
    """Full Ask Specialist question/answer history for one user (admin-only)."""
    target = await db.users.find_one({"id": user_id}, {"_id": 0, "name": 1, "email": 1})
    if not target:
        raise HTTPException(status_code=404, detail="Utilizator inexistent")
    items = await db.ask_history.find({"user_id": user_id}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return {"user": target, "items": items}


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
    enriched = await _enrich_family(fresh, user["id"])

    # Notify: joiner + existing members (fire and forget)
    try:
        existing_members = [m for m in enriched["members"] if not m["is_me"]]
        partner_name = existing_members[0]["name"] if existing_members else "partenerul tău"
        # Email to the joiner
        asyncio.create_task(send_family_join_notice(user["email"], user["name"], partner_name, fam["code"], "joined"))
        # Emails to existing members
        for m in existing_members:
            asyncio.create_task(send_family_join_notice(m["email"], m["name"], user.get("name", "Un părinte"), fam["code"], "partner_joined"))
    except Exception as e:
        logger.warning(f"family notify schedule failed: {e}")

    return {"family": enriched}


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


# ============ COMPARISON TABLES (Tabele comparative) ============
class CompareGenerateRequest(BaseModel):
    left: str
    right: str


@api_router.get("/compare")
async def list_comparisons():
    """List all predefined comparison tables (metadata only)."""
    return {"comparisons": [
        {"id": c["id"], "title": c["title"], "subtitle": c["subtitle"],
         "icon": c["icon"], "color": c["color"], "row_count": len(c["rows"])}
        for c in COMPARISON_TABLES
    ]}


@api_router.get("/compare/{comp_id}")
async def get_comparison(comp_id: str, user: dict = Depends(get_current_user)):
    """Get full details of a comparison table."""
    if comp_id in COMPARISON_MAP:
        return COMPARISON_MAP[comp_id]
    # Try in user-generated cache
    doc = await db.custom_comparisons.find_one({"id": comp_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Comparație inexistentă")
    return doc


@api_router.post("/compare/generate")
async def generate_comparison(data: CompareGenerateRequest, user: dict = Depends(get_current_user)):
    """Generate a custom comparison table with Claude on-demand."""
    left = data.left.strip()[:100]
    right = data.right.strip()[:100]
    if len(left) < 3 or len(right) < 3:
        raise HTTPException(status_code=400, detail="Fiecare termen trebuie să aibă minim 3 caractere")

    system_msg = (
        "Ești un asistent de psihoeducație pentru părinți români. Generezi TABELE COMPARATIVE "
        "cald-empatice între două profile/tulburări pediatrice. Format STRICT JSON.\n\n"
        "REGULI:\n"
        "1) Limba română, ton cald, fără jargon rigid, ZERO diagnostic\n"
        "2) 6–8 rânduri concrete, observabile de părinte acasă\n"
        "3) Fiecare rând: 'label' (aspectul comparat) + 'left' (max 15 cuvinte) + 'right' (max 15 cuvinte)\n"
        "4) 'insight' final: 2–3 propoziții cu îndrumare către specialist\n"
        "5) NU repeți diagnostice — spui 'poate semăna', 'este de explorat cu specialist'\n\n"
        "OUTPUT — DOAR JSON valid, fără text în jur, fără ```json:\n"
        "{\n"
        '  "title": "<A> vs <B>",\n'
        '  "subtitle": "<scurtă descriere educativă, max 15 cuvinte>",\n'
        '  "left_label": "<A>",\n'
        '  "right_label": "<B>",\n'
        '  "rows": [\n'
        '    {"label": "<aspect>", "left": "<manifestare la A>", "right": "<manifestare la B>"},\n'
        '    ...\n'
        '  ],\n'
        '  "insight": "<îndrumare 2-3 propoziții cu tip specialist recomandat>"\n'
        "}"
    ) + RO_CAPITALIZATION_RULE
    prompt = f"Generează tabelul comparativ între: **{left}** și **{right}**. Doar JSON."

    try:
        raw = await call_claude(system_msg, [{"role": "user", "content": prompt}], max_tokens=1500)
    except Exception as e:
        logger.exception("compare generate failed")
        raise HTTPException(status_code=500, detail=str(e))

    # Extract JSON
    import json as _json
    txt = raw.strip()
    # Strip potential code fences
    if txt.startswith("```"):
        txt = _re.sub(r"^```(?:json)?\s*|\s*```$", "", txt, flags=_re.MULTILINE).strip()
    try:
        data_obj = _json.loads(txt)
    except Exception:
        logger.warning(f"Bad JSON from LLM: {txt[:200]}")
        raise HTTPException(status_code=500, detail="Nu am putut interpreta răspunsul AI. Reîncearcă.")

    # Validate structure
    for key in ("title", "subtitle", "left_label", "right_label", "rows", "insight"):
        if key not in data_obj:
            raise HTTPException(status_code=500, detail=f"Răspuns AI incomplet ({key} lipsă)")
    if not isinstance(data_obj["rows"], list) or len(data_obj["rows"]) < 3:
        raise HTTPException(status_code=500, detail="Prea puține rânduri generate")

    doc = {
        "id": str(uuid.uuid4()),
        "title": data_obj["title"][:120],
        "subtitle": data_obj["subtitle"][:200],
        "left_label": data_obj["left_label"][:60],
        "right_label": data_obj["right_label"][:60],
        "icon": "sparkles",
        "color": "#7A9E9F",
        "rows": data_obj["rows"][:10],
        "insight": data_obj["insight"][:500],
        "custom": True,
        "created_by": user["id"],
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.custom_comparisons.insert_one(doc.copy())
    doc.pop("_id", None)
    return doc



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
            "author_id": it.get("user_id") if not it.get("is_anonymous") else None,
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
            "author_id": a.get("user_id") if not a.get("is_anonymous") else None,
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
        "author_id": post.get("user_id") if not post.get("is_anonymous") else None,
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
    if post.get("user_id") and post["user_id"] != user["id"]:
        await db.notifications.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": post["user_id"],
            "kind": "forum_reply",
            "title": "Ai un răspuns nou",
            "body": f'{doc["display_name"]} a răspuns la postarea ta „{post["title"][:60]}”',
            "route": f"/forum/{post_id}",
            "is_read": False,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
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


# ============ REVIEWS ============
@api_router.get("/reviews")
async def list_reviews(user: dict = Depends(get_current_user)):
    items = await db.reviews.find({}, {"_id": 0}).sort("created_at", -1).to_list(200)
    count = len(items)
    avg = round(sum(r["rating"] for r in items) / count, 1) if count else 0
    out = [{**r, "is_mine": r["user_id"] == user["id"]} for r in items]
    return {"reviews": out, "average": avg, "count": count}


@api_router.post("/reviews")
async def upsert_review(data: ReviewCreate, user: dict = Depends(get_current_user)):
    comment = data.comment.strip()[:500]
    existing = await db.reviews.find_one({"user_id": user["id"]})
    if existing:
        await db.reviews.update_one(
            {"user_id": user["id"]},
            {"$set": {"rating": data.rating, "comment": comment, "created_at": datetime.now(timezone.utc).isoformat()}},
        )
    else:
        await db.reviews.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": user["id"],
            "author_name": user["name"],
            "rating": data.rating,
            "comment": comment,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
    return {"ok": True}


@api_router.delete("/reviews/mine")
async def delete_my_review(user: dict = Depends(get_current_user)):
    await db.reviews.delete_one({"user_id": user["id"]})
    return {"ok": True}


@api_router.delete("/admin/reviews/{review_id}")
async def admin_delete_review(review_id: str, admin: dict = Depends(require_admin)):
    result = await db.reviews.delete_one({"id": review_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Recenzie inexistentă")
    return {"ok": True}


class ReviewReply(BaseModel):
    reply: str = Field(min_length=1, max_length=500)


@api_router.post("/admin/reviews/{review_id}/reply")
async def admin_reply_review(review_id: str, data: ReviewReply, admin: dict = Depends(require_admin)):
    review = await db.reviews.find_one({"id": review_id})
    if not review:
        raise HTTPException(status_code=404, detail="Recenzie inexistentă")
    reply = data.reply.strip()[:500]
    await db.reviews.update_one(
        {"id": review_id},
        {"$set": {"admin_reply": reply, "admin_reply_at": datetime.now(timezone.utc).isoformat()}},
    )
    if review.get("user_id"):
        await db.notifications.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": review["user_id"],
            "kind": "review_reply",
            "title": "Ai primit un răspuns la recenzia ta",
            "body": reply[:120],
            "route": "/(tabs)",
            "is_read": False,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        author = await db.users.find_one({"id": review["user_id"]}, {"_id": 0, "email": 1, "name": 1})
        if author and author.get("email"):
            safe_name = html_escape(author.get("name", ""))
            safe_reply = html_escape(reply)
            safe_comment = html_escape(review.get("comment", ""))
            inner = (
                f'<h2 style="margin:0 0 12px;font-size:20px;color:#5E8B7E">Ai primit un răspuns la recenzia ta 💬</h2>'
                f'<p style="margin:0 0 16px;font-size:14px;line-height:20px">Salut, {safe_name}! Mulțumim pentru recenzia ta'
                + (f' — <em>"{safe_comment}"</em>' if safe_comment else '')
                + ':</p>'
                f'<div style="background:#f7f5f0;border-radius:10px;padding:14px;margin:0 0 16px">'
                f'<p style="margin:0;font-size:14px;line-height:20px">{safe_reply}</p>'
                f'</div>'
                f'<p style="margin:0;font-size:13px;color:#666">Cu drag,<br>Echipa {html_escape(EMAIL_FROM_NAME)}</p>'
            )
            await send_email(to=author["email"], subject=f"Am răspuns la recenzia ta — {EMAIL_FROM_NAME}", html=_email_shell(inner))
    return {"ok": True}


# ============ DIRECT MESSAGES ============
def _conversation_id(a: str, b: str) -> str:
    return "_".join(sorted([a, b]))


class MessageCreate(BaseModel):
    recipient_id: str
    text: str = Field(min_length=1, max_length=2000)


@api_router.get("/messages/conversations")
async def list_conversations(user: dict = Depends(get_current_user)):
    docs = await db.messages.find(
        {"$or": [{"sender_id": user["id"]}, {"recipient_id": user["id"]}]},
        {"_id": 0},
    ).sort("created_at", 1).to_list(5000)
    convos: dict = {}
    for m in docs:
        is_mine = m["sender_id"] == user["id"]
        other_id = m["recipient_id"] if is_mine else m["sender_id"]
        other_name = m["recipient_name"] if is_mine else m["sender_name"]
        c = convos.setdefault(other_id, {
            "user_id": other_id, "name": other_name,
            "last_message": "", "last_at": "", "unread_count": 0,
        })
        c["last_message"] = m["text"]
        c["last_at"] = m["created_at"]
        if not is_mine and not m.get("is_read"):
            c["unread_count"] += 1
    items = sorted(convos.values(), key=lambda c: c["last_at"], reverse=True)
    return {"conversations": items}


@api_router.get("/messages/thread/{other_user_id}")
async def get_thread(other_user_id: str, user: dict = Depends(get_current_user)):
    cid = _conversation_id(user["id"], other_user_id)
    msgs = await db.messages.find({"conversation_id": cid}, {"_id": 0}).sort("created_at", 1).to_list(2000)
    await db.messages.update_many(
        {"conversation_id": cid, "recipient_id": user["id"], "is_read": False},
        {"$set": {"is_read": True}},
    )
    other = await db.users.find_one({"id": other_user_id}, {"_id": 0, "name": 1})
    if not other:
        raise HTTPException(status_code=404, detail="Utilizator inexistent")
    return {"messages": msgs, "other_name": other["name"]}


@api_router.post("/messages")
async def send_message(data: MessageCreate, user: dict = Depends(get_current_user)):
    if data.recipient_id == user["id"]:
        raise HTTPException(status_code=400, detail="Nu îți poți trimite mesaj ție însuți")
    recipient = await db.users.find_one({"id": data.recipient_id}, {"_id": 0, "name": 1})
    if not recipient:
        raise HTTPException(status_code=404, detail="Destinatar inexistent")
    text = data.text.strip()[:2000]
    doc = {
        "id": str(uuid.uuid4()),
        "conversation_id": _conversation_id(user["id"], data.recipient_id),
        "sender_id": user["id"],
        "sender_name": user["name"],
        "recipient_id": data.recipient_id,
        "recipient_name": recipient["name"],
        "text": text,
        "is_read": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.messages.insert_one(doc.copy())
    doc.pop("_id", None)
    await db.notifications.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": data.recipient_id,
        "kind": "direct_message",
        "title": f"Mesaj nou de la {user['name']}",
        "body": text[:120],
        "route": f"/messages/{user['id']}",
        "is_read": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return {"ok": True, "message": doc}


@api_router.get("/messages/support-contact")
async def support_contact(user: dict = Depends(get_current_user)):
    admin_user = await db.users.find_one({"is_admin": True}, {"_id": 0, "id": 1, "name": 1})
    if not admin_user:
        raise HTTPException(status_code=404, detail="Niciun admin disponibil")
    return admin_user


# ============ FEEDBACK ============
VALID_MOST_USEFUL = {"mindmap", "ghid", "test", "ask", "comunitate"}

@api_router.get("/feedback/mine")
async def my_feedback(user: dict = Depends(get_current_user)):
    existing = await db.feedback.find_one({"user_id": user["id"]}, {"_id": 0})
    return {"feedback": existing}


@api_router.post("/feedback")
async def upsert_feedback(data: FeedbackCreate, user: dict = Depends(get_current_user)):
    if data.role not in {"parinte", "specialist", "altceva"}:
        raise HTTPException(status_code=400, detail="Rol invalid")
    if data.is_useful not in {"da", "partial", "nu"}:
        raise HTTPException(status_code=400, detail="Răspuns invalid la utilitate")
    if data.usage_context not in {"copil_propriu", "altii", "ambele"}:
        raise HTTPException(status_code=400, detail="Răspuns invalid la utilizare")
    if data.would_recommend not in {"da", "nu", ""}:
        raise HTTPException(status_code=400, detail="Răspuns invalid la recomandare")
    most_useful = [m for m in data.most_useful if m in VALID_MOST_USEFUL]
    doc = {
        "user_id": user["id"],
        "user_name": user["name"],
        "user_email": user["email"],
        "how_found": data.how_found.strip()[:300],
        "role": data.role,
        "role_other": data.role_other.strip()[:120] if data.role == "altceva" else "",
        "is_useful": data.is_useful,
        "is_useful_reason": data.is_useful_reason.strip()[:500],
        "usage_context": data.usage_context,
        "would_recommend": data.would_recommend,
        "improvement": data.improvement.strip()[:1000],
        "most_useful": most_useful,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    existing = await db.feedback.find_one({"user_id": user["id"]})
    if existing:
        await db.feedback.update_one({"user_id": user["id"]}, {"$set": doc})
    else:
        doc["id"] = str(uuid.uuid4())
        await db.feedback.insert_one(doc)
    return {"ok": True}


@api_router.get("/admin/feedback")
async def admin_list_feedback(admin: dict = Depends(require_admin)):
    items = await db.feedback.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return {"feedback": items, "count": len(items)}


# ============ CONCENTRATION GAMES ============
VALID_GAMES = {"memory", "attention", "numbers", "oddoneout", "stroop"}

class GameScoreSubmit(BaseModel):
    game: str
    score: int = Field(ge=0)

@api_router.get("/games/scores")
async def my_game_scores(user: dict = Depends(get_current_user)):
    items = await db.game_scores.find({"user_id": user["id"]}, {"_id": 0, "game": 1, "best_score": 1}).to_list(10)
    return {"scores": {i["game"]: i["best_score"] for i in items}}


@api_router.post("/games/score")
async def submit_game_score(data: GameScoreSubmit, user: dict = Depends(get_current_user)):
    if data.game not in VALID_GAMES:
        raise HTTPException(status_code=400, detail="Joc invalid")
    existing = await db.game_scores.find_one({"user_id": user["id"], "game": data.game})
    is_new_best = not existing or data.score > existing["best_score"]
    if is_new_best:
        await db.game_scores.update_one(
            {"user_id": user["id"], "game": data.game},
            {"$set": {"best_score": data.score, "updated_at": datetime.now(timezone.utc).isoformat()}},
            upsert=True,
        )
    return {"ok": True, "is_new_best": is_new_best, "best_score": data.score if is_new_best else existing["best_score"]}


# ============ SPECIALISTS DIRECTORY ============
@api_router.get("/specialists")
async def list_specialists(user: dict = Depends(get_current_user)):
    items = await db.specialists.find({}, {"_id": 0}).sort("created_at", 1).to_list(200)
    return {"specialists": items}


@api_router.post("/admin/specialists")
async def create_specialist(data: SpecialistCreate, admin: dict = Depends(require_admin)):
    url = data.calendly_url.strip()
    if not url.startswith("https://"):
        raise HTTPException(status_code=400, detail="Linkul trebuie să înceapă cu https://")
    if len(data.photo_url) > 2_000_000:
        raise HTTPException(status_code=400, detail="Poza este prea mare")
    doc = {
        "id": str(uuid.uuid4()),
        "name": data.name.strip(),
        "title": data.title.strip(),
        "specialization": data.specialization.strip(),
        "calendly_url": url,
        "photo_url": data.photo_url,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.specialists.insert_one(doc.copy())
    doc.pop("_id", None)
    return {"ok": True, "specialist": doc}


@api_router.put("/admin/specialists/{specialist_id}")
async def update_specialist(specialist_id: str, data: SpecialistCreate, admin: dict = Depends(require_admin)):
    url = data.calendly_url.strip()
    if not url.startswith("https://"):
        raise HTTPException(status_code=400, detail="Linkul trebuie să înceapă cu https://")
    if len(data.photo_url) > 2_000_000:
        raise HTTPException(status_code=400, detail="Poza este prea mare")
    result = await db.specialists.update_one(
        {"id": specialist_id},
        {"$set": {
            "name": data.name.strip(),
            "title": data.title.strip(),
            "specialization": data.specialization.strip(),
            "calendly_url": url,
            "photo_url": data.photo_url,
        }},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Specialist inexistent")
    return {"ok": True}


@api_router.delete("/admin/specialists/{specialist_id}")
async def delete_specialist(specialist_id: str, admin: dict = Depends(require_admin)):
    result = await db.specialists.delete_one({"id": specialist_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Specialist inexistent")
    return {"ok": True}


app.include_router(api_router)

_cors_origins = [o.strip() for o in os.environ.get("CORS_ORIGINS", "").split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_credentials=bool(_cors_origins),
    allow_origins=_cors_origins or ["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


@app.on_event("startup")
async def create_indexes():
    await db.users.create_index("email", unique=True)
    await db.users.create_index("referral_code", unique=True, sparse=True)


async def _exercise_migration_and_backfill():
    await _clear_old_format_exercise_articles()
    await _backfill_exercise_images()
    await _backfill_exercise_steps()


@app.on_event("startup")
async def start_background_loops():
    asyncio.create_task(_weekly_recap_loop())
    asyncio.create_task(_exercise_migration_and_backfill())


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
