/**
 * Color scheme for performance dimensions
 * Used across the application for consistent visual identification
 */
export const DIMENSION_COLORS = {
  functional: {
    primary: '#2196F3',      // Blue
    light: '#E3F2FD',       // Light blue background
    dark: '#1976D2',        // Dark blue for hover
    border: '#2196F3',      // Border color
  },
  organizational: {
    primary: '#4CAF50',     // Green
    light: '#E8F5E9',       // Light green background
    dark: '#388E3C',        // Dark green for hover
    border: '#4CAF50',      // Border color
  },
  selfDevelopment: {
    primary: '#FF9800',     // Orange/Amber
    light: '#FFF3E0',       // Light orange background
    dark: '#F57C00',        // Dark orange for hover
    border: '#FF9800',      // Border color
  },
  developingOthers: {
    primary: '#9C27B0',     // Purple
    light: '#F3E5F5',       // Light purple background
    dark: '#7B1FA2',        // Dark purple for hover
    border: '#9C27B0',      // Border color
  },
} as const;

export type DimensionType = keyof typeof DIMENSION_COLORS;

/**
 * Get color scheme for a dimension
 */
export function getDimensionColor(dimension: DimensionType) {
  return DIMENSION_COLORS[dimension];
}
