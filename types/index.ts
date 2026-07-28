export interface CreateOptions {
  force: boolean;
  verbose: boolean;
  env: 'dev' | 'prod' | 'staging';
}
export type ScriptIndex = "install_script" | "postinstall_script" | "pre_script" | "post_script";
export interface ScriptConfig{
    install_script?: string[];
    postinstall_script?: string[];
    pre_script?: string[];
    post_script?: string[]
}
export interface CommandOptions {
  force: boolean;
  verbose: boolean;
  env: string;
};
export interface EnvConfig {
    domain: string;
    name: string;
    docker?: DockerConfig;
    nginx?: NginxConfig;
    site: SiteConfig;
    certbot?: CertbotConfig;
    env?: string[]
}
export interface RepoConfig{
    link: string,
    branch: string
}
export interface DockerConfig {
    path: string;
    services: DockerServiceConfig[];
    networks?: Record<string, { external: boolean }>;
    version?: string;
    add_env?: boolean
}
export interface DockerServiceConfig {
    image: string;
    tag: string;
    ports?: number[];
    volumes?: string[];
    networks?: string[];
    working_dir?: string;
    restart?: 'no' | 'always' | 'unless-stopped' | 'on-failure';
    environment?: Record<string, string>;
    command?: string;
    depends_on?: string[];
    env_file?: string[]
}
export interface NginxConfig extends ScriptConfig{
    path: string;
    root: string;
    ssl?: boolean;
    proxy: string
}
export interface SiteConfig extends ScriptConfig{
    path: string;
    repository?: string | RepoConfig;
}
export interface CertbotConfig extends ScriptConfig{}