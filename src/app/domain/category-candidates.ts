import {CatalogNode} from './catalog.model';

export interface CategoryCandidate { id: string; labels: string[] }

function isDescendant(node: CatalogNode, ancestorId: string, nodes: CatalogNode[]): boolean {
  let current: CatalogNode | undefined = node;
  const seen = new Set<string>();
  while (current?.parentId && !seen.has(current.id)) {
    if (current.parentId === ancestorId) return true;
    seen.add(current.id);
    current = nodes.find(other => other.id === current?.parentId);
  }
  return false;
}

export function foodCategoryCandidates(nodes: CatalogNode[]): CategoryCandidate[] {
  return nodes.filter(node => node.kind === 'class' && node.parentId !== null &&
    isDescendant(node, 'root-food', nodes)).map(node => ({
    id: node.id,
    labels: [node.name, ...nodes.filter(child => child.kind === 'product' &&
      isDescendant(child, node.id, nodes)).slice(0, 6).map(child => child.name)]
  }));
}
