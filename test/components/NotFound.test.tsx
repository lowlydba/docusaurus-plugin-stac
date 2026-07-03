import {describe, it, expect} from 'vitest';
import {render, screen} from '@testing-library/react';
import React from 'react';

import {NotFoundHint} from '../../src/theme/StacCommon/NotFoundHint.js';
import NotFoundContentWrapper from '../../src/theme/NotFound/Content/index.js';
import {__setPluginData} from '../mocks/useGlobalData.js';
import type {StacGlobalData} from '../../src/types.js';

describe('NotFoundHint', () => {
  it('renders nothing when given no content', () => {
    const {container} = render(<NotFoundHint />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders a default title when only a description/links are given', () => {
    render(<NotFoundHint description="It aged out." />);
    expect(
      screen.getByText('Looking for something that used to be here?'),
    ).toBeInTheDocument();
    expect(screen.getByText('It aged out.')).toBeInTheDocument();
  });

  it('renders a custom title, description and links', () => {
    render(
      <NotFoundHint
        title="Looking for a previous release?"
        description="Old releases age out."
        links={[
          {label: 'Retention policy', href: 'https://example.com/policy'},
          {label: 'Latest release', href: '/stac/latest'},
        ]}
      />,
    );
    expect(
      screen.getByText('Looking for a previous release?'),
    ).toBeInTheDocument();
    expect(screen.getByText('Old releases age out.')).toBeInTheDocument();

    const policyLink = screen.getByRole('link', {name: 'Retention policy'});
    expect(policyLink).toHaveAttribute('href', 'https://example.com/policy');
    const latestLink = screen.getByRole('link', {name: 'Latest release'});
    expect(latestLink).toHaveAttribute('href', '/stac/latest');
  });

  it('renders only a title when links/description are omitted', () => {
    render(<NotFoundHint title="Custom heading only" />);
    expect(screen.getByText('Custom heading only')).toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });
});

describe('NotFoundContentWrapper', () => {
  it('always renders the original 404 content', () => {
    __setPluginData(undefined);
    render(<NotFoundContentWrapper />);
    expect(screen.getByTestId('original-not-found-content')).toBeInTheDocument();
  });

  it('adds no hint when the plugin has no notFoundHint configured', () => {
    __setPluginData({} as StacGlobalData);
    const {container} = render(<NotFoundContentWrapper />);
    expect(screen.getByTestId('original-not-found-content')).toBeInTheDocument();
    expect(
      container.querySelector('.stac-not-found-hint'),
    ).not.toBeInTheDocument();
  });

  it('renders the configured hint alongside the original content', () => {
    __setPluginData({
      notFoundHint: {
        title: 'Looking for a previous release?',
        description: 'Overture ages out old releases.',
        links: [
          {
            label: "Overture's data retention policy",
            href: 'https://docs.overturemaps.org/release-calendar/#data-retention-policy',
          },
        ],
      },
    } as StacGlobalData);

    render(<NotFoundContentWrapper />);

    expect(screen.getByTestId('original-not-found-content')).toBeInTheDocument();
    expect(
      screen.getByText('Looking for a previous release?'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', {name: "Overture's data retention policy"}),
    ).toHaveAttribute(
      'href',
      'https://docs.overturemaps.org/release-calendar/#data-retention-policy',
    );
  });
});
