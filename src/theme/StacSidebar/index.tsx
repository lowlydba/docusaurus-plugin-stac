import React, {useCallback, useEffect, useMemo, useState} from 'react';
import Link from '@docusaurus/Link';
import Translate, {translate} from '@docusaurus/Translate';
import {usePluginData} from '@docusaurus/useGlobalData';

import type {StacGlobalData, StacNavNode} from '../../types.js';
import {LatestAliasPill, TypeBadge} from '../StacCommon/index.js';

/** routePaths from the tree root down to (and including) `target`, or an empty
 * set if `target` isn't found (e.g. stale/lazily-loaded data). */
function ancestorRoutePaths(root: StacNavNode, target: string): Set<string> {
  const trail: string[] = [];
  function dfs(node: StacNavNode): boolean {
    trail.push(node.routePath);
    if (node.routePath === target) return true;
    for (const child of node.children) {
      if (dfs(child)) return true;
    }
    trail.pop();
    return false;
  }
  dfs(root);
  return new Set(trail);
}

function TreeNode({
  node,
  activeRoutePath,
  expanded,
  onToggle,
}: {
  node: StacNavNode;
  activeRoutePath: string;
  expanded: Set<string>;
  onToggle: (routePath: string) => void;
}): React.JSX.Element {
  const hasChildren = node.children.length > 0;
  const isExpanded = expanded.has(node.routePath);
  const isActive = node.routePath === activeRoutePath;

  return (
    <li className="stac-tree__item">
      <div className="stac-tree__row">
        {hasChildren ? (
          <button
            type="button"
            className="stac-tree__toggle"
            aria-expanded={isExpanded}
            aria-label={
              isExpanded
                ? translate({id: 'stac.tree.collapse', message: 'Collapse'})
                : translate({id: 'stac.tree.expand', message: 'Expand'})
            }
            onClick={() => onToggle(node.routePath)}
          >
            {isExpanded ? '▾' : '▸'}
          </button>
        ) : (
          <span className="stac-tree__toggle stac-tree__toggle--leaf" aria-hidden="true" />
        )}
        <Link
          to={node.routePath}
          className={`stac-tree__link${isActive ? ' stac-tree__link--active' : ''}`}
          aria-current={isActive ? 'page' : undefined}
        >
          <TypeBadge type={node.type} />
          <span className="stac-tree__title">{node.title}</span>
          {node.isLatestAlias && <LatestAliasPill />}
        </Link>
      </div>
      {hasChildren && isExpanded && (
        <ul className="stac-tree__children">
          {node.children.map((child) => (
            <TreeNode
              key={child.routePath}
              node={child}
              activeRoutePath={activeRoutePath}
              expanded={expanded}
              onToggle={onToggle}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

/**
 * A persistent, collapsible view of the whole crawled catalog tree, rendered
 * as a left-hand sidebar next to the page content. The path from the tree
 * root down to the current page is expanded by default; everything else
 * starts collapsed so large catalogs stay navigable (subtrees are only
 * rendered once expanded, keeping the initial DOM small).
 */
export default function StacSidebar({
  activeRoutePath,
  pluginId = 'default',
}: {
  activeRoutePath: string;
  pluginId?: string;
}): React.JSX.Element | null {
  const data = usePluginData('docusaurus-plugin-stac', pluginId) as
    | StacGlobalData
    | undefined;

  const initialExpanded = useMemo(
    () => (data ? ancestorRoutePaths(data.tree, activeRoutePath) : new Set<string>()),
    // Only recomputed for the initial render of a given tree; subsequent route
    // changes are handled by the effect below so manual expand/collapse state
    // is preserved.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data],
  );
  const [expanded, setExpanded] = useState<Set<string>>(initialExpanded);

  // On client-side navigation to a new page, reveal its ancestors without
  // discarding whatever the visitor has already expanded elsewhere.
  useEffect(() => {
    if (!data) return;
    setExpanded((prev) => {
      const next = ancestorRoutePaths(data.tree, activeRoutePath);
      let changed = false;
      for (const p of next) {
        if (!prev.has(p)) changed = true;
      }
      if (!changed) return prev;
      return new Set([...prev, ...next]);
    });
  }, [activeRoutePath, data]);

  const onToggle = useCallback((routePath: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(routePath)) next.delete(routePath);
      else next.add(routePath);
      return next;
    });
  }, []);

  if (!data) return null;

  return (
    <nav
      className="stac-tree"
      aria-label={translate({id: 'stac.tree.aria', message: 'Catalog tree'})}
    >
      <p className="stac-tree__label" aria-hidden="true">
        <Translate id="stac.tree.label">Catalog tree</Translate>
      </p>
      <ul className="stac-tree__root">
        <TreeNode
          node={data.tree}
          activeRoutePath={activeRoutePath}
          expanded={expanded}
          onToggle={onToggle}
        />
      </ul>
    </nav>
  );
}
