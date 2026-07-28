#!/usr/bin/env node
import { Command } from "commander";
import chalk from "chalk";
import {createCommand, updateCommand} from "./commands/command.ts";
import { execAsync } from "./utils/misc";

const program = new Command();

async function checkRoot() {
  // Vérifier si l'utilisateur est root (UID === 0)
  const env = process.env.NODE_ENV || process.env.BUN_ENV || 'development';
  if(env === 'development') {
    return;
  }
  if (process.getuid && process.getuid() !== 0) {
    const args = process.argv.slice(2).join(' ');
    const script = process.argv[1];
      await execAsync(`sudo bun "${script}" ${args}`, {
      // @ts-ignore
        stdio: 'inherit'
      });
      process.exit(0);
  }
}

program
  .name("Siteman")
  .description("A simple CLI tool to initialize a new site for hosting.")
  .version("1.0.1");

program
  .command('create <fichier>')
  .description('Créer un site à partir d\'un fichier de configuration')
  .option('-f, --force', 'Forcer l\'écrasement du site existant', false)
  .option('-v, --verbose', 'Afficher plus de détails', false)
  .action(async (fichier, options) => {
    try {
      await createCommand(fichier, options);
    } catch (error) {
      console.error(chalk.red('❌ Erreur:', error instanceof Error ? error.message : error));
      process.exit(1);
    }
  });

program
    .command('update <fichier>')
    .description("Mettre à jour le site à partir de son fichier de configuration")
    .option('-f, --force', 'Forcer l\'écrasement du site existant', false)
    .option('-v, --verbose', 'Afficher plus de détails', false)
    .action(async (fichier, options)=>{
        try {
            await updateCommand(fichier, options);
        } catch (error) {
            console.error(chalk.red('❌ Erreur:', error instanceof Error ? error.message : error));
            process.exit(1);
        }
    })

program.configureOutput({
  outputError: (str, write) => write(chalk.red(str))
});

checkRoot()// Vérifier les privilèges root avant d'exécuter la commande
.then(() => {
    program.parse(process.argv);

    // Si aucune commande, afficher l'aide
    if (!process.argv.slice(2).length) {
        program.outputHelp();
    }
})