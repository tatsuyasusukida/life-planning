import { describe, expect, it } from "vitest";
import type { SocialInsuranceRates } from "../types";
import {
	calculateHealthInsuranceStandardMonthlySalary,
	calculatePensionStandardMonthlySalary,
	calculateSocialInsurancePremiums,
} from "./social-insurance";

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

describe("calculateSocialInsurancePremiums", () => {
	const rates: SocialInsuranceRates = {
		健康保険料率: 0.0981,
		介護保険料率: 0.0164,
		厚生年金保険料率: 0.183,
	};

	it("40歳未満の場合は介護保険料が0円", () => {
		const result = calculateSocialInsurancePremiums(
			500000, // 健康保険用標準報酬月額
			500000, // 厚生年金保険用標準報酬月額
			rates,
			39, // 39歳
		);

		expect(result.健康保険料月額).toBe(24525); // 500000 × 0.0981 ÷ 2
		expect(result.介護保険料月額).toBe(0); // 40歳未満なので0
		expect(result.厚生年金保険料月額).toBe(45750); // 500000 × 0.183 ÷ 2
		expect(result.社会保険料月額).toBe(24525 + 0 + 45750);
	});

	it("40歳以上の場合は介護保険料が発生", () => {
		const result = calculateSocialInsurancePremiums(
			500000, // 健康保険用標準報酬月額
			500000, // 厚生年金保険用標準報酬月額
			rates,
			40, // 40歳
		);

		expect(result.健康保険料月額).toBe(24525); // 500000 × 0.0981 ÷ 2
		expect(result.介護保険料月額).toBe(4100); // 500000 × 0.0164 ÷ 2
		expect(result.厚生年金保険料月額).toBe(45750); // 500000 × 0.183 ÷ 2
		expect(result.社会保険料月額).toBe(24525 + 4100 + 45750);
	});

	it("負の標準報酬月額の場合は負の値のまま計算", () => {
		const result = calculateSocialInsurancePremiums(
			-100000, // 負の値
			-100000, // 負の値
			rates,
			45, // 45歳
		);

		expect(result.健康保険料月額).toBe(-4905); // -100000 × 0.0981 ÷ 2 = -4905
		expect(result.介護保険料月額).toBe(-821); // -100000 × 0.0164 ÷ 2 = -820 → Math.floor(-820) = -821
		expect(result.厚生年金保険料月額).toBe(-9150); // -100000 × 0.183 ÷ 2 = -9150
		expect(result.社会保険料月額).toBe(-4905 + -821 + -9150);
	});

	it("標準報酬月額が0の場合は0円", () => {
		const result = calculateSocialInsurancePremiums(
			0, // 0円
			0, // 0円
			rates,
			45, // 45歳
		);

		expect(result.健康保険料月額).toBe(0);
		expect(result.介護保険料月額).toBe(0);
		expect(result.厚生年金保険料月額).toBe(0);
		expect(result.社会保険料月額).toBe(0);
	});

	it("保険料率が0の場合は0円", () => {
		const zeroRates: SocialInsuranceRates = {
			健康保険料率: 0,
			介護保険料率: 0,
			厚生年金保険料率: 0,
		};

		const result = calculateSocialInsurancePremiums(
			500000, // 健康保険用標準報酬月額
			500000, // 厚生年金保険用標準報酬月額
			zeroRates,
			45, // 45歳
		);

		expect(result.健康保険料月額).toBe(0);
		expect(result.介護保険料月額).toBe(0);
		expect(result.厚生年金保険料月額).toBe(0);
		expect(result.社会保険料月額).toBe(0);
	});

	it("高額な標準報酬月額の場合も正しく計算", () => {
		const result = calculateSocialInsurancePremiums(
			1390000, // 健康保険の最高等級
			650000, // 厚生年金の最高等級
			rates,
			50, // 50歳
		);

		expect(result.健康保険料月額).toBe(68179); // 1390000 × 0.0981 ÷ 2 = 68179.5 → 68179
		expect(result.介護保険料月額).toBe(11398); // 1390000 × 0.0164 ÷ 2 = 11398
		expect(result.厚生年金保険料月額).toBe(59475); // 650000 × 0.183 ÷ 2 = 59475
		expect(result.社会保険料月額).toBe(68179 + 11398 + 59475);
	});

	it("小数点以下は切り捨てで計算", () => {
		const result = calculateSocialInsurancePremiums(
			100000, // 健康保険用標準報酬月額
			100000, // 厚生年金保険用標準報酬月額
			rates,
			45, // 45歳
		);

		// 100000 × 0.0981 ÷ 2 = 4905
		expect(result.健康保険料月額).toBe(4905);
		// 100000 × 0.0164 ÷ 2 = 820
		expect(result.介護保険料月額).toBe(820);
		// 100000 × 0.183 ÷ 2 = 9150
		expect(result.厚生年金保険料月額).toBe(9150);
		expect(result.社会保険料月額).toBe(4905 + 820 + 9150);
	});

	it("健康保険と厚生年金の標準報酬月額が異なる場合", () => {
		const result = calculateSocialInsurancePremiums(
			300000, // 健康保険用標準報酬月額
			400000, // 厚生年金保険用標準報酬月額
			rates,
			45, // 45歳
		);

		expect(result.健康保険料月額).toBe(14715); // 300000 × 0.0981 ÷ 2
		expect(result.介護保険料月額).toBe(2460); // 300000 × 0.0164 ÷ 2
		expect(result.厚生年金保険料月額).toBe(36600); // 400000 × 0.183 ÷ 2
		expect(result.社会保険料月額).toBe(14715 + 2460 + 36600);
	});
});
