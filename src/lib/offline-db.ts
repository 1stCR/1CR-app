import { openDB } from 'idb';
import type { DBSchema, IDBPDatabase } from 'idb';

interface OfflineDB extends DBSchema {
  jobs: {
    key: string;
    value: {
      id: string;
      data: any;
      synced: boolean;
      created_at: string;
    };
  };
  time_entries: {
    key: string;
    value: {
      id: string;
      data: any;
      synced: boolean;
      created_at: string;
    };
  };
  photos: {
    key: string;
    value: {
      id: string;
      file: Blob;
      job_id: string;
      synced: boolean;
      created_at: string;
    };
  };
}

let db: IDBPDatabase<OfflineDB> | null = null;

export async function initOfflineDB() {
  if (db) return db;

  db = await openDB<OfflineDB>('amd-offline', 1, {
    upgrade(db) {
      // Jobs store
      if (!db.objectStoreNames.contains('jobs')) {
        db.createObjectStore('jobs', { keyPath: 'id' });
      }

      // Time entries store
      if (!db.objectStoreNames.contains('time_entries')) {
        db.createObjectStore('time_entries', { keyPath: 'id' });
      }

      // Photos store
      if (!db.objectStoreNames.contains('photos')) {
        db.createObjectStore('photos', { keyPath: 'id' });
      }
    }
  });

  return db;
}

export async function saveOfflineJob(job: any) {
  const database = await initOfflineDB();

  await database.put('jobs', {
    id: `offline-${Date.now()}`,
    data: job,
    synced: false,
    created_at: new Date().toISOString()
  });
}

export async function getOfflineJobs() {
  const database = await initOfflineDB();
  return database.getAll('jobs');
}

export async function saveOfflineTimeEntry(entry: any) {
  const database = await initOfflineDB();

  await database.put('time_entries', {
    id: `offline-${Date.now()}`,
    data: entry,
    synced: false,
    created_at: new Date().toISOString()
  });
}

export async function getOfflineTimeEntries() {
  const database = await initOfflineDB();
  return database.getAll('time_entries');
}

export async function saveOfflinePhoto(jobId: string, file: Blob) {
  const database = await initOfflineDB();

  await database.put('photos', {
    id: `offline-${Date.now()}`,
    file: file,
    job_id: jobId,
    synced: false,
    created_at: new Date().toISOString()
  });
}

export async function getOfflinePhotos() {
  const database = await initOfflineDB();
  return database.getAll('photos');
}

export async function syncOfflineData() {
  const database = await initOfflineDB();

  // Get all unsynced items
  const jobs = await database.getAll('jobs');
  const unsyncedJobs = jobs.filter(j => !j.synced);

  for (const job of unsyncedJobs) {
    try {
      const response = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(job.data)
      });

      if (response.ok) {
        // Mark as synced
        await database.put('jobs', { ...job, synced: true });
      }
    } catch (error) {
      console.error('Failed to sync job:', job.id, error);
    }
  }

  // Similar for time entries
  const timeEntries = await database.getAll('time_entries');
  const unsyncedTimeEntries = timeEntries.filter(t => !t.synced);

  for (const entry of unsyncedTimeEntries) {
    try {
      const response = await fetch('/api/time-entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry.data)
      });

      if (response.ok) {
        await database.put('time_entries', { ...entry, synced: true });
      }
    } catch (error) {
      console.error('Failed to sync time entry:', entry.id, error);
    }
  }

  // Similar for photos
  const photos = await database.getAll('photos');
  const unsyncedPhotos = photos.filter(p => !p.synced);

  for (const photo of unsyncedPhotos) {
    try {
      const formData = new FormData();
      formData.append('photo', photo.file);
      formData.append('job_id', photo.job_id);

      const response = await fetch('/api/photos', {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        await database.put('photos', { ...photo, synced: true });
      }
    } catch (error) {
      console.error('Failed to sync photo:', photo.id, error);
    }
  }
}

// Auto-sync when online
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    console.log('Back online - syncing data...');
    syncOfflineData();
  });
}
