import { boolInt, bool, str, SqliteRepository } from '@/data/repository';
import type { RepositoryOptions } from '@/data/repository';
import type { Contact, ContactType } from '@/data/types';

const options: RepositoryOptions<Contact> = {
  table: 'contacts',
  idField: 'contactId',
  sheet: 'Contacts',
  rowToEntity: (row): Contact => ({
    contactId: str(row.contactId),
    name: str(row.name),
    organization: str(row.organization),
    phone: str(row.phone),
    phone2: str(row.phone2),
    email: str(row.email),
    type: str(row.type, 'NGO') as ContactType,
    state: str(row.state),
    district: str(row.district),
    serviceArea: str(row.serviceArea),
    specialization: str(row.specialization),
    isActive: bool(row.isActive),
    isLocalOnly: bool(row.isLocalOnly),
    createdAt: str(row.createdAt),
    updatedAt: str(row.updatedAt),
    syncedAt: row.syncedAt ? str(row.syncedAt) : null,
    localVersion: Number(row.localVersion ?? 1),
    serverVersion: Number(row.serverVersion ?? 0),
    isDeleted: bool(row.isDeleted),
  }),
  entityToRow: (entity): Record<string, unknown> => ({
    contactId: entity.contactId,
    name: entity.name,
    organization: entity.organization,
    phone: entity.phone,
    phone2: entity.phone2,
    email: entity.email,
    type: entity.type,
    state: entity.state,
    district: entity.district,
    serviceArea: entity.serviceArea,
    specialization: entity.specialization,
    isActive: boolInt(entity.isActive),
    isLocalOnly: boolInt(entity.isLocalOnly),
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
    syncedAt: entity.syncedAt,
    localVersion: entity.localVersion,
    serverVersion: entity.serverVersion,
    isDeleted: boolInt(entity.isDeleted),
  }),
};

export const contactsRepository = new SqliteRepository<Contact>(options);
