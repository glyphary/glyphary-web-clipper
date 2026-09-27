import { chooseVaultFolder, loadVaultHandle } from "./vault";

const status = document.getElementById("status") as HTMLParagraphElement;
const vaultName = document.getElementById("vault-name") as HTMLParagraphElement;
const chooseVault = document.getElementById("choose-vault") as HTMLButtonElement;

function show(handle: FileSystemDirectoryHandle | undefined) {
  vaultName.textContent = handle ? `Vault: ${handle.name}` : "No vault folder chosen yet.";
  chooseVault.textContent = handle ? "Change vault folder" : "Choose vault folder";
}

chooseVault.addEventListener("click", async () => {
  try {
    show(await chooseVaultFolder());
    status.textContent = "Saved.";
  } catch (error) {
    if (!(error instanceof DOMException && error.name === "AbortError")) {
      status.textContent = error instanceof Error ? error.message : String(error);
    }
  }
});

loadVaultHandle().then(show, () => show(undefined));
