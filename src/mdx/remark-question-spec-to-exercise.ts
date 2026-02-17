import { visit } from 'unist-util-visit';
import type { Node } from 'unist';

type AstNode = Node & Record<string, unknown>;

type HeadingNode = AstNode & {
  type: 'heading';
  depth: number;
};

type MdxJsxAttribute = AstNode & {
  type: 'mdxJsxAttribute';
  name: string;
  value: string | null;
};

type MdxJsxFlowElement = AstNode & {
  type: 'mdxJsxFlowElement';
  name: string;
  attributes: MdxJsxAttribute[];
  children: AstNode[];
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isAstNode = (value: unknown): value is AstNode =>
  isRecord(value) && typeof value['type'] === 'string';

const toAstNodeArray = (value: unknown): AstNode[] =>
  Array.isArray(value) ? value.filter(isAstNode) : [];

const toMdxAttribute = (name: string, value: string): MdxJsxAttribute => ({
  type: 'mdxJsxAttribute',
  name,
  value,
});

const toMdxBooleanAttribute = (name: string): MdxJsxAttribute => ({
  type: 'mdxJsxAttribute',
  name,
  value: null,
});

const isHeading = (node: unknown, depth?: number): node is HeadingNode => {
  if (!isRecord(node)) return false;
  if (node['type'] !== 'heading') return false;

  const nodeDepth = node['depth'];
  if (typeof nodeDepth !== 'number') return false;

  return depth == null || nodeDepth === depth;
};

const getText = (node: unknown): string => {
  if (!isRecord(node)) return '';

  const value = node['value'];
  if (typeof value === 'string') return value;

  const children = node['children'];
  if (Array.isArray(children)) return children.map(getText).join('');
  return '';
};

const normalizeHeadingText = (node: unknown) => getText(node).trim();

const replaceClozeMarkers = (value: string) => {
  const escapedOpenPlaceholder = '__CLOZE_ESCAPED_OPEN__';
  const withEscapesProtected = value.replaceAll('\\{{', escapedOpenPlaceholder);
  const withClozeConverted = withEscapesProtected.replace(
    /\{\{([^}]+)\}\}/g,
    (_match, inner) => `\${${String(inner)}}`
  );
  return withClozeConverted.replaceAll(escapedOpenPlaceholder, '{{');
};

type TextLikeNode = AstNode & {
  type: 'text' | 'code' | 'inlineCode';
  value: string;
};

const isTextLikeNode = (node: unknown): node is TextLikeNode => {
  if (!isRecord(node)) return false;

  const type = node['type'];
  if (type !== 'text' && type !== 'code' && type !== 'inlineCode') return false;

  return typeof node['value'] === 'string';
};

const applyClozeConversion = (nodes: AstNode[]) => {
  const root: AstNode = { type: 'root', children: nodes };
  visit(root, (node) => {
    if (!isTextLikeNode(node)) return;
    node.value = replaceClozeMarkers(node.value);
  });
};

const sanitizeIdPart = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return '';
  return trimmed.replace(/\s+/g, '-').replace(/[^\p{L}\p{N}_-]/gu, '');
};

const applyHeadingIdPrefix = (nodes: AstNode[], idPrefix: string) => {
  const root: AstNode = { type: 'root', children: nodes };
  const counts = new Map<string, number>();

  visit(root, (node) => {
    if (!isHeading(node)) return;
    if (node.depth < 3) return;

    const text = normalizeHeadingText(node);
    const slug = sanitizeIdPart(text) || 'section';
    const baseId = `${idPrefix}-${slug}`;
    const prev = counts.get(baseId) ?? 0;
    counts.set(baseId, prev + 1);

    const id = prev === 0 ? baseId : `${baseId}-${prev}`;

    const dataRaw = node['data'];
    const data = isRecord(dataRaw) ? dataRaw : {};
    node['data'] = data;

    const hPropertiesRaw = data['hProperties'];
    const hProperties = isRecord(hPropertiesRaw) ? hPropertiesRaw : {};

    data['hProperties'] = {
      ...hProperties,
      id,
    };
  });
};

const parseScoringLines = (nodes: AstNode[]) => {
  const raw = nodes
    .map(getText)
    .join('\n')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const items: Array<{ points: number; description: string }> = [];
  for (const line of raw) {
    const match = /^(\d+)\s*:\s*(.+)$/.exec(line);
    if (!match) continue;
    items.push({ points: Number(match[1]), description: match[2].trim() });
  }
  return items;
};

const splitExamTip = (promptNodes: AstNode[]) => {
  const remaining: AstNode[] = [];
  const tipChildren: AstNode[] = [];

  let i = 0;
  while (i < promptNodes.length) {
    const node = promptNodes[i];
    const headingText = isHeading(node, 3) ? normalizeHeadingText(node) : '';
    if (headingText === 'Exam' || headingText === 'exam') {
      i += 1;
      while (i < promptNodes.length) {
        const next = promptNodes[i];
        if (isHeading(next, 3)) break;
        tipChildren.push(next);
        i += 1;
      }
      continue;
    }

    remaining.push(node);
    i += 1;
  }

  return { promptNodes: remaining, examTipNodes: tipChildren };
};

const createMdxFlowElement = (
  name: string,
  attributes: MdxJsxAttribute[],
  children: AstNode[]
): MdxJsxFlowElement => ({
  type: 'mdxJsxFlowElement',
  name,
  attributes,
  children,
});

const createAdmonition = (type: 'tip' | 'info', title: string, children: AstNode[]) =>
  createMdxFlowElement(
    'Admonition',
    [toMdxAttribute('type', type), toMdxAttribute('title', title)],
    children
  );

export default function remarkQuestionSpecToExercise() {
  return function transform(tree: unknown, file: unknown) {
    const filePath =
      isRecord(file) && typeof file['path'] === 'string' ? file['path'].replaceAll('\\', '/') : '';
    const isQuestionSpec = filePath.endsWith('.qspec.md');
    if (!isQuestionSpec) return;

    if (!isRecord(tree)) return;

    const children = toAstNodeArray(tree['children']);
    if (children.length === 0) return;

    if (children[0]?.type === 'yaml' || children[0]?.type === 'toml') {
      throw new Error(`Question spec markdown must not include frontmatter: ${filePath}`);
    }

    const titleHeading = children[0];
    if (!isHeading(titleHeading, 1)) {
      throw new Error(`Question spec markdown must start with "# <title>": ${filePath}`);
    }
    const title = normalizeHeadingText(titleHeading);
    if (!title) {
      throw new Error(`Question spec title must not be empty: ${filePath}`);
    }

    const sections = new Map<string, AstNode[]>();
    let currentSection: string | null = null;

    for (const node of children.slice(1)) {
      if (isHeading(node, 2)) {
        currentSection = normalizeHeadingText(node);
        sections.set(currentSection, []);
        continue;
      }
      if (!currentSection) continue;
      sections.get(currentSection)?.push(node);
    }

    const typeRaw = (sections.get('Type') ?? [])
      .map((node) => getText(node))
      .join('\n')
      .trim()
      .toLowerCase();

    if (!typeRaw) {
      throw new Error(`Question spec requires "## Type": ${filePath}`);
    }

    const isCloze = typeRaw === 'cloze';
    const promptSection = [...(sections.get('Prompt') ?? [])];
    if (promptSection.length === 0) {
      throw new Error(`Question spec requires "## Prompt": ${filePath}`);
    }

    const fileBase = filePath.split('/').pop() ?? '';
    const idPrefix = fileBase.endsWith('.qspec.md')
      ? fileBase.slice(0, -'.qspec.md'.length)
      : fileBase.endsWith('.md')
        ? fileBase.slice(0, -'.md'.length)
        : fileBase || 'question';

    const optionsSection = [...(sections.get('Options') ?? [])];
    const scoringSection = [...(sections.get('Scoring') ?? [])];
    const explanationSection = [...(sections.get('Explanation') ?? [])];

    const { promptNodes, examTipNodes } = splitExamTip(promptSection);
    const scoringItems = parseScoringLines(scoringSection);

    if (isCloze) {
      applyClozeConversion(promptNodes);
      applyClozeConversion(examTipNodes);
      applyClozeConversion(optionsSection);
      applyClozeConversion(explanationSection);
    }

    // Headings inside imported question MDX files are slugged independently, which can
    // produce duplicate ids across questions when multiple are rendered on one page.
    // Prefix heading ids by file name to keep them unique (and avoid React key warnings).
    applyHeadingIdPrefix(promptNodes, idPrefix);
    applyHeadingIdPrefix(examTipNodes, idPrefix);
    applyHeadingIdPrefix(optionsSection, idPrefix);
    applyHeadingIdPrefix(explanationSection, idPrefix);

    const exerciseChildren: AstNode[] = [
      ...promptNodes,
      ...(optionsSection.length > 0 ? optionsSection : []),
      ...(examTipNodes.length > 0 ? [createAdmonition('tip', '本試験では', examTipNodes)] : []),
      ...(scoringItems.length > 0
        ? [
            createAdmonition('info', '採点基準・配点', [
              {
                type: 'list',
                ordered: false,
                spread: false,
                children: scoringItems.map((item) => ({
                  type: 'listItem',
                  spread: false,
                  children: [
                    {
                      type: 'paragraph',
                      children: [
                        {
                          type: 'text',
                          value: `${item.description}：${item.points}点`,
                        },
                      ],
                    },
                  ],
                })),
              },
            ]),
          ]
        : []),
      createMdxFlowElement('Solution', [], explanationSection),
    ];

    const exerciseAttributes = [
      toMdxAttribute('title', title),
      ...(isCloze ? [toMdxBooleanAttribute('enableBlanks')] : []),
    ];

    tree['children'] = [createMdxFlowElement('Exercise', exerciseAttributes, exerciseChildren)];
  };
}
