#!/usr/bin/env python3
"""
Re-applies the GitHub-Pages / security fixes that a fresh Emergent export
always reverts (Emergent's own copy never had them). Idempotent: safe to
run again on top of a repo that already has some or all of the fixes.

Run from the repo root: python3 scripts/reapply_web_fixes.py
"""
import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FRONTEND = ROOT / "frontend"
BACKEND = ROOT / "backend"


def patch(path: Path, old: str, new: str, label: str) -> None:
    text = path.read_text()
    if new in text:
        print(f"  [skip] {label} (already applied)")
        return
    if old not in text:
        print(f"  [WARN] {label}: anchor text not found, skipping — check manually: {path}")
        return
    path.write_text(text.replace(old, new, 1))
    print(f"  [ok] {label}")


def fix_gitignore():
    print("== .gitignore: ignore frontend/.metro-cache ==")
    path = FRONTEND / ".gitignore"
    patch(
        path,
        "# Metro\n.metro-health-check*",
        "# Metro\n.metro-health-check*\n.metro-cache/",
        ".metro-cache ignore",
    )


def untrack_metro_cache():
    print("== untracking frontend/.metro-cache from git ==")
    result = subprocess.run(
        ["git", "ls-files", "frontend/.metro-cache"], cwd=ROOT, capture_output=True, text=True
    )
    if result.stdout.strip():
        subprocess.run(["git", "rm", "-r", "--cached", "-q", "frontend/.metro-cache"], cwd=ROOT)
        print("  [ok] untracked")
    else:
        print("  [skip] nothing tracked")


def fix_app_json():
    print("== frontend/app.json: web.output=single + baseUrl ==")
    path = FRONTEND / "app.json"
    patch(
        path,
        '"web": {\n      "bundler": "metro",\n      "output": "static",',
        '"web": {\n      "bundler": "metro",\n      "output": "single",',
        "web.output -> single",
    )
    patch(
        path,
        '"experiments": {\n      "typedRoutes": true\n    }',
        '"experiments": {\n      "typedRoutes": true,\n      "baseUrl": "/Metanoia-psihologiacopilului"\n    }',
        "experiments.baseUrl",
    )


def fix_layout():
    print("== frontend/app/_layout.tsx: onboarding routing ==")
    path = FRONTEND / "app" / "_layout.tsx"
    old = '''function RootNav() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const segments = useSegments();
  const [obChecked, setObChecked] = useState(false);
  const [obSeen, setObSeen] = useState(true);

  useEffect(() => {
    (async () => {
      const seen = await storage.getItem("onboarding_seen", "");
      setObSeen(!!seen);
      setObChecked(true);
    })();
  }, []);

  useEffect(() => {
    if (loading || !obChecked) return;
    const inAuth = segments[0] === "(auth)";
    if (!user && !inAuth) {
      router.replace("/(auth)/login");
    } else if (user && inAuth) {
      router.replace("/(tabs)");
    }
  }, [user, loading, segments, obChecked, obSeen]);'''
    new = '''function RootNav() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const segments = useSegments();
  const [ready, setReady] = useState(false);

  // Re-read the onboarding flag on every navigation-relevant change instead of
  // caching it in state, so finishing onboarding (which sets the flag and
  // navigates away) is picked up immediately without a stale-state redirect loop.
  useEffect(() => {
    if (loading) return;
    let cancelled = false;
    (async () => {
      const seen = await storage.getItem("onboarding_seen", "");
      if (cancelled) return;
      const obSeen = !!seen;
      const inAuth = segments[0] === "(auth)";
      const inOnboarding = segments[0] === "onboarding";

      if (!obSeen && !inOnboarding) {
        router.replace("/onboarding");
      } else if (!user && !inAuth && !inOnboarding) {
        router.replace("/(auth)/login");
      } else if (user && inAuth) {
        router.replace("/(tabs)");
      }
      setReady(true);
    })();
    return () => { cancelled = true; };
  }, [user, loading, segments]);'''
    patch(path, old, new, "onboarding routing rewrite")
    patch(path, "if (loading || !obChecked) {", "if (loading || !ready) {", "loader condition -> ready")


ALERT_WRAPPER = '''// react-native-web's Alert.alert() is a no-op (see node_modules/react-native-web/src/exports/Alert),
// so every error/confirmation dialog in the app silently did nothing on web. This wraps it with a
// window.alert/confirm fallback on web while delegating to the real native Alert everywhere else.
import { Alert as RNAlert, Platform } from "react-native";

type AlertButton = { text?: string; style?: "default" | "cancel" | "destructive"; onPress?: () => void };

function alert(title: string, message?: string, buttons?: AlertButton[]) {
  if (Platform.OS !== "web") {
    RNAlert.alert(title, message, buttons as any);
    return;
  }
  const text = message ? `${title}\\n\\n${message}` : title;
  if (!buttons || buttons.length <= 1) {
    window.alert(text);
    buttons?.[0]?.onPress?.();
    return;
  }
  const cancelButton = buttons.find((b) => b.style === "cancel");
  const confirmButton = buttons.find((b) => b !== cancelButton) || buttons[buttons.length - 1];
  if (window.confirm(text)) {
    confirmButton.onPress?.();
  } else {
    cancelButton?.onPress?.();
  }
}

export const Alert = { alert };
'''


def fix_alert():
    print("== recreating frontend/src/lib/alert.ts + swapping imports ==")
    alert_path = FRONTEND / "src" / "lib" / "alert.ts"
    if alert_path.exists() and alert_path.read_text() == ALERT_WRAPPER:
        print("  [skip] alert.ts already present")
    else:
        alert_path.write_text(ALERT_WRAPPER)
        print("  [ok] wrote alert.ts")

    changed = 0
    for path in (FRONTEND / "app").rglob("*.tsx"):
        text = path.read_text()
        if 'from "@/src/lib/alert"' in text:
            continue  # already fixed
        # Find the react-native import block (single- or multi-line) and check it imports Alert
        m = re.search(r'import\s*\{([^}]*)\}\s*from\s*"react-native";', text, re.DOTALL)
        if not m or not re.search(r'\bAlert\b', m.group(1)):
            continue
        names_block = m.group(1)
        names = [n.strip() for n in names_block.split(",")]
        names = [n for n in names if n and n != "Alert"]
        new_names_block = "\n  " + ",\n  ".join(names) + ",\n" if "\n" in names_block else ", ".join(names)
        new_import = "import {" + ("\n  " if "\n" in names_block else " ") + \
            (",\n  ".join(names) if "\n" in names_block else ", ".join(names)) + \
            ("\n" if "\n" in names_block else " ") + '} from "react-native";'
        text = text[: m.start()] + new_import + text[m.end():]
        # Insert our Alert import right after the react-native import line
        insertion_point = text.index('} from "react-native";') + len('} from "react-native";')
        text = text[:insertion_point] + '\nimport { Alert } from "@/src/lib/alert";' + text[insertion_point:]
        path.write_text(text)
        changed += 1
        print(f"  [ok] {path.relative_to(ROOT)}")
    if changed == 0:
        print("  [skip] no files needed the Alert import swap")


def fix_backend():
    print("== backend/server.py: unique email index, min password length, CORS ==")
    path = BACKEND / "server.py"
    patch(
        path,
        "from motor.motor_asyncio import AsyncIOMotorClient\nimport os",
        "from motor.motor_asyncio import AsyncIOMotorClient\nfrom pymongo.errors import DuplicateKeyError\nimport os",
        "import DuplicateKeyError",
    )
    patch(
        path,
        "class UserRegister(BaseModel):\n    email: EmailStr\n    password: str\n    name: str",
        "class UserRegister(BaseModel):\n    email: EmailStr\n    password: str = Field(min_length=6)\n    name: str",
        "UserRegister.password min_length",
    )
    patch(
        path,
        '        "is_admin": email_lc == SUPER_ADMIN_EMAIL,\n    }\n    await db.users.insert_one(user_doc)\n    # Fire-and-forget welcome email',
        '        "is_admin": email_lc == SUPER_ADMIN_EMAIL,\n    }\n    try:\n        await db.users.insert_one(user_doc)\n    except DuplicateKeyError:\n        raise HTTPException(status_code=400, detail="Email deja înregistrat")\n    # Fire-and-forget welcome email',
        "register() DuplicateKeyError handling",
    )
    patch(
        path,
        'app.add_middleware(\n    CORSMiddleware,\n    allow_credentials=True,\n    allow_origins=["*"],\n    allow_methods=["*"],\n    allow_headers=["*"],\n)',
        '_cors_origins = [o.strip() for o in os.environ.get("CORS_ORIGINS", "").split(",") if o.strip()]\n\napp.add_middleware(\n    CORSMiddleware,\n    allow_credentials=bool(_cors_origins),\n    allow_origins=_cors_origins or ["*"],\n    allow_methods=["*"],\n    allow_headers=["*"],\n)',
        "CORS: credentials only with explicit origins",
    )
    patch(
        path,
        '@app.on_event("shutdown")\nasync def shutdown_db_client():',
        '@app.on_event("startup")\nasync def create_indexes():\n    await db.users.create_index("email", unique=True)\n\n\n@app.on_event("shutdown")\nasync def shutdown_db_client():',
        "startup: unique email index",
    )


if __name__ == "__main__":
    fix_gitignore()
    untrack_metro_cache()
    fix_app_json()
    fix_layout()
    fix_alert()
    fix_backend()
    print("\nDone. Next: reinstall frontend deps if needed, rebuild the web export, and republish to the repo root (index.html, 404.html, .nojekyll, _expo/, assets/, favicon.ico).")
