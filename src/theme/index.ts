import { tokens } from './tokens';
import { typography } from './typography';
import { layout } from './layout';

export const theme = {
  colors: tokens.colors,
  fonts: typography.fonts,
  ...layout,
};
