import fs from 'fs/promises';
import path from 'path';
import chalk from 'chalk';
import { type EnvConfig, type CommandOptions } from '../types';
import { validateConfig } from '../utils/validator';
import { readJsonFile } from '../utils/file';
import {Process} from "../utils/process.ts";

export async function command(
    fichier: string,
    options: CommandOptions,
    startPoint:(e : EnvConfig)=>Promise<void>
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

    await startPoint(config);

    const endTime = performance.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    console.log(chalk.green(`\n✅ Site "${config.name}" créé avec succès !`));
    console.log(chalk.blue(`🌐 Domaine: ${config.domain}`));
    console.log(chalk.blue(`📂 Chemin: ${config.site.path}`));
    console.log(chalk.dim(`⏱️  Durée: ${duration}s`));
}

export async function createCommand(fichier: string, options: CommandOptions,){
    await command(fichier, options, async(config)=>{
        await Process.create(config, options);
    })
}
export async function updateCommand(fichier: string, options: CommandOptions,){
    await command(fichier, options, async(config)=>{
        await Process.update(config, options);
    })
}