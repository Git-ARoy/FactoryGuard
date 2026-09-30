import { NextRequest, NextResponse } from 'next/server';
import { errorResponse } from '@/lib/api-client/response';
import { repositoryFactory } from '@/lib/data/factory';
import { blobStorageService } from '@/lib/storage';
import { TelemetryLogger } from '@/lib/observability';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: { documentId: string } }
) {
  const { documentId } = params;
  const docRepo = repositoryFactory.getDocumentRepository();

  const doc = await docRepo.getById(documentId);
  if (!doc) {
    return errorResponse('DOCUMENT_NOT_FOUND', `Document ${documentId} not found`, 404);
  }

  try {
    const { buffer, contentType } = await blobStorageService.downloadBlob(doc.blobName);

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `inline; filename="${doc.blobName}"`,
        'Content-Length': buffer.length.toString(),
      },
    });
  } catch (err: unknown) {
    const error = err as Error;
    TelemetryLogger.trackException(error, {
      endpoint: `/api/documents/${documentId}/content`,
      documentId,
    });
    return errorResponse(
      'STORAGE_ERROR',
      `Failed to retrieve document from Azure Blob Storage: ${error.message}`,
      502
    );
  }
}
