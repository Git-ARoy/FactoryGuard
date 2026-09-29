import { repositoryFactory } from '../data/factory';
import { blobStorageService, DocumentDownloadInfo } from '../storage';
import { DocumentMetadata } from '../domain/types';
import { DocumentFilters } from '../data/interfaces';

export class DocumentService {
  private documentRepo = repositoryFactory.getDocumentRepository();

  async getDocuments(filters?: DocumentFilters): Promise<{ items: DocumentMetadata[] }> {
    const items = await this.documentRepo.getAll(filters);
    return { items };
  }

  async getDownloadUrl(documentId: string): Promise<DocumentDownloadInfo | null> {
    const doc = await this.documentRepo.getById(documentId);
    if (!doc) return null;

    return blobStorageService.getDownloadUrl(doc);
  }
}

export const documentService = new DocumentService();
