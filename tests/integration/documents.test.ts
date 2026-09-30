import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { documentService } from '../../lib/services/document.service';
import { blobStorageService } from '../../lib/storage';
import { GET as getDocumentsRoute } from '../../app/api/documents/route';
import { GET as getDownloadUrlRoute } from '../../app/api/documents/[documentId]/download-url/route';
import { GET as getContentRoute } from '../../app/api/documents/[documentId]/content/route';
import { NextRequest } from 'next/server';
import seedDocuments from '../../data/seed/documents.json';

describe('Machine Documents System Consistency', () => {
  beforeEach(() => {
    blobStorageService.resetClient();
  });

  describe('1. Seed Dataset and File Consistency', () => {
    it('contains exactly two seeded document records', () => {
      expect(seedDocuments).toHaveLength(2);
      expect(seedDocuments.map((d) => d.id)).toEqual(['doc-001', 'doc-002']);
    });

    it('confirms every seeded document references an existing sample PDF on disk', () => {
      const sampleDir = path.join(process.cwd(), 'data', 'seed', 'sample-docs');
      const diskFiles = fs.readdirSync(sampleDir);

      expect(diskFiles).toHaveLength(2);
      expect(diskFiles).toContain('CNC-02-maintenance-procedure.pdf');
      expect(diskFiles).toContain('CNC-operating-manual.pdf');

      for (const doc of seedDocuments) {
        expect(diskFiles).toContain(doc.blobName);
        const filePath = path.join(sampleDir, doc.blobName);
        const stats = fs.statSync(filePath);
        expect(stats.size).toBeGreaterThan(0);
      }
    });

    it('verifies exact metadata mapping for doc-001 and doc-002', () => {
      const doc1 = seedDocuments.find((d) => d.id === 'doc-001');
      expect(doc1).toBeDefined();
      expect(doc1!.machineId).toBe('CNC-02');
      expect(doc1!.name).toBe('CNC-02 Spindle Maintenance & Calibration Procedure.pdf');
      expect(doc1!.blobName).toBe('CNC-02-maintenance-procedure.pdf');
      expect(doc1!.category).toBe('MAINTENANCE');

      const doc2 = seedDocuments.find((d) => d.id === 'doc-002');
      expect(doc2).toBeDefined();
      expect(doc2!.machineId).toBe('CNC-02');
      expect(doc2!.name).toBe('CNC Machining Center Operating Manual Rev4.pdf');
      expect(doc2!.blobName).toBe('CNC-operating-manual.pdf');
      expect(doc2!.category).toBe('MANUAL');
    });
  });

  describe('2. DocumentService & Storage Service', () => {
    it('retrieves all documents matching seed count', async () => {
      const { items } = await documentService.getDocuments();
      expect(items).toHaveLength(2);
      expect(items.map((i) => i.id)).toEqual(['doc-001', 'doc-002']);
    });

    it('generates a signed SAS URL for valid doc-001', async () => {
      const res = await documentService.getDownloadUrl('doc-001');
      expect(res).not.toBeNull();
      expect(res!.documentId).toBe('doc-001');
      expect(res!.url).toContain('https://');
      expect(res!.expiresAt).toBeDefined();
    });

    it('generates a signed SAS URL for valid doc-002', async () => {
      const res = await documentService.getDownloadUrl('doc-002');
      expect(res).not.toBeNull();
      expect(res!.documentId).toBe('doc-002');
      expect(res!.url).toContain('https://');
      expect(res!.expiresAt).toBeDefined();
    });

    it('returns null when requesting download URL for nonexistent document', async () => {
      const res = await documentService.getDownloadUrl('doc-999');
      expect(res).toBeNull();
    });

    it('downloads blob content directly from storage', async () => {
      const { buffer, contentType } = await blobStorageService.downloadBlob(
        'CNC-02-maintenance-procedure.pdf'
      );
      expect(buffer).toBeDefined();
      expect(contentType).toBe('application/pdf');
    });
  });

  describe('3. REST API Endpoints', () => {
    it('GET /api/documents returns 200 and exactly 2 documents', async () => {
      const req = new NextRequest('http://localhost:3000/api/documents');
      const res = await getDocumentsRoute(req);

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.items).toHaveLength(2);
      expect(json.items.map((d: { id: string }) => d.id)).toEqual(['doc-001', 'doc-002']);
    });

    it('GET /api/documents/doc-001/download-url returns 200 and valid SAS URL', async () => {
      const req = new NextRequest('http://localhost:3000/api/documents/doc-001/download-url');
      const res = await getDownloadUrlRoute(req, { params: { documentId: 'doc-001' } });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.documentId).toBe('doc-001');
      expect(json.url).toContain('https://');
    });

    it('GET /api/documents/doc-999/download-url returns 404', async () => {
      const req = new NextRequest('http://localhost:3000/api/documents/doc-999/download-url');
      const res = await getDownloadUrlRoute(req, { params: { documentId: 'doc-999' } });

      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.error.code).toBe('DOCUMENT_NOT_FOUND');
    });

    it('GET /api/documents/doc-001/content returns 200 with PDF content headers', async () => {
      const req = new NextRequest('http://localhost:3000/api/documents/doc-001/content');
      const res = await getContentRoute(req, { params: { documentId: 'doc-001' } });

      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toBe('application/pdf');
      expect(res.headers.get('content-disposition')).toContain('CNC-02-maintenance-procedure.pdf');
    });

    it('GET /api/documents/doc-999/content returns 404 for missing document', async () => {
      const req = new NextRequest('http://localhost:3000/api/documents/doc-999/content');
      const res = await getContentRoute(req, { params: { documentId: 'doc-999' } });

      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.error.code).toBe('DOCUMENT_NOT_FOUND');
    });
  });
});
