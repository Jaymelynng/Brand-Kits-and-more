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
 * Extract file extension from filename
 */
export function getFileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.');
  if (lastDot === -1) return '';
  return filename.slice(lastDot + 1).toLowerCase();
}

/**
 * Parse underscore-separated format: gymcode_descriptor_variant.ext
 */
function parseUnderscoreFilename(
  filename: string,
  gymCodes: string[]
): ParsedFilename | null {
  const nameWithoutExt = filename.replace(/\.[^.]+$/, '');
  const extension = getFileExtension(filename);

  // Try to match gym code at start
  let matchedGymCode = '';
  for (const code of gymCodes) {
    if (nameWithoutExt.toLowerCase().startsWith(code.toLowerCase() + '_')) {
      matchedGymCode = code;
      break;
    }
  }

  if (!matchedGymCode) return null;

  // Extract rest of filename after gym code
  const rest = nameWithoutExt.slice(matchedGymCode.length + 1);
  const parts = rest.split('_');

  // Last part is variant number if it's a digit
  let variant = 1;
  const lastPart = parts[parts.length - 1];
  if (/^\d+$/.test(lastPart)) {
    variant = parseInt(lastPart, 10);
    parts.pop();
  }

  // First part could be asset type (gif, video, doc, etc.)
  const assetType = parts[0] || 'asset';

  // Rest is descriptor
  const descriptor = parts.slice(1).join('-') || 'file';

  return {
    gymCode: matchedGymCode.toUpperCase(),
    assetType: assetType.toLowerCase(),
    descriptor: descriptor.toLowerCase(),
    variant,
    extension,
    isValid: true,
    originalName: filename,
  };
}

/**
 * Parse a filename into its components
 * Supports two formats:
 * 1. Hyphenated: {CODE}-{type}-{descriptor}-v{number}.{ext}
 * 2. Underscore: {code}_{descriptor}_{variant}.{ext}
 */
export function parseFilename(filename: string, gymCodes?: string[]): ParsedFilename {
  // Try hyphenated format first
  const pattern = /^([A-Z0-9]+)-([a-z0-9]+)-([a-z0-9-]+)-v(\d+)\.([a-z0-9]+)$/i;
  const match = filename.match(pattern);
  
  if (match) {
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

  // Try underscore format if gym codes provided
  if (gymCodes && gymCodes.length > 0) {
    const underscoreResult = parseUnderscoreFilename(filename, gymCodes);
    if (underscoreResult) {
      return underscoreResult;
    }
  }

  // No match found
  return {
    gymCode: '',
    assetType: '',
    descriptor: filename,
    variant: 1,
    extension: getFileExtension(filename),
    isValid: false,
    originalName: filename,
  };
}

/**
 * Validate if a filename follows the naming convention
 */
export function validateFilename(filename: string): boolean {
  const parsed = parseFilename(filename);
  return parsed.isValid;
}

/**
 * Suggest next variant number for similar files
 */
export function suggestNextVariant(existingFilenames: string[], baseName: string): number {
  const variants = existingFilenames
    .filter(name => name.startsWith(baseName))
    .map(name => {
      const parsed = parseFilename(name);
      return parsed.variant;
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
