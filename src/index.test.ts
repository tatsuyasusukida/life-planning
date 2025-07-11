import { describe, expect, it } from "vitest";
import app from "./index";

describe("Application Integration", () => {
	it("基本的なアプリケーションの動作確認", async () => {
		const res = await app.request("/");

		expect(res.status).toBe(200);
		expect(await res.text()).toBe("Hello Hono!");
	});
});
