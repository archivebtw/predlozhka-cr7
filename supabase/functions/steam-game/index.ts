import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
  });
}

function extractAppId(value: unknown): string | null {
  const text = String(value ?? "").trim();
  if (/^\d{1,12}$/.test(text)) return text;
  try {
    const url = new URL(text);
    const match = url.pathname.match(/\/app\/(\d+)/i);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

function cleanText(value: unknown): string {
  return String(value ?? "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isoDate(year: number, month: number, day = 1): string | null {
  if (!Number.isInteger(year) || year < 1970 || year > 2200) return null;
  if (!Number.isInteger(month) || month < 1 || month > 12) return null;
  if (!Number.isInteger(day) || day < 1 || day > 31) return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return `${year.toString().padStart(4, "0")}-${month.toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
}

const ruMonths: Record<string, number> = {
  янв: 1, январь: 1, января: 1,
  фев: 2, февр: 2, февраль: 2, февраля: 2,
  мар: 3, март: 3, марта: 3,
  апр: 4, апрель: 4, апреля: 4,
  май: 5, мая: 5,
  июн: 6, июнь: 6, июня: 6,
  июл: 7, июль: 7, июля: 7,
  авг: 8, август: 8, августа: 8,
  сен: 9, сент: 9, сентябрь: 9, сентября: 9,
  окт: 10, октябрь: 10, октября: 10,
  ноя: 11, нояб: 11, ноябрь: 11, ноября: 11,
  дек: 12, декабрь: 12, декабря: 12,
};

const enMonths: Record<string, number> = {
  jan: 1, january: 1,
  feb: 2, february: 2,
  mar: 3, march: 3,
  apr: 4, april: 4,
  may: 5,
  jun: 6, june: 6,
  jul: 7, july: 7,
  aug: 8, august: 8,
  sep: 9, sept: 9, september: 9,
  oct: 10, october: 10,
  nov: 11, november: 11,
  dec: 12, december: 12,
};

function normalizeWord(value: string): string {
  return value.toLocaleLowerCase("ru-RU").replace(/[.,]/g, "").trim();
}

function parseSteamDate(rawValue: unknown) {
  const raw = String(rawValue ?? "").trim();
  if (!raw) return { iso: null, precision: "unknown", approximate: true };
  const normalized = raw.toLocaleLowerCase("ru-RU").replace(/\s+/g, " ").trim();

  let match = normalized.match(/^(\d{1,2})\s+([a-zа-яё.]+)\s+(\d{4})/i);
  if (match) {
    const monthWord = normalizeWord(match[2]);
    const month = ruMonths[monthWord] ?? enMonths[monthWord];
    const iso = month ? isoDate(Number(match[3]), month, Number(match[1])) : null;
    if (iso) return { iso, precision: "day", approximate: false };
  }

  match = normalized.match(/^([a-z]+)\s+(\d{1,2}),?\s+(\d{4})/i);
  if (match) {
    const month = enMonths[normalizeWord(match[1])];
    const iso = month ? isoDate(Number(match[3]), month, Number(match[2])) : null;
    if (iso) return { iso, precision: "day", approximate: false };
  }

  match = normalized.match(/(?:q\s*([1-4])|([1-4])(?:-?й)?\s*квартал)\D*(\d{4})/i);
  if (match) {
    const quarter = Number(match[1] ?? match[2]);
    const year = Number(match[3]);
    return { iso: isoDate(year, (quarter - 1) * 3 + 1), precision: "quarter", approximate: true };
  }

  const seasons: Record<string, number> = {
    winter: 1, зима: 1,
    spring: 3, весна: 3,
    summer: 6, лето: 6,
    autumn: 9, fall: 9, осень: 9,
  };
  match = normalized.match(/^(winter|spring|summer|autumn|fall|зима|весна|лето|осень)\s+(\d{4})/i);
  if (match) {
    return { iso: isoDate(Number(match[2]), seasons[normalizeWord(match[1])]), precision: "season", approximate: true };
  }

  match = normalized.match(/^([a-zа-яё.]+)\s+(\d{4})/i);
  if (match) {
    const word = normalizeWord(match[1]);
    const month = ruMonths[word] ?? enMonths[word];
    const iso = month ? isoDate(Number(match[2]), month) : null;
    if (iso) return { iso, precision: "month", approximate: true };
  }

  match = normalized.match(/\b(20\d{2}|21\d{2})\b/);
  if (match) return { iso: isoDate(Number(match[1]), 1, 1), precision: "year", approximate: true };

  return { iso: null, precision: "unknown", approximate: true };
}

type SteamGame = Record<string, any>;
type CoopType = "" | "generic" | "online" | "local" | "mixed";

type PlayerCandidate = {
  min: number;
  max: number;
  score: number;
  source: string;
};

function categoryInfo(game: SteamGame | null | undefined) {
  const categories = Array.isArray(game?.categories) ? game.categories : [];
  const ids = new Set<number>();
  const labels: string[] = [];
  for (const item of categories) {
    const id = Number(item?.id);
    if (Number.isFinite(id)) ids.add(id);
    const label = cleanText(item?.description).toLocaleLowerCase("ru-RU");
    if (label) labels.push(label);
  }
  return { ids, labels };
}

function collectDescriptionText(game: SteamGame | null | undefined): string {
  return [
    game?.short_description,
    game?.detailed_description,
    game?.about_the_game,
  ].map(cleanText).filter(Boolean).join(". ");
}

function normalizePlayerRange(minValue: number, maxValue: number): { min: number; max: number } | null {
  let min = Math.trunc(minValue);
  let max = Math.trunc(maxValue);
  if (!Number.isFinite(min) || !Number.isFinite(max)) return null;
  if (min > max) [min, max] = [max, min];
  if (max < 2 || max > 64) return null;
  min = Math.max(2, Math.min(min, max));
  return { min, max };
}

function addCandidate(candidates: PlayerCandidate[], min: number, max: number, score: number, source: string) {
  const normalized = normalizePlayerRange(min, max);
  if (!normalized) return;
  candidates.push({ ...normalized, score, source });
}

function replacePlayerNumberWords(value: string): string {
  const words: Record<string, number> = {
    one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
    eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16,
    один: 1, одного: 1, одна: 1, двое: 2, два: 2, двух: 2, трое: 3, три: 3, трех: 3, трёх: 3,
    четверо: 4, четыре: 4, четырех: 4, четырёх: 4, пять: 5, пяти: 5, шесть: 6, шести: 6,
    семь: 7, семи: 7, восемь: 8, восьми: 8, девять: 9, девяти: 9, десять: 10, десяти: 10
  };
  return value.replace(/[a-zа-яё]+/giu, word => String(words[word.toLocaleLowerCase('ru-RU')] ?? word));
}

function detectPlayerCount(text: string, isCoop: boolean): PlayerCandidate | null {
  if (!isCoop || !text) return null;
  const candidates: PlayerCandidate[] = [];
  const segments = replacePlayerNumberWords(text)
    .replace(/[•·|]/g, ".")
    .split(/(?<=[.!?;])\s+|\n+/)
    .map(part => part.trim())
    .filter(Boolean);

  const coopWord = /\bco[ -]?op\b|cooperative|кооператив\w*/iu;
  const playerWord = /players?|player|игрок(?:а|ов)?|человек/iu;

  for (const segment of segments) {
    if (!playerWord.test(segment)) continue;
    const hasCoopContext = coopWord.test(segment);

    for (const match of segment.matchAll(/(\d{1,2})\s*(?:-|–|—|to|до)\s*(\d{1,2})\s*(?:players?|player|игрок(?:а|ов)?|человек)/giu)) {
      addCandidate(candidates, Number(match[1]), Number(match[2]), hasCoopContext ? 7 : 3, "steam_description_range");
    }

    for (const match of segment.matchAll(/(?:up\s+to|до)\s*(\d{1,2})\s*(?:players?|player|игрок(?:а|ов)?|человек)/giu)) {
      addCandidate(candidates, 2, Number(match[1]), hasCoopContext ? 7 : 5, "steam_description_up_to");
    }

    for (const match of segment.matchAll(/(?:with\s+up\s+to|с\s+до)\s*(\d{1,2})\s*(?:friends?|друз(?:ьями|ей))/giu)) {
      addCandidate(candidates, 2, Number(match[1]) + 1, hasCoopContext ? 8 : 6, "steam_description_friends_plus_player");
    }

    for (const match of segment.matchAll(/(?:team|squad|команд(?:а|е|ой))[^.!?;]{0,24}?(?:up\s+to|до)\s*(\d{1,2})/giu)) {
      addCandidate(candidates, 2, Number(match[1]), hasCoopContext ? 7 : 5, "steam_description_team_size");
    }

    for (const match of segment.matchAll(/(\d{1,2})\s*[- ]?(?:players?|player|игрок(?:а|ов)?|человек)\s*(?:online\s+|local\s+)?(?:co[ -]?op|cooperative|кооператив\w*)/giu)) {
      addCandidate(candidates, 2, Number(match[1]), 8, "steam_description_coop_count");
    }

    for (const match of segment.matchAll(/(?:co[ -]?op|cooperative|кооператив\w*)[^.!?;]{0,60}?(?:for|на|до)?\s*(\d{1,2})\s*(?:players?|player|игрок(?:а|ов)?|человек)/giu)) {
      addCandidate(candidates, 2, Number(match[1]), 8, "steam_description_coop_count");
    }

    if (hasCoopContext) {
      for (const match of segment.matchAll(/\b(\d{1,2})\s*(?:players?|player|игрок(?:а|ов)?|человек)\b/giu)) {
        addCandidate(candidates, 2, Number(match[1]), 4, "steam_description_near_coop");
      }
    }
  }

  if (!candidates.length) return null;
  candidates.sort((a, b) => b.score - a.score || b.max - a.max || a.min - b.min);
  return candidates[0];
}

function detectCoop(gameRu: SteamGame, gameEn: SteamGame) {
  const ru = categoryInfo(gameRu);
  const en = categoryInfo(gameEn);
  const ids = new Set<number>([...ru.ids, ...en.ids]);
  const labels = [...ru.labels, ...en.labels].join(" | ");

  const hasGeneric = ids.has(9) || /\bco[ -]?op\b|cooperative|кооператив/iu.test(labels);
  const hasOnline = ids.has(38) || /online\s+co[ -]?op|онлайн[^|]{0,20}кооператив|кооператив[^|]{0,20}(?:по сети|онлайн)/iu.test(labels);
  const hasLocal = ids.has(39) || ids.has(44) || ((ids.has(24) || /shared|split screen|раздел.*экран|общ.*экран/iu.test(labels)) && hasGeneric)
    || /local\s+co[ -]?op|remote play together|локальн[^|]{0,20}кооператив/iu.test(labels);

  const isCoop = hasGeneric || hasOnline || hasLocal;
  let type: CoopType = "";
  if (hasOnline && hasLocal) type = "mixed";
  else if (hasOnline) type = "online";
  else if (hasLocal) type = "local";
  else if (isCoop) type = "generic";

  const text = `${collectDescriptionText(gameRu)}. ${collectDescriptionText(gameEn)}`;
  const playerCount = detectPlayerCount(text, isCoop);

  return {
    isCoop,
    coopType: type,
    coopMinPlayers: playerCount?.min ?? null,
    coopMaxPlayers: playerCount?.max ?? null,
    coopSource: isCoop
      ? (playerCount ? `${playerCount.source}+steam_categories` : "steam_categories")
      : "steam_categories",
  };
}

async function fetchSteamGame(appId: string, language: "russian" | "english") {
  const endpoint = `https://store.steampowered.com/api/appdetails?appids=${encodeURIComponent(appId)}&l=${language}&cc=ru`;
  const response = await fetch(endpoint, {
    headers: {
      "Accept": "application/json",
      "User-Agent": "CR7-Suggestion-Site/1.1",
    },
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(`Steam (${language}) ответил с кодом ${response.status}.`);
  const payload = await response.json();
  const entry = payload?.[appId];
  if (!entry?.success || !entry?.data) throw new Error(`Steam (${language}) не вернул информацию об игре.`);
  return entry.data as SteamGame;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Используй POST-запрос." }, 405);

  try {
    const authorization = req.headers.get("Authorization") ?? "";
    const token = authorization.replace(/^Bearer\s+/i, "").trim();
    if (!token) return jsonResponse({ error: "Требуется вход администратора." }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (!supabaseUrl || !supabaseAnonKey) return jsonResponse({ error: "Переменные Supabase недоступны функции." }, 500);

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user) return jsonResponse({ error: "Сессия истекла. Войди заново." }, 401);

    const { data: isAdmin, error: adminError } = await supabase.rpc("is_site_admin");
    if (adminError || isAdmin !== true) return jsonResponse({ error: "У аккаунта нет прав администратора." }, 403);

    const body = await req.json().catch(() => ({}));
    const appId = extractAppId(body?.steamUrl ?? body?.appId);
    if (!appId) return jsonResponse({ error: "Не удалось определить Steam App ID из ссылки." }, 400);

    const [ruResult, enResult] = await Promise.allSettled([
      fetchSteamGame(appId, "russian"),
      fetchSteamGame(appId, "english"),
    ]);

    const gameRu = ruResult.status === "fulfilled" ? ruResult.value : null;
    const gameEn = enResult.status === "fulfilled" ? enResult.value : null;
    const game = gameRu ?? gameEn;
    if (!game) {
      const ruError = ruResult.status === "rejected" ? String(ruResult.reason?.message ?? ruResult.reason) : "";
      const enError = enResult.status === "rejected" ? String(enResult.reason?.message ?? enResult.reason) : "";
      return jsonResponse({ error: `Steam не вернул данные игры. ${ruError || enError}`.trim() }, 502);
    }

    const releaseDateText = String(game.release_date?.date ?? "").trim();
    const parsedDate = parseSteamDate(releaseDateText);
    const coop = detectCoop(gameRu ?? game, gameEn ?? game);

    return jsonResponse({
      appId: Number(appId),
      title: cleanText(game.name),
      description: cleanText(game.short_description),
      coverUrl: String(game.header_image ?? game.capsule_image ?? "").trim(),
      comingSoon: Boolean(game.release_date?.coming_soon),
      releaseDate: parsedDate.iso,
      releaseDateText,
      releaseDatePrecision: parsedDate.precision,
      releaseDateApproximate: parsedDate.approximate,
      steamUrl: `https://store.steampowered.com/app/${appId}/`,
      ...coop,
    });
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : "Неизвестная ошибка.";
    return jsonResponse({ error: `Не удалось получить данные Steam: ${message}` }, 500);
  }
});
