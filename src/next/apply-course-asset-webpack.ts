import path from 'node:path';

type ApplyOptions = {
  basePath?: string;
  isServer: boolean;
  projectRoot: string;
};

type WebpackRuleLike = {
  test?: unknown;
  type?: unknown;
  oneOf?: WebpackRuleLike[];
  exclude?: unknown;
  generator?: unknown;
  [key: string]: unknown;
};

type WebpackConfigLike = {
  output: {
    path: string;
  };
  module: {
    rules: WebpackRuleLike[];
  };
  [key: string]: unknown;
};

const normalizeBasePath = (basePath: string | undefined) => {
  if (!basePath) return '';
  const trimmed = basePath.trim();
  if (!trimmed || trimmed === '/') return '';
  return trimmed.startsWith('/') ? trimmed.replace(/\/+$/, '') : `/${trimmed.replace(/\/+$/, '')}`;
};

const isRegExp = (value: unknown): value is RegExp => value instanceof RegExp;

const isExcludeFunction = (value: unknown): value is (resourcePath: string) => boolean =>
  typeof value === 'function';

export function applyCourseAssetWebpackRules(config: WebpackConfigLike, options: ApplyOptions) {
  const basePath = normalizeBasePath(options.basePath);
  const assetCssPattern = /[\\/]content[\\/].*[\\/]assets[\\/].*\.css$/i;
  const staticMediaFilename = 'static/media/[name].[hash][ext]';
  const staticMediaPublicPath = `${basePath}/_next/`;
  const nextOutputRoot = path.join(options.projectRoot, '.next');
  const staticMediaOutputPath = options.isServer
    ? path.relative(config.output.path, nextOutputRoot)
    : undefined;

  config.module.rules.unshift({
    test: assetCssPattern,
    type: 'asset/resource',
    generator: {
      filename: staticMediaFilename,
      publicPath: staticMediaPublicPath,
      outputPath: staticMediaOutputPath,
    },
  });

  const matchesExclude = (exclude: unknown, resourcePath: string) => {
    if (!exclude) return false;
    if (isRegExp(exclude)) return exclude.test(resourcePath);
    if (isExcludeFunction(exclude)) return exclude(resourcePath);
    return false;
  };

  for (const rule of config.module.rules) {
    if (!Array.isArray(rule.oneOf)) continue;

    for (const oneOfRule of rule.oneOf) {
      if (!isRegExp(oneOfRule.test)) continue;
      if (!oneOfRule.test.test('test.css')) continue;

      const existingExclude = oneOfRule.exclude;
      oneOfRule.exclude = (resourcePath: string) => {
        if (assetCssPattern.test(resourcePath)) return true;
        if (!existingExclude) return false;
        if (Array.isArray(existingExclude)) {
          return existingExclude.some((exclude) => matchesExclude(exclude, resourcePath));
        }
        return matchesExclude(existingExclude, resourcePath);
      };
    }
  }

  config.module.rules.push({
    test: /\.(png|jpe?g|gif|svg|webp|avif|ico|txt|zip|html)$/i,
    type: 'asset/resource',
    generator: {
      filename: staticMediaFilename,
      publicPath: staticMediaPublicPath,
      outputPath: staticMediaOutputPath,
    },
  });

  return config;
}
