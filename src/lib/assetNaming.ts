export interface NamingConvention {
  gymCode: string;
  assetType: string;
  descriptor: string;
  variant: number;
  extension: string;
}

export interface ParsedFilename extends NamingConvention {
  isValid: boolean;
  originalName: string;
}

/**
 * Generate a standardized filename from naming convention
 * Pattern: {gymCode}-{assetType}-{descriptor}-v{variant}.{extension}
 * Example: CRR-logo-horizontal-dark-v1.png
 */
export function generateFilename(convention: NamingConvention): string {
  const { gymCode, assetType, descriptor, variant, extension } = convention;
  
  // Sanitize parts
  const cleanGymCode = gymCode.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const cleanAssetType = assetType.toLowerCase().replace(/[^a-z0-9]/g, '');
  const cleanDescriptor = descriptor.toLowerCase().replace(/[^a-z0-9-]/g, '-');
  const cleanExtension = extension.toLowerCase().replace(/^\./, '');
  
  return `${cleanGymCode}-${cleanAssetType}-${cleanDescriptor}-v${variant}.${cleanExtension}`;
}

/**
 * Parse a filename into its components
 * Returns null if filename doesn't match expected pattern
 */
export function parseFilename(filename: string): ParsedFilename | null {
  // Pattern: {CODE}-{type}-{descriptor}-v{number}.{ext}
  const pattern = /^([A-Z0-9]+)-([a-z0-9]+)-([a-z0-9-]+)-v(\d+)\.([a-z0-9]+)$/i;
  const match = filename.match(pattern);
  
  if (!match) {
    return {
      gymCode: '',
      assetType: '',
      descriptor: '',
      variant: 1,
      extension: '',
      isValid: false,
      originalName: filename,
    };
  }
  
  return {
    gymCode: match[1].toUpperCase(),
    assetType: match[2].toLowerCase(),
    descriptor: match[3].toLowerCase(),
    variant: parseInt(match[4], 10),
    extension: match[5].toLowerCase(),
    isValid: true,
    originalName: filename,
  };
}

/**
 * Validate if a filename follows the naming convention
 */
export function validateFilename(filename: string): boolean {
  const parsed = parseFilename(filename);
  return parsed?.isValid || false;
}

/**
 * Extract file extension from filename
 */
export function getFileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.');
  if (lastDot === -1) return '';
  return filename.slice(lastDot + 1).toLowerCase();
}

/**
 * Suggest next variant number for similar files
 */
export function suggestNextVariant(existingFilenames: string[], baseName: string): number {
  const variants = existingFilenames
    .filter(name => name.startsWith(baseName))
    .map(name => {
      const parsed = parseFilename(name);
      return parsed?.variant || 0;
    });
  
  if (variants.length === 0) return 1;
  return Math.max(...variants) + 1;
}

/**
 * Clean and sanitize a user-provided filename
 */
export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9.-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Generate a filename from AI analysis result
 */
export function generateFromAnalysis(
  gymCode: string,
  analysis: {
    assetType: string;
    description: string;
    variant: number;
  },
  extension: string
): string {
  return generateFilename({
    gymCode,
    assetType: analysis.assetType,
    descriptor: analysis.description,
    variant: analysis.variant,
    extension,
  });
}
