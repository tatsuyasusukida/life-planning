import { createRoute } from "@hono/zod-openapi";
import type { z } from "zod";
import { MAX_ALLOWED_AGE } from "../lib/constants/social-insurance";
import { calculateSalaryDeduction } from "../lib/salary";
import {
	calculateHealthInsuranceStandardMonthlySalary,
	calculatePensionStandardMonthlySalary,
	calculateSocialInsurancePremiums,
} from "../lib/social-insurance";
import {
	ErrorResponseSchema,
	LifePlanningRequestSchema,
	LifePlanningResponseSchema,
} from "../schemas/life-planning";
import type { SocialInsuranceRates } from "../types";
import {
	fillMissingSalaryInfo,
	fillMissingSocialInsuranceInfo,
} from "../utils/date";

type LifePlanningRequest = z.infer<typeof LifePlanningRequestSchema>;

export const lifePlanningRoute = createRoute({
	method: "post",
	path: "/api/v1/life-planning/simulation",
	request: {
		body: {
			content: {
				"application/json": {
					schema: LifePlanningRequestSchema,
				},
			},
		},
	},
	responses: {
		200: {
			content: {
				"application/json": {
					schema: LifePlanningResponseSchema,
				},
			},
			description: "Successful life planning simulation",
		},
		400: {
			content: {
				"application/json": {
					schema: ErrorResponseSchema,
				},
			},
			description: "Bad request",
		},
		500: {
			content: {
				"application/json": {
					schema: ErrorResponseSchema,
				},
			},
			description: "Internal server error",
		},
	},
});

export const lifePlanningHandler = async (c: any) => {
	const body = c.req.valid("json") as LifePlanningRequest;

	if (body.開始年 > body.終了年) {
		return c.json({ エラー: "開始年は終了年以下である必要があります" }, 400);
	}

	const birthDate = new Date(body.生年月日);

	// 年齢の妥当性チェック
	const maxAgeInEndYear = body.終了年 - birthDate.getFullYear();
	if (maxAgeInEndYear > MAX_ALLOWED_AGE) {
		return c.json(
			{
				エラー: `年齢が上限の${MAX_ALLOWED_AGE}歳を超えています`,
			},
			400,
		);
	}
	const salaryInfoMap = new Map<number, number>();
	for (const info of body.年度別給与情報) {
		salaryInfoMap.set(info.年度, info.収入金額);
	}

	// 省略された年度の給与情報を前年度のデータで補完
	fillMissingSalaryInfo(salaryInfoMap, body.開始年, body.終了年);

	// 社会保険情報のマップを作成
	const socialInsuranceMap = new Map<number, SocialInsuranceRates>();
	if (body.年度別社会保険情報) {
		for (const info of body.年度別社会保険情報) {
			socialInsuranceMap.set(info.年度, {
				健康保険料率: info.健康保険料率,
				介護保険料率: info.介護保険料率,
				厚生年金保険料率: info.厚生年金保険料率,
			});
		}
	}

	// 省略された年度の社会保険情報を前年度のデータで補完
	fillMissingSocialInsuranceInfo(socialInsuranceMap, body.開始年, body.終了年);

	const years: Array<{
		西暦年: number;
		年齢: number;
		収入金額: number;
		給与所得控除額: number;
		給与所得控除後の金額: number;
		標準報酬月額等級: number;
		標準報酬月額: number;
		健康保険料月額: number;
		介護保険料月額: number;
		厚生年金保険料月額: number;
		社会保険料月額: number;
		社会保険料年額: number;
	}> = [];

	for (let year = body.開始年; year <= body.終了年; year++) {
		// 1月1日時点での満年齢を計算
		const currentYearStart = new Date(year, 0, 1); // 年の1月1日
		const age =
			currentYearStart.getFullYear() -
			birthDate.getFullYear() -
			(currentYearStart <
			new Date(
				currentYearStart.getFullYear(),
				birthDate.getMonth(),
				birthDate.getDate(),
			)
				? 1
				: 0);

		const income = salaryInfoMap.get(year) ?? 0;
		const deduction = Math.min(calculateSalaryDeduction(income), income);
		const afterDeduction = income - deduction;

		// 標準報酬月額の計算
		const monthlySalary = income / 12;
		const healthInsuranceStandardSalaryInfo =
			calculateHealthInsuranceStandardMonthlySalary(monthlySalary);
		const pensionStandardSalaryInfo =
			calculatePensionStandardMonthlySalary(monthlySalary);

		// 社会保険料の計算
		const socialInsuranceRates = socialInsuranceMap.get(year) ?? {
			健康保険料率: 0,
			介護保険料率: 0,
			厚生年金保険料率: 0,
		};
		const socialInsurancePremiums = calculateSocialInsurancePremiums(
			healthInsuranceStandardSalaryInfo.standardAmount,
			pensionStandardSalaryInfo.standardAmount,
			socialInsuranceRates,
			age,
		);

		const yearData = {
			西暦年: year,
			年齢: age,
			収入金額: income,
			給与所得控除額: deduction,
			給与所得控除後の金額: afterDeduction,
			標準報酬月額等級: healthInsuranceStandardSalaryInfo.grade,
			標準報酬月額: healthInsuranceStandardSalaryInfo.standardAmount,
			健康保険料月額: socialInsurancePremiums.健康保険料月額,
			介護保険料月額: socialInsurancePremiums.介護保険料月額,
			厚生年金保険料月額: socialInsurancePremiums.厚生年金保険料月額,
			社会保険料月額: socialInsurancePremiums.社会保険料月額,
			社会保険料年額: socialInsurancePremiums.社会保険料月額 * 12,
		};

		years.push(yearData);
	}

	return c.json({ 年度一覧: years }, 200);
};
