import { swaggerUI } from "@hono/swagger-ui";
import { OpenAPIHono } from "@hono/zod-openapi";
import {
	errorHandler,
	validationErrorHandler,
} from "./middleware/error-handler";
import { lifePlanningHandler, lifePlanningRoute } from "./routes/life-planning";

const app = new OpenAPIHono({
	defaultHook: validationErrorHandler,
});

app.get("/", (c) => {
	return c.text("Hello Hono!");
});

app.doc("/doc", {
	openapi: "3.0.0",
	info: {
		version: "1.0.0",
		title: "Life Planning API",
		description: "API for life planning simulation",
	},
});

app.get("/ui", swaggerUI({ url: "/doc" }));

app.openapi(lifePlanningRoute, lifePlanningHandler);

app.onError(errorHandler);

export default app;
