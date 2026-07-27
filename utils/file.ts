import fs from 'fs/promises';

// Détection du runtime
const isBun = typeof Bun !== 'undefined' && !!Bun.file;
const isNode = !isBun;

export async function readJsonFile<T>(chemin: string): Promise<T> {
  try {
    let contenu: string;

    if (isBun) {
      // Utiliser Bun
      contenu = await Bun.file(chemin).text();
    } else {
      // Utiliser Node.js
      contenu = await fs.readFile(chemin, 'utf-8');
    }

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
  const content = JSON.stringify(data, null, spaces);

  if (isBun) {
    // Utiliser Bun
    await Bun.write(chemin, content);
  } else {
    // Utiliser Node.js
    await fs.writeFile(chemin, content, 'utf-8');
  }
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