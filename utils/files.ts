
export const isTextBasedMime = (mime: string): boolean => {
  return mime.startsWith('text/') || 
         mime === 'application/json' ||
         mime === 'application/xml' ||
         mime.includes('javascript') ||
         mime.includes('typescript') ||
         mime.includes('python') ||
         mime.includes('csv');
};

export const isImageMime = (mime: string): boolean => {
  return mime.startsWith('image/');
};

export const decodeBase64Text = (base64: string): string => {
  try {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return new TextDecoder().decode(bytes);
  } catch (e) {
    console.error("Failed to decode base64 text", e);
    return "[Error decoding file content]";
  }
};
