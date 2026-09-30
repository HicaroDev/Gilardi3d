"use client";

import { useState } from "react";
import { ChevronRight, Eye, EyeOff, Box } from "lucide-react";
import clsx from "clsx";
import type { TreeNode } from "@/viewer/engine/types";

interface Props {
  nodes: TreeNode[];
  selected: Set<string>;
  hidden: Set<string>;
  onSelect: (node: TreeNode) => void;
  onToggleVisibility: (node: TreeNode) => void;
  filter: string;
}

export function ModelTree({ nodes, selected, hidden, onSelect, onToggleVisibility, filter }: Props) {
  const term = filter.trim().toLowerCase();
  return (
    <ul className="text-[13px]" role="tree">
      {nodes.map((n) => (
        <TreeItem
          key={n.key}
          node={n}
          depth={0}
          selected={selected}
          hidden={hidden}
          onSelect={onSelect}
          onToggleVisibility={onToggleVisibility}
          term={term}
          defaultOpen
        />
      ))}
    </ul>
  );
}

function matches(node: TreeNode, term: string): boolean {
  if (!term) return true;
  if (node.name.toLowerCase().includes(term)) return true;
  if ((node.category ?? "").toLowerCase().includes(term)) return true;
  return node.children.some((c) => matches(c, term));
}

function TreeItem({
  node,
  depth,
  selected,
  hidden,
  onSelect,
  onToggleVisibility,
  term,
  defaultOpen = false,
}: {
  node: TreeNode;
  depth: number;
  selected: Set<string>;
  hidden: Set<string>;
  onSelect: (node: TreeNode) => void;
  onToggleVisibility: (node: TreeNode) => void;
  term: string;
  defaultOpen?: boolean;
}) {
  const isSpatial = /PROJECT|SITE|BUILDING$|BUILDINGSTOREY|SPACE/.test(node.category ?? "") || node.localId === null;
  const [open, setOpen] = useState(defaultOpen || (depth < 3 && isSpatial));
  if (!matches(node, term)) return null;
  const hasChildren = node.children.length > 0;
  const isSelected = node.localId !== null && selected.has(`${node.modelId}:${node.localId}`);
  const isHidden = hidden.has(node.key);
  const expanded = open || (term !== "" && hasChildren);

  return (
    <li role="treeitem" aria-expanded={hasChildren ? expanded : undefined} aria-selected={isSelected}>
      <div
        className={clsx(
          "group flex items-center gap-1 rounded-md pr-1 transition-colors",
          isSelected ? "bg-accent/20 text-accent-strong" : "hover:bg-white/5",
          isHidden && "opacity-45",
        )}
        style={{ paddingLeft: depth * 12 + 4 }}
      >
        <button
          type="button"
          aria-label={expanded ? "Recolher" : "Expandir"}
          className={clsx("grid size-6 shrink-0 place-items-center rounded text-muted", !hasChildren && "invisible")}
          onClick={() => setOpen((o) => !o)}
        >
          <ChevronRight className={clsx("size-3.5 transition-transform", expanded && "rotate-90")} />
        </button>
        <button
          type="button"
          className="flex min-h-8 min-w-0 flex-1 items-center gap-2 text-left"
          onClick={() => onSelect(node)}
          title={node.category ?? undefined}
        >
          <Box className="size-3.5 shrink-0 text-muted" />
          <span className="truncate">{node.name}</span>
          {hasChildren && <span className="ml-auto shrink-0 text-[11px] text-muted">{node.children.length}</span>}
        </button>
        <button
          type="button"
          aria-label={isHidden ? "Mostrar" : "Ocultar"}
          className="grid size-7 shrink-0 place-items-center rounded text-muted opacity-100 hover:text-fg md:opacity-0 md:group-hover:opacity-100"
          onClick={() => onToggleVisibility(node)}
        >
          {isHidden ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
        </button>
      </div>
      {hasChildren && expanded && (
        <ul role="group">
          {node.children.map((c) => (
            <TreeItem
              key={c.key}
              node={c}
              depth={depth + 1}
              selected={selected}
              hidden={hidden}
              onSelect={onSelect}
              onToggleVisibility={onToggleVisibility}
              term={term}
            />
          ))}
        </ul>
      )}
    </li>
  );
}
