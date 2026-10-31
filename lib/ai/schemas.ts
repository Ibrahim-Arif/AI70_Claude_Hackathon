import { z } from "zod";
import { parents } from "@/data/merchants";

export const ISSUES = ["climate", "labor", "governance", "political", "privacy"] as const;
export const TAGS = [
  "fast_food",
  "fast_casual",
  "local",
  "coffee",
  "grocery",
  "clothing",
  "rideshare",
  "fuel",
  "streaming",
  "online_retail",
  "secondhand",
  "fast_fashion",
] as const;
export const PARENT_IDS = parents.map((p) => p.id) as [string, ...string[]];
export const BASES = [
  "Based on merchant category",
  "Based on company ratings",
  "Based on who owns the company",
] as const;

const RuleSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("rating"), issue: z.enum(ISSUES) }),
  z.object({
    kind: z.literal("attribute"),
    tag: z.enum(TAGS),
    polarity: z.enum(["avoid", "prefer"]),
    alsoTags: z.array(z.enum(TAGS)).optional(),
  }),
  z.object({ kind: z.literal("entity"), parentId: z.enum(PARENT_IDS), polarity: z.literal("avoid") }),
]);

const QA = z.object({ q: z.string(), a: z.string() });

export const PreferenceDraftSchema = z
  .object({
    id: z.string().optional(),
    label: z.string().min(2).max(60),
    sourceText: z.string().optional(),
    type: z.enum(["rating", "attribute", "entity"]),
    rule: RuleSchema,
    clarifications: z.array(QA).optional(),
  })
  .refine((p) => p.type === p.rule.kind, { message: "type must match rule.kind" });

export const ParseOutputSchema = z.discriminatedUnion("status", [
  z.object({
    status: z.literal("clarify"),
    question: z.string().min(3).max(140),
    options: z.array(z.string().min(1).max(60)).min(2).max(4),
    progress: z.object({ step: z.number().int(), total: z.number().int() }).optional(),
  }),
  z.object({
    status: z.literal("result"),
    preference: PreferenceDraftSchema,
    summary: z.string().min(3).max(200),
    basis: z.enum(BASES),
  }),
  z.object({ status: z.literal("unsupported"), label: z.string().min(2).max(60), message: z.string().min(3).max(240) }),
  z.object({ status: z.literal("declined"), message: z.string().min(3).max(240) }),
]);

export type ParseOutput = z.infer<typeof ParseOutputSchema>;
export type ParseResponse = ParseOutput | { status: "failed"; message: string };

export const ParseInputSchema = z.object({
  text: z.string().min(1).max(500),
  history: z.array(QA).max(4).default([]),
  mode: z.enum(["live", "scripted"]).default("live"),
});

export const ExplainInputSchema = z.object({
  cacheKey: z.string().max(120),
  mode: z.enum(["live", "scripted"]).default("live"),
  merchant: z.object({
    id: z.string(),
    name: z.string(),
    category: z.string(),
    parentName: z.string(),
    differentParent: z.boolean(),
  }),
  ratings: z.array(
    z.object({
      issue: z.enum(ISSUES),
      score: z.number(),
      source: z.string(),
      date: z.string(),
      scope: z.enum(["merchant", "parent"]),
      url: z.string(),
    }),
  ),
  label: z.enum(["Aligned", "Mixed", "Conflicts", "Unknown"]),
  reasons: z.array(
    z.object({
      label: z.string(),
      importance: z.enum(["nice", "important", "dealbreaker"]),
      rule: z.any().optional(),
      severe: z.boolean().optional(),
    }),
  ),
  notes: z.array(z.object({ label: z.string(), importance: z.enum(["nice", "important", "dealbreaker"]), rule: z.any().optional() })),
  profile: z.object({
    preferences: z.array(z.object({ label: z.string(), importance: z.enum(["nice", "important", "dealbreaker"]) })),
  }),
});

export type ExplainInput = z.infer<typeof ExplainInputSchema>;
