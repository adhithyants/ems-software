import { app, safeStorage } from 'electron';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const STORE_FILE = 'secure-store.json';

function getStorePath() {
  return path.join(app.getPath('userData'), STORE_FILE);
}

async function readStore() {
  try {
    const raw = await readFile(getStorePath(), 'utf8');
    return JSON.parse(raw);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return {};
    }
    throw error;
  }
}

async function writeStore(store) {
  const storePath = getStorePath();
  await mkdir(path.dirname(storePath), { recursive: true });
  await writeFile(storePath, JSON.stringify(store, null, 2), 'utf8');
}

function ensureEncryptionAvailable() {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('OS-level secure storage is unavailable on this device.');
  }
}

function encryptString(value) {
  ensureEncryptionAvailable();
  return safeStorage.encryptString(value).toString('base64');
}

function decryptString(value) {
  ensureEncryptionAvailable();
  return safeStorage.decryptString(Buffer.from(value, 'base64'));
}

export async function getSecureValue(key) {
  const store = await readStore();
  const encryptedValue = store[key];

  if (!encryptedValue) {
    return null;
  }

  return decryptString(encryptedValue);
}

export async function setSecureValue(key, value) {
  if (typeof value !== 'string') {
    throw new TypeError(`Secure value for "${key}" must be a string.`);
  }

  const store = await readStore();
  store[key] = encryptString(value);
  await writeStore(store);
  return true;
}

export async function deleteSecureValue(key) {
  const store = await readStore();
  if (!(key in store)) {
    return true;
  }

  delete store[key];
  await writeStore(store);
  return true;
}
