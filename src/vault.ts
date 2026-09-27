// Responsibilities:
// - Remember the vault folder the user picked and write clippings into it.
// Contracts:
// - The directory handle lives in IndexedDB because extension storage cannot
//   hold a FileSystemHandle; the permission it carries is re-checked on use.
// - A clashing file name gets the app's numeric suffix; nothing is overwritten.

const DB_NAME = "glyphary-clipper";
const STORE = "handles";
const KEY = "vault";

function openDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);

    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function transact<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>) {
  return openDatabase().then(
    (database) =>
      new Promise<T>((resolve, reject) => {
        const request = run(database.transaction(STORE, mode).objectStore(STORE));

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      }),
  );
}

export function loadVaultHandle() {
  return transact<FileSystemDirectoryHandle | undefined>("readonly", (store) => store.get(KEY));
}

export function saveVaultHandle(handle: FileSystemDirectoryHandle) {
  return transact("readwrite", (store) => store.put(handle, KEY));
}

export async function chooseVaultFolder() {
  const handle = await window.showDirectoryPicker({ id: "glyphary-vault", mode: "readwrite" });

  await saveVaultHandle(handle);

  return handle;
}

/** Must run inside a user gesture so the browser may show a prompt. */
export async function ensureWritable(handle: FileSystemDirectoryHandle) {
  const options = { mode: "readwrite" } as const;

  if ((await handle.queryPermission(options)) === "granted") {
    return true;
  }

  return (await handle.requestPermission(options)) === "granted";
}

async function fileExists(directory: FileSystemDirectoryHandle, name: string) {
  try {
    await directory.getFileHandle(name);
    return true;
  } catch (error) {
    if (error instanceof DOMException && error.name === "NotFoundError") {
      return false;
    }
    throw error;
  }
}

export async function writeClipping(
  vault: FileSystemDirectoryHandle,
  folderSegments: string[],
  fileName: string,
  content: string,
) {
  let directory = vault;

  for (const segment of folderSegments) {
    directory = await directory.getDirectoryHandle(segment, { create: true });
  }

  const stem = fileName.replace(/\.md$/, "");
  let candidate = fileName;

  for (let counter = 2; await fileExists(directory, candidate); counter += 1) {
    candidate = `${stem} ${counter}.md`;
  }

  const file = await directory.getFileHandle(candidate, { create: true });
  const writable = await file.createWritable();

  await writable.write(content);
  await writable.close();

  return [...folderSegments, candidate].join("/");
}
