// Make styled-components' `theme` strongly typed as our graph theme so the ported
// viewer's `({ theme }) => theme.colors.*` accesses typecheck under strict mode.
import 'styled-components';
import type { GraphTheme } from './theme';

declare module 'styled-components' {
  // eslint-disable-next-line @typescript-eslint/no-empty-interface
  export interface DefaultTheme extends GraphTheme {}
}
