import { Options } from "tsup";

export const tsup: Options = {
    target: "node16",
    entryPoints: ["./src/index.ts", "./src/cli.ts"],
    clean: true,
    sourcemap: true,
    dts: false,
    bundle: true,
    splitting: true,
    format: ["cjs"],
    external: ["@prisma/client", "prisma", "urql"],
};
