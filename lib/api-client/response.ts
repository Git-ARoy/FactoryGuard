import { NextResponse } from 'next/server';
import { ApiErrorResponse } from '../domain/types';

export function jsonResponse<T>(data: T, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: {
      'Cache-Control': 'no-store, max-age=0',
      'Content-Type': 'application/json',
    },
  });
}

export function errorResponse(
  code: string,
  message: string,
  status = 400,
  details?: unknown
) {
  const body: ApiErrorResponse = {
    error: {
      code,
      message,
      requestId: `req-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      details,
    },
  };

  return NextResponse.json(body, {
    status,
    headers: {
      'Cache-Control': 'no-store, max-age=0',
      'Content-Type': 'application/json',
    },
  });
}
