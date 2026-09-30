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

function parseConnectionString(connStr: string): { accountName?: string; accountKey?: string } {
  const accountNameMatch = connStr.match(/AccountName=([^;]+)/i);
  const accountKeyMatch = connStr.match(/AccountKey=([^;]+)/i);
  return {
    accountName: accountNameMatch ? accountNameMatch[1] : undefined,
    accountKey: accountKeyMatch ? accountKeyMatch[1] : undefined,
  };
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
   * Idempotent: checks for existing blobs before uploading, never overwriting unnecessarily.
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

        // Create container if it does not exist (private access)
        await containerClient.createIfNotExists();

        const sampleDir = fs.existsSync(path.join(process.cwd(), 'data', 'seed', 'sample-docs'))
          ? path.join(process.cwd(), 'data', 'seed', 'sample-docs')
          : path.join(__dirname, '..', '..', 'data', 'seed', 'sample-docs');

        if (fs.existsSync(sampleDir)) {
          const files = fs.readdirSync(sampleDir);
          for (const file of files) {
            // Only seed actual sample documents
            if (!file.endsWith('.pdf')) continue;

            const blockBlobClient = containerClient.getBlockBlobClient(file);
            const exists = await blockBlobClient.exists();
            if (!exists) {
              const filePath = path.join(sampleDir, file);
              const fileBuffer = fs.readFileSync(filePath);
              await blockBlobClient.upload(fileBuffer, fileBuffer.length, {
                blobHTTPHeaders: {
                  blobContentType: 'application/pdf',
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
   * Generates a signed, short-lived, read-only SAS download URL directly from Azure Blob Storage.
   * Throws a descriptive error if storage is not configured for SAS generation or if the blob is missing.
   */
  async getDownloadUrl(
    document: DocumentMetadata,
    expiresInMinutes = 15
  ): Promise<DocumentDownloadInfo> {
    await this.ensureContainerAndBlobs();

    const containerName = config.storage.containerName || 'documents';
    const containerClient = this.getClient().getContainerClient(containerName);
    const blobClient = containerClient.getBlobClient(document.blobName);

    // Verify underlying blob exists in storage where supported
    if (typeof blobClient.exists === 'function') {
      const exists = await blobClient.exists();
      if (!exists) {
        throw new Error(`The requested document file "${document.blobName}" was not found in Blob Storage.`);
      }
    }

    // Parse AccountName and AccountKey from connection string to generate SAS
    let accountName: string | undefined;
    let accountKey: string | undefined;

    if (config.storage.connectionString) {
      const creds = parseConnectionString(config.storage.connectionString);
      accountName = creds.accountName;
      accountKey = creds.accountKey;
    }

    if (!accountName || !accountKey) {
      throw new Error(
        'Azure Blob Storage is not configured for SAS generation. A STORAGE_CONNECTION_STRING containing AccountKey is required.'
      );
    }

    const sharedKeyCred = new StorageSharedKeyCredential(accountName, accountKey);
    const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000).toISOString();

    const sasToken = generateBlobSASQueryParameters(
      {
        containerName,
        blobName: document.blobName,
        permissions: BlobSASPermissions.parse('r'),
        startsOn: new Date(Date.now() - 5 * 60 * 1000), // 5-minute pre-dated buffer against clock skew
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

  /**
   * Downloads blob content directly from Azure Blob Storage server-side.
   */
  async downloadBlob(blobName: string): Promise<{ buffer: Buffer; contentType: string }> {
    await this.ensureContainerAndBlobs();
    const containerName = config.storage.containerName || 'documents';
    const containerClient = this.getClient().getContainerClient(containerName);
    const blobClient = containerClient.getBlobClient(blobName);

    if (typeof blobClient.exists === 'function') {
      const exists = await blobClient.exists();
      if (!exists) {
        throw new Error(`The requested file "${blobName}" was not found in Blob Storage.`);
      }
    }

    const buffer = await blobClient.downloadToBuffer();
    const contentType = blobName.endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream';

    return { buffer, contentType };
  }
}

export const blobStorageService = new BlobStorageService();
