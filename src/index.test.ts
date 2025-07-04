import { describe, expect, it } from "vitest";
import app, {
	calculateHealthInsuranceStandardMonthlySalary,
	calculatePensionStandardMonthlySalary,
	fillMissingSalaryInfo,
	fillMissingSocialInsuranceInfo,
} from "./index";

describe("fillMissingSalaryInfo", () => {
	it("省略された年度を前年度のデータで補完する", () => {
		const salaryInfoMap = new Map<number, number>();
		salaryInfoMap.set(2020, 5000000);
		salaryInfoMap.set(2023, 5500000);

		fillMissingSalaryInfo(salaryInfoMap, 2020, 2025);

		expect(salaryInfoMap.get(2020)).toBe(5000000);
		expect(salaryInfoMap.get(2021)).toBe(5000000); // 2020年のデータで補完
		expect(salaryInfoMap.get(2022)).toBe(5000000); // 2020年のデータで補完
		expect(salaryInfoMap.get(2023)).toBe(5500000);
		expect(salaryInfoMap.get(2024)).toBe(5500000); // 2023年のデータで補完
		expect(salaryInfoMap.get(2025)).toBe(5500000); // 2023年のデータで補完
	});

	it("最初の年度に給与情報がない場合は補完しない", () => {
		const salaryInfoMap = new Map<number, number>();
		salaryInfoMap.set(2022, 5000000);

		fillMissingSalaryInfo(salaryInfoMap, 2020, 2025);

		expect(salaryInfoMap.has(2020)).toBe(false);
		expect(salaryInfoMap.has(2021)).toBe(false);
		expect(salaryInfoMap.get(2022)).toBe(5000000);
		expect(salaryInfoMap.get(2023)).toBe(5000000); // 2022年のデータで補完
		expect(salaryInfoMap.get(2024)).toBe(5000000); // 2022年のデータで補完
		expect(salaryInfoMap.get(2025)).toBe(5000000); // 2022年のデータで補完
	});

	it("すべての年度に給与情報がある場合は変更しない", () => {
		const salaryInfoMap = new Map<number, number>();
		salaryInfoMap.set(2020, 4000000);
		salaryInfoMap.set(2021, 4200000);
		salaryInfoMap.set(2022, 4400000);

		fillMissingSalaryInfo(salaryInfoMap, 2020, 2022);

		expect(salaryInfoMap.get(2020)).toBe(4000000);
		expect(salaryInfoMap.get(2021)).toBe(4200000);
		expect(salaryInfoMap.get(2022)).toBe(4400000);
	});

	it("給与情報が全くない場合は何も追加しない", () => {
		const salaryInfoMap = new Map<number, number>();

		fillMissingSalaryInfo(salaryInfoMap, 2020, 2022);

		expect(salaryInfoMap.size).toBe(0);
	});
});

describe("fillMissingSocialInsuranceInfo", () => {
	it("省略された年度を前年度のデータで補完する", () => {
		type SocialInsuranceRates = {
			健康保険料率: number;
			介護保険料率: number;
			厚生年金保険料率: number;
		};
		const socialInsuranceMap = new Map<number, SocialInsuranceRates>();
		socialInsuranceMap.set(2020, {
			健康保険料率: 0.0981,
			介護保険料率: 0.0164,
			厚生年金保険料率: 0.183,
		});
		socialInsuranceMap.set(2023, {
			健康保険料率: 0.1,
			介護保険料率: 0.0165,
			厚生年金保険料率: 0.183,
		});

		fillMissingSocialInsuranceInfo(socialInsuranceMap, 2020, 2025);

		expect(socialInsuranceMap.get(2020)).toEqual({
			健康保険料率: 0.0981,
			介護保険料率: 0.0164,
			厚生年金保険料率: 0.183,
		});
		expect(socialInsuranceMap.get(2021)).toEqual({
			健康保険料率: 0.0981,
			介護保険料率: 0.0164,
			厚生年金保険料率: 0.183,
		});
		expect(socialInsuranceMap.get(2022)).toEqual({
			健康保険料率: 0.0981,
			介護保険料率: 0.0164,
			厚生年金保険料率: 0.183,
		});
		expect(socialInsuranceMap.get(2023)).toEqual({
			健康保険料率: 0.1,
			介護保険料率: 0.0165,
			厚生年金保険料率: 0.183,
		});
		expect(socialInsuranceMap.get(2024)).toEqual({
			健康保険料率: 0.1,
			介護保険料率: 0.0165,
			厚生年金保険料率: 0.183,
		});
		expect(socialInsuranceMap.get(2025)).toEqual({
			健康保険料率: 0.1,
			介護保険料率: 0.0165,
			厚生年金保険料率: 0.183,
		});
	});

	it("最初の年度に社会保険情報がない場合はデフォルト値（0）を設定", () => {
		type SocialInsuranceRates = {
			健康保険料率: number;
			介護保険料率: number;
			厚生年金保険料率: number;
		};
		const socialInsuranceMap = new Map<number, SocialInsuranceRates>();
		socialInsuranceMap.set(2022, {
			健康保険料率: 0.0981,
			介護保険料率: 0.0164,
			厚生年金保険料率: 0.183,
		});

		fillMissingSocialInsuranceInfo(socialInsuranceMap, 2020, 2025);

		expect(socialInsuranceMap.get(2020)).toEqual({
			健康保険料率: 0,
			介護保険料率: 0,
			厚生年金保険料率: 0,
		});
		expect(socialInsuranceMap.get(2021)).toEqual({
			健康保険料率: 0,
			介護保険料率: 0,
			厚生年金保険料率: 0,
		});
		expect(socialInsuranceMap.get(2022)).toEqual({
			健康保険料率: 0.0981,
			介護保険料率: 0.0164,
			厚生年金保険料率: 0.183,
		});
	});
});

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
			標準報酬月額等級: 27,
			標準報酬月額: 410000,
			健康保険料月額: 0,
			介護保険料月額: 0,
			厚生年金保険料月額: 0,
			社会保険料月額: 0,
			社会保険料年額: 0,
		});
		expect(data.年度一覧[5]).toEqual({
			西暦年: 2025,
			年齢: 35,
			収入金額: 6000000,
			給与所得控除額: 1640000,
			給与所得控除後の金額: 4360000,
			標準報酬月額等級: 30,
			標準報酬月額: 500000,
			健康保険料月額: 0,
			介護保険料月額: 0,
			厚生年金保険料月額: 0,
			社会保険料月額: 0,
			社会保険料年額: 0,
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
			標準報酬月額等級: 27,
			標準報酬月額: 410000,
			健康保険料月額: 0,
			介護保険料月額: 0,
			厚生年金保険料月額: 0,
			社会保険料月額: 0,
			社会保険料年額: 0,
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
			標準報酬月額等級: 30,
			標準報酬月額: 500000,
			健康保険料月額: 0,
			介護保険料月額: 0,
			厚生年金保険料月額: 0,
			社会保険料月額: 0,
			社会保険料年額: 0,
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
			標準報酬月額等級: 27,
			標準報酬月額: 410000,
			健康保険料月額: 0,
			介護保険料月額: 0,
			厚生年金保険料月額: 0,
			社会保険料月額: 0,
			社会保険料年額: 0,
		});

		// 2021年は2020年と同額で補完
		expect(data.年度一覧[1]).toEqual({
			西暦年: 2021,
			年齢: 31,
			収入金額: 5000000,
			給与所得控除額: 1440000,
			給与所得控除後の金額: 3560000,
			標準報酬月額等級: 27,
			標準報酬月額: 410000,
			健康保険料月額: 0,
			介護保険料月額: 0,
			厚生年金保険料月額: 0,
			社会保険料月額: 0,
			社会保険料年額: 0,
		});

		// 2022年も2020年と同額で補完
		expect(data.年度一覧[2]).toEqual({
			西暦年: 2022,
			年齢: 32,
			収入金額: 5000000,
			給与所得控除額: 1440000,
			給与所得控除後の金額: 3560000,
			標準報酬月額等級: 27,
			標準報酬月額: 410000,
			健康保険料月額: 0,
			介護保険料月額: 0,
			厚生年金保険料月額: 0,
			社会保険料月額: 0,
			社会保険料年額: 0,
		});

		// 2023年の情報
		expect(data.年度一覧[3]).toEqual({
			西暦年: 2023,
			年齢: 33,
			収入金額: 5500000,
			給与所得控除額: 1540000,
			給与所得控除後の金額: 3960000,
			標準報酬月額等級: 29,
			標準報酬月額: 470000,
			健康保険料月額: 0,
			介護保険料月額: 0,
			厚生年金保険料月額: 0,
			社会保険料月額: 0,
			社会保険料年額: 0,
		});

		// 2024年は2023年と同額で補完
		expect(data.年度一覧[4]).toEqual({
			西暦年: 2024,
			年齢: 34,
			収入金額: 5500000,
			給与所得控除額: 1540000,
			給与所得控除後の金額: 3960000,
			標準報酬月額等級: 29,
			標準報酬月額: 470000,
			健康保険料月額: 0,
			介護保険料月額: 0,
			厚生年金保険料月額: 0,
			社会保険料月額: 0,
			社会保険料年額: 0,
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
			標準報酬月額等級: 1,
			標準報酬月額: 58000,
			健康保険料月額: 0,
			介護保険料月額: 0,
			厚生年金保険料月額: 0,
			社会保険料月額: 0,
			社会保険料年額: 0,
		});

		// 2021年も給与情報がないので収入0（控除額は収入金額以下に制限）
		expect(data.年度一覧[1]).toEqual({
			西暦年: 2021,
			年齢: 31,
			収入金額: 0,
			給与所得控除額: 0,
			給与所得控除後の金額: 0,
			標準報酬月額等級: 1,
			標準報酬月額: 58000,
			健康保険料月額: 0,
			介護保険料月額: 0,
			厚生年金保険料月額: 0,
			社会保険料月額: 0,
			社会保険料年額: 0,
		});

		// 2022年は給与情報あり
		expect(data.年度一覧[2]).toEqual({
			西暦年: 2022,
			年齢: 32,
			収入金額: 5000000,
			給与所得控除額: 1440000,
			給与所得控除後の金額: 3560000,
			標準報酬月額等級: 27,
			標準報酬月額: 410000,
			健康保険料月額: 0,
			介護保険料月額: 0,
			厚生年金保険料月額: 0,
			社会保険料月額: 0,
			社会保険料年額: 0,
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

	it("社会保険料の計算テスト", async () => {
		const res = await app.request("/api/v1/life-planning/simulation", {
			method: "POST",
			body: JSON.stringify({
				生年月日: "1980-01-01",
				開始年: 2024,
				終了年: 2024,
				年度別給与情報: [{ 年度: 2024, 収入金額: 6000000 }],
				年度別社会保険情報: [
					{
						年度: 2024,
						健康保険料率: 0.0981,
						介護保険料率: 0.0164,
						厚生年金保険料率: 0.183,
					},
				],
			}),
			headers: new Headers({ "Content-Type": "application/json" }),
		});

		const data = await res.json();

		expect(res.status).toBe(200);
		expect(data.年度一覧).toHaveLength(1);

		const yearData = data.年度一覧[0];
		expect(yearData.西暦年).toBe(2024);
		expect(yearData.収入金額).toBe(6000000);

		// 月額50万円 → 標準報酬月額50万円(等級30)
		expect(yearData.標準報酬月額等級).toBe(30);
		expect(yearData.標準報酬月額).toBe(500000);

		// 健康保険料: 500,000 × 0.0981 ÷ 2 = 24,525円（小数点以下切り捨て）
		expect(yearData.健康保険料月額).toBe(24525);

		// 介護保険料: 500,000 × 0.0164 ÷ 2 = 4,100円（44歳なので発生）
		expect(yearData.介護保険料月額).toBe(4100);

		// 厚生年金保険料: 500,000 × 0.183 ÷ 2 = 45,750円
		expect(yearData.厚生年金保険料月額).toBe(45750);

		// 社会保険料合計
		expect(yearData.社会保険料月額).toBe(24525 + 4100 + 45750);
		expect(yearData.社会保険料年額).toBe((24525 + 4100 + 45750) * 12);
	});

	it("40歳未満は介護保険料0", async () => {
		const res = await app.request("/api/v1/life-planning/simulation", {
			method: "POST",
			body: JSON.stringify({
				生年月日: "1990-01-01",
				開始年: 2024,
				終了年: 2024,
				年度別給与情報: [{ 年度: 2024, 収入金額: 6000000 }],
				年度別社会保険情報: [
					{
						年度: 2024,
						健康保険料率: 0.0981,
						介護保険料率: 0.0164,
						厚生年金保険料率: 0.183,
					},
				],
			}),
			headers: new Headers({ "Content-Type": "application/json" }),
		});

		const data = await res.json();

		expect(res.status).toBe(200);
		expect(data.年度一覧).toHaveLength(1);

		const yearData = data.年度一覧[0];
		expect(yearData.年齢).toBe(34);

		// 健康保険料: 500,000 × 0.0981 ÷ 2 = 24,525円（小数点以下切り捨て）
		expect(yearData.健康保険料月額).toBe(24525);

		// 介護保険料: 34歳なので0円
		expect(yearData.介護保険料月額).toBe(0);

		// 厚生年金保険料: 500,000 × 0.183 ÷ 2 = 45,750円
		expect(yearData.厚生年金保険料月額).toBe(45750);

		// 社会保険料合計
		expect(yearData.社会保険料月額).toBe(24525 + 0 + 45750);
		expect(yearData.社会保険料年額).toBe((24525 + 0 + 45750) * 12);
	});

	it("社会保険情報なしの場合は保険料0", async () => {
		const res = await app.request("/api/v1/life-planning/simulation", {
			method: "POST",
			body: JSON.stringify({
				生年月日: "1990-01-01",
				開始年: 2024,
				終了年: 2024,
				年度別給与情報: [{ 年度: 2024, 収入金額: 5000000 }],
			}),
			headers: new Headers({ "Content-Type": "application/json" }),
		});

		const data = await res.json();

		expect(res.status).toBe(200);
		expect(data.年度一覧).toHaveLength(1);

		const yearData = data.年度一覧[0];
		expect(yearData.健康保険料月額).toBe(0);
		expect(yearData.介護保険料月額).toBe(0);
		expect(yearData.厚生年金保険料月額).toBe(0);
		expect(yearData.社会保険料月額).toBe(0);
		expect(yearData.社会保険料年額).toBe(0);
	});

	it("標準報酬月額の等級計算テスト", async () => {
		const res = await app.request("/api/v1/life-planning/simulation", {
			method: "POST",
			body: JSON.stringify({
				生年月日: "1990-01-01",
				開始年: 2024,
				終了年: 2026,
				年度別給与情報: [
					{ 年度: 2024, 収入金額: 1000000 }, // 月額約8.3万円 → 等級4（8.8万円）
					{ 年度: 2025, 収入金額: 3600000 }, // 月額30万円 → 等級22（30万円）
					{ 年度: 2026, 収入金額: 8000000 }, // 月額約66.7万円 → 等級35（65万円）
				],
			}),
			headers: new Headers({ "Content-Type": "application/json" }),
		});

		const data = await res.json();

		expect(res.status).toBe(200);
		expect(data.年度一覧).toHaveLength(3);

		// 月額約8.3万円 → 等級4（標準報酬月額8.8万円）
		expect(data.年度一覧[0].標準報酬月額等級).toBe(4);
		expect(data.年度一覧[0].標準報酬月額).toBe(88000);

		// 月額30万円 → 等級22（標準報酬月額30万円）
		expect(data.年度一覧[1].標準報酬月額等級).toBe(22);
		expect(data.年度一覧[1].標準報酬月額).toBe(300000);

		// 月額約66.7万円 → 等級36（標準報酬月額68万円）
		expect(data.年度一覧[2].標準報酬月額等級).toBe(36);
		expect(data.年度一覧[2].標準報酬月額).toBe(680000);
	});
});

describe("calculateHealthInsuranceStandardMonthlySalary", () => {
	it("最低等級未満の給与の場合は等級1を返す", () => {
		const result = calculateHealthInsuranceStandardMonthlySalary(30000);
		expect(result.grade).toBe(1);
		expect(result.standardAmount).toBe(58000);
	});

	it("等級1の範囲内の給与の場合は等級1を返す", () => {
		const result = calculateHealthInsuranceStandardMonthlySalary(50000);
		expect(result.grade).toBe(1);
		expect(result.standardAmount).toBe(58000);
	});

	it("等級1の上限丁度の給与の場合は等級2を返す", () => {
		const result = calculateHealthInsuranceStandardMonthlySalary(63000);
		expect(result.grade).toBe(2);
		expect(result.standardAmount).toBe(68000);
	});

	it("等級2の範囲内の給与の場合は等級2を返す", () => {
		const result = calculateHealthInsuranceStandardMonthlySalary(68000);
		expect(result.grade).toBe(2);
		expect(result.standardAmount).toBe(68000);
	});

	it("等級2の上限丁度の給与の場合は等級3を返す", () => {
		const result = calculateHealthInsuranceStandardMonthlySalary(73000);
		expect(result.grade).toBe(3);
		expect(result.standardAmount).toBe(78000);
	});

	it("中間等級の給与の場合は正しい等級を返す", () => {
		const result = calculateHealthInsuranceStandardMonthlySalary(300000);
		expect(result.grade).toBe(22);
		expect(result.standardAmount).toBe(300000);
	});

	it("最高等級の範囲内の給与の場合は最高等級を返す", () => {
		const result = calculateHealthInsuranceStandardMonthlySalary(1300000);
		expect(result.grade).toBe(49);
		expect(result.standardAmount).toBe(1330000);
	});

	it("最高等級を超える給与の場合は最高等級を返す", () => {
		const result = calculateHealthInsuranceStandardMonthlySalary(2000000);
		expect(result.grade).toBe(50);
		expect(result.standardAmount).toBe(1390000);
	});
});

describe("calculatePensionStandardMonthlySalary", () => {
	it("最低等級未満の給与の場合は等級4を返す", () => {
		const result = calculatePensionStandardMonthlySalary(80000);
		expect(result.grade).toBe(4);
		expect(result.standardAmount).toBe(88000);
	});

	it("等級4の範囲内の給与の場合は等級4を返す", () => {
		const result = calculatePensionStandardMonthlySalary(90000);
		expect(result.grade).toBe(4);
		expect(result.standardAmount).toBe(88000);
	});

	it("等級4の上限丁度の給与の場合は等級5を返す", () => {
		const result = calculatePensionStandardMonthlySalary(93000);
		expect(result.grade).toBe(5);
		expect(result.standardAmount).toBe(98000);
	});

	it("等級5の範囲内の給与の場合は等級5を返す", () => {
		const result = calculatePensionStandardMonthlySalary(98000);
		expect(result.grade).toBe(5);
		expect(result.standardAmount).toBe(98000);
	});

	it("等級5の上限丁度の給与の場合は等級6を返す", () => {
		const result = calculatePensionStandardMonthlySalary(101000);
		expect(result.grade).toBe(6);
		expect(result.standardAmount).toBe(104000);
	});

	it("中間等級の給与の場合は正しい等級を返す", () => {
		const result = calculatePensionStandardMonthlySalary(300000);
		expect(result.grade).toBe(22);
		expect(result.standardAmount).toBe(300000);
	});

	it("最高等級の範囲内の給与の場合は最高等級を返す", () => {
		const result = calculatePensionStandardMonthlySalary(620000);
		expect(result.grade).toBe(34);
		expect(result.standardAmount).toBe(620000);
	});

	it("最高等級を超える給与の場合は最高等級を返す", () => {
		const result = calculatePensionStandardMonthlySalary(1000000);
		expect(result.grade).toBe(35);
		expect(result.standardAmount).toBe(650000);
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
