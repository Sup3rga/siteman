import { cli } from '../utils/misc';
import fs from 'fs/promises';
import { type EnvConfig, type CommandOptions, type DockerServiceConfig } from '../types';
import chalk from "chalk";
import path from "path";
import {fileExists} from "./file.ts";

export const Process = {
    config : {} as EnvConfig,
    options: {} as CommandOptions,
    async start(config: EnvConfig, options: CommandOptions){
        this.config = config;
        this.options = options;
        await this.services.createSiteFolder();
        if(!(await this.services.cloneRepo())) {
            await this.services.pullRepo();
        }
        await this.services.createEnvFile(Process.config.sitePath);
        await this.services.buildProject();
        await this.services.createConfigFolder();
        await this.services.createDockerComposeFile();
        await this.services.runDockerCompose();
        await this.services.generateNginxFile(false);
        if(config.nginx?.server_script){
            await this.services.runServerScript();
        }
        if(config.nginx?.ssl){
            await this.services.runCertbot();
            await this.services.generateNginxFile(true);
            if(config.nginx?.server_script){
                await this.services.runServerScript();
            }
        }
    },
    services: {
        async createSiteFolder(): Promise<void> {
            try{
                await fs.mkdir(Process.config.sitePath, { recursive: true });
                if (Process.options.verbose) {
                    console.log(chalk.dim(`  ✅ Dossier créé: ${Process.config.sitePath}`));
                }
            } catch {
                if (Process.options.verbose) {
                    console.log(chalk.dim(`  ⚠️  Dossier déjà existant: ${Process.config.sitePath}`));
                }
            }
        },
        async cloneRepo(){
            if(await fileExists(path.join(Process.config.sitePath, ".git"))){
                if (Process.options.verbose) {
                    console.log(chalk.dim(`  ✅ Dossier créé: ${Process.config.sitePath}`));
                }
                return false;
            }
            let [cwd] = await cli.default("pwd");
            let link = Process.config.repository;
            let branch = "main";
            if(typeof Process.config.repository == "object"){
                link = Process.config.repository.link;
                branch = Process.config.repository.branch;
            }
            await cli.exec(
                `cd ${Process.config.sitePath} && git clone ${link} .`,
                (stream)=> {
                    if(Process.options.verbose) console.log(stream);
                }
            );
            await cli.exec(
                `cd ${Process.config.sitePath} && git checkout ${branch}`,
                (stream)=> {
                    if(Process.options.verbose) console.log(stream);
                }
            );
            if (Process.options.verbose) {
                console.log(chalk.dim(`  ✅ Dossier créé: ${Process.config.rootPath}`));
            }
            await cli.default("cd " + cwd);
            return true;
        },
        async pullRepo(){
            let [cwd] = await cli.default("pwd");
            await cli.exec(
                `cd ${Process.config.sitePath} &&  git pull`,
                (stream)=> {
                    if(Process.options.verbose) console.log(stream);
                }
            );
            await cli.default("cd " + cwd);
        },
        async buildProject(){
            const cwd = process.cwd();
            await cli.exec(
                `cd ${Process.config.sitePath} && bun i && bun run build`,
                (stream)=> {
                    if(Process.options.verbose) console.log(stream);
                }
            );
            process.chdir(cwd);
        },
        async createConfigFolder(): Promise<void> {
            try{
                await fs.mkdir(Process.config.rootPath, { recursive: true });
                if (Process.options.verbose) {
                    console.log(chalk.dim(`  ✅ Dossier créé: ${Process.config.rootPath}`));
                }
            } catch {
                if (Process.options.verbose) {
                    console.log(chalk.dim(`  ⚠️  Dossier déjà existant: ${Process.config.rootPath}`));
                }
            }
        },
        async createDockerComposeFile(){
            if(Process.config.docker) {
                const filename = path.join(Process.config.rootPath, "docker-compose.yml");
                fs.writeFile(filename, Process.generate.dockerComposeFile());
                if (Process.options.verbose) {
                    console.log(chalk.dim(`  ✅ Fichier docker compose créé: ${filename}`));
                }
                if(Process.config.docker.add_env){
                    await this.createEnvFile(Process.config.rootPath);
                }
            }
        },
        async runDockerCompose(){
            const cwd = process.cwd();
            await cli.exec(`cd ${Process.config.rootPath} && sudo docker compose down && sudo docker compose up -d`);
            if (Process.options.verbose) {
                console.log(chalk.dim(`  ✅ docker compose exécuté !`));
            }
            process.chdir(cwd);
        },
        async generateNginxFile(withSsl: boolean){
            if(Process.config.nginx) {
                const filename = path.join(Process.config.nginxPath, Process.config.name+".default.conf");
                fs.writeFile(filename, Process.generate.nginxConfFile(withSsl));
                if (Process.options.verbose) {
                    console.log(chalk.dim(`  ✅ Fichier de configuration nginx créé: ${filename}`));
                }
            }
        },
        async runServerScript(){
            const cwd = process.cwd();
            if(Process.config.nginx?.server_script){
                for(let script of Process.config.nginx.server_script){
                    await cli.exec(script);
                }
            }
            process.chdir(cwd);
        },
        async runCertbot(){
            const cwd = process.cwd();
            if(Process.config.certbot_prescript){
                for(let script of Process.config.certbot_prescript){
                    await cli.exec(script);
                }
            }
            await cli.exec("docker-compose run certbot certonly --webroot -w /var/www/certbot -d "+Process.config.domain);
            process.chdir(cwd);
            if (Process.options.verbose) {
                console.log(chalk.dim(`  ✅ Certbot executé avec succès !`));
            }
        },
        async createEnvFile(_path: string){
            if(Process.config.env) {
                const filename = path.join(_path, ".env");
                fs.writeFile(filename, Process.generate.envFile());
                if (Process.options.verbose) {
                    console.log(chalk.dim(`  ✅ Fichier .env créé: ${filename}`));
                }
            }
        }
    },
    generate: {
        space(qty: number){
            return " ".repeat(qty);
        },
        nextLine(qty: number){
            return "\n".repeat(qty);
        },
        addLine(text: string, startAt: number = 0, space = 0){
            return this.space(space + startAt * 3) + text + this.nextLine(1);
        },
        dockerComposeFile(){
            let content = "";
            const conf = Process.config.docker;
            if(!conf) return "";
            for(let i in conf){
                switch(i){
                    case "version":
                        content += this.addLine("version: '" +conf.version+"'");
                    break;
                    case "networks":
                        content += this.addLine("networks:");
                        for(let network in conf.networks){
                            content += this.addLine(network+":",1);
                            if(conf.networks[network]?.external){
                                content += this.addLine("external: "+conf.networks[network]?.external, 2);
                            }
                        }
                    break;
                    case "services":
                        content += this.addLine("services:");
                        for(let service of conf.services){
                            content += this.dockerComposeServices(service, 1);
                        }
                    break;
                }
            }
            return content;
        },
        dockerComposeServices(service : DockerServiceConfig, start: number = 1){
            let content = "";
            for(let data in service){
                switch(data){
                    case "tag":
                        content += this.addLine(service.tag+":", start);
                    break;
                    case "image":
                        content += this.addLine("image: "+service.image, start+1);
                    break;
                    case "restart":
                        content += this.addLine("restart: "+service.restart, start+1);
                    break;
                    case "working_dir":
                        content += this.addLine("working_dir: "+service.working_dir, start + 1);
                    break;
                    case "env_file":
                        content += this.addLine(data+": ", start + 1);
                        for(let item of service[data]){
                            content += this.addLine("- "+item, start+1, 2);
                        }
                    break;
                    case "ports":
                    case "environment":
                    case "networks":
                    case "volumes":
                    case "command":
                    case "depends_on":
                        content += this.addLine(data+": ", start + 1);
                        for(let item of service[data]){
                            content += this.addLine("- "+item, start+1, 2);
                        }
                    break;
                }
            }
            return content;
        },
        nginxConfFile(ssl: boolean){
            let content = "";
            content += this.nginxConfFileRoot(ssl);
            if(ssl){
                content += this.nextLine(2)+this.nginxConfFileSecure();
            }
            return content;
        },
        nginxConfFileRoot(secure: boolean){
            let content = "";
            content += this.addLine("server{");
            content += this.addLine("listen 80;", 1);
            content += this.addLine("listen [::]:80;", 1);
            content += this.nextLine(1);
            content += this.addLine(`server_name ${Process.config.domain};`, 1);
            content += this.addLine("server_tokens off;", 1);
            content += this.nextLine(1);
            content += this.addLine("location /.well-known/acme-challenge/ {", 1);
            content += this.addLine("root /var/www/certbot;", 1, 2);
            content += this.addLine("}", 1);
            content += this.nextLine(1);
            content += this.addLine("location / {", 1);
            if(secure){
                content += this.addLine(`return 302 https://${Process.config.domain}$request_uri;`,1,2);
            }
            else{
                content += this.addLine(`proxy_pass ${Process.config.nginx?.root}$request_uri;`,1,2);
                content += this.addLine("include /etc/nginx/conf.d/proxy.conf;", 1,2);
            }
            content += this.addLine("}", 1);
            content += this.addLine("}");
            return content;
        },
        nginxConfFileSecure(){
            let content = "";
            content += this.addLine("server{");
            content += this.addLine("listen 443 ssl;", 1);
            content += this.addLine(`server_name ${Process.config.domain};`, 1);
            content += this.nextLine(1);
            content += this.addLine(`ssl_certificate /etc/letsencrypt/live/${Process.config.domain}/fullchain.pem`, 1);
            content += this.addLine(`ssl_certificate_key /etc/letsencrypt/live/${Process.config.domain}/privkey.pem;`, 1);
            content += this.addLine("include /etc/nginx/conf.d/ssl.conf;", 1);
            content += this.nextLine(1);
            content += this.addLine("location / {", 1);
            content += this.addLine(`proxy_pass ${Process.config.nginx?.root}$request_uri;`,1,2);
            content += this.addLine("include /etc/nginx/conf.d/proxy.conf;", 1,2);
            content += this.addLine("}", 1);
            content += this.addLine("}");
            return content;
        },
        envFile(){
            let content = "";
            for(let data of Process.config.env!){
                content += this.addLine(data);
            }
            return content;
        }
    }
};