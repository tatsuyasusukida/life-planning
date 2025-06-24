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
		expect(data.error).toBe("Missing required parameter: endYear");
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
		expect(data.error).toBe(
			"Invalid date format for birthDate: expected YYYY-MM-DD format",
		);
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

describe("/doc", () => {
	it("OpenAPI JSON仕様を正しく提供する", async () => {
		const req = new Request("http://localhost/doc", {
			method: "GET",
		});

		const res = await app.request(req);
		const data = await res.json();

		expect(res.status).toBe(200);
		expect(res.headers.get("content-type")).toBe("application/json");

		// OpenAPI仕様の基本構造を確認
		expect(data.openapi).toBe("3.0.0");
		expect(data.info).toEqual({
			version: "1.0.0",
			title: "Life Planning API",
			description: "API for life planning simulation",
		});

		// パスが含まれていることを確認
		expect(data.paths).toBeDefined();
		expect(data.paths["/api/v1/life-planning/simulation"]).toBeDefined();

		// POST メソッドが定義されていることを確認
		const endpoint = data.paths["/api/v1/life-planning/simulation"];
		expect(endpoint.post).toBeDefined();

		// レスポンスが定義されていることを確認（200, 400, 500）
		expect(endpoint.post.responses).toBeDefined();
		expect(endpoint.post.responses["200"]).toBeDefined();
		expect(endpoint.post.responses["400"]).toBeDefined();
		expect(endpoint.post.responses["500"]).toBeDefined();
	});
});

describe("/ui", () => {
	it("Swagger UIを正しく提供する", async () => {
		const req = new Request("http://localhost/ui", {
			method: "GET",
		});

		const res = await app.request(req);
		const html = await res.text();

		expect(res.status).toBe(200);
		expect(res.headers.get("content-type")).toBe("text/html; charset=UTF-8");

		// Swagger UIの基本的なHTMLコンテンツが含まれていることを確認
		expect(html).toContain('<html lang="en">');
		expect(html).toContain("SwaggerUI");
		expect(html).toContain("/doc"); // OpenAPI仕様のURLが参照されている
	});
});
