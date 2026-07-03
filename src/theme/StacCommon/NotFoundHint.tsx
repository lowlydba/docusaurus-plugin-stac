import React from 'react';
import Link from '@docusaurus/Link';
import {translate} from '@docusaurus/Translate';

export interface NotFoundHintLink {
  label: string;
  href: string;
}

export interface NotFoundHintProps {
  title?: string;
  description?: string;
  links?: NotFoundHintLink[];
}

/**
 * A generic "looking for something that's gone?" callout meant to be
 * composed into a site's 404 page (see `theme/NotFound/Content`). This
 * plugin has no built-in opinions about *why* content goes missing — a
 * data-retention policy, a moved catalog, a renamed route — callers supply
 * their own title/description/links via plugin options. Renders nothing
 * when given no content, so an unconfigured site's 404 page is unaffected.
 */
export function NotFoundHint({
  title,
  description,
  links = [],
}: NotFoundHintProps): React.JSX.Element | null {
  const hasContent = Boolean(title || description || links.length > 0);
  if (!hasContent) return null;

  const heading =
    title ??
    translate({
      id: 'stac.notFoundHint.title',
      message: 'Looking for something that used to be here?',
      description:
        'Default heading for the configurable "not found" hint on the 404 page, shown when a description/links were configured without an explicit title',
    });

  return (
    <div className="stac-not-found-hint">
      <p className="stac-not-found-hint__title">{heading}</p>
      {description && (
        <p className="stac-not-found-hint__description">{description}</p>
      )}
      {links.length > 0 && (
        <ul className="stac-not-found-hint__links">
          {links.map((link) => (
            <li key={link.href}>
              <Link to={link.href}>{link.label}</Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
