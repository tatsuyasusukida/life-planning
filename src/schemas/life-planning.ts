import { z } from "zod";
import { MAX_YEAR, MIN_YEAR } from "../lib/constants/social-insurance";

export const LifePlanningRequestSchema = z.object({
	生年月日: z.string().date().openapi({ example: "1990-01-01" }),
	開始年: z
		.number()
		.int()
		.min(MIN_YEAR)
		.max(MAX_YEAR)
		.openapi({ example: 2024 }),
	終了年: z
		.number()
		.int()
		.min(MIN_YEAR)
		.max(MAX_YEAR)
		.openapi({ example: 2050 }),
	年度別給与情報: z
		.array(
			z.object({
				年度: z
					.number()
					.int()
					.min(MIN_YEAR)
					.max(MAX_YEAR)
					.openapi({ example: 2024 }),
				収入金額: z.number().min(0).openapi({ example: 5000000 }),
			}),
		)
		.openapi({ example: [{ 年度: 2024, 収入金額: 5000000 }] }),
	年度別社会保険情報: z
		.array(
			z.object({
				年度: z
					.number()
					.int()
					.min(MIN_YEAR)
					.max(MAX_YEAR)
					.openapi({ example: 2024 }),
				健康保険料率: z.number().min(0).max(1).openapi({ example: 0.0981 }),
				介護保険料率: z.number().min(0).max(1).openapi({ example: 0.0164 }),
				厚生年金保険料率: z.number().min(0).max(1).openapi({ example: 0.183 }),
			}),
		)
		.optional()
		.openapi({
			example: [
				{
					年度: 2024,
					健康保険料率: 0.0981,
					介護保険料率: 0.0164,
					厚生年金保険料率: 0.183,
				},
			],
		}),
});

export const LifePlanningResponseSchema = z.object({
	年度一覧: z.array(
		z.object({
			西暦年: z.number().int(),
			年齢: z.number().int(),
			収入金額: z.number(),
			給与所得控除額: z.number(),
			給与所得控除後の金額: z.number(),
			標準報酬月額等級: z.number().int(),
			標準報酬月額: z.number(),
			健康保険料月額: z.number(),
			介護保険料月額: z.number(),
			厚生年金保険料月額: z.number(),
			社会保険料月額: z.number(),
			社会保険料年額: z.number(),
		}),
	),
});

export const ErrorResponseSchema = z.object({
	エラー: z.string(),
});
