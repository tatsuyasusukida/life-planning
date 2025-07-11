import { describe, expect, it } from "vitest";
import { calculateSalaryDeduction } from "./salary";

describe("calculateSalaryDeduction", () => {
	it("162.5万円以下の場合は55万円", () => {
		const result = calculateSalaryDeduction(1000000);
		expect(result).toBe(550000);
	});

	it("162.5万円超180万円以下の場合は収入金額×40%－10万円", () => {
		const result = calculateSalaryDeduction(1700000);
		expect(result).toBe(580000); // 170万円×40%－10万円 = 580,000円
	});

	it("180万円超360万円以下の場合は収入金額×30%＋8万円", () => {
		const result = calculateSalaryDeduction(3000000);
		expect(result).toBe(980000); // 300万円×30%＋8万円 = 980,000円
	});

	it("360万円超660万円以下の場合は収入金額×20%＋44万円", () => {
		const result = calculateSalaryDeduction(5000000);
		expect(result).toBe(1440000); // 500万円×20%＋44万円 = 1,440,000円
	});

	it("660万円超850万円以下の場合は収入金額×10%＋110万円", () => {
		const result = calculateSalaryDeduction(7000000);
		expect(result).toBe(1800000); // 700万円×10%＋110万円 = 1,800,000円
	});

	it("850万円超の場合は195万円（上限）", () => {
		const result = calculateSalaryDeduction(10000000);
		expect(result).toBe(1950000); // 1000万円 → 1,950,000円（上限）
	});
});
