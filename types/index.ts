export interface CreateOptions {
  force: boolean;
  verbose: boolean;
  env: 'dev' | 'prod' | 'staging';
}

export interface ListOptions {
  all: boolean;
  format: 'table' | 'json';
}


export interface CommandOptions {
  force: boolean;
  verbose: boolean;
  env: string;
};

export interface DeleteOptions {
  yes: boolean;
  recursive: boolean;
}

export interface EnvConfig {
    domain: string;
    name: string;
    docker?: DockerConfig;
    nginx?: NginxConfig;
    rootPath: string;
    sitePath: string;
    nginxPath?: string;
    repository?: string | RepoConfig;
    certbot_prescript?: string[];
    dockerPath?: string
}
export interface RepoConfig{
    link: string,
    branch: string
}
export interface DockerConfig {
    services: DockerServiceConfig[];
    networks?: Record<string, { external: boolean }>;
    version?: string;
}

export interface DockerServiceConfig {
    image: string;
    tag: string;
    ports: number[];
    volumes?: string[];
    networks?: string[];
    working_dir?: string;
    restart?: 'no' | 'always' | 'unless-stopped' | 'on-failure';
    environment?: Record<string, string>;
    command?: string;
}

export interface NginxConfig {
    root: string;
    ssl?: boolean;
    server_script?: string[]
}