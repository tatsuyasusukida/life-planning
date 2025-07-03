import { swaggerUI } from "@hono/swagger-ui";
import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";

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
 * 健康保険の標準報酬月額等級表
 */
const HEALTH_INSURANCE_MONTHLY_SALARY_GRADES = [
	{ grade: 1, min: 0, max: 63000, standardAmount: 58000 },
	{ grade: 2, min: 63000, max: 73000, standardAmount: 68000 },
	{ grade: 3, min: 73000, max: 83000, standardAmount: 78000 },
	{ grade: 4, min: 83000, max: 93000, standardAmount: 88000 },
	{ grade: 5, min: 93000, max: 101000, standardAmount: 98000 },
	{ grade: 6, min: 101000, max: 107000, standardAmount: 104000 },
	{ grade: 7, min: 107000, max: 114000, standardAmount: 110000 },
	{ grade: 8, min: 114000, max: 122000, standardAmount: 118000 },
	{ grade: 9, min: 122000, max: 130000, standardAmount: 126000 },
	{ grade: 10, min: 130000, max: 138000, standardAmount: 134000 },
	{ grade: 11, min: 138000, max: 146000, standardAmount: 142000 },
	{ grade: 12, min: 146000, max: 155000, standardAmount: 150000 },
	{ grade: 13, min: 155000, max: 165000, standardAmount: 160000 },
	{ grade: 14, min: 165000, max: 175000, standardAmount: 170000 },
	{ grade: 15, min: 175000, max: 185000, standardAmount: 180000 },
	{ grade: 16, min: 185000, max: 195000, standardAmount: 190000 },
	{ grade: 17, min: 195000, max: 210000, standardAmount: 200000 },
	{ grade: 18, min: 210000, max: 230000, standardAmount: 220000 },
	{ grade: 19, min: 230000, max: 250000, standardAmount: 240000 },
	{ grade: 20, min: 250000, max: 270000, standardAmount: 260000 },
	{ grade: 21, min: 270000, max: 290000, standardAmount: 280000 },
	{ grade: 22, min: 290000, max: 310000, standardAmount: 300000 },
	{ grade: 23, min: 310000, max: 330000, standardAmount: 320000 },
	{ grade: 24, min: 330000, max: 350000, standardAmount: 340000 },
	{ grade: 25, min: 350000, max: 370000, standardAmount: 360000 },
	{ grade: 26, min: 370000, max: 395000, standardAmount: 380000 },
	{ grade: 27, min: 395000, max: 425000, standardAmount: 410000 },
	{ grade: 28, min: 425000, max: 455000, standardAmount: 440000 },
	{ grade: 29, min: 455000, max: 485000, standardAmount: 470000 },
	{ grade: 30, min: 485000, max: 515000, standardAmount: 500000 },
	{ grade: 31, min: 515000, max: 545000, standardAmount: 530000 },
	{ grade: 32, min: 545000, max: 575000, standardAmount: 560000 },
	{ grade: 33, min: 575000, max: 605000, standardAmount: 590000 },
	{ grade: 34, min: 605000, max: 635000, standardAmount: 620000 },
	{ grade: 35, min: 635000, max: 665000, standardAmount: 650000 },
	{ grade: 36, min: 665000, max: 695000, standardAmount: 680000 },
	{ grade: 37, min: 695000, max: 730000, standardAmount: 710000 },
	{ grade: 38, min: 730000, max: 770000, standardAmount: 750000 },
	{ grade: 39, min: 770000, max: 810000, standardAmount: 790000 },
	{ grade: 40, min: 810000, max: 855000, standardAmount: 830000 },
	{ grade: 41, min: 855000, max: 905000, standardAmount: 880000 },
	{ grade: 42, min: 905000, max: 955000, standardAmount: 930000 },
	{ grade: 43, min: 955000, max: 1005000, standardAmount: 980000 },
	{ grade: 44, min: 1005000, max: 1055000, standardAmount: 1030000 },
	{ grade: 45, min: 1055000, max: 1115000, standardAmount: 1090000 },
	{ grade: 46, min: 1115000, max: 1175000, standardAmount: 1150000 },
	{ grade: 47, min: 1175000, max: 1235000, standardAmount: 1210000 },
	{ grade: 48, min: 1235000, max: 1295000, standardAmount: 1270000 },
	{ grade: 49, min: 1295000, max: 1355000, standardAmount: 1330000 },
	{ grade: 50, min: 1355000, max: Number.MAX_VALUE, standardAmount: 1390000 },
];

/**
 * 厚生年金保険の標準報酬月額等級表（等級4-35のみ）
 * 報酬月額93,000円未満は標準報酬月額88,000円、635,000円以上は650,000円
 */
const PENSION_MONTHLY_SALARY_GRADES = [
	{ grade: 4, min: 0, max: 93000, standardAmount: 88000 },
	{ grade: 5, min: 93000, max: 101000, standardAmount: 98000 },
	{ grade: 6, min: 101000, max: 107000, standardAmount: 104000 },
	{ grade: 7, min: 107000, max: 114000, standardAmount: 110000 },
	{ grade: 8, min: 114000, max: 122000, standardAmount: 118000 },
	{ grade: 9, min: 122000, max: 130000, standardAmount: 126000 },
	{ grade: 10, min: 130000, max: 138000, standardAmount: 134000 },
	{ grade: 11, min: 138000, max: 146000, standardAmount: 142000 },
	{ grade: 12, min: 146000, max: 155000, standardAmount: 150000 },
	{ grade: 13, min: 155000, max: 165000, standardAmount: 160000 },
	{ grade: 14, min: 165000, max: 175000, standardAmount: 170000 },
	{ grade: 15, min: 175000, max: 185000, standardAmount: 180000 },
	{ grade: 16, min: 185000, max: 195000, standardAmount: 190000 },
	{ grade: 17, min: 195000, max: 210000, standardAmount: 200000 },
	{ grade: 18, min: 210000, max: 230000, standardAmount: 220000 },
	{ grade: 19, min: 230000, max: 250000, standardAmount: 240000 },
	{ grade: 20, min: 250000, max: 270000, standardAmount: 260000 },
	{ grade: 21, min: 270000, max: 290000, standardAmount: 280000 },
	{ grade: 22, min: 290000, max: 310000, standardAmount: 300000 },
	{ grade: 23, min: 310000, max: 330000, standardAmount: 320000 },
	{ grade: 24, min: 330000, max: 350000, standardAmount: 340000 },
	{ grade: 25, min: 350000, max: 370000, standardAmount: 360000 },
	{ grade: 26, min: 370000, max: 395000, standardAmount: 380000 },
	{ grade: 27, min: 395000, max: 425000, standardAmount: 410000 },
	{ grade: 28, min: 425000, max: 455000, standardAmount: 440000 },
	{ grade: 29, min: 455000, max: 485000, standardAmount: 470000 },
	{ grade: 30, min: 485000, max: 515000, standardAmount: 500000 },
	{ grade: 31, min: 515000, max: 545000, standardAmount: 530000 },
	{ grade: 32, min: 545000, max: 575000, standardAmount: 560000 },
	{ grade: 33, min: 575000, max: 605000, standardAmount: 590000 },
	{ grade: 34, min: 605000, max: 635000, standardAmount: 620000 },
	{ grade: 35, min: 635000, max: Number.MAX_VALUE, standardAmount: 650000 },
];

/**
 * 健康保険の月額給与から標準報酬月額の等級と金額を計算する
 * @param monthlySalary 月額給与
 * @returns 標準報酬月額の等級と金額
 */
function calculateHealthInsuranceStandardMonthlySalary(monthlySalary: number): {
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

	// 最低等級または最高等級を適用
	if (monthlySalary < HEALTH_INSURANCE_MONTHLY_SALARY_GRADES[0].min) {
		return {
			grade: HEALTH_INSURANCE_MONTHLY_SALARY_GRADES[0].grade,
			standardAmount: HEALTH_INSURANCE_MONTHLY_SALARY_GRADES[0].standardAmount,
		};
	}

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
function calculatePensionStandardMonthlySalary(monthlySalary: number): {
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

	// 最低等級または最高等級を適用
	if (monthlySalary < PENSION_MONTHLY_SALARY_GRADES[0].min) {
		return {
			grade: PENSION_MONTHLY_SALARY_GRADES[0].grade,
			standardAmount: PENSION_MONTHLY_SALARY_GRADES[0].standardAmount,
		};
	}

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
			socialInsuranceMap.set(year, lastValidRates);
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
