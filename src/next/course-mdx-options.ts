import remarkGfm from 'remark-gfm';
import remarkDirective from 'remark-directive';
import remarkAdmonitionsToMdx from '../mdx/remark-admonitions-to-mdx.js';

export const courseRemarkPlugins = [
  remarkGfm,
  remarkDirective,
  remarkAdmonitionsToMdx,
] as const;

export const courseMdxOptions = {
  remarkPlugins: courseRemarkPlugins,
};

