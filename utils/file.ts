import fs from 'fs/promises';

export async function readJsonFile<T>(chemin: string): Promise<T> {
  try {
    // Utiliser Bun pour lire le fichier
    const contenu = await Bun.file(chemin).text();
    return JSON.parse(contenu) as T;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`Le fichier JSON est invalide: ${error.message}`);
    }
    throw error;
  }
}

export async function writeJsonFile<T>(
  chemin: string,
  data: T,
  spaces: number = 2
): Promise<void> {
  await Bun.write(chemin, JSON.stringify(data, null, spaces));
}

export async function ensureDirectoryExists(chemin: string): Promise<void> {
  await fs.mkdir(chemin, { recursive: true });
}

export async function fileExists(chemin: string): Promise<boolean> {
  try {
    await fs.access(chemin);
    return true;
  } catch {
    return false;
  }
}