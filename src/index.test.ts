import { describe, expect, it } from "vitest";
import app from "./index";

describe("/api/v1/life-planning/simulation", () => {
	it("正常なリクエストで年齢を計算する", async () => {
		const res = await app.request("/api/v1/life-planning/simulation", {
			method: "POST",
			body: JSON.stringify({
				生年月日: "1990-01-01",
				開始年: 2020,
				終了年: 2025,
			}),
			headers: new Headers({ "Content-Type": "application/json" }),
		});

		const data = await res.json();

		expect(res.status).toBe(200);
		expect(data.年度一覧).toHaveLength(6);
		expect(data.年度一覧[0]).toEqual({ 西暦年: 2020, 年齢: 30 });
		expect(data.年度一覧[5]).toEqual({ 西暦年: 2025, 年齢: 35 });
	});

	it("必須パラメータが不足している場合400エラーを返す", async () => {
		const res = await app.request("/api/v1/life-planning/simulation", {
			method: "POST",
			body: JSON.stringify({
				生年月日: "1990-01-01",
				開始年: 2020,
			}),
			headers: new Headers({ "Content-Type": "application/json" }),
		});

		const data = await res.json();

		expect(res.status).toBe(400);
		expect(data.エラー).toBe("Missing required parameter: 終了年");
	});

	it("不正な生年月日フォーマットの場合400エラーを返す", async () => {
		const res = await app.request("/api/v1/life-planning/simulation", {
			method: "POST",
			body: JSON.stringify({
				生年月日: "invalid-date",
				開始年: 2020,
				終了年: 2025,
			}),
			headers: new Headers({ "Content-Type": "application/json" }),
		});

		const data = await res.json();

		expect(res.status).toBe(400);
		expect(data.エラー).toBe(
			"Invalid date format for 生年月日: expected YYYY-MM-DD format",
		);
	});

	it("開始年が終了年より大きい場合400エラーを返す", async () => {
		const res = await app.request("/api/v1/life-planning/simulation", {
			method: "POST",
			body: JSON.stringify({
				生年月日: "1990-01-01",
				開始年: 2025,
				終了年: 2020,
			}),
			headers: new Headers({ "Content-Type": "application/json" }),
		});

		const data = await res.json();

		expect(res.status).toBe(400);
		expect(data.エラー).toBe(
			"Start year must be less than or equal to end year",
		);
	});

	it("150歳を超える場合400エラーを返す", async () => {
		const res = await app.request("/api/v1/life-planning/simulation", {
			method: "POST",
			body: JSON.stringify({
				生年月日: "1850-01-01",
				開始年: 2024,
				終了年: 2025,
			}),
			headers: new Headers({ "Content-Type": "application/json" }),
		});

		const data = await res.json();

		expect(res.status).toBe(400);
		expect(data.エラー).toBe(
			"Age would exceed maximum allowed age of 150 years",
		);
	});

	it("150歳ちょうどの場合は正常に処理する", async () => {
		const res = await app.request("/api/v1/life-planning/simulation", {
			method: "POST",
			body: JSON.stringify({
				生年月日: "1874-01-01",
				開始年: 2024,
				終了年: 2024,
			}),
			headers: new Headers({ "Content-Type": "application/json" }),
		});

		const data = await res.json();

		expect(res.status).toBe(200);
		expect(data.年度一覧).toHaveLength(1);
		expect(data.年度一覧[0]).toEqual({ 西暦年: 2024, 年齢: 150 });
	});

	it("不正なJSONフォーマットの場合400エラーを返す", async () => {
		const res = await app.request("/api/v1/life-planning/simulation", {
			method: "POST",
			body: "invalid json",
			headers: new Headers({ "Content-Type": "application/json" }),
		});

		const data = await res.json();

		expect(res.status).toBe(400);
		expect(data.エラー).toBe("Invalid JSON format");
	});

	it("単一年のシミュレーション", async () => {
		const res = await app.request("/api/v1/life-planning/simulation", {
			method: "POST",
			body: JSON.stringify({
				生年月日: "1985-06-15",
				開始年: 2024,
				終了年: 2024,
			}),
			headers: new Headers({ "Content-Type": "application/json" }),
		});

		const data = await res.json();

		expect(res.status).toBe(200);
		expect(data.年度一覧).toHaveLength(1);
		expect(data.年度一覧[0]).toEqual({ 西暦年: 2024, 年齢: 38 });
	});
});

describe("/doc", () => {
	it("OpenAPI JSON仕様を正しく提供する", async () => {
		const res = await app.request("/doc");

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
		const res = await app.request("/ui");

		const html = await res.text();

		expect(res.status).toBe(200);
		expect(res.headers.get("content-type")).toBe("text/html; charset=UTF-8");

		// Swagger UIの基本的なHTMLコンテンツが含まれていることを確認
		expect(html).toContain('<html lang="en">');
		expect(html).toContain("SwaggerUI");
		expect(html).toContain("/doc"); // OpenAPI仕様のURLが参照されている
	});
});
