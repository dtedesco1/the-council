/**
 * File Utility Functions
 *
 * Provides MIME type detection and file content processing utilities
 * for handling file attachments across different LLM providers.
 */

/**
 * Maps file extensions to their correct MIME types.
 * This is used when the browser doesn't provide a MIME type (returns empty string).
 *
 * IMPORTANT: Browsers often return empty MIME types for certain file extensions
 * like .md, .ts, .tsx, .py, etc. This map ensures correct type detection.
 */
const EXTENSION_TO_MIME: Record<string, string> = {
  // Markdown
  '.md': 'text/markdown',
  '.markdown': 'text/markdown',

  // Plain text and common text formats
  '.txt': 'text/plain',
  '.text': 'text/plain',
  '.log': 'text/plain',
  '.cfg': 'text/plain',
  '.conf': 'text/plain',
  '.ini': 'text/plain',

  // Programming languages (text-based)
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.cjs': 'text/javascript',
  '.jsx': 'text/jsx',
  '.ts': 'text/typescript',
  '.tsx': 'text/tsx',
  '.py': 'text/x-python',
  '.rb': 'text/x-ruby',
  '.go': 'text/x-go',
  '.rs': 'text/x-rust',
  '.java': 'text/x-java',
  '.c': 'text/x-c',
  '.cpp': 'text/x-c++',
  '.h': 'text/x-c',
  '.hpp': 'text/x-c++',
  '.cs': 'text/x-csharp',
  '.swift': 'text/x-swift',
  '.kt': 'text/x-kotlin',
  '.scala': 'text/x-scala',
  '.php': 'text/x-php',
  '.pl': 'text/x-perl',
  '.sh': 'text/x-shellscript',
  '.bash': 'text/x-shellscript',
  '.zsh': 'text/x-shellscript',
  '.fish': 'text/x-shellscript',
  '.ps1': 'text/x-powershell',
  '.lua': 'text/x-lua',
  '.r': 'text/x-r',
  '.sql': 'text/x-sql',
  '.m': 'text/x-matlab',
  '.jl': 'text/x-julia',

  // Web and markup
  '.html': 'text/html',
  '.htm': 'text/html',
  '.css': 'text/css',
  '.scss': 'text/x-scss',
  '.sass': 'text/x-sass',
  '.less': 'text/x-less',
  '.xml': 'application/xml',
  '.svg': 'image/svg+xml',
  '.vue': 'text/x-vue',
  '.svelte': 'text/x-svelte',

  // Data formats
  '.json': 'application/json',
  '.jsonl': 'application/jsonl',
  '.yaml': 'text/yaml',
  '.yml': 'text/yaml',
  '.toml': 'text/x-toml',
  '.csv': 'text/csv',
  '.tsv': 'text/tab-separated-values',

  // Documentation
  '.rst': 'text/x-rst',
  '.asciidoc': 'text/asciidoc',
  '.adoc': 'text/asciidoc',
  '.tex': 'text/x-tex',
  '.latex': 'text/x-latex',

  // Config files
  '.env': 'text/plain',
  '.gitignore': 'text/plain',
  '.dockerignore': 'text/plain',
  '.editorconfig': 'text/plain',
  '.prettierrc': 'application/json',
  '.eslintrc': 'application/json',
  '.babelrc': 'application/json',

  // Image formats
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.bmp': 'image/bmp',
  '.tiff': 'image/tiff',
  '.tif': 'image/tiff',

  // Documents (binary - will be treated differently)
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.ppt': 'application/vnd.ms-powerpoint',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
};

/**
 * Detects the MIME type for a file based on its extension.
 * This is more reliable than browser-provided MIME types which are often empty.
 *
 * @param filename - The name of the file (e.g., "readme.md", "script.py")
 * @param browserMimeType - The MIME type provided by the browser (may be empty)
 * @returns The detected MIME type, falling back to text/plain for unknown text files
 *
 * @example
 * detectMimeType("README.md", "") // Returns "text/markdown"
 * detectMimeType("data.json", "application/json") // Returns "application/json"
 * detectMimeType("mystery.xyz", "") // Returns "application/octet-stream"
 */
export const detectMimeType = (filename: string, browserMimeType: string = ''): string => {
  // If browser provided a valid MIME type (not generic octet-stream), use it
  if (browserMimeType && browserMimeType !== 'application/octet-stream') {
    console.log(`[files] Using browser MIME type for ${filename}: ${browserMimeType}`);
    return browserMimeType;
  }

  // Extract extension from filename (case-insensitive)
  const lastDotIndex = filename.lastIndexOf('.');
  if (lastDotIndex === -1) {
    console.warn(`[files] No extension found for ${filename}, defaulting to text/plain`);
    return 'text/plain';
  }

  const extension = filename.slice(lastDotIndex).toLowerCase();
  const detectedMime = EXTENSION_TO_MIME[extension];

  if (detectedMime) {
    console.log(`[files] Detected MIME type for ${filename} (ext: ${extension}): ${detectedMime}`);
    return detectedMime;
  }

  // For unknown extensions, check if the extension looks like it could be text
  // Common text-like extensions that might not be in our map
  if (extension.length <= 5 && /^\.[a-z]+$/.test(extension)) {
    console.log(`[files] Unknown extension ${extension} for ${filename}, assuming text/plain`);
    return 'text/plain';
  }

  console.warn(`[files] Unknown file type for ${filename}, using application/octet-stream`);
  return 'application/octet-stream';
};

/**
 * Checks if a MIME type represents text-based content that can be decoded and displayed.
 * Used to determine if file content should be included inline in prompts.
 *
 * @param mime - The MIME type to check
 * @returns true if the MIME type represents text content
 *
 * @example
 * isTextBasedMime("text/markdown") // true
 * isTextBasedMime("application/json") // true
 * isTextBasedMime("image/png") // false
 */
export const isTextBasedMime = (mime: string): boolean => {
  // All text/* types are text-based
  if (mime.startsWith('text/')) return true;

  // Common application types that are actually text
  const textApplicationTypes = [
    'application/json',
    'application/jsonl',
    'application/xml',
    'application/javascript',
    'application/typescript',
    'application/x-javascript',
    'application/x-typescript',
  ];

  if (textApplicationTypes.includes(mime)) return true;

  // Check for patterns in MIME type that indicate text
  if (mime.includes('javascript') ||
    mime.includes('typescript') ||
    mime.includes('python') ||
    mime.includes('csv') ||
    mime.includes('yaml') ||
    mime.includes('xml') ||
    mime.includes('json')) {
    return true;
  }

  return false;
};

/**
 * Checks if a MIME type represents an image that can be sent to vision-capable models.
 *
 * @param mime - The MIME type to check
 * @returns true if the MIME type is a supported image format
 */
export const isImageMime = (mime: string): boolean => {
  return mime.startsWith('image/');
};

/**
 * Decodes base64-encoded text content back to a UTF-8 string.
 * Used to extract readable text from file attachments for inclusion in prompts.
 *
 * @param base64 - The base64-encoded string
 * @returns The decoded UTF-8 text, or an error message if decoding fails
 */
export const decodeBase64Text = (base64: string): string => {
  try {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return new TextDecoder().decode(bytes);
  } catch (e) {
    console.error("[files] Failed to decode base64 text:", e);
    return "[Error decoding file content]";
  }
};
