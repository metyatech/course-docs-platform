import type { Root } from 'mdast';
import type { Node, Parent } from 'unist';
import { visit } from 'unist-util-visit';

const SUPPORTED_TYPES = new Set(['tip', 'info', 'note', 'caution', 'danger']);

interface DirectiveNode extends Parent {
  type: 'containerDirective';
  name: string;
  label?: string;
  attributes?: Record<string, string>;
}

const toMdxAttribute = (name: string, value: string) => ({
  type: 'mdxJsxAttribute',
  name,
  value,
});

export default function remarkAdmonitionsToMdx() {
  return function transform(tree: Root) {
    visit(tree, (node: Node) => {
      if (node.type !== 'containerDirective') return;
      const directive = node as DirectiveNode;
      if (!SUPPORTED_TYPES.has(directive.name)) return;

      const admonitionType = directive.name;
      const title =
        typeof directive.label === 'string' && directive.label.trim().length > 0
          ? directive.label.trim()
          : undefined;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mdxNode = node as any;
      mdxNode.type = 'mdxJsxFlowElement';
      mdxNode.name = 'Admonition';
      mdxNode.attributes = [
        toMdxAttribute('type', admonitionType),
        ...(title ? [toMdxAttribute('title', title)] : []),
      ];
    });
  };
}
