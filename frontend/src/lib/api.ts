import { storage } from "@/src/utils/storage";

const BASE = process.env.EXPO_PUBLIC_BACKEND_URL;

export const TOKEN_KEY = "auth_token";

async function authHeaders(): Promise<Record<string, string>> {
  const token = await storage.secureGet(TOKEN_KEY, "");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T = any>(
  path: string,
  options: { method?: string; body?: any; auth?: boolean } = {}
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (options.auth !== false) {
    Object.assign(headers, await authHeaders());
  }
  const res = await fetch(`${BASE}/api${path}`, {
    method: options.method || "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { detail: text };
  }
  if (!res.ok) {
    throw new Error(data?.detail || `Eroare ${res.status}`);
  }
  return data as T;
}

export const api = {
  register: (email: string, password: string, name: string) =>
    request("/auth/register", { method: "POST", body: { email, password, name }, auth: false }),
  login: (email: string, password: string) =>
    request("/auth/login", { method: "POST", body: { email, password }, auth: false }),
  me: () => request("/auth/me"),
  getCategories: () => request("/categories", { auth: false }),
  getCategory: (id: string) => request(`/categories/${id}`, { auth: false }),
  getArticle: (subtopicId: string) => request(`/article/${subtopicId}`),
  search: (q: string, category_id?: string) =>
    request(`/search?q=${encodeURIComponent(q)}${category_id ? `&category_id=${category_id}` : ""}`, { auth: false }),
  listBookmarks: () => request("/bookmarks"),
  addBookmark: (data: {
    subtopic_id: string; title: string; category_id: string;
    type?: "article" | "explanation"; point?: string; explanation?: string;
  }) => request("/bookmarks", { method: "POST", body: data }),
  removeBookmark: (id: string) =>
    request(`/bookmarks/${id}`, { method: "DELETE" }),
  listJournal: () => request("/journal"),
  createJournal: (entry: { title: string; note: string; mood: string; triggers?: string; category_id?: string }) =>
    request("/journal", { method: "POST", body: entry }),
  journalStats: () => request("/journal/stats"),
  deleteJournal: (id: string) => request(`/journal/${id}`, { method: "DELETE" }),
  quickExplain: (point: string, subtopic_title: string, category_title: string) =>
    request("/quick-explain", { method: "POST", body: { point, subtopic_title, category_title } }),
  ask: (question: string) => request("/ask", { method: "POST", body: { question } }),
  askHistory: () => request("/ask/history"),
  askDelete: (id: string) => request(`/ask/${id}`, { method: "DELETE" }),
  journalPatterns: () => request("/journal/patterns"),
};
