import {
  BlobServiceClient,
  generateBlobSASQueryParameters,
  BlobSASPermissions,
  StorageSharedKeyCredential,
} from '@azure/storage-blob';
import { config } from '../config/env';
import { DocumentMetadata } from '../domain/types';
import fs from 'fs';
import path from 'path';

export interface DocumentDownloadInfo {
  documentId: string;
  url: string;
  expiresAt: string;
}

export class BlobStorageService {
  private blobServiceClient: BlobServiceClient | null = null;

  private getClient(): BlobServiceClient {
    if (!this.blobServiceClient) {
      if (config.storage.connectionString) {
        this.blobServiceClient = BlobServiceClient.fromConnectionString(
          config.storage.connectionString
        );
      } else if (config.storage.accountUrl) {
        this.blobServiceClient = new BlobServiceClient(config.storage.accountUrl);
      } else {
        throw new Error('Azure Blob Storage credentials not configured');
      }
    }
    return this.blobServiceClient;
  }

  /**
   * Generates a signed download URL (SAS token) in Azure mode, or a local download route in local mode.
   */
  async getDownloadUrl(
    document: DocumentMetadata,
    expiresInMinutes = 15
  ): Promise<DocumentDownloadInfo> {
    const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000).toISOString();

    if (!config.storage.isConfigured) {
      // Local fallback mode: Return direct application download route
      return {
        documentId: document.id,
        url: `/api/documents/${document.id}/content`,
        expiresAt,
      };
    }

    try {
      const containerClient = this.getClient().getContainerClient(
        config.storage.containerName
      );
      const blobClient = containerClient.getBlobClient(document.blobName);

      // If using connection string with account key, generate SAS URL
      if (config.storage.connectionString.includes('AccountKey=')) {
        const matches = config.storage.connectionString.match(
          /AccountName=([^;]+);AccountKey=([^;]+)/
        );
        if (matches) {
          const accountName = matches[1];
          const accountKey = matches[2];
          const sharedKeyCred = new StorageSharedKeyCredential(
            accountName,
            accountKey
          );

          const sasToken = generateBlobSASQueryParameters(
            {
              containerName: config.storage.containerName,
              blobName: document.blobName,
              permissions: BlobSASPermissions.parse('r'),
              startsOn: new Date(),
              expiresOn: new Date(Date.now() + expiresInMinutes * 60 * 1000),
            },
            sharedKeyCred
          ).toString();

          return {
            documentId: document.id,
            url: `${blobClient.url}?${sasToken}`,
            expiresAt,
          };
        }
      }

      // Default blob client URL
      return {
        documentId: document.id,
        url: blobClient.url,
        expiresAt,
      };
    } catch (err) {
      console.error('Failed to generate Azure Blob SAS URL, falling back to local content route', err);
      return {
        documentId: document.id,
        url: `/api/documents/${document.id}/content`,
        expiresAt,
      };
    }
  }

  /**
   * Reads file content for local fallback serving.
   */
  getLocalDocumentContent(blobName: string): { buffer: Buffer; contentType: string } | null {
    const samplePath = path.join(
      process.cwd(),
      'data',
      'seed',
      'sample-docs',
      blobName
    );

    if (fs.existsSync(samplePath)) {
      const buffer = fs.readFileSync(samplePath);
      const contentType = blobName.endsWith('.pdf') ? 'application/pdf' : 'text/plain';
      return { buffer, contentType };
    }

    // Fallback generated content if file not found on disk
    const content = Buffer.from(
      `FACTORYGUARD INDUSTRIAL ARCHIVE\nDocument: ${blobName}\nGenerated for local workshop inspection.`
    );
    return { buffer: content, contentType: 'text/plain' };
  }
}

export const blobStorageService = new BlobStorageService();
