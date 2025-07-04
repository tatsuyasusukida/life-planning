import { swaggerUI } from "@hono/swagger-ui";
import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import {
	HEALTH_INSURANCE_MONTHLY_SALARY_GRADES,
	PENSION_MONTHLY_SALARY_GRADES,
} from "./constants";

// 定数定義
const MAX_ALLOWED_AGE = 150;
const MIN_YEAR = 1900;
const MAX_YEAR = 2100;

/**
 * 給与所得控除額を計算する
 * @param income 収入金額
 * @returns 給与所得控除額
 */
function calculateSalaryDeduction(income: number): number {
	if (income <= 1625000) {
		return 550000;
	}
	if (income <= 1800000) {
		return Math.floor(income * 0.4 - 100000);
	}
	if (income <= 3600000) {
		return Math.floor(income * 0.3 + 80000);
	}
	if (income <= 6600000) {
		return Math.floor(income * 0.2 + 440000);
	}
	if (income <= 8500000) {
		return Math.floor(income * 0.1 + 1100000);
	}
	return 1950000;
}

/**
 * 省略された年度の給与情報を前年度のデータで補完する
 * @param salaryInfoMap 年度別給与情報
 * @param startYear 開始年
 * @param endYear 終了年
 */
export function fillMissingSalaryInfo(
	salaryInfoMap: Map<number, number>,
	startYear: number,
	endYear: number,
): void {
	let lastValidSalary = 0;
	for (let year = startYear; year <= endYear; year++) {
		if (salaryInfoMap.has(year)) {
			const salary = salaryInfoMap.get(year);
			if (salary !== undefined) {
				lastValidSalary = salary;
			}
		} else if (lastValidSalary > 0) {
			salaryInfoMap.set(year, lastValidSalary);
		}
	}
}

/**
 * 健康保険の月額給与から標準報酬月額の等級と金額を計算する
 * @param monthlySalary 月額給与
 * @returns 標準報酬月額の等級と金額
 */
export function calculateHealthInsuranceStandardMonthlySalary(
	monthlySalary: number,
): {
	grade: number;
	standardAmount: number;
} {
	for (const gradeInfo of HEALTH_INSURANCE_MONTHLY_SALARY_GRADES) {
		if (monthlySalary >= gradeInfo.min && monthlySalary < gradeInfo.max) {
			return {
				grade: gradeInfo.grade,
				standardAmount: gradeInfo.standardAmount,
			};
		}
	}

	// 最高等級を適用
	const lastGrade =
		HEALTH_INSURANCE_MONTHLY_SALARY_GRADES[
			HEALTH_INSURANCE_MONTHLY_SALARY_GRADES.length - 1
		];
	return {
		grade: lastGrade.grade,
		standardAmount: lastGrade.standardAmount,
	};
}

/**
 * 厚生年金保険の月額給与から標準報酬月額の等級と金額を計算する
 * @param monthlySalary 月額給与
 * @returns 標準報酬月額の等級と金額
 */
export function calculatePensionStandardMonthlySalary(monthlySalary: number): {
	grade: number;
	standardAmount: number;
} {
	for (const gradeInfo of PENSION_MONTHLY_SALARY_GRADES) {
		if (monthlySalary >= gradeInfo.min && monthlySalary < gradeInfo.max) {
			return {
				grade: gradeInfo.grade,
				standardAmount: gradeInfo.standardAmount,
			};
		}
	}

	// 最高等級を適用
	const lastGrade =
		PENSION_MONTHLY_SALARY_GRADES[PENSION_MONTHLY_SALARY_GRADES.length - 1];
	return {
		grade: lastGrade.grade,
		standardAmount: lastGrade.standardAmount,
	};
}

/**
 * 社会保険料情報の型定義
 */
interface SocialInsuranceRates {
	健康保険料率: number;
	介護保険料率: number;
	厚生年金保険料率: number;
}

/**
 * 社会保険料を計算する
 * @param healthInsuranceStandardSalary 健康保険用標準報酬月額
 * @param pensionStandardSalary 厚生年金保険用標準報酬月額
 * @param rates 保険料率
 * @returns 各種保険料
 */
function calculateSocialInsurancePremiums(
	healthInsuranceStandardSalary: number,
	pensionStandardSalary: number,
	rates: SocialInsuranceRates,
	age: number,
): {
	健康保険料: number;
	介護保険料: number;
	厚生年金保険料: number;
	社会保険料: number;
} {
	// 保険料は従業員負担分のみ計算（労使折半のため料率を2で割る）
	const 健康保険料 = Math.floor(
		(healthInsuranceStandardSalary * rates.健康保険料率) / 2,
	);
	// 介護保険料は40歳から発生
	const 介護保険料 =
		age >= 40
			? Math.floor((healthInsuranceStandardSalary * rates.介護保険料率) / 2)
			: 0;
	const 厚生年金保険料 = Math.floor(
		(pensionStandardSalary * rates.厚生年金保険料率) / 2,
	);
	const 社会保険料 = 健康保険料 + 介護保険料 + 厚生年金保険料;

	return {
		健康保険料,
		介護保険料,
		厚生年金保険料,
		社会保険料,
	};
}

/**
 * 省略された年度の社会保険情報を前年度のデータで補完する
 * @param socialInsuranceMap 年度別社会保険情報
 * @param startYear 開始年
 * @param endYear 終了年
 */
export function fillMissingSocialInsuranceInfo(
	socialInsuranceMap: Map<number, SocialInsuranceRates>,
	startYear: number,
	endYear: number,
): void {
	let lastValidRates: SocialInsuranceRates | null = null;
	for (let year = startYear; year <= endYear; year++) {
		if (socialInsuranceMap.has(year)) {
			const rates = socialInsuranceMap.get(year);
			if (rates !== undefined) {
				lastValidRates = rates;
			}
		} else if (lastValidRates !== null) {
			socialInsuranceMap.set(year, { ...lastValidRates });
		} else {
			// デフォルト値（保険料率0）を設定
			socialInsuranceMap.set(year, {
				健康保険料率: 0,
				介護保険料率: 0,
				厚生年金保険料率: 0,
			});
		}
	}
}

const app = new OpenAPIHono({
	defaultHook: (result, c) => {
		if (!result.success) {
			const firstIssue = result.error.issues[0];

			if (
				firstIssue.code === "invalid_type" &&
				firstIssue.received === "undefined"
			) {
				return c.json(
					{
						エラー: `必須パラメータが不足しています: ${firstIssue.path.join(".")}`,
					},
					400,
				);
			}

			if (
				firstIssue.code === "invalid_string" &&
				firstIssue.validation === "date"
			) {
				return c.json(
					{
						エラー: `${firstIssue.path.join(".")}の日付形式が正しくありません。YYYY-MM-DD形式で入力してください`,
					},
					400,
				);
			}

			if (firstIssue.code === "too_small") {
				return c.json(
					{
						エラー: `${firstIssue.path.join(".")}は${firstIssue.minimum}以上である必要があります`,
					},
					400,
				);
			}

			if (firstIssue.code === "too_big") {
				return c.json(
					{
						エラー: `${firstIssue.path.join(".")}は${firstIssue.maximum}以下である必要があります`,
					},
					400,
				);
			}

			if (firstIssue.code === "invalid_type") {
				return c.json(
					{
						エラー: `${firstIssue.path.join(".")}の型が正しくありません。${firstIssue.expected}型である必要がありますが、${firstIssue.received}型が入力されました`,
					},
					400,
				);
			}

			return c.json(
				{
					エラー: `${firstIssue.path.join(".")}のバリデーションエラー: ${firstIssue.message}`,
				},
				400,
			);
		}
	},
});

app.get("/", (c) => {
	return c.text("Hello Hono!");
});

app.doc("/doc", {
	openapi: "3.0.0",
	info: {
		version: "1.0.0",
		title: "Life Planning API",
		description: "API for life planning simulation",
	},
});

app.get("/ui", swaggerUI({ url: "/doc" }));

const LifePlanningRequestSchema = z.object({
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

const LifePlanningResponseSchema = z.object({
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

const ErrorResponseSchema = z.object({
	エラー: z.string(),
});

const lifePlanningRoute = createRoute({
	method: "post",
	path: "/api/v1/life-planning/simulation",
	request: {
		body: {
			content: {
				"application/json": {
					schema: LifePlanningRequestSchema,
				},
			},
		},
	},
	responses: {
		200: {
			content: {
				"application/json": {
					schema: LifePlanningResponseSchema,
				},
			},
			description: "Successful life planning simulation",
		},
		400: {
			content: {
				"application/json": {
					schema: ErrorResponseSchema,
				},
			},
			description: "Bad request",
		},
		500: {
			content: {
				"application/json": {
					schema: ErrorResponseSchema,
				},
			},
			description: "Internal server error",
		},
	},
});

app.openapi(lifePlanningRoute, async (c) => {
	const body = c.req.valid("json");

	if (body.開始年 > body.終了年) {
		return c.json({ エラー: "開始年は終了年以下である必要があります" }, 400);
	}

	const birthDate = new Date(body.生年月日);

	// 年齢の妥当性チェック
	const maxAgeInEndYear = body.終了年 - birthDate.getFullYear();
	if (maxAgeInEndYear > MAX_ALLOWED_AGE) {
		return c.json(
			{
				エラー: `年齢が上限の${MAX_ALLOWED_AGE}歳を超えています`,
			},
			400,
		);
	}
	const salaryInfoMap = new Map<number, number>();
	for (const info of body.年度別給与情報) {
		salaryInfoMap.set(info.年度, info.収入金額);
	}

	// 省略された年度の給与情報を前年度のデータで補完
	fillMissingSalaryInfo(salaryInfoMap, body.開始年, body.終了年);

	// 社会保険情報のマップを作成
	const socialInsuranceMap = new Map<number, SocialInsuranceRates>();
	if (body.年度別社会保険情報) {
		for (const info of body.年度別社会保険情報) {
			socialInsuranceMap.set(info.年度, {
				健康保険料率: info.健康保険料率,
				介護保険料率: info.介護保険料率,
				厚生年金保険料率: info.厚生年金保険料率,
			});
		}
	}

	// 省略された年度の社会保険情報を前年度のデータで補完
	fillMissingSocialInsuranceInfo(socialInsuranceMap, body.開始年, body.終了年);

	const years: Array<{
		西暦年: number;
		年齢: number;
		収入金額: number;
		給与所得控除額: number;
		給与所得控除後の金額: number;
		標準報酬月額等級: number;
		標準報酬月額: number;
		健康保険料月額: number;
		介護保険料月額: number;
		厚生年金保険料月額: number;
		社会保険料月額: number;
		社会保険料年額: number;
	}> = [];

	for (let year = body.開始年; year <= body.終了年; year++) {
		// 1月1日時点での満年齢を計算
		const currentYearStart = new Date(year, 0, 1); // 年の1月1日
		const age =
			currentYearStart.getFullYear() -
			birthDate.getFullYear() -
			(currentYearStart <
			new Date(
				currentYearStart.getFullYear(),
				birthDate.getMonth(),
				birthDate.getDate(),
			)
				? 1
				: 0);

		const income = salaryInfoMap.get(year) ?? 0;
		const deduction = Math.min(calculateSalaryDeduction(income), income);
		const afterDeduction = income - deduction;

		// 標準報酬月額の計算
		const monthlySalary = income / 12;
		const healthInsuranceStandardSalaryInfo =
			calculateHealthInsuranceStandardMonthlySalary(monthlySalary);
		const pensionStandardSalaryInfo =
			calculatePensionStandardMonthlySalary(monthlySalary);

		// 社会保険料の計算
		const socialInsuranceRates = socialInsuranceMap.get(year) ?? {
			健康保険料率: 0,
			介護保険料率: 0,
			厚生年金保険料率: 0,
		};
		const socialInsurancePremiums = calculateSocialInsurancePremiums(
			healthInsuranceStandardSalaryInfo.standardAmount,
			pensionStandardSalaryInfo.standardAmount,
			socialInsuranceRates,
			age,
		);

		const yearData = {
			西暦年: year,
			年齢: age,
			収入金額: income,
			給与所得控除額: deduction,
			給与所得控除後の金額: afterDeduction,
			標準報酬月額等級: healthInsuranceStandardSalaryInfo.grade,
			標準報酬月額: healthInsuranceStandardSalaryInfo.standardAmount,
			健康保険料月額: socialInsurancePremiums.健康保険料,
			介護保険料月額: socialInsurancePremiums.介護保険料,
			厚生年金保険料月額: socialInsurancePremiums.厚生年金保険料,
			社会保険料月額: socialInsurancePremiums.社会保険料,
			社会保険料年額: socialInsurancePremiums.社会保険料 * 12,
		};

		years.push(yearData);
	}

	return c.json({ 年度一覧: years }, 200);
});

app.onError((err, c) => {
	if (
		err.name === "SyntaxError" ||
		err.message.includes("Unexpected token") ||
		err.message.includes("JSON") ||
		err.message.includes("Malformed")
	) {
		return c.json({ エラー: "JSONフォーマットが正しくありません" }, 400);
	}

	return c.json({ エラー: "内部サーバーエラーが発生しました" }, 500);
});

export default app;
