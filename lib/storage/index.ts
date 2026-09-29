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
  private provisionPromise: Promise<void> | null = null;

  getClient(): BlobServiceClient {
    if (!this.blobServiceClient) {
      if (config.storage.connectionString) {
        this.blobServiceClient = BlobServiceClient.fromConnectionString(
          config.storage.connectionString
        );
      } else if (config.storage.accountUrl) {
        this.blobServiceClient = new BlobServiceClient(config.storage.accountUrl);
      } else {
        throw new Error(
          'Azure Blob Storage credentials not configured (STORAGE_CONNECTION_STRING or STORAGE_ACCOUNT_URL required)'
        );
      }
    }
    return this.blobServiceClient;
  }

  resetClient(): void {
    this.blobServiceClient = null;
    this.provisionPromise = null;
  }

  /**
   * Ensures the Azure Blob container exists and seeds initial sample documents
   * so manual container creation or uploads in Azure are not required.
   */
  async ensureContainerAndBlobs(): Promise<void> {
    if (this.provisionPromise) {
      return this.provisionPromise;
    }

    this.provisionPromise = (async () => {
      try {
        const client = this.getClient();
        const containerName = config.storage.containerName || 'documents';
        const containerClient = client.getContainerClient(containerName);

        await containerClient.createIfNotExists({ access: 'blob' });

        const sampleDir = path.join(process.cwd(), 'data', 'seed', 'sample-docs');
        if (fs.existsSync(sampleDir)) {
          const files = fs.readdirSync(sampleDir);
          for (const file of files) {
            const blockBlobClient = containerClient.getBlockBlobClient(file);
            const exists = await blockBlobClient.exists();
            if (!exists) {
              const filePath = path.join(sampleDir, file);
              const fileBuffer = fs.readFileSync(filePath);
              await blockBlobClient.upload(fileBuffer, fileBuffer.length, {
                blobHTTPHeaders: {
                  blobContentType: file.endsWith('.pdf') ? 'application/pdf' : 'text/plain',
                },
              });
            }
          }
        }
      } catch (err) {
        this.provisionPromise = null;
        console.error('[Blob Storage Provisioner] Container setup or blob seeding failed:', err);
        throw err;
      }
    })();

    return this.provisionPromise;
  }

  /**
   * Generates a signed SAS download URL directly from Azure Blob Storage.
   */
  async getDownloadUrl(
    document: DocumentMetadata,
    expiresInMinutes = 15
  ): Promise<DocumentDownloadInfo> {
    await this.ensureContainerAndBlobs();

    const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000).toISOString();
    const containerName = config.storage.containerName || 'documents';
    const containerClient = this.getClient().getContainerClient(containerName);
    const blobClient = containerClient.getBlobClient(document.blobName);

    // If using connection string with account key, generate SAS URL
    if (config.storage.connectionString && config.storage.connectionString.includes('AccountKey=')) {
      const matches = config.storage.connectionString.match(
        /AccountName=([^;]+);AccountKey=([^;]+)/
      );
      if (matches) {
        const accountName = matches[1];
        const accountKey = matches[2];
        const sharedKeyCred = new StorageSharedKeyCredential(accountName, accountKey);

        const sasToken = generateBlobSASQueryParameters(
          {
            containerName,
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

    // Default Azure Blob URL
    return {
      documentId: document.id,
      url: blobClient.url,
      expiresAt,
    };
  }

  /**
   * Downloads blob content directly from Azure Blob Storage.
   */
  async downloadBlob(blobName: string): Promise<{ buffer: Buffer; contentType: string }> {
    await this.ensureContainerAndBlobs();
    const containerName = config.storage.containerName || 'documents';
    const containerClient = this.getClient().getContainerClient(containerName);
    const blobClient = containerClient.getBlobClient(blobName);

    const buffer = await blobClient.downloadToBuffer();
    const contentType = blobName.endsWith('.pdf') ? 'application/pdf' : 'text/plain';

    return { buffer, contentType };
  }
}

export const blobStorageService = new BlobStorageService();
