import { swaggerUI } from "@hono/swagger-ui";
import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";

// 定数定義
const MAX_ALLOWED_AGE = 150;
const MIN_YEAR = 1900;
const MAX_YEAR = 2100;

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
});

const LifePlanningResponseSchema = z.object({
	年度一覧: z.array(
		z.object({
			西暦年: z.number().int(),
			年齢: z.number().int(),
			収入金額: z.number(),
			給与所得控除額: z.number(),
			給与所得控除後の金額: z.number(),
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
	const sortedYears = Array.from(salaryInfoMap.keys()).sort((a, b) => a - b);
	for (let year = body.開始年; year <= body.終了年; year++) {
		if (!salaryInfoMap.has(year)) {
			// 現在の年度より前で最も近い年度の給与情報を使用
			const previousYears = sortedYears.filter((y) => y < year);
			if (previousYears.length > 0) {
				const nearestPreviousYear = Math.max(...previousYears);
				const previousSalary = salaryInfoMap.get(nearestPreviousYear);
				if (previousSalary !== undefined) {
					salaryInfoMap.set(year, previousSalary);
				}
			}
		}
	}

	const years: Array<{
		西暦年: number;
		年齢: number;
		収入金額: number;
		給与所得控除額: number;
		給与所得控除後の金額: number;
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

		const yearData = {
			西暦年: year,
			年齢: age,
			収入金額: income,
			給与所得控除額: deduction,
			給与所得控除後の金額: afterDeduction,
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
