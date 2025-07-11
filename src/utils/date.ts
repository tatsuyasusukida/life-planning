import type { SocialInsuranceRates } from "../types";

/**
 * デフォルトの社会保険料率（保険料率0）
 */
const DEFAULT_SOCIAL_INSURANCE_RATES: SocialInsuranceRates = {
	健康保険料率: 0,
	介護保険料率: 0,
	厚生年金保険料率: 0,
};

/**
 * 省略された年度の給与情報を前年度のデータで補完する
 * @param salaryInfoMap 年度別給与情報
 * @param startYear 開始年
 * @param endYear 終了年
 */
export function fillMissingSalaryInfo(
	salaryInfoMap: Map<number, number>,
	startYear: number,
	endYear: number,
): void {
	let lastValidSalary = 0;
	for (let year = startYear; year <= endYear; year++) {
		if (salaryInfoMap.has(year)) {
			const salary = salaryInfoMap.get(year);
			if (salary !== undefined) {
				lastValidSalary = salary;
			}
		} else if (lastValidSalary > 0) {
			salaryInfoMap.set(year, lastValidSalary);
		}
	}
}

/**
 * 省略された年度の社会保険情報を前年度のデータで補完する
 * 前年度のデータが利用できない場合、デフォルトの保険料率0を適用する
 * @param socialInsuranceMap 年度別社会保険情報
 * @param startYear 開始年
 * @param endYear 終了年
 */
export function fillMissingSocialInsuranceInfo(
	socialInsuranceMap: Map<number, SocialInsuranceRates>,
	startYear: number,
	endYear: number,
): void {
	let lastValidRates: SocialInsuranceRates | null = null;
	for (let year = startYear; year <= endYear; year++) {
		if (socialInsuranceMap.has(year)) {
			const rates = socialInsuranceMap.get(year);
			if (rates !== undefined) {
				lastValidRates = rates;
			}
		} else if (lastValidRates !== null) {
			socialInsuranceMap.set(year, { ...lastValidRates });
		} else {
			// デフォルト値（保険料率0）を設定
			socialInsuranceMap.set(year, { ...DEFAULT_SOCIAL_INSURANCE_RATES });
		}
	}
}
