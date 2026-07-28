import { EnvConfig } from '../types';

function dockerServiceConfigValidator(service: any): void {
  if (typeof service.image !== 'string') {
    throw new Error('Le champ "image" doit être une chaîne de caractères');
  }
  if (typeof service.tag !== 'string') {
    throw new Error('Le champ "tag" doit être une chaîne de caractères');
  }
  if (!Array.isArray(service.ports)) {
    throw new Error('Le champ "ports" doit être un tableau.');
  }
  if (service.volumes && (!Array.isArray(service.volumes) || !service.volumes.every((volume: any) => typeof volume === 'string'))) {
    throw new Error('Le champ "volumes" doit être un tableau de chaînes de caractères');
  }
  if (service.networks && (!Array.isArray(service.networks) || !service.networks.every((network: any) => typeof network === 'string'))) {
    throw new Error('Le champ "networks" doit être un tableau de chaînes de caractères');
  }
  if (service.working_dir && typeof service.working_dir !== 'string') {
    throw new Error('Le champ "working_dir" doit être une chaîne de caractères');
  }
  if (service.restart && !['no', 'always', 'unless-stopped', 'on-failure'].includes(service.restart)) {
    throw new Error('Le champ "restart" doit être l\'une des valeurs suivantes: "no", "always", "unless-stopped", "on-failure"');
  }
  if (service.environment && !Array.isArray(service.environment)) {
    throw new Error('Le champ "environment" doit être un tableau.');
  }
  if (service.command && !Array.isArray(service.command)) {
    throw new Error('Le champ "command" doit être un tableau.');
  }
  if(service.depends_on && !Array.isArray(service.depends_on)){
    throw new Error('Le champ "depends_on" doit être un tableau de chaînes de caractères');
  }
  if(service.env_file && !Array.isArray(service.env_file)){
    throw new Error('Le champ "env_file" doit être un tableau de chaînes de caractères');
  }
}

function dockerConfigValidator(docker: any): void {
  if (!Array.isArray(docker.services)) {
    throw new Error('Le champ "services" doit être un tableau');
  }
  docker.services.forEach(dockerServiceConfigValidator);
  
  if (docker.networks && (typeof docker.networks !== 'object' || Array.isArray(docker.networks))) {
    throw new Error('Le champ "networks" doit être un objet');
  }
  
  if (docker.version && typeof docker.version !== 'string') {
    throw new Error('Le champ "version" doit être une chaîne de caractères');
  }
  if (docker.add_env && typeof docker.add_env !== 'boolean') {
    throw new Error('Le champ "add_env" doit être un booléen');
  }
}

function nginxConfigValidator(nginx: any): void {
  if (typeof nginx.root !== 'string') {
    throw new Error('Le champ "root" doit être une chaîne de caractères');
  }
  if (nginx.server_script && !Array.isArray(nginx.server_script)) {
    throw new Error('Le champ "server_script" doit être une liste de commandes.');
  }
  if (nginx.ssl && typeof nginx.ssl !== 'boolean') {
    throw new Error('Le champ "ssl" doit être un booléen');
  }
} 

export function validateConfig(config: EnvConfig): void {
  const required: (keyof EnvConfig)[] = [
    'name', 'domain', 'docker', 'nginx', 'rootPath', 'sitePath', 'repository'
  ];
  const missing = required.filter(field => !config[field]);
  
  if (missing.length > 0) {
    throw new Error(`Champs manquants: ${missing.join(', ')}`);
  }
  
  // Valider le nom
  if (!/^[a-z0-9-]+$/.test(config.name)) {
    throw new Error(
      'Le nom ne doit contenir que des lettres minuscules, des chiffres et des tirets'
    );
  }
  
  // Valider le domaine
  if (!config.domain.includes('.')) {
    throw new Error('Le domaine doit être valide (ex: example.com)');
  }
  
  // Valider le chemin
  if (!config.rootPath.startsWith('/')) {
    throw new Error('Le chemin de \'rootPath\' doit être absolu (commencer par /)');
  }
  // Valider le chemin
  if (!config.sitePath.startsWith('/')) {
    throw new Error('Le chemin de \'sitePath\' doit être absolu (commencer par /)');
  }
  // Valider le chemin de Nginx
  if (config.nginxPath && !config.nginxPath.startsWith('/')) {
    throw new Error('Le chemin de \'nginxPath\' doit être absolu (commencer par /)');
  }

  if(config.certbot_prescript && !Array.isArray(config.certbot_prescript)){
    throw new Error('La valeur \'certbot_prescript\' doit être une liste de commandes.');
  }

  if(config.env && !Array.isArray(config.env)){
    throw new Error('La valeur \'env\' doit être une liste.');
  }

  if(config.docker) {
    dockerConfigValidator(config.docker);
  }
  
  if(config.nginx) {
    nginxConfigValidator(config.nginx);
  }
}

