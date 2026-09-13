import {defineConfig} from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
    plugins: [react()],
    test: {
        environment: "jsdom",
        setupFiles: ["./test/setup.ts"],
        globals: true,
        css: true,
        include: ["test/**/*.test.{ts,tsx}"],
        coverage: {
            provider: "v8",
            reporter: ["text", "html", "lcov"],
            include: ["app/**/*.{ts,tsx}"],
            exclude: [
                "app/**/*.d.ts",
                "app/lib/types/**",
                "app/lib/enums/**",
                "app/**/layout.tsx",
                "app/globals.css",
            ],
        },
    },
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "."),
        },
    },
});