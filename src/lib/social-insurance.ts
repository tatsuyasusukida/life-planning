import type { SocialInsuranceRates } from "../types";
import {
	HEALTH_INSURANCE_MONTHLY_SALARY_GRADES,
	PENSION_MONTHLY_SALARY_GRADES,
} from "./constants/social-insurance";

/**
 * 健康保険の月額給与から標準報酬月額の等級と金額を計算する
 * @param monthlySalary 月額給与
 * @returns 標準報酬月額の等級と金額
 */
export function calculateHealthInsuranceStandardMonthlySalary(
	monthlySalary: number,
): {
	grade: number;
	standardAmount: number;
} {
	// 負の値は最低等級を適用
	if (monthlySalary < 0) {
		const firstGrade = HEALTH_INSURANCE_MONTHLY_SALARY_GRADES[0];
		return {
			grade: firstGrade.grade,
			standardAmount: firstGrade.standardAmount,
		};
	}

	for (const gradeInfo of HEALTH_INSURANCE_MONTHLY_SALARY_GRADES) {
		if (monthlySalary >= gradeInfo.min && monthlySalary < gradeInfo.max) {
			return {
				grade: gradeInfo.grade,
				standardAmount: gradeInfo.standardAmount,
			};
		}
	}

	// 最高等級を適用
	const lastGrade =
		HEALTH_INSURANCE_MONTHLY_SALARY_GRADES[
			HEALTH_INSURANCE_MONTHLY_SALARY_GRADES.length - 1
		];
	return {
		grade: lastGrade.grade,
		standardAmount: lastGrade.standardAmount,
	};
}

/**
 * 厚生年金保険の月額給与から標準報酬月額の等級と金額を計算する
 * @param monthlySalary 月額給与
 * @returns 標準報酬月額の等級と金額
 */
export function calculatePensionStandardMonthlySalary(monthlySalary: number): {
	grade: number;
	standardAmount: number;
} {
	// 負の値は最低等級を適用
	if (monthlySalary < 0) {
		const firstGrade = PENSION_MONTHLY_SALARY_GRADES[0];
		return {
			grade: firstGrade.grade,
			standardAmount: firstGrade.standardAmount,
		};
	}

	for (const gradeInfo of PENSION_MONTHLY_SALARY_GRADES) {
		if (monthlySalary >= gradeInfo.min && monthlySalary < gradeInfo.max) {
			return {
				grade: gradeInfo.grade,
				standardAmount: gradeInfo.standardAmount,
			};
		}
	}

	// 最高等級を適用
	const lastGrade =
		PENSION_MONTHLY_SALARY_GRADES[PENSION_MONTHLY_SALARY_GRADES.length - 1];
	return {
		grade: lastGrade.grade,
		standardAmount: lastGrade.standardAmount,
	};
}

/**
 * 社会保険料を計算する
 * @param healthInsuranceStandardSalary 健康保険用標準報酬月額
 * @param pensionStandardSalary 厚生年金保険用標準報酬月額
 * @param rates 保険料率
 * @param age 年齢（介護保険料は40歳以上が対象）
 * @returns 各種保険料
 */
export function calculateSocialInsurancePremiums(
	healthInsuranceStandardSalary: number,
	pensionStandardSalary: number,
	rates: SocialInsuranceRates,
	age: number,
): {
	健康保険料月額: number;
	介護保険料月額: number;
	厚生年金保険料月額: number;
	社会保険料月額: number;
} {
	// 保険料は従業員負担分のみ計算（労使折半のため料率を2で割る）
	const 健康保険料月額 = Math.floor(
		(healthInsuranceStandardSalary * rates.健康保険料率) / 2,
	);
	// 介護保険料は40歳から発生
	const 介護保険料月額 =
		age >= 40
			? Math.floor((healthInsuranceStandardSalary * rates.介護保険料率) / 2)
			: 0;
	const 厚生年金保険料月額 = Math.floor(
		(pensionStandardSalary * rates.厚生年金保険料率) / 2,
	);
	const 社会保険料月額 = 健康保険料月額 + 介護保険料月額 + 厚生年金保険料月額;

	return {
		健康保険料月額,
		介護保険料月額,
		厚生年金保険料月額,
		社会保険料月額,
	};
}
