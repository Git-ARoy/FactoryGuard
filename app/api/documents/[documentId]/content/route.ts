import { NextRequest, NextResponse } from 'next/server';
import { errorResponse } from '@/lib/api-client/response';
import { repositoryFactory } from '@/lib/data/factory';
import { blobStorageService } from '@/lib/storage';

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

  const content = blobStorageService.getLocalDocumentContent(doc.blobName);
  if (!content) {
    return errorResponse('DOCUMENT_NOT_FOUND', `Document content not found`, 404);
  }

  return new NextResponse(new Uint8Array(content.buffer), {
    status: 200,
    headers: {
      'Content-Type': content.contentType,
      'Content-Disposition': `inline; filename="${doc.blobName}"`,
      'Content-Length': content.buffer.length.toString(),
    },
  });
}
