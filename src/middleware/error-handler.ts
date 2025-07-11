import type { Context, ErrorHandler } from "hono";

export const errorHandler: ErrorHandler = (err, c) => {
	if (
		err.name === "SyntaxError" ||
		err.message.includes("Unexpected token") ||
		err.message.includes("JSON") ||
		err.message.includes("Malformed")
	) {
		return c.json({ エラー: "JSONフォーマットが正しくありません" }, 400);
	}

	return c.json({ エラー: "内部サーバーエラーが発生しました" }, 500);
};

export const validationErrorHandler = (result: any, c: Context) => {
	if (!result.success) {
		const firstIssue = result.error.issues[0];

		if (
			firstIssue.code === "invalid_type" &&
			firstIssue.received === "undefined"
		) {
			return c.json(
				{
					エラー: `必須パラメータが不足しています: ${firstIssue.path.join(".")}`,
				},
				400,
			);
		}

		if (
			firstIssue.code === "invalid_string" &&
			firstIssue.validation === "date"
		) {
			return c.json(
				{
					エラー: `${firstIssue.path.join(".")}の日付形式が正しくありません。YYYY-MM-DD形式で入力してください`,
				},
				400,
			);
		}

		if (firstIssue.code === "too_small") {
			return c.json(
				{
					エラー: `${firstIssue.path.join(".")}は${firstIssue.minimum}以上である必要があります`,
				},
				400,
			);
		}

		if (firstIssue.code === "too_big") {
			return c.json(
				{
					エラー: `${firstIssue.path.join(".")}は${firstIssue.maximum}以下である必要があります`,
				},
				400,
			);
		}

		if (firstIssue.code === "invalid_type") {
			return c.json(
				{
					エラー: `${firstIssue.path.join(".")}の型が正しくありません。${firstIssue.expected}型である必要がありますが、${firstIssue.received}型が入力されました`,
				},
				400,
			);
		}

		return c.json(
			{
				エラー: `${firstIssue.path.join(".")}のバリデーションエラー: ${firstIssue.message}`,
			},
			400,
		);
	}
};
