import { describe, expect, it } from "vitest";
import app from "./index";

describe("/api/v1/life-planning/simulation", () => {
	it("正常なリクエストで年齢を計算する", async () => {
		const req = new Request(
			"http://localhost/api/v1/life-planning/simulation",
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					birthDate: "1990-01-01",
					startYear: 2020,
					endYear: 2025,
				}),
			},
		);

		const res = await app.request(req);
		const data = await res.json();

		expect(res.status).toBe(200);
		expect(data.years).toHaveLength(6);
		expect(data.years[0]).toEqual({ year: 2020, age: 30 });
		expect(data.years[5]).toEqual({ year: 2025, age: 35 });
	});

	it("必須パラメータが不足している場合400エラーを返す", async () => {
		const req = new Request(
			"http://localhost/api/v1/life-planning/simulation",
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					birthDate: "1990-01-01",
					startYear: 2020,
				}),
			},
		);

		const res = await app.request(req);
		const data = await res.json();

		expect(res.status).toBe(400);
		expect(data.error).toBe("Missing required parameters");
	});

	it("不正な生年月日フォーマットの場合400エラーを返す", async () => {
		const req = new Request(
			"http://localhost/api/v1/life-planning/simulation",
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					birthDate: "invalid-date",
					startYear: 2020,
					endYear: 2025,
				}),
			},
		);

		const res = await app.request(req);
		const data = await res.json();

		expect(res.status).toBe(400);
		expect(data.error).toBe("Invalid birth date format");
	});

	it("開始年が終了年より大きい場合400エラーを返す", async () => {
		const req = new Request(
			"http://localhost/api/v1/life-planning/simulation",
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					birthDate: "1990-01-01",
					startYear: 2025,
					endYear: 2020,
				}),
			},
		);

		const res = await app.request(req);
		const data = await res.json();

		expect(res.status).toBe(400);
		expect(data.error).toBe(
			"Start year must be less than or equal to end year",
		);
	});

	it("不正なJSONフォーマットの場合400エラーを返す", async () => {
		const req = new Request(
			"http://localhost/api/v1/life-planning/simulation",
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: "invalid json",
			},
		);

		const res = await app.request(req);
		const data = await res.json();

		expect(res.status).toBe(400);
		expect(data.error).toBe("Invalid JSON format");
	});

	it("単一年のシミュレーション", async () => {
		const req = new Request(
			"http://localhost/api/v1/life-planning/simulation",
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					birthDate: "1985-06-15",
					startYear: 2024,
					endYear: 2024,
				}),
			},
		);

		const res = await app.request(req);
		const data = await res.json();

		expect(res.status).toBe(200);
		expect(data.years).toHaveLength(1);
		expect(data.years[0]).toEqual({ year: 2024, age: 39 });
	});
});
