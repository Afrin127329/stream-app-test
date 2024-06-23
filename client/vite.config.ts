import react from "@vitejs/plugin-react-swc";
import { defineConfig } from "vite";

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    base: "/",
    build: {
        outDir: "dist",
        assetsDir: "assets",
        emptyOutDir: true,
    },
    resolve: {
        extensions: [".js", ".mjs", ".ts", ".jsx", ".tsx", ".json"],
    },
});
