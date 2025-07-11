import { describe, expect, it } from "vitest";
import type { SocialInsuranceRates } from "../types";
import { fillMissingSalaryInfo, fillMissingSocialInsuranceInfo } from "./date";

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
