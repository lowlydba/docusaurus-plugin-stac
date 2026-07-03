import React, {useMemo, useState} from 'react';
import Link from '@docusaurus/Link';
import Translate, {translate} from '@docusaurus/Translate';
import {usePluginData} from '@docusaurus/useGlobalData';

import type {StacGlobalData, StacSearchEntry} from '../../types.js';
import {searchEntries} from '../../nav.js';
import {TypeBadge} from '../StacCommon/index.js';

export default function StacSearch({
  pluginId = 'default',
}: {
  pluginId?: string;
}): React.JSX.Element | null {
  const data = usePluginData('docusaurus-plugin-stac', pluginId) as
    | StacGlobalData
    | undefined;
  const [query, setQuery] = useState('');

  const results = useMemo<StacSearchEntry[]>(() => {
    if (!data || !query.trim()) return [];
    return searchEntries(data.index, query).slice(0, 50);
  }, [data, query]);

  if (!data) return null;

  return (
    <div className="stac-search">
      <input
        type="search"
        className="stac-search__input"
        placeholder={translate({
          id: 'stac.search.placeholder',
          message: 'Search the catalog…',
        })}
        aria-label={translate({
          id: 'stac.search.aria',
          message: 'Search the catalog',
        })}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {query.trim() !== '' && (
        <div className="stac-search__results">
          {results.length === 0 ? (
            <p className="stac-empty">
              <Translate
                id="stac.search.noResults"
                values={{query}}
              >
                {'No matches for “{query}”.'}
              </Translate>
            </p>
          ) : (
            <ul className="stac-search__list">
              {results.map((r) => (
                <li key={r.routePath} className="stac-search__item">
                  <Link to={r.routePath} className="stac-search__link">
                    <TypeBadge type={r.type} />
                    <span className="stac-search__title">{r.title}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
