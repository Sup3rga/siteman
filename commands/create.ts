import fs from 'fs/promises';
import path from 'path';
import chalk from 'chalk';
import { EnvConfig, CommandOptions } from '../types';
import { validateConfig } from '../utils/validator';
import { readJsonFile } from '../utils/file';
import { Process } from '../utils/process';

export async function createCommand(
  fichier: string,
  options: CommandOptions
): Promise<void> {
  const verbose = options.verbose;
  const startTime = performance.now();
  
  // Résoudre le chemin absolu
  const cheminAbsolu = path.resolve(process.cwd(), fichier);
  
  if (verbose) {
    console.log(chalk.cyan('\n🚀 Démarrage de la création...'));
    console.log(chalk.dim(`📁 Fichier de configuration: ${cheminAbsolu}`));
    console.log(chalk.dim(`🌍 Environnement: ${options.env}`));
    console.log(chalk.dim(`🔄 Force: ${options.force ? '✅ Oui' : '❌ Non'}`));
    console.log(chalk.dim(`🔊 Mode verbose: ${options.verbose ? '✅ Activé' : '❌ Désactivé'}`));
    console.log(chalk.dim(`🔧 Bun version: ${Bun.version}`));
  }
  
  // Vérifier si le fichier existe
  try {
    await fs.access(cheminAbsolu);
  } catch {
    throw new Error(`Le fichier ${cheminAbsolu} n'existe pas`);
  }
  
  // Lire et parser le fichier JSON avec Bun
  const config = await readJsonFile<EnvConfig>(cheminAbsolu);
  
  // Valider la configuration
  validateConfig(config);
  
  console.log(chalk.green('✅ Configuration chargée avec succès !'));
  
  if (verbose) {
    console.log(chalk.dim('\n📋 Détails de la configuration:'));
    console.log(chalk.dim(JSON.stringify(config, null, 2)));
  }
  
  // Simuler la création du site
  await Process.start(config, options);
  
  const endTime = performance.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);
  
  console.log(chalk.green(`\n✅ Site "${config.name}" créé avec succès !`));
  console.log(chalk.blue(`🌐 Domaine: ${config.domain}`));
  console.log(chalk.blue(`📂 Chemin: ${config.path}`));
  console.log(chalk.dim(`⏱️  Durée: ${duration}s`));
}