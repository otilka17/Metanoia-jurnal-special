import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { api } from "./api";

const escapeHtml = (s: string) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export async function exportArticlePdf(subtopicId: string) {
  const a: any = await api.getArticle(subtopicId);
  const c = a.content;
  const points = (c.puncte_cheie || [])
    .map((p: any) => `<li><strong>${escapeHtml(p.titlu)}</strong><br/><span>${escapeHtml(p.explicatie)}</span></li>`)
    .join("");
  const tips = (c.sfaturi_practice || [])
    .map((t: string) => `<li>${escapeHtml(t)}</li>`).join("");
  const html = `
<!DOCTYPE html><html><head><meta charset="utf-8"/>
<style>
  body { font-family: -apple-system, system-ui, sans-serif; color: #2D3A35; padding: 32px; line-height: 1.55; }
  .badge { color: ${a.color}; font-size: 11px; letter-spacing: 1.5px; font-weight: 700; }
  h1 { font-size: 28px; margin: 6px 0 14px; color: #2D3A35; }
  .bar { width: 56px; height: 4px; background: ${a.color}; border-radius: 2px; margin-bottom: 20px; }
  h2 { font-size: 17px; margin-top: 26px; color: #2D3A35; }
  .intro { font-size: 14px; }
  ul { padding-left: 18px; }
  li { margin-bottom: 8px; font-size: 13px; }
  .tips { background: #F2EFE8; border-left: 4px solid ${a.color}; padding: 14px 18px; border-radius: 8px; }
  .example { background: #F0EFEA; padding: 14px; border-radius: 8px; font-style: italic; font-size: 13px; }
  .footer { margin-top: 40px; font-size: 11px; color: #888; text-align: center; }
</style></head><body>
  <div class="badge">${escapeHtml(a.category_title.toUpperCase())}</div>
  <h1>${escapeHtml(a.title)}</h1>
  <div class="bar"></div>
  <p class="intro">${escapeHtml(c.introducere)}</p>
  <h2>Puncte Cheie</h2><ul>${points}</ul>
  <h2>Sfaturi Practice</h2>
  <div class="tips"><ul>${tips}</ul></div>
  <h2>Exemplu de Situație</h2>
  <div class="example">${escapeHtml(c.exemplu_situatie)}</div>
  <h2>Când să ceri ajutor</h2>
  <p>${escapeHtml(c.cand_sa_cer_ajutor)}</p>
  <div class="footer">Ghid Părinte — Educația Copilului Supradotat / Hiperactiv</div>
</body></html>`;
  const { uri } = await Print.printToFileAsync({ html });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: "application/pdf", dialogTitle: a.title });
  }
  return uri;
}
