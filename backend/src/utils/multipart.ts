import { Request } from 'express';
import { ApiError } from './errors';

export interface ParsedMultipartFile {
  fieldName: string;
  fileName: string;
  mimeType: string;
  buffer: Buffer;
}

const IMAGE_MAX_BYTES = 5 * 1024 * 1024;

/**
 * Parses a multipart/form-data request body without third-party dependencies.
 * Enforces a hard upper size limit before buffering to prevent memory exhaustion.
 */
export async function parseMultipartSingleFile(
  req: Request,
  maxBytes: number = IMAGE_MAX_BYTES
): Promise<ParsedMultipartFile> {
  const contentType = req.headers['content-type'] || '';
  const boundaryMatch = /boundary=(?:"([^"]+)"|([^;\s]+))/i.exec(contentType);
  if (!boundaryMatch) {
    throw ApiError.badRequest('Invalid multipart/form-data header: missing boundary', 'INVALID_MULTIPART');
  }
  const boundary = boundaryMatch[1] || boundaryMatch[2];
  const boundaryDelimiter = Buffer.from(`--${boundary}`);

  const chunks: Buffer[] = [];
  let totalBytes = 0;

  await new Promise<void>((resolve, reject) => {
    req.on('data', (chunk: Buffer) => {
      totalBytes += chunk.length;
      if (totalBytes > maxBytes + 64 * 1024) {
        req.destroy();
        reject(ApiError.badRequest(`Uploaded file exceeds maximum allowed size of ${Math.round(maxBytes / (1024 * 1024))} MB`, 'FILE_TOO_LARGE'));
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve());
    req.on('error', (err) => reject(err));
  });

  const body = Buffer.concat(chunks);
  let pos = body.indexOf(boundaryDelimiter);
  while (pos !== -1) {
    const partStart = pos + boundaryDelimiter.length;
    if (body.slice(partStart, partStart + 2).equals(Buffer.from('--'))) {
      break;
    }
    const headerStart = body.slice(partStart, partStart + 2).equals(Buffer.from('\r\n'))
      ? partStart + 2
      : partStart;
    const headerEnd = body.indexOf(Buffer.from('\r\n\r\n'), headerStart);
    if (headerEnd === -1) break;

    const headersText = body.slice(headerStart, headerEnd).toString('utf8');
    const dataStart = headerEnd + 4;
    const nextBoundary = body.indexOf(boundaryDelimiter, dataStart);
    if (nextBoundary === -1) break;

    // Strip trailing \r\n right before the next boundary
    let dataEnd = nextBoundary;
    if (body.slice(dataEnd - 2, dataEnd).equals(Buffer.from('\r\n'))) {
      dataEnd -= 2;
    }

    const dispMatch = /name="([^"]+)"/i.exec(headersText);
    const fileMatch = /filename="([^"]*)"/i.exec(headersText);
    const typeMatch = /content-type:\s*([^\r\n;]+)/i.exec(headersText);

    if (fileMatch && fileMatch[1]) {
      const fileBuf = body.slice(dataStart, dataEnd);
      if (fileBuf.length > maxBytes) {
        throw ApiError.badRequest(`Uploaded file exceeds maximum allowed size of ${Math.round(maxBytes / (1024 * 1024))} MB`, 'FILE_TOO_LARGE');
      }
      return {
        fieldName: dispMatch?.[1] || 'photo',
        fileName: fileMatch[1],
        mimeType: (typeMatch?.[1] || 'application/octet-stream').trim().toLowerCase(),
        buffer: fileBuf,
      };
    }

    pos = nextBoundary;
  }

  throw ApiError.badRequest('No image file found in multipart payload', 'FILE_REQUIRED');
}

/**
 * Validates actual binary magic bytes for JPEG, PNG, or WEBP images.
 */
export function detectValidatedImageFormat(buffer: Buffer): { mimeType: 'image/jpeg' | 'image/png' | 'image/webp'; ext: string } {
  if (buffer.length < 12) {
    throw ApiError.badRequest('Uploaded image is empty or corrupted', 'INVALID_IMAGE_FILE');
  }

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { mimeType: 'image/jpeg', ext: 'jpg' };
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return { mimeType: 'image/png', ext: 'png' };
  }

  // WEBP: "RIFF" .... "WEBP"
  if (
    buffer.slice(0, 4).toString('ascii') === 'RIFF' &&
    buffer.slice(8, 12).toString('ascii') === 'WEBP'
  ) {
    return { mimeType: 'image/webp', ext: 'webp' };
  }

  throw ApiError.badRequest('Unsupported or invalid image file format. Only JPEG, PNG, and WEBP images are allowed.', 'UNSUPPORTED_IMAGE_FORMAT');
}
