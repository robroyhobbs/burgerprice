import { existsSync } from "node:fs";
import { dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * node --test strips TypeScript but does not resolve the extensionless
 * imports the Next app uses. Append .ts when that file exists.
 */
export async function resolve(specifier, context, nextResolve) {
  if (
    (specifier.startsWith("./") || specifier.startsWith("../")) &&
    extname(specifier) === ""
  ) {
    const parent = context.parentURL
      ? fileURLToPath(context.parentURL)
      : process.cwd();
    const candidate = join(dirname(parent), `${specifier}.ts`);
    if (existsSync(candidate)) {
      return nextResolve(`${specifier}.ts`, context);
    }
  }
  return nextResolve(specifier, context);
}
