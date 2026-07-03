import React from 'react';
import {usePluginData} from '@docusaurus/useGlobalData';
import OriginalNotFoundContent from '@theme-init/NotFound/Content';

import type {StacGlobalData} from '../../../types.js';
import {NotFoundHint} from '../../StacCommon/NotFoundHint.js';

/**
 * Wraps (never replaces) the classic theme's default 404 body, adding an
 * optional hint below it when the plugin was configured with a
 * `notFoundHint` (see `StacPluginOptions`). Sites that don't configure it see
 * the stock 404 page, unchanged.
 *
 * Reads the "default"-id plugin instance's data — a single site-wide 404
 * page can't know which instance a visitor meant, so sites running multiple
 * STAC plugin instances should configure the hint on the `default`-id one
 * (or omit an explicit `id` on the instance meant to own the 404 hint).
 */
export default function NotFoundContentWrapper(props: {
  className?: string;
}): React.JSX.Element {
  const data = usePluginData('docusaurus-plugin-stac', 'default') as
    | StacGlobalData
    | undefined;

  return (
    <>
      <OriginalNotFoundContent {...props} />
      {data?.notFoundHint && (
        <div className="container margin-vert--md">
          <div className="row">
            <div className="col col--6 col--offset-3">
              <NotFoundHint {...data.notFoundHint} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
