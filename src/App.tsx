import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { apiMessage, apiMutation, apiRequest, ApiError } from "./api";
import type { HqList, HqProfile, HqSession, MediaSearchItem, MediaType, Operator } from "./contracts";

type View = "overview" | "lists" | "insights" | "profile" | "team" | "settings";
type CatalogSource = "cabinet" | "external";
type CatalogItem = {
  id: string;
  mediaId: string | null;
  externalId: string | null;
  externalSource: string | null;
  mediaType: MediaType | null;
  title: string;
  year: number;
  cover: string;
  type: string;
  source: CatalogSource;
  publisher: string;
};
type ListEntry = { id: string; item: CatalogItem; note: string };
type Collection = {
  id: string;
  ordered: boolean;
  editorIds: string[];
  title: string;
  description: string;
  richText: string;
  backdrop: string;
  visibility: "Pública" | "Privada";
  items: ListEntry[];
  updatedAt: string;
};
type Profile = {
  id: string;
  name: string;
  handle: string;
  bio: string;
  website: string;
  avatar: string;
  backdrop: string;
  accent: string;
  followers: number;
  verified: boolean;
  claimStatus: string;
};
type AppData = { profile: Profile; lists: Collection[] };

function Icon({ name, size = 19 }: { name: string; size?: number }) {
  const paths: Record<string, string> = {
    grid: "M3 3h7v7H3z M14 3h7v7h-7z M14 14h7v7h-7z M3 14h7v7H3z",
    list: "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01",
    chart: "M3 3v18h18M7 14l4-4 4 3 6-7",
    user: "M20 21a8 8 0 0 0-16 0M12 13a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z",
    users:
      "M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M10 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM20 8v6M23 11h-6",
    settings:
      "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-1.7 2.94-.08-.02a1.7 1.7 0 0 0-1.77.52l-.05.06h-3.4l-.05-.06a1.7 1.7 0 0 0-1.77-.52l-.08.02-1.7-2.94.06-.06A1.7 1.7 0 0 0 9.6 15l-.08-.04v-3.4l.08-.04a1.7 1.7 0 0 0-.34-1.88L9.2 9.58l1.7-2.94.08.02a1.7 1.7 0 0 0 1.77-.52l.05-.06h3.4l.05.06a1.7 1.7 0 0 0 1.77.52l.08-.02 1.7 2.94-.06.06A1.7 1.7 0 0 0 19.4 11.5l.08.04v3.4z",
    plus: "M12 5v14M5 12h14",
    search: "m21 21-4.34-4.34M19 10.5a8.5 8.5 0 1 1-17 0 8.5 8.5 0 0 1 17 0Z",
    arrow: "M7 17 17 7M7 7h10v10",
    chevron: "m9 18 6-6-6-6",
    close: "M18 6 6 18M6 6l12 12",
    sparkle:
      "m12 3 1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2L12 3ZM19 14l1.1 2.9L23 18l-2.9 1.1L19 22l-1.1-2.9L15 18l2.9-1.1L19 14Z",
    dots: "M5 12h.01M12 12h.01M19 12h.01",
    edit: "M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4Z",
    image:
      "M3 3h18v18H3zM8.5 10a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3ZM21 15l-5-5L5 21",
    external:
      "M14 3h7v7M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6",
    check: "m5 12 4 4L19 6",
    download: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3",
    globe:
      "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20ZM2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10Z",
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.65"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name] ?? paths.sparkle} />
    </svg>
  );
}
function initialName(name: string) {
  return name.trim().slice(0, 1).toUpperCase() || "M";
}
function formatNumber(value: number) {
  return new Intl.NumberFormat("pt-BR").format(value);
}
function backdropBackground(url: string, overlay: string) {
  return url ? `${overlay}, url("${url.replaceAll('"', "%22")}")` : overlay;
}
const todayLabel = new Intl.DateTimeFormat("pt-BR", {
  weekday: "long",
  day: "2-digit",
  month: "long",
  timeZone: "America/Sao_Paulo",
})
  .format(new Date())
  .toLocaleUpperCase("pt-BR");
function sanitizeRichText(html: string) {
  const parsed = new DOMParser().parseFromString(html, "text/html");
  const allowed = new Set([
    "P",
    "BR",
    "STRONG",
    "B",
    "EM",
    "I",
    "BLOCKQUOTE",
    "UL",
    "OL",
    "LI",
    "A",
  ]);
  for (const element of Array.from(parsed.body.querySelectorAll("*"))) {
    if (!allowed.has(element.tagName)) {
      element.replaceWith(...Array.from(element.childNodes));
      continue;
    }
    for (const attribute of Array.from(element.attributes)) {
      const safeLink =
        element.tagName === "A" &&
        attribute.name === "href" &&
        /^https?:\/\//i.test(attribute.value);
      if (!safeLink) element.removeAttribute(attribute.name);
    }
  }
  return parsed.body.innerHTML;
}
function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] ?? char);
}
function richDocumentToHtml(value: string | null) {
  if (!value) return "";
  try {
    const document = JSON.parse(value) as { version?: number; blocks?: Array<{ type?: string; children?: Array<{ text?: string; marks?: string[]; link?: string | null }> }> };
    if (document.version !== 1 || !Array.isArray(document.blocks)) return "";
    return document.blocks.map((block) => {
      const contents = (block.children ?? []).map((run) => {
        let text = escapeHtml(run.text ?? "");
        for (const mark of run.marks ?? []) if (mark === "bold") text = `<strong>${text}</strong>`; else if (mark === "italic") text = `<em>${text}</em>`;
        if (run.link && /^https?:\/\//i.test(run.link)) text = `<a href="${escapeHtml(run.link)}">${text}</a>`;
        return text;
      }).join("");
      return block.type === "quote" ? `<blockquote>${contents}</blockquote>` : `<p>${contents}</p>`;
    }).join("");
  } catch { return ""; }
}
function richHtmlToDocument(html: string) {
  const parsed = new DOMParser().parseFromString(sanitizeRichText(html), "text/html");
  const blocks: Array<{ type: "paragraph" | "quote"; children: Array<{ text: string; marks: string[]; link?: string }> }> = [];
  const toRuns = (node: Node, marks: string[] = [], link?: string): Array<{ text: string; marks: string[]; link?: string }> => {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent ? [{ text: node.textContent, marks, ...(link ? { link } : {}) }] : [];
    if (!(node instanceof HTMLElement)) return [];
    const next = [...marks];
    if (["B", "STRONG"].includes(node.tagName) && !next.includes("bold")) next.push("bold");
    if (["I", "EM"].includes(node.tagName) && !next.includes("italic")) next.push("italic");
    const nextLink = node.tagName === "A" ? node.getAttribute("href") ?? link : link;
    return Array.from(node.childNodes).flatMap((child) => toRuns(child, next, nextLink));
  };
  for (const node of Array.from(parsed.body.childNodes)) {
    if (node instanceof HTMLElement && ["P", "BLOCKQUOTE"].includes(node.tagName)) {
      blocks.push({ type: node.tagName === "BLOCKQUOTE" ? "quote" : "paragraph", children: toRuns(node) });
    } else {
      const children = toRuns(node);
      if (children.length) blocks.push({ type: "paragraph", children });
    }
  }
  if (!blocks.length) blocks.push({ type: "paragraph", children: [] });
  return JSON.stringify({ version: 1, blocks });
}
function mapProfile(profile: HqProfile): Profile {
  return { id: profile.id, name: profile.displayName, handle: profile.handle, bio: profile.bio ?? "", website: profile.hq?.websiteUrl ?? "", avatar: profile.avatarUrl ?? "", backdrop: profile.backdropUrl ?? "", accent: "#c6f36a", followers: profile.followers, verified: profile.verified, claimStatus: profile.hq?.claimStatus ?? "UNKNOWN" };
}
function mapList(list: HqList): Collection {
  return { id: list.id, ordered: list.ordered, editorIds: list.editorIds, title: list.name, description: list.description ?? "", richText: richDocumentToHtml(list.richDescription), backdrop: list.coverUrl ?? "", visibility: list.visibility === "PUBLIC" ? "Pública" : "Privada", items: list.items.map((entry) => ({ id: entry.id, item: { id: entry.mediaId, mediaId: entry.mediaId, externalId: null, externalSource: null, mediaType: null, title: entry.title, year: 0, cover: entry.coverUrl ?? "", type: "Obra do catálogo Cabinet", source: "cabinet", publisher: "Cabinet" }, note: entry.notes ?? "" })), updatedAt: list.updatedAt ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(new Date(list.updatedAt)) : "—" };
}
function mapSearchResult(item: MediaSearchItem): CatalogItem {
  const typeLabels: Record<MediaType, string> = { BOOK: "Livro / HQ", MOVIE: "Filme", SERIES: "Série", TRACK: "Faixa", ALBUM: "Álbum", EPISODE: "Episódio" };
  return { id: item.id ?? `${item.source ?? "external"}:${item.externalId ?? item.title}`, mediaId: item.id, externalId: item.externalId, externalSource: item.source, mediaType: item.type, title: item.title, year: item.releaseDate ? Number(item.releaseDate.slice(0, 4)) : 0, cover: item.coverUrl ?? "", type: typeLabels[item.type], source: item.source ? "external" : "cabinet", publisher: item.creator ?? (item.source ?? "Cabinet") };
}
const emptyData: AppData = { profile: { id: "", name: "", handle: "", bio: "", website: "", avatar: "", backdrop: "", accent: "#c6f36a", followers: 0, verified: false, claimStatus: "UNKNOWN" }, lists: [] };
async function fetchDashboard(session: HqSession) {
  const [profile, lists, operators] = await Promise.all([
    apiRequest<HqProfile>("/v1/hq-console/profile"),
    apiRequest<HqList[]>("/v1/hq-console/lists"),
    ["OWNER", "ADMIN"].includes(session.role) ? apiRequest<Operator[]>("/v1/hq-console/operators") : Promise.resolve([]),
  ]);
  return { data: { profile: mapProfile(profile), lists: lists.map(mapList) }, operators };
}
function RichTextEditor({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== value)
      ref.current.innerHTML = value;
  }, [value]);
  const run = (command: string, argument?: string) => {
    ref.current?.focus();
    document.execCommand(command, false, argument);
    onChange(ref.current?.innerHTML ?? "");
  };
  return (
    <div className="rich-editor">
      <div className="rich-tools" aria-label="Formatação de texto">
        <button type="button" onClick={() => run("bold")} aria-label="Negrito">
          <b>B</b>
        </button>
        <button
          type="button"
          onClick={() => run("italic")}
          aria-label="Itálico"
        >
          <i>I</i>
        </button>
        <button
          type="button"
          onClick={() => run("formatBlock", "blockquote")}
          aria-label="Citação"
        >
          ❝
        </button>
        <button
          type="button"
          onClick={() => run("insertUnorderedList")}
          aria-label="Lista"
        >
          ☷
        </button>
        <span />
        <button
          type="button"
          onClick={() => run("removeFormat")}
          aria-label="Limpar formatação"
        >
          Limpar
        </button>
      </div>
      <div
        ref={ref}
        className="rich-input"
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        data-placeholder={placeholder}
        onInput={(event) =>
          onChange(sanitizeRichText(event.currentTarget.innerHTML))
        }
      />
    </div>
  );
}
function MediaBackdropPicker({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<MediaSearchItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedTitle, setSelectedTitle] = useState("");
  useEffect(() => {
    const normalized = query.trim();
    if (normalized.length < 3) {
      setItems([]);
      setError("");
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError("");
      try {
        const page = await apiRequest<{ items: MediaSearchItem[]; nextCursor: string | null }>(
          `/v1/media/search?query=${encodeURIComponent(normalized)}&limit=30`,
          { signal: controller.signal },
        );
        setItems(page.items.filter((item) => Boolean(item.coverUrl)));
      } catch (cause) {
        if (!controller.signal.aborted) setError(apiMessage(cause));
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 250);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [query]);
  return <div className="media-backdrop-picker">
    <div className="search-box backdrop-search"><Icon name="search" size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar obra no catálogo…" aria-label="Buscar mídia para o backdrop" /></div>
    <p className="field-hint">Escolha a imagem de capa de uma obra do catálogo Cabinet ou externo.</p>
    <div className="backdrop-media-grid" aria-live="polite">
      {loading && <p className="no-results">Buscando mídias…</p>}
      {error && <p className="no-results">{error}</p>}
      {!loading && query.trim().length < 3 && <p className="no-results">Digite ao menos 3 caracteres para buscar mídias.</p>}
      {!loading && query.trim().length >= 3 && !error && items.length === 0 && <p className="no-results">Nenhuma mídia com imagem encontrada.</p>}
      {items.map((item) => {
        const selected = item.coverUrl === value;
        return <button type="button" key={item.id ?? `${item.source}:${item.externalId ?? item.title}`} className={`backdrop-media-option ${selected ? "chosen" : ""}`} aria-pressed={selected} onClick={() => { onChange(item.coverUrl ?? ""); setSelectedTitle(item.title); }}>
          <img src={item.coverUrl ?? ""} alt="" />
          <span><strong>{item.title}</strong><small>{item.creator || item.type}{item.releaseDate ? ` · ${item.releaseDate.slice(0, 4)}` : ""}</small></span>
          {selected && <Icon name="check" size={16} />}
        </button>;
      })}
    </div>
    {value && <div className="backdrop-picked-row"><div className="backdrop-picked-preview" style={{ backgroundImage: `url("${value.replaceAll('"', "%22")}")` }} /><span><strong>{selectedTitle || "Backdrop selecionado"}</strong><small>Imagem da mídia escolhida</small></span><button type="button" className="text-link" onClick={() => { onChange(""); setSelectedTitle(""); }}>Remover</button></div>}
  </div>;
}
function LoginScreen({ onSubmit, busy, error }: { onSubmit: (event: FormEvent<HTMLFormElement>) => void; busy: boolean; error: string }) {
  return <div className="login-screen"><form className="login-card" onSubmit={onSubmit}>
    <div className="brand-row login-brand"><div className="brand-mark">c.</div><div className="brand-name">cabinet<span> / studio</span></div></div>
    <div className="eyebrow">ESPAÇO DE PUBLICAÇÃO</div><h1>Entre no seu Cabinet</h1>
    <p>Use o identificador da HQ e uma conta de operador.</p>
    {error && <div className="login-error" role="alert">{error}</div>}
    <label className="field-label">Identificador da HQ<input name="handle" required placeholder="mare-alta" autoComplete="organization" /></label>
    <label className="field-label">E-mail<input name="email" type="email" required placeholder="voce@editora.com" autoComplete="username" /></label>
    <label className="field-label">Senha<input name="password" type="password" required autoComplete="current-password" /></label>
    <button className="button button-primary login-submit" disabled={busy}>{busy ? "Conectando…" : "Entrar"}</button>
  </form></div>;
}
function App() {
  const [data, setData] = useState<AppData>(emptyData);
  const [session, setSession] = useState<HqSession | null>(null);
  const [operators, setOperators] = useState<Operator[]>([]);
  const [authLoading, setAuthLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [authError, setAuthError] = useState("");
  const [searchResults, setSearchResults] = useState<MediaSearchItem[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [view, setView] = useState<View>("overview");
  const [modal, setModal] = useState<"new-list" | "edit-profile" | null>(null);
  const [selectedList, setSelectedList] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [source, setSource] = useState<CatalogSource>("cabinet");
  const [notice, setNotice] = useState("");
  const [mobileMenu, setMobileMenu] = useState(false);
  const publicUrl = (import.meta.env.VITE_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
  async function reloadDashboard(currentSession = session) {
    if (!currentSession) return;
    const result = await fetchDashboard(currentSession);
    setData(result.data);
    setOperators(result.operators);
  }
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const currentSession = await apiRequest<HqSession>("/v1/hq-console/me");
        if (cancelled) return;
        const result = await fetchDashboard(currentSession);
        if (!cancelled) {
          setSession(currentSession);
          setData(result.data);
          setOperators(result.operators);
        }
      } catch (error) {
        if (!cancelled && (!(error instanceof ApiError) || error.status !== 401)) {
          setAuthError(apiMessage(error));
        }
      } finally {
        if (!cancelled) setAuthLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);
  useEffect(() => {
    const normalized = query.trim();
    if (view !== "lists" || !selectedList || normalized.length < 3) {
      setSearchResults([]);
      setSearchError("");
      setSearchLoading(false);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setSearchLoading(true);
      setSearchError("");
      try {
        const page = await apiRequest<{ items: MediaSearchItem[]; nextCursor: string | null }>(
          `/v1/media/search?query=${encodeURIComponent(normalized)}&limit=30`,
          { signal: controller.signal },
        );
        setSearchResults(page.items);
      } catch (error) {
        if (!controller.signal.aborted) setSearchError(apiMessage(error));
      } finally {
        if (!controller.signal.aborted) setSearchLoading(false);
      }
    }, 300);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [query, source, view, selectedList]);
  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 2800);
    return () => window.clearTimeout(timer);
  }, [notice]);
  const activeList =
    data.lists.find((list) => list.id === selectedList) ?? null;
  const totalItems = data.lists.reduce(
    (sum, list) => sum + list.items.length,
    0,
  );
  const publicLists = data.lists.filter(
    (list) => list.visibility === "Pública",
  ).length;
  const catalogItems = useMemo(() => searchResults
    .filter((item) => source === "external" ? item.source !== null : item.source === null)
    .map(mapSearchResult), [searchResults, source]);
  const go = (next: View) => {
    setView(next);
    setSelectedList(null);
    setMobileMenu(false);
  };
  const nav: { id: View; label: string; icon: string }[] = [
    { id: "overview", label: "Visão geral", icon: "grid" },
    { id: "lists", label: "Listas", icon: "list" },
    { id: "insights", label: "Estatísticas", icon: "chart" },
    { id: "profile", label: "Perfil público", icon: "user" },
  ];
  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    try {
      const profile = await apiMutation<HqProfile>("/v1/hq-console/profile", {
        method: "PUT",
        body: JSON.stringify({
          displayName: String(form.get("name")).trim(),
          bio: String(form.get("bio")).trim(),
          websiteUrl: String(form.get("website")).trim(),
          avatarUrl: String(form.get("avatar")).trim(),
          backdropUrl: String(form.get("backdrop")).trim() || null,
        }),
      });
      setData((current) => ({ ...current, profile: mapProfile(profile) }));
      setModal(null);
      setNotice("Perfil atualizado no Cabinet");
    } catch (error) { setNotice(apiMessage(error)); }
    finally { setBusy(false); }
  }
  async function createList(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    try {
      const list = await apiMutation<HqList>("/v1/hq-console/lists", {
        method: "POST",
        body: JSON.stringify({
          name: String(form.get("title")).trim(),
          description: String(form.get("description")).trim(),
          richDescription: richHtmlToDocument(String(form.get("richText") || "")),
          visibility: form.get("visibility") === "Privada" ? "PRIVATE" : "PUBLIC",
          ordered: true,
          coverUrl: String(form.get("backdrop")) || null,
        }),
      });
      setData((current) => ({ ...current, lists: [mapList(list), ...current.lists] }));
      setSelectedList(list.id);
      setView("lists");
      setModal(null);
      setNotice("Lista criada no Cabinet");
    } catch (error) { setNotice(apiMessage(error)); }
    finally { setBusy(false); }
  }
  async function updateList(id: string, payload: Partial<Collection>) {
    const list = data.lists.find((candidate) => candidate.id === id);
    if (!list) return;
    setBusy(true);
    try {
      const updated = await apiMutation<HqList>(`/v1/hq-console/lists/${id}`, {
        method: "PUT",
        body: JSON.stringify({
          name: payload.title ?? list.title,
          description: payload.description ?? list.description,
          richDescription: richHtmlToDocument(payload.richText ?? list.richText),
          visibility: (payload.visibility ?? list.visibility) === "Privada" ? "PRIVATE" : "PUBLIC",
          ordered: payload.ordered ?? list.ordered,
          coverUrl: (payload.backdrop ?? list.backdrop).trim() || null,
        }),
      });
      setData((current) => ({ ...current, lists: current.lists.map((item) => item.id === id ? mapList(updated) : item) }));
      setNotice("Alterações salvas no Cabinet");
    } catch (error) { setNotice(apiMessage(error)); }
    finally { setBusy(false); }
  }
  async function addItem(item: CatalogItem) {
    if (!activeList || activeList.items.some((entry) => entry.item.mediaId === item.mediaId && item.mediaId)) return;
    setBusy(true);
    try {
      let mediaId = item.mediaId;
      if (!mediaId && item.externalId && item.externalSource) {
        const imported = await apiMutation<{ id: string }>("/v1/media/external/import", {
          method: "POST",
          body: JSON.stringify({ source: item.externalSource, externalId: item.externalId, mediaType: item.mediaType }),
        });
        mediaId = imported.id;
      }
      if (!mediaId) throw new Error("Esta obra não pôde ser importada para o catálogo Cabinet.");
      const updated = await apiMutation<HqList>(`/v1/hq-console/lists/${activeList.id}/items`, {
        method: "POST", body: JSON.stringify({ mediaId }),
      });
      setData((current) => ({ ...current, lists: current.lists.map((list) => list.id === activeList.id ? mapList(updated) : list) }));
      setNotice(`${item.title} adicionada à lista`);
    } catch (error) { setNotice(apiMessage(error)); }
    finally { setBusy(false); }
  }
  async function removeItem(itemId: string) {
    if (!activeList) return;
    try {
      const updated = await apiMutation<HqList>(`/v1/hq-console/lists/${activeList.id}/items/${itemId}`, { method: "DELETE" });
      setData((current) => ({ ...current, lists: current.lists.map((list) => list.id === activeList.id ? mapList(updated) : list) }));
      setNotice("Obra removida da lista");
    } catch (error) { setNotice(apiMessage(error)); }
  }
  async function saveItemNote(itemId: string, notes: string) {
    if (!activeList) return;
    try {
      const updated = await apiMutation<HqList>(`/v1/hq-console/lists/${activeList.id}/items/${itemId}`, { method: "PUT", body: JSON.stringify({ notes }) });
      setData((current) => ({ ...current, lists: current.lists.map((list) => list.id === activeList.id ? mapList(updated) : list) }));
    } catch (error) { setNotice(apiMessage(error)); }
  }
  async function reorderItem(id: string, direction: -1 | 1) {
    if (!activeList) return;
    const from = activeList.items.findIndex((entry) => entry.id === id);
    const to = from + direction;
    if (to < 0 || to >= activeList.items.length) return;
    try {
      const updated = await apiMutation<HqList>(`/v1/hq-console/lists/${activeList.id}/items/${id}`, { method: "PUT", body: JSON.stringify({ position: to }) });
      setData((current) => ({ ...current, lists: current.lists.map((list) => list.id === activeList.id ? mapList(updated) : list) }));
    } catch (error) { setNotice(apiMessage(error)); }
  }
  async function deleteList() {
    if (!activeList || !window.confirm(`Excluir a lista “${activeList.title}” e todos os itens dela?`)) return;
    try {
      await apiMutation<void>(`/v1/hq-console/lists/${activeList.id}`, { method: "DELETE" });
      setData((current) => ({ ...current, lists: current.lists.filter((list) => list.id !== activeList.id) }));
      setSelectedList(null);
      setNotice("Lista excluída do Cabinet");
    } catch (error) { setNotice(apiMessage(error)); }
  }
  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true); setAuthError("");
    try {
      const currentSession = await apiMutation<HqSession>("/v1/hq-console/login", { method: "POST", body: JSON.stringify({ handle: String(form.get("handle")).trim().replace(/^@/, ""), email: String(form.get("email")).trim(), password: String(form.get("password")) }) });
      const result = await fetchDashboard(currentSession);
      setSession(currentSession); setData(result.data); setOperators(result.operators);
    } catch (error) { setSession(null); setAuthError(apiMessage(error)); }
    finally { setBusy(false); setAuthLoading(false); }
  }
  async function logout() {
    try { await apiMutation<void>("/v1/hq-console/logout", { method: "POST" }); }
    catch (error) { setNotice(apiMessage(error)); }
    setSession(null); setData(emptyData); setOperators([]); setView("overview");
  }
  async function refresh() {
    try { await reloadDashboard(); setNotice("Dados atualizados do Cabinet"); }
    catch (error) { setNotice(apiMessage(error)); }
  }
  if (authLoading) return <div className="login-screen"><div className="login-card"><div className="brand-mark">c.</div><h1>Conectando ao Cabinet</h1><p>Carregando o espaço de publicação…</p></div></div>;
  if (!session) return <LoginScreen onSubmit={login} busy={busy} error={authError} />;
  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileMenu ? "sidebar-open" : ""}`}>
        <div className="brand-row">
          <div className="brand-mark">c.</div>
          <div className="brand-name">
            cabinet<span> / studio</span>
          </div>
          <button
            className="icon-button sidebar-close"
            aria-label="Fechar menu"
            onClick={() => setMobileMenu(false)}
          >
            <Icon name="close" />
          </button>
        </div>
        <div className="workspace-switch">
          <div className="workspace-avatar">{initialName(data.profile.name)}</div>
          <div className="workspace-copy">
            <strong>{data.profile.name}</strong>
            <small>Espaço Cabinet · {session.role}</small>
          </div>
          <span className="switch-dots">•••</span>
        </div>
        <div className="side-label">PUBLICAÇÃO</div>
        <nav className="side-nav" aria-label="Navegação principal">
          {nav.map((item) => (
            <button
              key={item.id}
              className={`nav-item ${view === item.id && !selectedList ? "active" : ""}`}
              onClick={() => go(item.id)}
            >
              <Icon name={item.icon} />
              <span>{item.label}</span>
              {item.id === "lists" && <small>{data.lists.length}</small>}
            </button>
          ))}
        </nav>
        <div className="side-label side-label-gap">GERENCIAMENTO</div>
        <nav className="side-nav" aria-label="Gerenciamento">
          <button
            className={`nav-item ${view === "team" ? "active" : ""}`}
            onClick={() => go("team")}
          >
            <Icon name="users" />
            <span>Equipe</span>
          </button>
          <button
            className={`nav-item ${view === "settings" ? "active" : ""}`}
            onClick={() => go("settings")}
          >
            <Icon name="settings" />
            <span>Configurações</span>
          </button>
        </nav>
        <div className="sidebar-bottom">
          <div className="plan-card">
            <div className="plan-icon">
              <Icon name="sparkle" size={16} />
            </div>
            <strong>Cabinet Studio</strong>
            <p>Seu espaço está no ar e pronto para crescer.</p>
            <button
              onClick={() => {
                go("profile");
                setNotice("Seu perfil público está atualizado");
              }}
            >
              Ver página pública <Icon name="arrow" size={14} />
            </button>
          </div>
          <div className="account-row">
            <div className="account-avatar">
              {initialName(data.profile.name)}
            </div>
            <div className="workspace-copy">
              <strong>{session.displayName}</strong>
              <small>{session.email}</small>
            </div>
            <button
              className="icon-button"
              title="Configurações da conta"
              onClick={() => go("settings")}
            >
              <Icon name="dots" />
            </button>
          </div>
        </div>
      </aside>
      {mobileMenu && (
        <button
          aria-label="Fechar navegação"
          className="mobile-scrim"
          onClick={() => setMobileMenu(false)}
        />
      )}
      <main className="main-panel">
        <header className="topbar">
          <button
            className="icon-button mobile-menu-button"
            aria-label="Abrir menu"
            onClick={() => setMobileMenu(true)}
          >
            <span className="hamburger">☰</span>
          </button>
          <div className="breadcrumbs">
            <span>Cabinet</span>
            <Icon name="chevron" size={14} />
            <strong>
              {activeList?.title ??
                (
                  {
                    overview: "Visão geral",
                    lists: "Listas",
                    insights: "Estatísticas",
                    profile: "Perfil público",
                    team: "Equipe",
                    settings: "Configurações",
                  } as Record<View, string>
                )[view]}
            </strong>
          </div>
          <div className="topbar-actions">
            <span className="live-indicator">
              <i /> API conectada
            </span>
            <button
              className="top-avatar"
              onClick={() => setModal("edit-profile")}
              aria-label="Editar perfil"
            >
              {initialName(data.profile.name)}
            </button>
          </div>
        </header>
        <div className="content-wrap">
          {view === "overview" && (
            <>
              <div className="welcome-row">
                <div>
                  <div className="eyebrow">
                    <span className="eyebrow-line" /> {todayLabel}
                  </div>
                  <h1>
                    Bom dia, equipe <span className="wave">✳</span>
                  </h1>
                  <p className="lede">
                    Aqui está o que está acontecendo com a sua HQ.
                  </p>
                </div>
                <button
                  className="button button-primary"
                  onClick={() => setModal("new-list")}
                >
                  <Icon name="plus" size={17} /> Criar lista
                </button>
              </div>
              <section
                className="hero-card"
                style={{
                  backgroundImage: backdropBackground(data.profile.backdrop, "linear-gradient(90deg, rgba(10,15,12,.91) 0%, rgba(10,15,12,.65) 46%, rgba(10,15,12,.1) 100%)"),
                }}
              >
                <div className="hero-content">
                  <span className="hero-tag">
                    <i /> SUA PÁGINA PÚBLICA
                  </span>
                  <h2>{data.profile.name}</h2>
                  <p>{data.profile.bio}</p>
                  <div className="hero-actions">
                    <button
                      className="button button-acid"
                      onClick={() => go("profile")}
                    >
                      Personalizar perfil <Icon name="arrow" size={15} />
                    </button>
                    <button
                      className="button button-glass"
                      onClick={() => {
                        go("profile");
                        setNotice("Prévia da página pública");
                      }}
                    >
                      <Icon name="globe" size={15} /> Prévia pública
                    </button>
                  </div>
                </div>
                <button
                  className="hero-edit"
                  title="Alterar imagem de capa"
                  onClick={() => setModal("edit-profile")}
                >
                  <Icon name="image" size={16} /> Editar capa
                </button>
                <div className="hero-art-label">
                  CAPA DO PERFIL <span>01 / 04</span>
                </div>
              </section>
              <section className="stats-grid" aria-label="Resumo da conta">
                <StatCard label="Listas públicas" value={formatNumber(publicLists)} change="no seu Cabinet" tone="lime" icon="list" />
                <StatCard
                  label="Obras selecionadas"
                  value={formatNumber(totalItems)}
                  change="em todas as listas"
                  tone="purple"
                  icon="grid"
                />
                <StatCard label="Seguidores" value={formatNumber(data.profile.followers)} change="total do perfil" tone="blue" icon="users" />
              </section>
              <section className="section-block">
                <div className="section-heading">
                  <div>
                    <div className="eyebrow">CURADORIA</div>
                    <h2>Suas listas</h2>
                  </div>
                  <button className="text-link" onClick={() => go("lists")}>
                    Ver todas <Icon name="chevron" size={15} />
                  </button>
                </div>
                <div className="collection-grid">
                  {data.lists.slice(0, 3).map((list) => (
                    <CollectionCard
                      key={list.id}
                      list={list}
                      onOpen={() => {
                        setSelectedList(list.id);
                        setView("lists");
                      }}
                    />
                  ))}
                  <button
                    className="new-collection-card"
                    onClick={() => setModal("new-list")}
                  >
                    <span className="new-list-icon">
                      <Icon name="plus" size={20} />
                    </span>
                    <strong>Começar uma nova lista</strong>
                    <small>Crie uma seleção para sua comunidade</small>
                  </button>
                </div>
              </section>
              <section className="section-block bottom-grid">
                <div>
                  <div className="section-heading">
                    <div>
                      <div className="eyebrow">ATIVIDADE RECENTE</div>
                      <h2>O espaço está em movimento</h2>
                    </div>
                  </div>
                  <div className="activity-list">
                    {data.lists.slice(0, 3).map((list) => <Activity key={list.id} icon="list" color="purple" title={list.title} text={`${list.items.length} obras · ${list.visibility.toLowerCase()}`} time={`atualizada ${list.updatedAt}`} />)}
                    {!data.lists.length && <p className="form-help">As listas criadas aparecerão aqui.</p>}
                  </div>
                </div>
                <div className="quick-card">
                  <div className="quick-icon">
                    <Icon name="sparkle" size={20} />
                  </div>
                  <div className="eyebrow">DICA DE ESTÚDIO</div>
                  <h3>Uma boa seleção conta uma história.</h3>
                  <p>
                    Adicione notas às obras da sua lista para compartilhar o
                    olhar por trás de cada escolha.
                  </p>
                  <button
                    className="text-link"
                    onClick={() => {
                      setSelectedList(data.lists[0]?.id ?? null);
                      setView("lists");
                    }}
                  >
                    Editar uma lista <Icon name="arrow" size={14} />
                  </button>
                </div>
              </section>
            </>
          )}
          {view === "lists" && (
            <>
              {!activeList ? (
                <>
                  <div className="page-heading">
                    <div>
                      <div className="eyebrow">PUBLICAÇÃO / CURADORIA</div>
                      <h1>Listas</h1>
                      <p className="lede">
                        Seleções editoriais que aproximam leitores das suas
                        histórias.
                      </p>
                    </div>
                    <button
                      className="button button-primary"
                      onClick={() => setModal("new-list")}
                    >
                      <Icon name="plus" size={17} /> Criar lista
                    </button>
                  </div>
                  <div className="filter-row">
                    <div className="search-box">
                      <Icon name="search" size={17} />
                      <input
                        placeholder="Buscar uma lista..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                      />
                    </div>
                    <span className="results-count">
                      {data.lists.length} listas no espaço
                    </span>
                  </div>
                  <div className="collection-grid collection-grid-large">
                    {data.lists
                      .filter((list) =>
                        `${list.title} ${list.description}`
                          .toLowerCase()
                          .includes(query.toLowerCase()),
                      )
                      .map((list) => (
                        <CollectionCard
                          key={list.id}
                          list={list}
                          onOpen={() => setSelectedList(list.id)}
                        />
                      ))}
                    <button
                      className="new-collection-card"
                      onClick={() => setModal("new-list")}
                    >
                      <span className="new-list-icon">
                        <Icon name="plus" size={20} />
                      </span>
                      <strong>Nova lista</strong>
                      <small>Escolha uma capa e monte sua curadoria</small>
                    </button>
                  </div>
                </>
              ) : (
                <ListEditor
                  list={activeList}
                  source={source}
                  setSource={setSource}
                  query={query}
                  setQuery={setQuery}
                  results={catalogItems}
                  onBack={() => setSelectedList(null)}
                  onAdd={addItem}
                  onRemove={removeItem}
                  onSaveNote={saveItemNote}
                  onReorder={reorderItem}
                  onSaveList={(payload) => updateList(activeList.id, payload)}
                  shareUrl={`${publicUrl}/hq/${data.profile.handle}#lists`}
                  onDelete={deleteList}
                  searchLoading={searchLoading}
                  searchError={searchError}
                  onNotice={setNotice}
                />
              )}
            </>
          )}
          {view === "insights" && (
            <Insights
              lists={data.lists}
              totalItems={totalItems}
              publicLists={publicLists}
              followers={data.profile.followers}
            />
          )}
          {view === "profile" && (
            <ProfilePage
              profile={data.profile}
              lists={data.lists}
              onEdit={() => setModal("edit-profile")}
            />
          )}
          {view === "team" && <TeamPage members={operators} session={session} onRefresh={refresh} onNotice={setNotice} />}
          {view === "settings" && (
            <SettingsPage session={session} onRefresh={refresh} onLogout={logout} />
          )}
        </div>
      </main>
      {modal === "new-list" && (
        <NewListModal onClose={() => setModal(null)} onSubmit={createList} />
      )}
      {modal === "edit-profile" && (
        <ProfileModal
          profile={data.profile}
          onClose={() => setModal(null)}
          onSubmit={saveProfile}
        />
      )}
      {notice && (
        <div className="toast" role="status">
          <span className="toast-check">
            <Icon name="check" size={15} />
          </span>
          {notice}
        </div>
      )}
    </div>
  );
}
function StatCard({
  label,
  value,
  change,
  tone,
  icon,
}: {
  label: string;
  value: string;
  change: string;
  tone: string;
  icon: string;
}) {
  return (
    <article className="stat-card">
      <div className={`stat-icon ${tone}`}>
        <Icon name={icon} size={18} />
      </div>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      <div className={`stat-change ${tone}`}>
        <span>↗</span> {change}
      </div>
      <div className={`stat-spark ${tone}`}>
        <svg viewBox="0 0 88 28" preserveAspectRatio="none">
          <path d="M1 22 C12 19 12 18 21 19 S34 12 42 15 51 5 61 10 71 9 87 2" />
        </svg>
      </div>
    </article>
  );
}
function CollectionCard({
  list,
  onOpen,
}: {
  list: Collection;
  onOpen: () => void;
}) {
  return (
    <button className="collection-card" onClick={onOpen}>
      <div
        className="collection-cover"
        style={{
          backgroundImage: backdropBackground(list.backdrop, "linear-gradient(0deg,rgba(7,10,8,.82),rgba(7,10,8,0) 65%)"),
        }}
      >
        <span
          className={`visibility-tag ${list.visibility === "Pública" ? "public" : "private"}`}
        >
          {list.visibility === "Pública" ? "● PÚBLICA" : "◉ PRIVADA"}
        </span>
        <div className="cover-title">{list.title}</div>
      </div>
      <div className="collection-info">
        <div className="collection-info-top">
          <strong>{list.title}</strong>
          <span>{list.items.length} obras</span>
        </div>
        <p>{list.description || "Sem descrição."}</p>
        <div className="collection-foot">
          <div className="mini-covers">
            {list.items.slice(0, 3).map((entry) => (
              <img key={entry.id} src={entry.item.cover} alt="" />
            ))}
            {list.items.length > 3 && <span>+{list.items.length - 3}</span>}
          </div>
          <small>Atualizada {list.updatedAt}</small>
        </div>
      </div>
    </button>
  );
}
function Activity({
  icon,
  color,
  title,
  text,
  time,
}: {
  icon: string;
  color: string;
  title: string;
  text: string;
  time: string;
}) {
  return (
    <div className="activity-item">
      <div className={`activity-icon ${color}`}>
        <Icon name={icon} size={17} />
      </div>
      <div className="activity-copy">
        <strong>{title}</strong>
        <p>{text}</p>
      </div>
      <time>{time}</time>
    </div>
  );
}
function ListEditor({
  list,
  source,
  setSource,
  query,
  setQuery,
  results,
  searchLoading,
  searchError,
  onBack,
  onAdd,
  onRemove,
  onSaveNote,
  onReorder,
  onSaveList,
  shareUrl,
  onDelete,
  onNotice,
}: {
  list: Collection;
  source: CatalogSource;
  setSource: (source: CatalogSource) => void;
  query: string;
  setQuery: (query: string) => void;
  results: CatalogItem[];
  searchLoading: boolean;
  searchError: string;
  onBack: () => void;
  onAdd: (item: CatalogItem) => void;
  onRemove: (itemId: string) => void;
  onSaveNote: (itemId: string, notes: string) => void;
  onReorder: (id: string, direction: -1 | 1) => void;
  onSaveList: (payload: Partial<Collection>) => void;
  shareUrl: string;
  onDelete: () => void;
  onNotice: (message: string) => void;
}) {
  const [tab, setTab] = useState<"obras" | "detalhes">("obras");
  return (
    <>
      <div className="list-breadcrumb">
        <button className="text-link" onClick={onBack}>
          Listas
        </button>
        <Icon name="chevron" size={14} />
        <span>{list.title}</span>
      </div>
      <section
        className="list-hero"
        style={{
          backgroundImage: backdropBackground(list.backdrop, "linear-gradient(90deg,rgba(10,14,11,.92),rgba(10,14,11,.34))"),
        }}
      >
        <div className="list-hero-inner">
          <span className="hero-tag">
            <i /> {list.visibility.toUpperCase()} · {list.items.length} OBRAS
          </span>
          <h1>{list.title}</h1>
          <p>{list.description}</p>
          <div className="list-hero-buttons">
            <button
              className="button button-glass"
              onClick={() => setTab("detalhes")}
            >
              <Icon name="edit" size={15} /> Editar detalhes
            </button>
            <button
              className="button button-glass"
              onClick={() => {
                navigator.clipboard?.writeText(shareUrl);
                onNotice("Link público das listas copiado");
              }}
            >
              <Icon name="external" size={15} /> Compartilhar
            </button>
            <button className="button button-glass" onClick={onDelete}>
              Excluir lista
            </button>
          </div>
        </div>
      </section>
      <div className="tab-row">
        <button
          className={tab === "obras" ? "selected" : ""}
          onClick={() => setTab("obras")}
        >
          Obras <span>{list.items.length}</span>
        </button>
        <button
          className={tab === "detalhes" ? "selected" : ""}
          onClick={() => setTab("detalhes")}
        >
          Detalhes da lista
        </button>
        <div className="tab-spacer" />
          <span className="saved-indicator">
          <i /> Alterações salvas ao confirmar
        </span>
      </div>
      {tab === "obras" ? (
        <div className="list-workspace">
          <section className="list-items-panel">
            <div className="section-heading compact">
              <div>
                <div className="eyebrow">NA SUA SELEÇÃO</div>
                <h2>Obras da lista</h2>
              </div>
              <span className="results-count">Use as setas para reordenar</span>
            </div>
            {list.items.length ? (
              <div className="list-entry-stack">
                {list.items.map((entry, index) => (
                  <article className="list-entry" key={entry.id}>
                    <div className="entry-number">
                      {String(index + 1).padStart(2, "0")}
                    </div>
                    <img
                      className="entry-cover"
                      src={entry.item.cover}
                      alt={`Capa de ${entry.item.title}`}
                    />
                    <div className="entry-details">
                      <div className="entry-title-row">
                        <div>
                          <h3>{entry.item.title}</h3>
                          <p>
                            {entry.item.publisher} · {entry.item.year ? `${entry.item.year} · ` : ""}
                            {entry.item.type}
                          </p>
                        </div>
                        <div className="entry-controls">
                          <button
                            title="Mover para cima"
                            aria-label="Mover para cima"
                            disabled={index === 0}
                            onClick={() => onReorder(entry.id, -1)}
                          >
                            ↑
                          </button>
                          <button
                            title="Mover para baixo"
                            aria-label="Mover para baixo"
                            disabled={index === list.items.length - 1}
                            onClick={() => onReorder(entry.id, 1)}
                          >
                            ↓
                          </button>
                          <button
                            title="Remover da lista"
                            aria-label="Remover da lista"
                            onClick={() => onRemove(entry.id)}
                          >
                            ×
                          </button>
                        </div>
                      </div>
                      <input
                        className="entry-note"
                        aria-label={`Nota editorial para ${entry.item.title}`}
                        key={`${entry.id}:${entry.note}`}
                        defaultValue={entry.note}
                        onBlur={(event) => onSaveNote(entry.id, event.currentTarget.value)}
                        placeholder="Adicione uma nota editorial para esta obra…"
                      />
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-entries">
                <div className="empty-icon">
                  <Icon name="list" size={24} />
                </div>
                <h3>Sua lista começa aqui</h3>
                <p>Busque uma obra no catálogo e adicione à sua curadoria.</p>
              </div>
            )}
          </section>
          <aside className="catalog-panel">
            <div className="catalog-head">
              <div>
                <div className="eyebrow">EXPLORE</div>
                <h2>Adicionar obras</h2>
              </div>
              <span className="catalog-count">{results.length}</span>
            </div>
            <div className="catalog-tabs">
              <button
                className={source === "cabinet" ? "active" : ""}
                onClick={() => setSource("cabinet")}
              >
                Cabinet <span>●</span>
              </button>
              <button
                className={source === "external" ? "active" : ""}
                onClick={() => setSource("external")}
              >
                <Icon name="external" size={13} /> Catálogo externo
              </button>
            </div>
            <div className="search-box catalog-search">
              <Icon name="search" size={16} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Título, editora, série..."
              />
            </div>
            {source === "external" && (
              <div className="source-notice">
                <Icon name="globe" size={15} /> Resultados de catálogos
                parceiros
              </div>
            )}
            <div className="catalog-results">
              {searchLoading && <p className="no-results">Buscando no catálogo…</p>}
              {searchError && <p className="no-results">{searchError}</p>}
              {!searchLoading && query.trim().length < 3 && <p className="no-results">Digite ao menos 3 caracteres para buscar.</p>}
              {results.map((item) => {
                const exists = list.items.some(
                  (entry) => entry.item.id === item.id,
                );
                return (
                  <div className="catalog-result" key={item.id}>
                    <img src={item.cover} alt="" />
                    <div className="catalog-result-copy">
                      <strong>{item.title}</strong>
                      <span>
                        {item.publisher} · {item.year}
                      </span>
                      <small>{item.type}</small>
                    </div>
                    <button
                      disabled={exists}
                      aria-label={`Adicionar ${item.title}`}
                      onClick={() => onAdd(item)}
                      className={exists ? "added" : ""}
                    >
                      {exists ? (
                        <Icon name="check" size={17} />
                      ) : (
                        <Icon name="plus" size={17} />
                      )}
                    </button>
                  </div>
                );
              })}
              {!results.length && (
                <p className="no-results">
                  Nenhuma obra encontrada. Tente outro termo.
                </p>
              )}
            </div>
            <button
              className="text-link catalog-link"
              onClick={() => {
                setSource(source === "cabinet" ? "external" : "cabinet");
                setQuery("");
              }}
            >
              Buscar em {source === "cabinet" ? "outro catálogo" : "Cabinet"}{" "}
              <Icon name="arrow" size={13} />
            </button>
          </aside>
        </div>
      ) : (
        <ListDetails list={list} onSave={onSaveList} />
      )}
    </>
  );
}
function ListDetails({
  list,
  onSave,
}: {
  list: Collection;
  onSave: (payload: Partial<Collection>) => void;
}) {
  const [title, setTitle] = useState(list.title);
  const [description, setDescription] = useState(list.description);
  const [richText, setRichText] = useState(list.richText);
  const [backdrop, setBackdrop] = useState(list.backdrop);
  const [visibility, setVisibility] = useState(list.visibility);
  const save = () => {
    onSave({
      title,
      description,
      richText,
      backdrop,
      visibility,
    });
  };
  return (
    <div className="details-layout">
      <section className="form-card">
        <div className="section-heading compact">
          <div>
            <div className="eyebrow">APRESENTAÇÃO</div>
            <h2>Detalhes da lista</h2>
          </div>
        </div>
        <label className="field-label">
          Nome da lista
          <input
            value={title}
            maxLength={100}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>
        <label className="field-label">
          Descrição curta
          <input
            value={description}
            maxLength={180}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Uma frase para apresentar sua seleção"
          />
        </label>
        <div className="field-label">
          Texto editorial{" "}
          <span className="field-hint">
            Formate o texto que aparece na página da lista
          </span>
          <RichTextEditor
            value={richText}
            onChange={setRichText}
            placeholder="Conte o contexto da seleção, suas referências e o que conecta estas obras…"
          />
        </div>
        <div className="field-label">
          Visibilidade
          <select
            value={visibility}
            onChange={(e) =>
              setVisibility(e.target.value as Collection["visibility"])
            }
          >
            <option>Pública</option>
            <option>Privada</option>
          </select>
        </div>
        <button className="button button-primary" onClick={save}>
          Salvar alterações
        </button>
      </section>
      <aside className="form-card backdrop-card">
        <div className="eyebrow">IMAGEM DE CAPA</div>
        <h2>Escolha um clima</h2>
        <p className="form-help">A capa dá o tom da sua seleção.</p>
        <MediaBackdropPicker value={backdrop} onChange={setBackdrop} />
        <div
          className="backdrop-preview"
          style={{
            backgroundImage: backdropBackground(backdrop, "linear-gradient(0deg,rgba(0,0,0,.7),transparent)"),
          }}
        >
          <span>PRÉVIA DA CAPA</span>
          <strong>{title || "Nome da lista"}</strong>
        </div>
        <div className="form-callout">
          <Icon name="sparkle" size={17} />
          <p>
            Listas com uma apresentação pessoal ajudam leitores a descobrir
            novas histórias.
          </p>
        </div>
      </aside>
    </div>
  );
}
function Insights({
  lists,
  totalItems,
  publicLists,
  followers,
}: {
  lists: Collection[];
  totalItems: number;
  publicLists: number;
  followers: number;
}) {
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">DADOS DO CABINET</div>
          <h1>Estatísticas</h1>
          <p className="lede">Resumo atual do perfil e das listas conectadas.</p>
        </div>
        <button className="button button-secondary" onClick={() => window.print()}>
          <Icon name="download" size={16} /> Exportar relatório
        </button>
      </div>
      <section className="stats-grid stats-grid-large">
        <StatCard label="Seguidores" value={formatNumber(followers)} change="total do perfil" tone="lime" icon="users" />
        <StatCard label="Listas públicas" value={formatNumber(publicLists)} change="visíveis no perfil" tone="purple" icon="list" />
        <StatCard label="Obras selecionadas" value={formatNumber(totalItems)} change="somadas nas listas" tone="orange" icon="grid" />
        <StatCard label="Total de listas" value={formatNumber(lists.length)} change="públicas e privadas" tone="blue" icon="chart" />
      </section>
      <section className="insight-card data-availability-card">
        <div className="eyebrow">ALCANCE DO PERFIL</div>
        <h2>Visitas e evolução</h2>
        <p>O Cabinet ainda não disponibiliza métricas de visitas ou histórico de seguidores para este painel. Os números acima são lidos diretamente do perfil e das listas.</p>
      </section>
      <section className="section-block list-stats-block">
        <div className="section-heading">
          <div><div className="eyebrow">CATÁLOGO</div><h2>Listas do espaço</h2></div>
        </div>
        <div className="stats-table">
          <div className="table-head"><span>LISTA</span><span>OBRAS</span><span>VISIBILIDADE</span><span>ATUALIZADA</span></div>
          {lists.map((list) => (
            <div className="table-row" key={list.id}>
              <strong>{list.title}</strong><span>{list.items.length}</span>
              <span><i className={`status-dot ${list.visibility === "Pública" ? "public" : ""}`} />{list.visibility}</span>
              <span>{list.updatedAt}</span>
            </div>
          ))}
          {!lists.length && <p className="form-help">Ainda não há listas cadastradas neste Cabinet.</p>}
        </div>
      </section>
    </>
  );
}
function ProfilePage({
  profile,
  lists,
  onEdit,
}: {
  profile: Profile;
  lists: Collection[];
  onEdit: () => void;
}) {
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">PRESENÇA / PÁGINA PÚBLICA</div>
          <h1>Seu perfil</h1>
          <p className="lede">
            Conte ao mundo quem está por trás das histórias.
          </p>
        </div>
        <button className="button button-primary" onClick={onEdit}>
          <Icon name="edit" size={16} /> Editar perfil
        </button>
      </div>
      <section
        className="public-preview"
        style={{
          backgroundImage: backdropBackground(profile.backdrop, "linear-gradient(90deg,rgba(10,14,11,.91),rgba(10,14,11,.15))"),
        }}
      >
        <div className="preview-content">
          <span className="hero-tag">
            <i /> VISUALIZAÇÃO DO PERFIL
          </span>
          <div className="preview-profile">
            <div className="preview-avatar">
              {profile.avatar ? (
                <img src={profile.avatar} alt="" />
              ) : (
                initialName(profile.name)
              )}
            </div>
            <div>
              <h2>
                {profile.name}
                {profile.verified && <span className="verified-mark">✓</span>}
              </h2>
              <p>@{profile.handle} · {profile.claimStatus === "CLAIMED" ? "HQ verificada" : "Perfil Cabinet"}</p>
            </div>
          </div>
          <p className="preview-bio">{profile.bio}</p>
          <button className="button button-acid" onClick={onEdit}>
            Personalizar página <Icon name="arrow" size={15} />
          </button>
        </div>
      </section>
      <section className="profile-detail-grid">
        <article className="profile-detail-card">
          <div className="eyebrow">SOBRE</div>
          <h2>Uma editora com histórias para contar.</h2>
          <p>{profile.bio}</p>
          {profile.website && (
            <a
              href={`https://${profile.website.replace(/^https?:\/\//, "")}`}
              target="_blank"
              rel="noreferrer"
            >
              {profile.website} <Icon name="external" size={13} />
            </a>
          )}
        </article>
        <article className="profile-detail-card">
          <div className="eyebrow">PUBLICAÇÕES</div>
          <h2>
            {lists.filter((list) => list.visibility === "Pública").length}{" "}
            listas públicas
          </h2>
          <p>
            {lists.reduce(
              (count, list) =>
                count + (list.visibility === "Pública" ? list.items.length : 0),
              0,
            )}{" "}
            obras compartilhadas com a comunidade.
          </p>
          <div className="profile-list-chips">
            {lists
              .filter((list) => list.visibility === "Pública")
              .map((list) => (
                <span key={list.id}>
                  {list.title} · {list.items.length}
                </span>
              ))}
          </div>
        </article>
      </section>
    </>
  );
}
function TeamPage({
  members, session, onRefresh, onNotice,
}: {
  members: Operator[];
  session: HqSession;
  onRefresh: () => void;
  onNotice: (message: string) => void;
}) {
  const [inviteOpen, setInviteOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const canManage = session.role === "OWNER";
  const canView = session.role === "OWNER" || session.role === "ADMIN";
  async function addMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    try {
      await apiMutation<Operator>("/v1/hq-console/operators", { method: "POST", body: JSON.stringify({ email: String(form.get("email")).trim(), displayName: String(form.get("displayName")).trim(), password: String(form.get("password")), role: String(form.get("role")) }) });
      setInviteOpen(false); onNotice("Acesso criado no Cabinet"); onRefresh();
    } catch (error) { onNotice(apiMessage(error)); }
    finally { setBusy(false); }
  }
  async function removeMember(member: Operator) {
    if (!canManage) return;
    try {
      await apiMutation<void>(`/v1/hq-console/operators/${member.id}`, { method: "DELETE" });
      onNotice("Acesso removido"); onRefresh();
    } catch (error) { onNotice(apiMessage(error)); }
  }
  return (
    <>
      <div className="page-heading">
        <div><div className="eyebrow">GERENCIAMENTO / ACESSOS</div><h1>Equipe</h1><p className="lede">Pessoas e permissões cadastradas neste Cabinet.</p></div>
        {canManage && <button className="button button-primary" onClick={() => setInviteOpen(!inviteOpen)}><Icon name="plus" size={16} /> Adicionar pessoa</button>}
      </div>
      {inviteOpen && canManage && <form className="invite-form" onSubmit={addMember}>
        <div><strong>Adicionar operador</strong><p>A senha inicial precisa ter pelo menos 12 caracteres.</p></div>
        <input name="displayName" required placeholder="Nome completo" />
        <input name="email" type="email" required placeholder="nome@editora.com" />
        <input name="password" type="password" minLength={12} required placeholder="Senha inicial (mín. 12 caracteres)" />
        <select name="role" defaultValue="EDITOR"><option value="ADMIN">Administrador</option><option value="EDITOR">Editor</option><option value="ANALYST">Analista</option></select>
        <button className="button button-primary" disabled={busy}>{busy ? "Salvando…" : "Criar acesso"}</button>
      </form>}
      <section className="team-card">
        <div className="team-card-head"><div><h2>Pessoas com acesso</h2><p>{canView ? `${members.length} integrantes cadastrados` : "A lista de operadores exige acesso de administração."}</p></div><button className="button button-secondary" onClick={onRefresh}>Atualizar</button></div>
        {canView && members.map((member) => {
          const role = { OWNER: "Proprietário", ADMIN: "Administrador", EDITOR: "Editor", ANALYST: "Analista" }[member.role];
          return <div className="team-member" key={member.id}>
            <div className="member-avatar green">{initialName(member.displayName)}</div>
            <div className="member-info"><strong>{member.displayName}</strong><span>{member.email}</span></div>
            <span className={`role-tag ${member.role === "OWNER" || member.role === "ADMIN" ? "admin" : ""}`}>{role}</span>
            <span className={`status-dot ${member.active ? "public" : ""}`} title={member.active ? "Ativo" : "Inativo"} />
            {canManage && member.id !== session.operatorId && member.active && <button className="icon-button" aria-label={`Remover ${member.displayName}`} onClick={() => removeMember(member)}><Icon name="close" /></button>}
          </div>;
        })}
        {canView && members.length === 0 && <p className="form-help">Nenhum operador cadastrado.</p>}
      </section>
      <div className="permission-note"><Icon name="sparkle" size={18} /><p><strong>Permissões do Cabinet.</strong> Proprietários gerenciam acessos. Administradores e proprietários podem ver a equipe; permissões de edição de listas são aplicadas pela API.</p></div>
    </>
  );
}
function SettingsPage({ session, onRefresh, onLogout }: { session: HqSession; onRefresh: () => void; onLogout: () => void }) {
  return (
    <>
      <div className="page-heading"><div><div className="eyebrow">GERENCIAMENTO / CONTA</div><h1>Configurações</h1><p className="lede">Sessão e conexão com o Cabinet.</p></div></div>
      <section className="settings-card">
        <div className="settings-section"><div><h2>Conta conectada</h2><p>{session.displayName} · {session.email}</p></div><span className="role-tag admin">{{ OWNER: "Proprietário", ADMIN: "Administrador", EDITOR: "Editor", ANALYST: "Analista" }[session.role]}</span></div>
        <div className="settings-section"><div><h2>Espaço Cabinet</h2><p>Perfil, listas e catálogo são carregados da API Cabinet.</p></div><button className="button button-secondary" onClick={onRefresh}>Atualizar dados</button></div>
        <div className="settings-section"><div><h2>Sessão</h2><p>Encerre a sessão deste navegador.</p></div><button className="button button-secondary" onClick={onLogout}>Sair da conta</button></div>
      </section>
      <div className="storage-note"><span className="storage-dot" /><div><strong>Conectado à API</strong><p>As alterações de perfil, listas e equipe são gravadas no Cabinet.</p></div></div>
    </>
  );
}
function ProfileModal({
  profile,
  onClose,
  onSubmit,
}: {
  profile: Profile;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const [backdrop, setBackdrop] = useState(profile.backdrop);
  return (
    <Modal
      title="Personalizar perfil"
      subtitle="Deixe a página da sua HQ com a sua cara."
      onClose={onClose}
    >
      <form onSubmit={onSubmit} className="modal-form">
        <label className="field-label">
          Nome público
          <input
            name="name"
            required
            maxLength={80}
            defaultValue={profile.name}
          />
        </label>
        <label className="field-label">
          Identificador público
          <div className="handle-input">
            <span>@</span>
            <input
              name="handle"
              required
              maxLength={32}
              defaultValue={profile.handle}
              readOnly
            />
          </div>
        </label>
        <label className="field-label">
          Apresentação
          <textarea
            name="bio"
            maxLength={280}
            rows={3}
            defaultValue={profile.bio}
          />
          <span className="field-hint">Até 280 caracteres.</span>
        </label>
        <label className="field-label">
          Site oficial
          <input
            name="website"
            defaultValue={profile.website}
            placeholder="marealta.com.br"
          />
        </label>
        <label className="field-label">
          URL do avatar
          <input
            name="avatar"
            type="url"
            defaultValue={profile.avatar}
            placeholder="https://..."
          />
          <span className="field-hint">
            Cole o endereço de uma imagem pública para o logo.
          </span>
        </label>
        <div className="field-label">
          Imagem de capa
          <span className="field-hint">
            Busque uma mídia no catálogo e use sua imagem na página pública.
          </span>
          <input type="hidden" name="backdrop" value={backdrop} />
          <MediaBackdropPicker value={backdrop} onChange={setBackdrop} />
        </div>
        <div className="modal-actions">
          <button
            type="button"
            className="button button-secondary"
            onClick={onClose}
          >
            Cancelar
          </button>
          <button className="button button-primary">Salvar perfil</button>
        </div>
      </form>
    </Modal>
  );
}
function NewListModal({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const [backdrop, setBackdrop] = useState("");
  const [richText, setRichText] = useState("");
  return (
    <Modal
      title="Criar uma lista"
      subtitle="Uma seleção é o começo de uma boa conversa."
      onClose={onClose}
    >
      <form onSubmit={onSubmit} className="modal-form">
        <label className="field-label">
          Nome da lista
          <input
            name="title"
            required
            autoFocus
            maxLength={100}
            placeholder="Ex.: Leituras para dias chuvosos"
          />
        </label>
        <label className="field-label">
          Descrição curta
          <input
            name="description"
            maxLength={180}
            placeholder="O que une estas histórias?"
          />
        </label>
        <div className="field-label">
          Texto editorial{" "}
          <span className="field-hint">
            Você pode formatar a apresentação depois.
          </span>
          <RichTextEditor
            value={richText}
            onChange={setRichText}
            placeholder="Conte um pouco mais sobre a seleção…"
          />
          <input type="hidden" name="richText" value={richText} />
        </div>
        <input type="hidden" name="backdrop" value={backdrop} />
        <div className="field-label">
          Escolha uma capa
          <MediaBackdropPicker value={backdrop} onChange={setBackdrop} />
        </div>
        <label className="field-label">
          Visibilidade
          <select name="visibility">
            <option value="Pública">Pública</option>
            <option value="Privada">Privada</option>
          </select>
        </label>
        <div className="modal-actions">
          <button
            type="button"
            className="button button-secondary"
            onClick={onClose}
          >
            Cancelar
          </button>
          <button className="button button-primary">
            <Icon name="plus" size={16} /> Criar lista
          </button>
        </div>
      </form>
    </Modal>
  );
}
function Modal({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string;
  subtitle: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div
      className="modal-scrim"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <header className="modal-head">
          <div>
            <div className="eyebrow">CABINET STUDIO</div>
            <h2 id="modal-title">{title}</h2>
            <p>{subtitle}</p>
          </div>
          <button className="icon-button" aria-label="Fechar" onClick={onClose}>
            <Icon name="close" />
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}
export default App;
