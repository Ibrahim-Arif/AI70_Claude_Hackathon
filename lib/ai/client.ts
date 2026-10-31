"use client";

import type { Label, Merchant, Profile } from "@/lib/types";
import type { LabelResult } from "@/lib/engine";
import { profileHash } from "@/lib/engine";
import { hasDifferentParent, parentName } from "@/data/merchants";
import type { ExplainInput, ParseResponse } from "./schemas";
import { FAILED, UNKNOWN_EXPLANATION } from "./scripted";
import type { AIMode } from "@/lib/store";

export const MIN_PROCESSING_MS = 900;

export function wait(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function atLeast<T>(p: Promise<T>, ms = MIN_PROCESSING_MS): Promise<T> {
  const [v] = await Promise.all([p, wait(ms)]);
  return v;
}

async function postJson<T>(url: string, body: unknown, timeoutMs = 9000): Promise<T> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error(String(res.status));
    return (await res.json()) as T;
  } finally {
    clearTimeout(t);
  }
}

export async function parsePreference(
  text: string,
  history: { q: string; a: string }[],
  mode: AIMode,
): Promise<ParseResponse> {
  return atLeast(
    postJson<ParseResponse>("/api/parse-preference", { text, history, mode }).catch(() => FAILED),
  );
}

// ---------------------------------------------------------------- explanations

const cache = new Map<string, string>();
const inflight = new Map<string, Promise<string>>();

export function explainKey(merchantId: string, profile: Profile, mode: AIMode) {
  return `${mode}:${merchantId}:${profileHash(profile)}`;
}

export function buildExplainInput(m: Merchant, result: LabelResult, profile: Profile, mode: AIMode): ExplainInput {
  const strip = (p: { label: string; importance: Profile["preferences"][number]["importance"]; rule?: unknown }) => ({
    label: p.label,
    importance: p.importance,
    rule: p.rule,
  });
  return {
    cacheKey: `${m.id}:${profileHash(profile)}`,
    mode,
    merchant: {
      id: m.id,
      name: m.name,
      category: m.category,
      parentName: parentName(m),
      differentParent: hasDifferentParent(m),
    },
    ratings: m.ratings,
    label: result.label as Label,
    reasons: result.reasons.map(strip),
    notes: result.notes.map(strip),
    profile: { preferences: profile.preferences.map((p) => ({ label: p.label, importance: p.importance })) },
  };
}

/** Cached per merchant + profile hash. Unknown merchants never call the AI. */
export function getExplanation(m: Merchant, result: LabelResult, profile: Profile, mode: AIMode): Promise<string> {
  if (result.label === "Unknown" || m.ratings.length === 0) return Promise.resolve(UNKNOWN_EXPLANATION);
  const key = explainKey(m.id, profile, mode);
  const hit = cache.get(key);
  if (hit) return Promise.resolve(hit);
  const running = inflight.get(key);
  if (running) return running;
  const p = postJson<{ text: string }>("/api/explain", buildExplainInput(m, result, profile, mode), 9000)
    .then((r) => r.text)
    .catch(async () => {
      const { templateExplain } = await import("./explainTemplate");
      return templateExplain(buildExplainInput(m, result, profile, mode));
    })
    .then((text) => {
      cache.set(key, text);
      inflight.delete(key);
      return text;
    });
  inflight.set(key, p);
  return p;
}

export function getCachedExplanation(m: Merchant, profile: Profile, mode: AIMode) {
  return cache.get(explainKey(m.id, profile, mode)) ?? null;
}
