import {describe, it, expect} from 'vitest';

import {resolvePlatformUri} from '../../src/theme/StacCommon/StorageSchemes.js';

describe('resolvePlatformUri', () => {
  it('fills in {placeholder} tokens from sibling properties', () => {
    const uri = resolvePlatformUri({
      type: 'aws-s3',
      platform: 'https://{bucket}.s3.{region}.amazonaws.com',
      bucket: 'overturemaps-us-west-2',
      region: 'us-west-2',
    });
    expect(uri).toBe('https://overturemaps-us-west-2.s3.us-west-2.amazonaws.com');
  });

  it('resolves a single-placeholder template', () => {
    const uri = resolvePlatformUri({
      type: 'ms-azure',
      platform: 'https://{account}.blob.core.windows.net/',
      account: 'overturemapswestus2',
    });
    expect(uri).toBe('https://overturemapswestus2.blob.core.windows.net/');
  });

  it('leaves unresolvable placeholders as-is', () => {
    const uri = resolvePlatformUri({
      platform: 'https://{bucket}.s3.{region}.amazonaws.com',
      bucket: 'known-bucket',
      // `region` is intentionally missing.
    });
    expect(uri).toBe('https://known-bucket.s3.{region}.amazonaws.com');
  });

  it('returns undefined when there is no platform template', () => {
    expect(resolvePlatformUri({type: 'aws-s3'})).toBeUndefined();
  });
});
