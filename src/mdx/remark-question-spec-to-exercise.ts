import { visit } from 'unist-util-visit';

const toMdxAttribute = (name: string, value: string) => ({
  type: 'mdxJsxAttribute',
  name,
  value,
});

const toMdxBooleanAttribute = (name: string) => ({
  type: 'mdxJsxAttribute',
  name,
  value: null,
});

const isHeading = (node: any, depth?: number) =>
  node?.type === 'heading' && (depth == null || node.depth === depth);

const getText = (node: any): string => {
  if (!node) return '';
  if (typeof node.value === 'string') return node.value;
  if (Array.isArray(node.children)) return node.children.map(getText).join('');
  return '';
};

const normalizeHeadingText = (node: any) => getText(node).trim();

const replaceClozeMarkers = (value: string) => {
  const escapedOpenPlaceholder = '__CLOZE_ESCAPED_OPEN__';
  const withEscapesProtected = value.replaceAll('\\{{', escapedOpenPlaceholder);
  const withClozeConverted = withEscapesProtected.replace(
    /\{\{([^}]+)\}\}/g,
    (_match, inner) => `\${${String(inner)}}`,
  );
  return withClozeConverted.replaceAll(escapedOpenPlaceholder, '{{');
};

const applyClozeConversion = (nodes: any[]) => {
  const root = { type: 'root', children: nodes };
  visit(root, (node: any) => {
    if (!['text', 'code', 'inlineCode'].includes(node.type)) return;
    if (typeof node.value !== 'string') return;
    node.value = replaceClozeMarkers(node.value);
  });
};

const parseScoringLines = (nodes: any[]) => {
  const raw = nodes
    .map((node) => getText(node))
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

const splitExamTip = (promptNodes: any[]) => {
  const remaining: any[] = [];
  const tipChildren: any[] = [];

  let i = 0;
  while (i < promptNodes.length) {
    const node = promptNodes[i];
    if (isHeading(node, 3) && normalizeHeadingText(node) === '本試験では') {
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
  attributes: any[],
  children: any[],
) => ({
  type: 'mdxJsxFlowElement',
  name,
  attributes,
  children,
});

const createAdmonition = (
  type: 'tip' | 'info',
  title: string,
  children: any[],
) =>
  createMdxFlowElement(
    'Admonition',
    [toMdxAttribute('type', type), toMdxAttribute('title', title)],
    children,
  );

export default function remarkQuestionSpecToExercise() {
  return function transform(tree: any, file: any) {
    const filePath =
      typeof file?.path === 'string' ? file.path.replaceAll('\\', '/') : '';
    const isQuestionSpec = filePath.includes('/questions/');
    if (!isQuestionSpec) return;

    const children: any[] = Array.isArray(tree?.children) ? tree.children : [];
    if (children.length === 0) return;

    if (children[0]?.type === 'yaml' || children[0]?.type === 'toml') {
      throw new Error(
        `Question spec markdown must not include frontmatter: ${filePath}`,
      );
    }

    const titleHeading = children[0];
    if (!isHeading(titleHeading, 1)) {
      throw new Error(`Question spec markdown must start with "# <title>": ${filePath}`);
    }
    const title = normalizeHeadingText(titleHeading);
    if (!title) {
      throw new Error(`Question spec title must not be empty: ${filePath}`);
    }

    const sections = new Map<string, any[]>();
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

    const exerciseChildren: any[] = [
      ...promptNodes,
      ...(optionsSection.length > 0 ? optionsSection : []),
      ...(examTipNodes.length > 0
        ? [createAdmonition('tip', '本試験では', examTipNodes)]
        : []),
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

    tree.children = [
      createMdxFlowElement('Exercise', exerciseAttributes, exerciseChildren),
    ];
  };
}
