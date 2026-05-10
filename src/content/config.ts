// src/content/config.ts
// Astro Content Collections 설정 — 공작소 일지

import { defineCollection, z } from 'astro:content';

const journalCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),

    // 카테고리 — 4가지
    category: z.enum([
      'log',       // 작업 일지 (가장 자주)
      'review',    // 샤프트·헤드 리뷰
      'trends',    // 장비 트렌드 분기 리포트
      'data',      // 측정 데이터
    ]).default('log'),

    // 태그 — 자유
    tags: z.array(z.string()).default([]),

    // 클럽 종류 — 진단 트리와 연결
    clubType: z.enum([
      'driver',
      'fairway',
      'hybrid',
      'iron',
      'wedge',
      'putter',
      'mixed',
    ]).optional(),

    // 관련 진단 트리 (선택)
    relatedSymptom: z.string().optional(),

    // 공개 상태
    draft: z.boolean().default(false),
  }),
});

export const collections = {
  journal: journalCollection,
};
