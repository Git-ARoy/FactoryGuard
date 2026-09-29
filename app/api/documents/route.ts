import { NextRequest } from 'next/server';
import { jsonResponse, errorResponse } from '@/lib/api-client/response';
import { documentService } from '@/lib/services/document.service';
import { DocumentCategory } from '@/lib/domain/types';
import { TelemetryLogger } from '@/lib/observability';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const machineId = searchParams.get('machineId') || undefined;
    const category = searchParams.get('category') as DocumentCategory | null;

    if (
      category &&
      !['MANUAL', 'MAINTENANCE', 'INSPECTION', 'REPORT'].includes(category)
    ) {
      return errorResponse(
        'INVALID_REQUEST',
        'category must be MANUAL, MAINTENANCE, INSPECTION, or REPORT',
        400
      );
    }

    const data = await documentService.getDocuments({
      machineId,
      category: category || undefined,
    });

    return jsonResponse(data);
  } catch (err: unknown) {
    const error = err as Error;
    TelemetryLogger.trackException(error, { endpoint: '/api/documents' });
    return errorResponse(
      'INTERNAL_ERROR',
      'Failed to retrieve documents',
      500,
      error.message
    );
  }
}
