/**
 * 給与所得控除額を計算する
 * @param income 収入金額
 * @returns 給与所得控除額
 */
export function calculateSalaryDeduction(income: number): number {
	if (income <= 1625000) {
		return 550000;
	}
	if (income <= 1800000) {
		return Math.floor(income * 0.4 - 100000);
	}
	if (income <= 3600000) {
		return Math.floor(income * 0.3 + 80000);
	}
	if (income <= 6600000) {
		return Math.floor(income * 0.2 + 440000);
	}
	if (income <= 8500000) {
		return Math.floor(income * 0.1 + 1100000);
	}
	return 1950000;
}
