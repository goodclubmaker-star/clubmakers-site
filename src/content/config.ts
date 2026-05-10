// src/content/config.ts
// Astro Content Collections 설정 — 공작소 일지 + 용어사전

import { defineCollection, z } from 'astro:content';

// ===== 공작소 일지 =====
const journalCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    category: z.enum([
      'log',
      'review',
      'trends',
      'data',
    ]).default('log'),
    tags: z.array(z.string()).default([]),
    clubType: z.enum([
      'driver',
      'fairway',
      'hybrid',
      'iron',
      'wedge',
      'putter',
      'mixed',
    ]).optional(),
    relatedSymptom: z.string().optional(),
    draft: z.boolean().default(false),
  }),
});

// ===== 용어사전 (105개) =====
const glossaryCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),                      // "거리 갭 (Distance Gap)"
    koreanTitle: z.string(),                // "거리 갭"
    englishTitle: z.string().optional(),    // "Distance Gap"
    shortDef: z.string().optional(),        // 한 줄 정의 (AI 인용 0순위)
    letter: z.string().optional(),          // "ㄱ"
    category: z.enum([
      'workshop',    // 작업 (🛠️)
      'data',        // 측정·분석 (📊)
      'new',         // 신규 개념 (🆕)
      'shaft',       // 샤프트
      'head',        // 헤드
      'grip',        // 그립
      'length-sw',   // 길이·SW
      'lie-loft',    // 라이·로프트
      'general',     // 기타
    ]).default('general'),
    emojis: z.array(z.string()).default([]),
    workshopLink: z.object({
      label: z.string(),
      href: z.string(),
    }).optional(),
    systemLink: z.object({
      label: z.string(),
      href: z.string(),
    }).optional(),
    relatedParts: z.array(z.string()).default([]),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    draft: z.boolean().default(false),
  }),
});

export const collections = {
  journal: journalCollection,
  glossary: glossaryCollection,
};
