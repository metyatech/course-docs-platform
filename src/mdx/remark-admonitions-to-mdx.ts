import { visit } from 'unist-util-visit';
import type { Root, Node } from 'mdast';

const SUPPORTED_TYPES = new Set(['tip', 'info', 'note', 'caution', 'danger']);

interface AdmonitionNode extends Node {
  type: string;
  name: string;
  label?: string;
  attributes?: Array<{ type: string; name: string; value: string | null }>;
  children?: Node[];
}

const toMdxAttribute = (name: string, value: string) => ({
  type: 'mdxJsxAttribute',
  name,
  value,
});

export default function remarkAdmonitionsToMdx() {
  return function transform(tree: Root) {
    visit(tree, (node: Node) => {
      const admonitionNode = node as AdmonitionNode;
      if (admonitionNode.type !== 'containerDirective') return;
      if (!SUPPORTED_TYPES.has(admonitionNode.name)) return;

      const admonitionType = admonitionNode.name;
      const title =
        typeof admonitionNode.label === 'string' && admonitionNode.label.trim().length > 0
          ? admonitionNode.label.trim()
          : undefined;

      admonitionNode.type = 'mdxJsxFlowElement';
      admonitionNode.name = 'Admonition';
      admonitionNode.attributes = [
        toMdxAttribute('type', admonitionType),
        ...(title ? [toMdxAttribute('title', title)] : []),
      ];
      admonitionNode.children = admonitionNode.children ?? [];
    });
  };
}
