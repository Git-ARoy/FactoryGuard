import { NextRequest } from 'next/server';
import { jsonResponse, errorResponse } from '@/lib/api-client/response';
import { documentService } from '@/lib/services/document.service';
import { TelemetryLogger } from '@/lib/observability';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: { documentId: string } }
) {
  const { documentId } = params;

  try {
    const downloadInfo = await documentService.getDownloadUrl(documentId);
    if (!downloadInfo) {
      return errorResponse(
        'DOCUMENT_NOT_FOUND',
        `Document ${documentId} does not exist.`,
        404
      );
    }

    return jsonResponse(downloadInfo);
  } catch (err: unknown) {
    const error = err as Error;
    TelemetryLogger.trackException(error, {
      endpoint: `/api/documents/${documentId}/download-url`,
      documentId,
    });

    const isNotFound = error.message.includes('not found in Blob Storage');
    const statusCode = isNotFound ? 404 : 500;
    const errorCode = isNotFound ? 'BLOB_NOT_FOUND' : 'STORAGE_CONFIGURATION_ERROR';

    return errorResponse(
      errorCode,
      `Failed to generate download URL for document ${documentId}: ${error.message}`,
      statusCode
    );
  }
}
