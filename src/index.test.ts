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
				年度別給与情報: [
					{ 年度: 2020, 収入金額: 5000000 },
					{ 年度: 2021, 収入金額: 5200000 },
					{ 年度: 2022, 収入金額: 5400000 },
					{ 年度: 2023, 収入金額: 5600000 },
					{ 年度: 2024, 収入金額: 5800000 },
					{ 年度: 2025, 収入金額: 6000000 },
				],
			}),
			headers: new Headers({ "Content-Type": "application/json" }),
		});

		const data = await res.json();

		expect(res.status).toBe(200);
		expect(data.年度一覧).toHaveLength(6);
		expect(data.年度一覧[0]).toEqual({
			西暦年: 2020,
			年齢: 30,
			収入金額: 5000000,
			給与所得控除額: 1440000,
			給与所得控除後の金額: 3560000,
		});
		expect(data.年度一覧[5]).toEqual({
			西暦年: 2025,
			年齢: 35,
			収入金額: 6000000,
			給与所得控除額: 1640000,
			給与所得控除後の金額: 4360000,
		});
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
		expect(data.エラー).toBe("必須パラメータが不足しています: 終了年");
	});

	it("年度別給与情報が不足している場合400エラーを返す", async () => {
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

		expect(res.status).toBe(400);
		expect(data.エラー).toBe("必須パラメータが不足しています: 年度別給与情報");
	});

	it("不正な生年月日フォーマットの場合400エラーを返す", async () => {
		const res = await app.request("/api/v1/life-planning/simulation", {
			method: "POST",
			body: JSON.stringify({
				生年月日: "invalid-date",
				開始年: 2020,
				終了年: 2025,
				年度別給与情報: [{ 年度: 2020, 収入金額: 5000000 }],
			}),
			headers: new Headers({ "Content-Type": "application/json" }),
		});

		const data = await res.json();

		expect(res.status).toBe(400);
		expect(data.エラー).toBe(
			"生年月日の日付形式が正しくありません。YYYY-MM-DD形式で入力してください",
		);
	});

	it("開始年が終了年より大きい場合400エラーを返す", async () => {
		const res = await app.request("/api/v1/life-planning/simulation", {
			method: "POST",
			body: JSON.stringify({
				生年月日: "1990-01-01",
				開始年: 2025,
				終了年: 2020,
				年度別給与情報: [{ 年度: 2020, 収入金額: 5000000 }],
			}),
			headers: new Headers({ "Content-Type": "application/json" }),
		});

		const data = await res.json();

		expect(res.status).toBe(400);
		expect(data.エラー).toBe("開始年は終了年以下である必要があります");
	});

	it("150歳を超える場合400エラーを返す", async () => {
		const res = await app.request("/api/v1/life-planning/simulation", {
			method: "POST",
			body: JSON.stringify({
				生年月日: "1850-01-01",
				開始年: 2024,
				終了年: 2025,
				年度別給与情報: [{ 年度: 2024, 収入金額: 5000000 }],
			}),
			headers: new Headers({ "Content-Type": "application/json" }),
		});

		const data = await res.json();

		expect(res.status).toBe(400);
		expect(data.エラー).toBe("年齢が上限の150歳を超えています");
	});

	it("150歳ちょうどの場合は正常に処理する", async () => {
		const res = await app.request("/api/v1/life-planning/simulation", {
			method: "POST",
			body: JSON.stringify({
				生年月日: "1874-01-01",
				開始年: 2024,
				終了年: 2024,
				年度別給与情報: [{ 年度: 2024, 収入金額: 5000000 }],
			}),
			headers: new Headers({ "Content-Type": "application/json" }),
		});

		const data = await res.json();

		expect(res.status).toBe(200);
		expect(data.年度一覧).toHaveLength(1);
		expect(data.年度一覧[0]).toEqual({
			西暦年: 2024,
			年齢: 150,
			収入金額: 5000000,
			給与所得控除額: 1440000,
			給与所得控除後の金額: 3560000,
		});
	});

	it("不正なJSONフォーマットの場合400エラーを返す", async () => {
		const res = await app.request("/api/v1/life-planning/simulation", {
			method: "POST",
			body: "invalid json",
			headers: new Headers({ "Content-Type": "application/json" }),
		});

		const data = await res.json();

		expect(res.status).toBe(400);
		expect(data.エラー).toBe("JSONフォーマットが正しくありません");
	});

	it("単一年のシミュレーション", async () => {
		const res = await app.request("/api/v1/life-planning/simulation", {
			method: "POST",
			body: JSON.stringify({
				生年月日: "1985-06-15",
				開始年: 2024,
				終了年: 2024,
				年度別給与情報: [{ 年度: 2024, 収入金額: 6000000 }],
			}),
			headers: new Headers({ "Content-Type": "application/json" }),
		});

		const data = await res.json();

		expect(res.status).toBe(200);
		expect(data.年度一覧).toHaveLength(1);
		expect(data.年度一覧[0]).toEqual({
			西暦年: 2024,
			年齢: 38,
			収入金額: 6000000,
			給与所得控除額: 1640000,
			給与所得控除後の金額: 4360000,
		});
	});

	it("省略機能を使用した給与情報の補完", async () => {
		const res = await app.request("/api/v1/life-planning/simulation", {
			method: "POST",
			body: JSON.stringify({
				生年月日: "1990-01-01",
				開始年: 2020,
				終了年: 2024,
				年度別給与情報: [
					{ 年度: 2020, 収入金額: 5000000 },
					{ 年度: 2023, 収入金額: 5500000 },
				],
			}),
			headers: new Headers({ "Content-Type": "application/json" }),
		});

		const data = await res.json();

		expect(res.status).toBe(200);
		expect(data.年度一覧).toHaveLength(5);

		// 2020年の情報
		expect(data.年度一覧[0]).toEqual({
			西暦年: 2020,
			年齢: 30,
			収入金額: 5000000,
			給与所得控除額: 1440000,
			給与所得控除後の金額: 3560000,
		});

		// 2021年は2020年と同額で補完
		expect(data.年度一覧[1]).toEqual({
			西暦年: 2021,
			年齢: 31,
			収入金額: 5000000,
			給与所得控除額: 1440000,
			給与所得控除後の金額: 3560000,
		});

		// 2022年も2020年と同額で補完
		expect(data.年度一覧[2]).toEqual({
			西暦年: 2022,
			年齢: 32,
			収入金額: 5000000,
			給与所得控除額: 1440000,
			給与所得控除後の金額: 3560000,
		});

		// 2023年の情報
		expect(data.年度一覧[3]).toEqual({
			西暦年: 2023,
			年齢: 33,
			収入金額: 5500000,
			給与所得控除額: 1540000,
			給与所得控除後の金額: 3960000,
		});

		// 2024年は2023年と同額で補完
		expect(data.年度一覧[4]).toEqual({
			西暦年: 2024,
			年齢: 34,
			収入金額: 5500000,
			給与所得控除額: 1540000,
			給与所得控除後の金額: 3960000,
		});
	});

	it("給与情報がない年度は収入0として処理", async () => {
		const res = await app.request("/api/v1/life-planning/simulation", {
			method: "POST",
			body: JSON.stringify({
				生年月日: "1990-01-01",
				開始年: 2020,
				終了年: 2022,
				年度別給与情報: [{ 年度: 2022, 収入金額: 5000000 }],
			}),
			headers: new Headers({ "Content-Type": "application/json" }),
		});

		const data = await res.json();

		expect(res.status).toBe(200);
		expect(data.年度一覧).toHaveLength(3);

		// 2020年は給与情報がないので収入0（控除額は収入金額以下に制限）
		expect(data.年度一覧[0]).toEqual({
			西暦年: 2020,
			年齢: 30,
			収入金額: 0,
			給与所得控除額: 0,
			給与所得控除後の金額: 0,
		});

		// 2021年も給与情報がないので収入0（控除額は収入金額以下に制限）
		expect(data.年度一覧[1]).toEqual({
			西暦年: 2021,
			年齢: 31,
			収入金額: 0,
			給与所得控除額: 0,
			給与所得控除後の金額: 0,
		});

		// 2022年は給与情報あり
		expect(data.年度一覧[2]).toEqual({
			西暦年: 2022,
			年齢: 32,
			収入金額: 5000000,
			給与所得控除額: 1440000,
			給与所得控除後の金額: 3560000,
		});
	});

	it("給与所得控除額の計算テスト", async () => {
		const res = await app.request("/api/v1/life-planning/simulation", {
			method: "POST",
			body: JSON.stringify({
				生年月日: "1990-01-01",
				開始年: 2020,
				終了年: 2025,
				年度別給与情報: [
					{ 年度: 2020, 収入金額: 1000000 }, // 162.5万円以下
					{ 年度: 2021, 収入金額: 1700000 }, // 162.5万円超180万円以下
					{ 年度: 2022, 収入金額: 3000000 }, // 180万円超360万円以下
					{ 年度: 2023, 収入金額: 5000000 }, // 360万円超660万円以下
					{ 年度: 2024, 収入金額: 7000000 }, // 660万円超850万円以下
					{ 年度: 2025, 収入金額: 10000000 }, // 850万円超
				],
			}),
			headers: new Headers({ "Content-Type": "application/json" }),
		});

		const data = await res.json();

		expect(res.status).toBe(200);
		expect(data.年度一覧).toHaveLength(6);

		// 100万円 -> 550,000円
		expect(data.年度一覧[0].給与所得控除額).toBe(550000);

		// 170万円 -> 170万円×40%－10万円 = 580,000円
		expect(data.年度一覧[1].給与所得控除額).toBe(580000);

		// 300万円 -> 300万円×30%＋8万円 = 980,000円
		expect(data.年度一覧[2].給与所得控除額).toBe(980000);

		// 500万円 -> 500万円×20%＋44万円 = 1,440,000円
		expect(data.年度一覧[3].給与所得控除額).toBe(1440000);

		// 700万円 -> 700万円×10%＋110万円 = 1,800,000円
		expect(data.年度一覧[4].給与所得控除額).toBe(1800000);

		// 1000万円 -> 1,950,000円（上限）
		expect(data.年度一覧[5].給与所得控除額).toBe(1950000);
	});

	it("収入金額が少ない場合の控除額制限テスト", async () => {
		const res = await app.request("/api/v1/life-planning/simulation", {
			method: "POST",
			body: JSON.stringify({
				生年月日: "1990-01-01",
				開始年: 2020,
				終了年: 2022,
				年度別給与情報: [
					{ 年度: 2020, 収入金額: 0 }, // 収入0
					{ 年度: 2021, 収入金額: 300000 }, // 30万円
					{ 年度: 2022, 収入金額: 1000000 }, // 100万円
				],
			}),
			headers: new Headers({ "Content-Type": "application/json" }),
		});

		const data = await res.json();

		expect(res.status).toBe(200);
		expect(data.年度一覧).toHaveLength(3);

		// 収入0円 -> 控除額も0円
		expect(data.年度一覧[0].収入金額).toBe(0);
		expect(data.年度一覧[0].給与所得控除額).toBe(0);
		expect(data.年度一覧[0].給与所得控除後の金額).toBe(0);

		// 収入30万円 -> 控除額は30万円（55万円より少ない）
		expect(data.年度一覧[1].収入金額).toBe(300000);
		expect(data.年度一覧[1].給与所得控除額).toBe(300000);
		expect(data.年度一覧[1].給与所得控除後の金額).toBe(0);

		// 収入100万円 -> 控除額は55万円（通常通り）
		expect(data.年度一覧[2].収入金額).toBe(1000000);
		expect(data.年度一覧[2].給与所得控除額).toBe(550000);
		expect(data.年度一覧[2].給与所得控除後の金額).toBe(450000);
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
