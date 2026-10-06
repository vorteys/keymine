import type { ErrorMode, Language } from "@/db/types";
import { createRng } from "@/lib/text/rng";
import { BotTimeline, isBotLevel, type BotLevelName } from "./bots";
import {
  appendWords,
  BONUS_KINDS,
  BONUS_LABELS,
  BONUS_WORDS,
  CHECKPOINTS,
  findLaggards,
  findLeader,
  FOG_DURATION_MS,
  MAX_BONUSES_PER_PLAYER,
  removeUpcomingWords,
  wordsAfterCurrent,
  type BonusKind,
  type BonusRecord,
} from "./bonus";
import {
  accuracy as accuracyOf,
  BURST_ALLOWANCE_CHARS,
  MAX_CHARS_PER_SECOND,
  netWpm,
  rawWpm,
} from "./metrics";

// Moteur de course : toute la logique d'une course (progression, rejet des
// progressions impossibles, bots, bonus, fin et classement) sans entrée/sortie
// ni horloge propre — `now` est toujours fourni. Il est donc testable
// unitairement (BOT-05) et le serveur temps réel n'est qu'une fine couche
// autour (COURSE-06 : le serveur est la source de vérité).

export type RacerStatus = "racing" | "finished" | "timeout" | "abandoned";

export type EngineConfig = {
  seed: number;
  startsAtMs: number;
  durationMs: number;
  errorMode: ErrorMode;
  comebackBonus: boolean;
  language: Language;
  /** Mots que le bonus « +3 mots » peut ajouter. */
  wordPool: readonly string[];
  /** Délai de reconnexion avant abandon (COURSE-08). */
  disconnectGraceMs?: number;
};

export type RacerInit = {
  id: string;
  name: string;
  text: string;
  isBot?: boolean;
  botLevel?: BotLevelName | null;
  userId?: string | null;
  guestId?: string | null;
};

export type Racer = {
  id: string;
  name: string;
  isBot: boolean;
  botLevel: BotLevelName | null;
  userId: string | null;
  guestId: string | null;
  text: string;
  progress: number;
  errors: number;
  status: RacerStatus;
  /** Instant (ms, horloge serveur) de l'arrivée, de l'abandon ou de la fin du temps. */
  endedAtMs: number | null;
  keyCorrect: Record<string, number>;
  keyErrors: Record<string, number>;
  bonuses: BonusRecord[];
  fogUntilMs: number;
  disconnectedAtMs: number | null;
  lastUpdateMs: number;
  lastTextChangeMs: number;
  /** Série du MPM net, un point par seconde (RES-03). */
  series: { t: number; wpm: number }[];
  rank: number | null;
  bot: BotTimeline | null;
};

export type ProgressInput = {
  progressChars: number;
  errorCount: number;
  keyCorrect?: Record<string, number>;
  keyErrors?: Record<string, number>;
};

export type ProgressResult =
  | { ok: true }
  | { ok: false; reason: "not_racing" | "not_started" | "backwards" | "too_long" | "impossible_jump" | "unknown_racer" };

export type EngineEvent =
  | { type: "bonus"; bonus: BonusRecord; label: string }
  | { type: "text"; racerId: string; text: string; progress: number }
  | { type: "finished"; racerId: string }
  | { type: "abandoned"; racerId: string; reason: "player" | "disconnected" };

export type RacerView = {
  id: string;
  name: string;
  isBot: boolean;
  botLevel: BotLevelName | null;
  progress: number;
  textLength: number;
  fraction: number;
  wpm: number;
  accuracy: number;
  errors: number;
  status: RacerStatus;
  rank: number;
  fogUntilMs: number;
  bonusCount: number;
};

export type RacerResult = {
  id: string;
  name: string;
  isBot: boolean;
  botLevel: BotLevelName | null;
  userId: string | null;
  guestId: string | null;
  rank: number;
  status: RacerStatus;
  progress: number;
  textLength: number;
  errors: number;
  wpm: number;
  rawWpm: number;
  accuracy: number;
  timeMs: number;
  bonuses: BonusRecord[];
  series: { t: number; wpm: number }[];
  keyCorrect: Record<string, number>;
  keyErrors: Record<string, number>;
};

const SERIES_STEP_MS = 1_000;
const DEFAULT_GRACE_MS = 30_000;
const TEXT_CHANGE_TOLERANCE_MS = 2_000;

export class RaceEngine {
  readonly racers = new Map<string, Racer>();
  private readonly rng: () => number;
  private readonly triggered = new Set<number>();
  private lastSeriesMs = 0;
  private finalized = false;

  constructor(
    readonly config: EngineConfig,
    inits: readonly RacerInit[],
  ) {
    this.rng = createRng(config.seed);
    inits.forEach((init, index) => {
      const botLevel = init.isBot && init.botLevel && isBotLevel(init.botLevel) ? init.botLevel : null;
      this.racers.set(init.id, {
        id: init.id,
        name: init.name,
        isBot: !!init.isBot,
        botLevel,
        userId: init.userId ?? null,
        guestId: init.guestId ?? null,
        text: init.text,
        progress: 0,
        errors: 0,
        status: "racing",
        endedAtMs: null,
        keyCorrect: {},
        keyErrors: {},
        bonuses: [],
        fogUntilMs: 0,
        disconnectedAtMs: null,
        lastUpdateMs: config.startsAtMs,
        lastTextChangeMs: -Infinity,
        series: [],
        rank: null,
        bot: botLevel
          ? new BotTimeline(botLevel, config.seed * 1_000 + index + 1, init.text, config.errorMode)
          : null,
      });
    });
  }

  get isFinalized(): boolean {
    return this.finalized;
  }

  get endsAtMs(): number {
    return this.config.startsAtMs + this.config.durationMs;
  }

  private list(): Racer[] {
    return [...this.racers.values()];
  }

  private fraction(r: Racer): number {
    return r.text.length === 0 ? 1 : Math.min(1, r.progress / r.text.length);
  }

  /** Participants encore en course. */
  private racing(): Racer[] {
    return this.list().filter((r) => r.status === "racing");
  }

  // ---- Entrées des joueurs ----

  /** COURSE-06 : valide et applique l'avancement annoncé par un joueur humain. */
  applyProgress(id: string, input: ProgressInput, now: number): ProgressResult {
    const r = this.racers.get(id);
    if (!r || r.isBot) return { ok: false, reason: "unknown_racer" };
    if (r.status !== "racing" || this.finalized) return { ok: false, reason: "not_racing" };
    if (now < this.config.startsAtMs) return { ok: false, reason: "not_started" };

    let progress = input.progressChars;
    if (progress < r.progress) return { ok: false, reason: "backwards" };
    if (progress > r.text.length) {
      // Juste après un bonus qui raccourcit le texte, le client peut encore taper l'ancien.
      if (now - r.lastTextChangeMs < TEXT_CHANGE_TOLERANCE_MS) progress = r.text.length;
      else return { ok: false, reason: "too_long" };
    }

    // Saut impossible : plus vite que la vitesse maximale (+ marge de rafale),
    // depuis le dernier message accepté ET depuis le départ.
    const sinceLast = Math.max(0, now - r.lastUpdateMs) / 1000;
    const sinceStart = Math.max(0, now - this.config.startsAtMs) / 1000;
    const allowedSinceLast = r.progress + sinceLast * MAX_CHARS_PER_SECOND + BURST_ALLOWANCE_CHARS;
    const allowedSinceStart = sinceStart * MAX_CHARS_PER_SECOND + BURST_ALLOWANCE_CHARS;
    if (progress > allowedSinceLast || progress > allowedSinceStart) {
      return { ok: false, reason: "impossible_jump" };
    }

    r.progress = progress;
    r.errors = Math.max(r.errors, Math.min(input.errorCount, 1_000_000));
    if (input.keyCorrect) r.keyCorrect = sanitizeCounts(input.keyCorrect);
    if (input.keyErrors) r.keyErrors = sanitizeCounts(input.keyErrors);
    r.lastUpdateMs = now;

    if (r.progress >= r.text.length) this.finish(r, now);
    return { ok: true };
  }

  /** COURSE-07 : abandon volontaire. */
  abandon(id: string, now: number): EngineEvent[] {
    const r = this.racers.get(id);
    if (!r || r.isBot || r.status !== "racing") return [];
    r.status = "abandoned";
    r.endedAtMs = now;
    return [{ type: "abandoned", racerId: id, reason: "player" }];
  }

  /** COURSE-08 : suit la connexion d'un joueur ; au-delà du délai de grâce il est déclaré abandonné. */
  setConnected(id: string, connected: boolean, now: number): void {
    const r = this.racers.get(id);
    if (!r || r.isBot) return;
    r.disconnectedAtMs = connected ? null : (r.disconnectedAtMs ?? now);
  }

  private finish(r: Racer, now: number): void {
    r.status = "finished";
    r.endedAtMs = now;
  }

  // ---- Avancement du temps ----

  /** Fait avancer la course : bots, bonus, déconnexions, série de MPM, fin du temps. */
  tick(now: number): EngineEvent[] {
    const events: EngineEvent[] = [];
    if (this.finalized || now < this.config.startsAtMs) return events;
    const elapsed = now - this.config.startsAtMs;

    // Bots
    for (const r of this.racing()) {
      if (!r.bot) continue;
      const sample = r.bot.sample(elapsed);
      r.progress = Math.min(sample.chars, r.text.length);
      r.errors = sample.errors;
      if (r.progress >= r.text.length) {
        // Instant d'arrivée exact de la chronologie, indépendant de la cadence du tick.
        this.finish(r, Math.min(now, this.config.startsAtMs + r.bot.completionMs));
        events.push({ type: "finished", racerId: r.id });
      }
    }

    // Déconnexions trop longues
    const grace = this.config.disconnectGraceMs ?? DEFAULT_GRACE_MS;
    for (const r of this.racing()) {
      if (r.disconnectedAtMs !== null && now - r.disconnectedAtMs >= grace) {
        r.status = "abandoned";
        r.endedAtMs = r.disconnectedAtMs + grace;
        events.push({ type: "abandoned", racerId: r.id, reason: "disconnected" });
      }
    }

    // Bonus de remontée
    if (this.config.comebackBonus) events.push(...this.checkBonuses(elapsed));

    // Série du MPM pour les graphiques
    while (this.lastSeriesMs + SERIES_STEP_MS <= elapsed) {
      this.lastSeriesMs += SERIES_STEP_MS;
      for (const r of this.racing()) {
        r.series.push({ t: this.lastSeriesMs / 1000, wpm: round1(this.wpmAt(r, this.lastSeriesMs)) });
      }
    }

    // Fin de course : tous terminés/abandonnés, ou temps écoulé
    if (this.racing().length === 0 || now >= this.endsAtMs) this.finalize(now);
    return events;
  }

  private wpmAt(r: Racer, elapsedMs: number): number {
    return netWpm(r.progress, r.errors, this.config.errorMode, elapsedMs);
  }

  // ---- Bonus ----

  private checkBonuses(elapsed: number): EngineEvent[] {
    const events: EngineEvent[] = [];
    const racers = this.racing();
    if (racers.length < 2) return events;
    const views = racers.map((r) => ({ id: r.id, fraction: this.fraction(r) }));
    const leaderView = findLeader(views);
    if (!leaderView) return events;
    const leader = this.racers.get(leaderView.id)!;

    for (const checkpoint of CHECKPOINTS) {
      if (this.triggered.has(checkpoint) || leaderView.fraction < checkpoint) continue;
      this.triggered.add(checkpoint);
      const laggards = findLaggards(views, leaderView)
        .map((v) => this.racers.get(v.id)!)
        .sort((a, b) => (a.id < b.id ? -1 : 1));
      for (const laggard of laggards) {
        if (laggard.bonuses.length >= MAX_BONUSES_PER_PLAYER) continue;
        events.push(...this.grantBonus(laggard, leader, checkpoint, elapsed));
      }
    }
    return events;
  }

  private grantBonus(laggard: Racer, leader: Racer, checkpoint: number, elapsed: number): EngineEvent[] {
    const eligible = BONUS_KINDS.filter(
      (kind) => kind !== "minus_words" || wordsAfterCurrent(laggard.text, laggard.progress) >= BONUS_WORDS + 1,
    );
    const kind: BonusKind = eligible[Math.floor(this.rng() * eligible.length)]!;
    const now = this.config.startsAtMs + elapsed;
    const target = kind === "minus_words" ? laggard : leader;
    const record: BonusRecord = {
      kind,
      checkpoint,
      atMs: elapsed,
      beneficiaryId: laggard.id,
      targetId: target.id,
    };
    laggard.bonuses.push(record);

    const events: EngineEvent[] = [{ type: "bonus", bonus: record, label: BONUS_LABELS[kind] }];
    if (kind === "fog") {
      leader.fogUntilMs = now + FOG_DURATION_MS;
    } else if (kind === "minus_words") {
      events.push(this.setText(laggard, removeUpcomingWords(laggard.text, laggard.progress), elapsed, now));
    } else {
      const words = Array.from(
        { length: BONUS_WORDS },
        () => this.config.wordPool[Math.floor(this.rng() * this.config.wordPool.length)] ?? "mot",
      );
      events.push(this.setText(leader, appendWords(leader.text, words), elapsed, now));
    }
    return events;
  }

  /** BONUS-04 : le texte change, la progression reste mesurée sur le texte courant du joueur. */
  private setText(r: Racer, text: string, elapsed: number, now: number): EngineEvent {
    r.text = text;
    r.lastTextChangeMs = now;
    if (r.progress > text.length) r.progress = text.length;
    r.bot?.rebase(elapsed, text);
    return { type: "text", racerId: r.id, text, progress: r.progress };
  }

  // ---- Fin et classement ----

  /** Termine la course : les joueurs encore en course sont en « temps écoulé ». */
  finalize(now: number): void {
    if (this.finalized) return;
    this.finalized = true;
    const end = Math.min(now, this.endsAtMs);
    for (const r of this.list()) {
      if (r.status === "racing") {
        r.status = "timeout";
        r.endedAtMs = end;
      }
    }
    this.rankAll();
  }

  /** COURSE-10 : arrivés (par temps), puis temps écoulé (par progression), puis abandons (par progression). */
  private rankAll(): void {
    const order: Record<RacerStatus, number> = { finished: 0, timeout: 1, abandoned: 2, racing: 1 };
    const sorted = this.list().sort((a, b) => {
      if (order[a.status] !== order[b.status]) return order[a.status] - order[b.status];
      if (a.status === "finished") return (a.endedAtMs ?? 0) - (b.endedAtMs ?? 0) || cmpId(a, b);
      return this.fraction(b) - this.fraction(a) || cmpId(a, b);
    });
    sorted.forEach((r, i) => (r.rank = i + 1));
  }

  /** Classement en direct, pendant la course (même règle que le classement final). */
  private liveRanks(): Map<string, number> {
    const order: Record<RacerStatus, number> = { finished: 0, racing: 1, timeout: 1, abandoned: 2 };
    const sorted = this.list().sort((a, b) => {
      if (order[a.status] !== order[b.status]) return order[a.status] - order[b.status];
      if (a.status === "finished") return (a.endedAtMs ?? 0) - (b.endedAtMs ?? 0) || cmpId(a, b);
      return this.fraction(b) - this.fraction(a) || cmpId(a, b);
    });
    return new Map(sorted.map((r, i) => [r.id, i + 1]));
  }

  private elapsedFor(r: Racer, now: number): number {
    const end = r.endedAtMs ?? now;
    return Math.max(0, end - this.config.startsAtMs);
  }

  /** Vue publique de la piste (COURSE-05). */
  snapshot(now: number): RacerView[] {
    const ranks = this.liveRanks();
    return this.list().map((r) => {
      const elapsed = this.elapsedFor(r, now);
      return {
        id: r.id,
        name: r.name,
        isBot: r.isBot,
        botLevel: r.botLevel,
        progress: r.progress,
        textLength: r.text.length,
        fraction: this.fraction(r),
        wpm: round1(netWpm(r.progress, r.errors, this.config.errorMode, elapsed)),
        accuracy: round1(accuracyOf(r.progress, r.errors, this.config.errorMode)),
        errors: r.errors,
        status: r.status,
        rank: r.rank ?? ranks.get(r.id)!,
        fogUntilMs: r.fogUntilMs,
        bonusCount: r.bonuses.length,
      };
    });
  }

  /** Résultats détaillés (RES-02), disponibles une fois la course terminée. */
  results(now: number): RacerResult[] {
    if (!this.finalized) this.finalize(now);
    return this.list()
      .map((r) => {
        const elapsed = this.elapsedFor(r, now);
        return {
          id: r.id,
          name: r.name,
          isBot: r.isBot,
          botLevel: r.botLevel,
          userId: r.userId,
          guestId: r.guestId,
          rank: r.rank!,
          status: r.status,
          progress: r.progress,
          textLength: r.text.length,
          errors: r.errors,
          wpm: round1(netWpm(r.progress, r.errors, this.config.errorMode, elapsed)),
          rawWpm: round1(rawWpm(r.progress, r.errors, this.config.errorMode, elapsed)),
          accuracy: round1(accuracyOf(r.progress, r.errors, this.config.errorMode)),
          timeMs: elapsed,
          bonuses: r.bonuses,
          series: r.series,
          keyCorrect: r.keyCorrect,
          keyErrors: r.keyErrors,
        };
      })
      .sort((a, b) => a.rank - b.rank);
  }
}

function cmpId(a: Racer, b: Racer): number {
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function sanitizeCounts(input: Record<string, number>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [key, value] of Object.entries(input).slice(0, 200)) {
    if (Number.isFinite(value) && value >= 0) out[key] = Math.min(Math.floor(value), 1_000_000);
  }
  return out;
}
