import { swaggerUI } from "@hono/swagger-ui";
import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";

// 定数定義
const MAX_ALLOWED_AGE = 150;
const MIN_YEAR = 1900;
const MAX_YEAR = 2100;

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
						エラー: `Missing required parameter: ${firstIssue.path.join(".")}`,
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
						エラー: `Invalid date format for ${firstIssue.path.join(".")}: expected YYYY-MM-DD format`,
					},
					400,
				);
			}

			if (firstIssue.code === "too_small") {
				return c.json(
					{
						エラー: `${firstIssue.path.join(".")} must be at least ${firstIssue.minimum}`,
					},
					400,
				);
			}

			if (firstIssue.code === "too_big") {
				return c.json(
					{
						エラー: `${firstIssue.path.join(".")} must be at most ${firstIssue.maximum}`,
					},
					400,
				);
			}

			if (firstIssue.code === "invalid_type") {
				return c.json(
					{
						エラー: `Invalid type for ${firstIssue.path.join(".")}: expected ${firstIssue.expected}, received ${firstIssue.received}`,
					},
					400,
				);
			}

			return c.json(
				{
					エラー: `Validation error for ${firstIssue.path.join(".")}: ${firstIssue.message}`,
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
});

const LifePlanningResponseSchema = z.object({
	年度一覧: z.array(
		z.object({
			西暦年: z.number().int(),
			年齢: z.number().int(),
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
		return c.json(
			{ エラー: "Start year must be less than or equal to end year" },
			400,
		);
	}

	const birthDate = new Date(body.生年月日);

	// 年齢の妥当性チェック
	const maxAgeInEndYear = body.終了年 - birthDate.getFullYear();
	if (maxAgeInEndYear > MAX_ALLOWED_AGE) {
		return c.json(
			{
				エラー: `Age would exceed maximum allowed age of ${MAX_ALLOWED_AGE} years`,
			},
			400,
		);
	}
	const years: Array<{ 西暦年: number; 年齢: number }> = [];

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
		years.push({ 西暦年: year, 年齢: age });
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
		return c.json({ エラー: "Invalid JSON format" }, 400);
	}

	return c.json({ エラー: "Internal Server Error" }, 500);
});

export default app;
