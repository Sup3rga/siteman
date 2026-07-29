import {type CertbotConfig, type DockerConfig, type EnvConfig, type SiteConfig} from '../types';

function dockerServiceConfigValidator(service: any): void {
  if (typeof service.image !== 'string') {
    throw new Error('Le champ "image" doit être une chaîne de caractères');
  }
  if (typeof service.tag !== 'string') {
    throw new Error('Le champ "tag" doit être une chaîne de caractères');
  }
  if (service.ports && !Array.isArray(service.ports)) {
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

function dockerConfigValidator(docker: DockerConfig): void {
  if (!Array.isArray(docker.services)) {
    throw new Error('Le champ "services" doit être un tableau');
  }
  docker.services.forEach(dockerServiceConfigValidator);
  if (docker.networks && (typeof docker.networks !== 'object' || Array.isArray(docker.networks))) {
    throw new Error('Le champ "networks" doit être un objet');
  }
  // Valider le chemin
  if (!docker.path.startsWith('/')) {
    throw new Error('Le chemin de \'docker.path\' doit être absolu (commencer par /)');
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
  if (typeof nginx.proxy !== 'string') {
    throw new Error('Le champ "proxy" doit être une chaîne de caractères');
  }
  if (nginx.ssl && typeof nginx.ssl !== 'boolean') {
    throw new Error('Le champ "ssl" doit être un booléen');
  }
  if(nginx.socket && !Array.isArray(nginx.socket)){
    throw new Error('Le champ "nginx.socket" doit être une liste.');
  }
  // Valider le chemin de Nginx
  if (!nginx.path.startsWith('/')) {
    throw new Error('Le chemin de \'nginx.path\' doit être absolu (commencer par /)');
  }
  scriptConfig(nginx, 'nginx');
}

function scriptConfig(config : any, source : string) : void{
  const keys =  ["install_script", "postinstall_script", "pre_script", "post_script"];
  for(let key of keys){
    if(config[key] && !Array.isArray(config[key])){
      throw new Error(`Le champ "${source}.${key}" doit être un tableau`);
    }
  }
}

function certbotConfig(certbot: CertbotConfig): void{
  scriptConfig(certbot, 'certbot');
}

function siteConfig(site: SiteConfig) : void{
  // Valider le chemin
  if (!site.path.startsWith('/')) {
    throw new Error('Le chemin de \'site.path\' doit être absolu (commencer par /)');
  }
  scriptConfig(site, 'site');
}

export function validateConfig(config: EnvConfig): void {
  const required: (keyof EnvConfig)[] = [
    'name', 'domain', 'site'
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

  if(config.env && !Array.isArray(config.env)){
    throw new Error('La valeur \'env\' doit être une liste.');
  }

  if(config.docker) {
    dockerConfigValidator(config.docker);
  }
  
  if(config.nginx) {
    nginxConfigValidator(config.nginx);
  }

  if(config.certbot){
    certbotConfig(config.certbot);
  }
  siteConfig(config.site);
}

