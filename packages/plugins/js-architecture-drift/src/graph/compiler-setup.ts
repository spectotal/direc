import { resolve, relative, join, dirname } from "node:path";
import { existsSync } from "node:fs";
import ts from "typescript";

function getPathsMaps(
  packageBoundaries: Array<{ name?: string; root?: string }>,
  repositoryRoot: string,
): Record<string, string[]> {
  const maps: Record<string, string[]> = {};
  for (const { name, root } of packageBoundaries) {
    if (name && root) {
      const relativeSrcPath = relative(repositoryRoot, join(root, "src"));
      maps[name] = [relativeSrcPath];
      maps[`${name}/*`] = [`${relativeSrcPath}/*`];
    }
  }
  return maps;
}

export function resolveCompilerOptions(options: {
  repositoryRoot: string;
  tsConfigPath?: string;
  packageBoundaries?: Array<{ name?: string; root?: string }>;
}): ts.CompilerOptions {
  const pathsMaps = getPathsMaps(options.packageBoundaries || [], options.repositoryRoot);
  let compilerOptions: ts.CompilerOptions = {};

  if (options.tsConfigPath) {
    const configPath = resolve(options.repositoryRoot, options.tsConfigPath);
    if (existsSync(configPath)) {
      const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
      const parsedConfig = ts.parseJsonConfigFileContent(
        configFile.config,
        ts.sys,
        dirname(configPath),
      );
      compilerOptions = parsedConfig.options;
    }
  }

  return {
    ...compilerOptions,
    baseUrl: options.repositoryRoot,
    paths: { ...(compilerOptions.paths || {}), ...pathsMaps },
  };
}
