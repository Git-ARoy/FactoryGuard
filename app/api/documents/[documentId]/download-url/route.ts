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
    return errorResponse(
      'INTERNAL_ERROR',
      `Failed to generate download URL for document ${documentId}`,
      500,
      error.message
    );
  }
}
