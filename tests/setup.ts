import { vi } from 'vitest';
import { globalMockCosmosClient } from './mocks/azure-cosmos-mock';

process.env.COSMOS_ENDPOINT = 'https://factoryguard-mock.documents.azure.com:443/';
process.env.COSMOS_KEY = 'mock-key-for-tests';
process.env.COSMOS_DATABASE = 'factoryguard';
process.env.STORAGE_CONNECTION_STRING =
  'DefaultEndpointsProtocol=https;AccountName=factoryguardmock;AccountKey=mockkey==;EndpointSuffix=core.windows.net';
process.env.STORAGE_CONTAINER_NAME = 'documents';

vi.mock('@azure/cosmos', () => {
  return {
    CosmosClient: vi.fn().mockImplementation(() => globalMockCosmosClient),
  };
});

vi.mock('@azure/storage-blob', () => {
  const mockBlobClient = {
    url: 'https://factoryguardmock.blob.core.windows.net/documents/sample.pdf',
    downloadToBuffer: vi.fn().mockResolvedValue(Buffer.from('FACTORYGUARD ARCHIVE CONTENT')),
  };

  const mockContainerClient = {
    createIfNotExists: vi.fn().mockResolvedValue({}),
    exists: vi.fn().mockResolvedValue(true),
    getBlockBlobClient: vi.fn().mockReturnValue({
      exists: vi.fn().mockResolvedValue(true),
      upload: vi.fn().mockResolvedValue({}),
      downloadToBuffer: vi.fn().mockResolvedValue(Buffer.from('FACTORYGUARD ARCHIVE CONTENT')),
    }),
    getBlobClient: vi.fn().mockReturnValue(mockBlobClient),
  };

  const mockBlobServiceClient = {
    getContainerClient: vi.fn().mockReturnValue(mockContainerClient),
  };

  return {
    BlobServiceClient: {
      fromConnectionString: vi.fn().mockReturnValue(mockBlobServiceClient),
    },
    generateBlobSASQueryParameters: vi.fn().mockReturnValue({
      toString: () => 'sv=2024-08-04&se=2026-10-01&sp=r&sig=mocksig',
    }),
    BlobSASPermissions: {
      parse: vi.fn().mockReturnValue({}),
    },
    StorageSharedKeyCredential: vi.fn().mockImplementation(() => ({})),
  };
});
