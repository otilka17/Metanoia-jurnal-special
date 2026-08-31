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
  register: (email: string, password: string, name: string, referral_code?: string) =>
    request("/auth/register", { method: "POST", body: { email, password, name, referral_code: referral_code || undefined }, auth: false }),
  myReferrals: () => request("/referrals/me"),
  login: (email: string, password: string) =>
    request("/auth/login", { method: "POST", body: { email, password }, auth: false }),
  me: () => request("/auth/me"),
  getCategories: () => request("/categories", { auth: false }),
  getCategory: (id: string) => request(`/categories/${id}`, { auth: false }),
  getArticle: (subtopicId: string) => request(`/article/${subtopicId}`),
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

  // Forum
  forumCategories: () => request("/forum/categories", { auth: false }),
  forumMe: () => request("/forum/me"),
  forumListPosts: (category?: string) =>
    request(`/forum/posts${category && category !== "all" ? `?category=${category}` : ""}`),
  forumGetPost: (id: string) => request(`/forum/posts/${id}`),
  forumCreatePost: (data: { category: string; title: string; content: string; is_anonymous: boolean }) =>
    request("/forum/posts", { method: "POST", body: data }),
  forumDeletePost: (id: string) => request(`/forum/posts/${id}`, { method: "DELETE" }),
  forumCreateAnswer: (postId: string, content: string, is_anonymous: boolean) =>
    request(`/forum/posts/${postId}/answers`, { method: "POST", body: { content, is_anonymous } }),
  forumDeleteAnswer: (id: string) => request(`/forum/answers/${id}`, { method: "DELETE" }),
  forumLikePost: (id: string) => request(`/forum/posts/${id}/like`, { method: "POST" }),
  forumLikeAnswer: (id: string) => request(`/forum/answers/${id}/like`, { method: "POST" }),
  forumFlagPost: (id: string) => request(`/forum/posts/${id}/flag`, { method: "POST" }),
  forumFlagAnswer: (id: string) => request(`/forum/answers/${id}/flag`, { method: "POST" }),

  // Family
  familyMe: () => request("/family/me"),
  familyCreate: () => request("/family", { method: "POST" }),
  familyJoin: (code: string) => request("/family/join", { method: "POST", body: { code } }),
  familyLeave: () => request("/family/leave", { method: "DELETE" }),

  // Test result
  saveTestResult: (data: any) => request("/test/result", { method: "POST", body: data }),
  getLatestTestResult: () => request("/test/result"),

  // Personal stats
  myStats: () => request("/me/stats"),

  // Admin
  adminStats: () => request("/admin/stats"),
  adminUsers: (q?: string) => request(`/admin/users${q ? `?q=${encodeURIComponent(q)}` : ""}`),
  adminDeleteUser: (id: string) => request(`/admin/users/${id}`, { method: "DELETE" }),
  adminToggleAdmin: (id: string) => request(`/admin/users/${id}/toggle-admin`, { method: "POST" }),
  adminFlagged: () => request("/admin/forum/flagged"),
  adminUserAskHistory: (id: string) => request(`/admin/users/${id}/ask-history`),
  adminPregenerateArticles: () => request("/admin/articles/pregenerate", { method: "POST" }),
  adminBroadcastEmail: (subject: string, body: string) =>
    request("/admin/broadcast-email", { method: "POST", body: { subject, body } }),
  adminAnalytics: () => request("/admin/analytics"),
  listSpecialists: () => request("/specialists"),
  adminCreateSpecialist: (data: { name: string; title: string; specialization: string; calendly_url: string; photo_url?: string }) =>
    request("/admin/specialists", { method: "POST", body: data }),
  adminUpdateSpecialist: (id: string, data: { name: string; title: string; specialization: string; calendly_url: string; photo_url?: string }) =>
    request(`/admin/specialists/${id}`, { method: "PUT", body: data }),
  adminDeleteSpecialist: (id: string) => request(`/admin/specialists/${id}`, { method: "DELETE" }),
  adminDeleteForumPost: (id: string) => request(`/admin/forum/posts/${id}`, { method: "DELETE" }),
  adminDeleteForumAnswer: (id: string) => request(`/admin/forum/answers/${id}`, { method: "DELETE" }),

  // Password
  changePassword: (old_password: string, new_password: string) =>
    request("/auth/change-password", { method: "POST", body: { old_password, new_password } }),
  deleteMyAccount: () => request("/auth/me", { method: "DELETE" }),
  setEmailPreferences: (opt_out: boolean) =>
    request("/auth/email-preferences", { method: "POST", body: { opt_out } }),
  setAssistantName: (name: string) =>
    request("/auth/assistant-name", { method: "POST", body: { name } }),
  forgotPassword: (email: string) =>
    request("/auth/forgot-password", { method: "POST", body: { email }, auth: false }),
  resetPassword: (email: string, code: string, new_password: string) =>
    request("/auth/reset-password", { method: "POST", body: { email, code, new_password }, auth: false }),

  // Reviews
  listReviews: () => request("/reviews"),
  upsertReview: (rating: number, comment: string) =>
    request("/reviews", { method: "POST", body: { rating, comment } }),
  deleteMyReview: () => request("/reviews/mine", { method: "DELETE" }),
  adminDeleteReview: (id: string) => request(`/admin/reviews/${id}`, { method: "DELETE" }),
  adminReplyReview: (id: string, reply: string) =>
    request(`/admin/reviews/${id}/reply`, { method: "POST", body: { reply } }),

  // Notifications
  listNotifications: () => request("/notifications"),
  markNotificationRead: (id: string) => request(`/notifications/${id}/read`, { method: "POST" }),
  markAllNotificationsRead: () => request("/notifications/read-all", { method: "POST" }),

  // Feedback
  myFeedback: () => request("/feedback/mine"),
  upsertFeedback: (data: {
    how_found: string; role: string; role_other?: string;
    is_useful: string; is_useful_reason?: string;
    usage_context: string; would_recommend?: string;
    improvement?: string; most_useful: string[];
  }) => request("/feedback", { method: "POST", body: data }),
  adminListFeedback: () => request("/admin/feedback"),

  // Concentration games
  myGameScores: () => request("/games/scores"),
  submitGameScore: (game: string, score: number) =>
    request("/games/score", { method: "POST", body: { game, score } }),

  // Direct messages
  listConversations: () => request("/messages/conversations"),
  getThread: (otherUserId: string) => request(`/messages/thread/${otherUserId}`),
  sendMessage: (recipient_id: string, text: string) =>
    request("/messages", { method: "POST", body: { recipient_id, text } }),
  supportContact: () => request("/messages/support-contact"),

  // Comparison tables
  listComparisons: () => request("/compare"),
  getComparison: (id: string) => request(`/compare/${id}`),
  generateComparison: (left: string, right: string) =>
    request("/compare/generate", { method: "POST", body: { left, right } }),
};
