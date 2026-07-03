// Ambient module declarations for the Docusaurus/theme runtime modules that the
// theme components import. These are resolved by the *consuming* site's webpack
// at build time; here we only need enough typing for the plugin's own `tsc` to
// pass. Keeping them loose (any) is intentional and dependency-light.

declare module '@docusaurus/BrowserOnly' {
  import type {ReactNode} from 'react';
  export interface Props {
    readonly children: () => ReactNode;
    readonly fallback?: ReactNode;
  }
  export default function BrowserOnly(props: Props): ReactNode;
}

declare module '@docusaurus/Link' {
  import type {ComponentProps, ReactNode} from 'react';
  export interface Props extends ComponentProps<'a'> {
    readonly to?: string;
    readonly href?: string;
    readonly children?: ReactNode;
  }
  export default function Link(props: Props): ReactNode;
}

declare module '@docusaurus/useBaseUrl' {
  export default function useBaseUrl(url: string): string;
}

declare module '@docusaurus/Head' {
  import type {ReactNode} from 'react';
  export default function Head(props: {children?: ReactNode}): ReactNode;
}

declare module '@docusaurus/useGlobalData' {
  export function usePluginData(pluginName: string, pluginId?: string): unknown;
  export default function useGlobalData(): unknown;
}

declare module '*.css';

declare module '@docusaurus/Translate' {
  import type {ReactNode} from 'react';
  export interface TranslateProps {
    readonly id?: string;
    readonly message?: string;
    readonly description?: string;
    readonly values?: Record<string, unknown>;
    readonly children?: string;
  }
  export default function Translate(props: TranslateProps): ReactNode;
  export function translate(
    opts: {id?: string; message: string; description?: string},
    values?: Record<string, unknown>,
  ): string;
}

declare module '@theme/Layout' {
  import type {ReactNode} from 'react';
  export interface Props {
    readonly children?: ReactNode;
    readonly title?: string;
    readonly description?: string;
    readonly [key: string]: unknown;
  }
  export default function Layout(props: Props): ReactNode;
}
