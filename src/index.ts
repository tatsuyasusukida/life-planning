import { swaggerUI } from "@hono/swagger-ui";
import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";

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
						error: `Missing required parameter: ${firstIssue.path.join(".")}`,
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
						error: `Invalid date format for ${firstIssue.path.join(".")}: expected YYYY-MM-DD format`,
					},
					400,
				);
			}

			if (firstIssue.code === "too_small") {
				return c.json(
					{
						error: `${firstIssue.path.join(".")} must be at least ${firstIssue.minimum}`,
					},
					400,
				);
			}

			if (firstIssue.code === "too_big") {
				return c.json(
					{
						error: `${firstIssue.path.join(".")} must be at most ${firstIssue.maximum}`,
					},
					400,
				);
			}

			if (firstIssue.code === "invalid_type") {
				return c.json(
					{
						error: `Invalid type for ${firstIssue.path.join(".")}: expected ${firstIssue.expected}, received ${firstIssue.received}`,
					},
					400,
				);
			}

			return c.json(
				{
					error: `Validation error for ${firstIssue.path.join(".")}: ${firstIssue.message}`,
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
	birthDate: z.string().date().openapi({ example: "1990-01-01" }),
	startYear: z.number().int().min(1900).max(2100).openapi({ example: 2024 }),
	endYear: z.number().int().min(1900).max(2100).openapi({ example: 2050 }),
});

const LifePlanningResponseSchema = z.object({
	years: z.array(
		z.object({
			year: z.number().int(),
			age: z.number().int(),
		}),
	),
});

const ErrorResponseSchema = z.object({
	error: z.string(),
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

	if (body.startYear > body.endYear) {
		return c.json(
			{ error: "Start year must be less than or equal to end year" },
			400,
		);
	}

	const birthDate = new Date(body.birthDate);
	const years: Array<{ year: number; age: number }> = [];

	for (let year = body.startYear; year <= body.endYear; year++) {
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
		years.push({ year, age });
	}

	return c.json({ years }, 200);
});

app.onError((err, c) => {
	if (
		err.name === "SyntaxError" ||
		err.message.includes("Unexpected token") ||
		err.message.includes("JSON") ||
		err.message.includes("Malformed")
	) {
		return c.json({ error: "Invalid JSON format" }, 400);
	}

	return c.json({ error: "Internal Server Error" }, 500);
});

export default app;
