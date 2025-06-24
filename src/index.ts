import { Hono } from "hono";

const app = new Hono();

app.get("/", (c) => {
	return c.text("Hello Hono!");
});

interface LifePlanningRequest {
	birthDate: string;
	startYear: number;
	endYear: number;
}

interface LifePlanningResponse {
	years: Array<{
		year: number;
		age: number;
	}>;
}

app.post("/api/v1/life-planning/simulation", async (c) => {
	try {
		const body: LifePlanningRequest = await c.req.json();

		if (!body.birthDate || !body.startYear || !body.endYear) {
			return c.json({ error: "Missing required parameters" }, 400);
		}

		const birthDate = new Date(body.birthDate);
		if (Number.isNaN(birthDate.getTime())) {
			return c.json({ error: "Invalid birth date format" }, 400);
		}

		if (body.startYear > body.endYear) {
			return c.json(
				{ error: "Start year must be less than or equal to end year" },
				400,
			);
		}

		const years: Array<{ year: number; age: number }> = [];

		for (let year = body.startYear; year <= body.endYear; year++) {
			const age = year - birthDate.getFullYear();
			years.push({ year, age });
		}

		const response: LifePlanningResponse = { years };
		return c.json(response);
	} catch (_error) {
		return c.json({ error: "Invalid JSON format" }, 400);
	}
});

export default app;
