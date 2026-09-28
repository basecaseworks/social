import "dotenv/config";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/db/schema/index.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url:
      process.env.DATABASE_URL ??
      process.env.TEST_DATABASE_URL ??
      "postgres://postgres:postgres@localhost:5432/social",
  },
  casing: "snake_case",
});
