import {describe, it, expect} from 'vitest';

import {
  resolvePlatformUri,
  detectStorageProvider,
} from '../../src/theme/StacCommon/StorageSchemes.js';

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

describe('detectStorageProvider', () => {
  it('detects AWS from the documented aws-s3 type', () => {
    const scheme = {
      type: 'aws-s3',
      platform: 'https://{bucket}.s3.{region}.amazonaws.com',
      bucket: 'overturemaps-us-west-2',
      region: 'us-west-2',
    };
    expect(
      detectStorageProvider('aws', scheme, resolvePlatformUri(scheme)),
    ).toBe('aws');
  });

  it('detects Azure from the documented ms-azure type', () => {
    const scheme = {
      type: 'ms-azure',
      platform: 'https://{account}.blob.core.windows.net/',
      account: 'overturemapswestus2',
    };
    expect(
      detectStorageProvider('azure', scheme, resolvePlatformUri(scheme)),
    ).toBe('azure');
  });

  it('detects GCP heuristically from id/platform since there is no documented type', () => {
    const scheme = {
      platform: 'https://storage.googleapis.com/{bucket}',
      bucket: 'some-bucket',
    };
    expect(
      detectStorageProvider('gcp', scheme, resolvePlatformUri(scheme)),
    ).toBe('gcp');
  });

  it('never mistakes custom-s3 (generic/non-AWS S3-compatible) for AWS', () => {
    const scheme = {
      type: 'custom-s3',
      platform: 'https://minio.example.com/{bucket}',
      bucket: 'some-bucket',
    };
    expect(
      detectStorageProvider('custom-s3', scheme, resolvePlatformUri(scheme)),
    ).toBe('generic');
  });

  it('falls back to generic for unrecognized providers', () => {
    const scheme = {
      type: 'custom',
      platform: 'https://s3.wasabisys.com/{bucket}',
      bucket: 'some-bucket',
    };
    expect(
      detectStorageProvider('wasabi', scheme, resolvePlatformUri(scheme)),
    ).toBe('generic');
  });

  it('falls back to generic when there is no type, id hint, or platform hint', () => {
    expect(detectStorageProvider('mirror-1', {}, undefined)).toBe('generic');
  });
});
