import { cli } from '../utils/misc';
import fs from 'fs/promises';
import {
    type EnvConfig,
    type CommandOptions,
    type DockerServiceConfig,
    type ScriptConfig,
    type ScriptIndex
} from '../types';
import chalk from "chalk";
import path from "path";
import {fileExists} from "./file.ts";

export const Process = {
    config : {} as EnvConfig,
    options: {} as CommandOptions,
    async create(config: EnvConfig, options: CommandOptions){
        this.config = config;
        this.options = options;
        await this.services.createSiteFolder();
        if(await this.services.cloneRepo()) {
            await this.services.execScript(Process.config.site, "install_script");
        }
        await this.services.createEnvFile(Process.config.site.path);
        await this.services.execScript(Process.config.site, "postinstall_script");
        await this.services.createConfigFolder();
        await this.services.createDockerComposeFile();
        await this.services.runDockerCompose();
        await this.services.generateNginxFile(false);
        if(config.nginx){
            await this.services.execScript(Process.config.nginx as ScriptConfig, "post_script");
        }
        if(config.nginx?.ssl && config.certbot){
            await this.services.runCertbot();
            await this.services.generateNginxFile(true);
            await this.services.execScript(Process.config.nginx as ScriptConfig, "post_script");
        }
    },
    async update(config: EnvConfig, options: CommandOptions){
        this.config = config;
        this.options = options;
        await this.services.createEnvFile(Process.config.site.path);
        await this.services.execScript(Process.config.site, "postinstall_script");
        await this.services.createDockerComposeFile();
        await this.services.runDockerCompose();
        if(config.nginx){
            await this.services.execScript(Process.config.nginx as ScriptConfig, "post_script");
        }
    },
    services: {
        async createSiteFolder(): Promise<void> {
            try{
                await fs.mkdir(Process.config.site.path, { recursive: true });
                if (Process.options.verbose) {
                    console.log(chalk.dim(`  ✅ Dossier créé: ${Process.config.site.path}`));
                }
            } catch {
                if (Process.options.verbose) {
                    console.log(chalk.dim(`  ⚠️  Dossier déjà existant: ${Process.config.site.path}`));
                }
            }
        },
        async cloneRepo(){
            if(await fileExists(path.join(Process.config.site.path, ".git"))){
                if (Process.options.verbose) {
                    console.log(chalk.dim(`  ✅ Dossier créé: ${Process.config.site.path}`));
                }
                return false;
            }
            if(Process.config.site.repository) {
                let [cwd] = await cli.default("pwd");
                let link = Process.config.site.repository;
                let branch = "main";
                if (typeof Process.config.site.repository == "object") {
                    link = Process.config.site.repository.link;
                    branch = Process.config.site.repository.branch;
                }
                await cli.exec(
                    `cd ${Process.config.site.path} && git clone ${link} .`,
                    (stream) => {
                        if (Process.options.verbose) console.log(stream);
                    }
                );
                await cli.exec(
                    `cd ${Process.config.site.path} && git checkout ${branch}`,
                    (stream) => {
                        if (Process.options.verbose) console.log(stream);
                    }
                );
                if (Process.options.verbose) {
                    console.log(chalk.dim(`  ✅ Dépot git cloné !`));
                }
                await cli.default("cd " + cwd);
            }
            return true;
        },
        async execScript(config: ScriptConfig, index: ScriptIndex){
            if(config[index]){
                for(let script of config[index]){
                    if (Process.options.verbose) {
                        console.log(chalk.dim(`  ✅ [${index}] Exécute : ${script}`));
                    }
                    await cli.exec(script);
                }
            }
        },
        async createConfigFolder(): Promise<void> {
            if(!Process.config.docker) return ;
            try{
                await fs.mkdir(Process.config.docker.path, { recursive: true });
                if (Process.options.verbose) {
                    console.log(chalk.dim(`  ✅ Dossier créé: ${Process.config.docker.path}`));
                }
            } catch {
                if (Process.options.verbose) {
                    console.log(chalk.dim(`  ⚠️  Dossier déjà existant: ${Process.config.docker.path}`));
                }
            }
        },
        async createDockerComposeFile(){
            if(!Process.config.docker) return ;

            const filename = path.join(Process.config.docker.path, "docker-compose.yml");
            fs.writeFile(filename, Process.generate.dockerComposeFile());
            if (Process.options.verbose) {
                console.log(chalk.dim(`  ✅ Fichier docker compose créé: ${filename}`));
            }
            if(Process.config.docker.add_env){
                await this.createEnvFile(Process.config.docker.path);
            }
        },
        async runDockerCompose(){
            if(!Process.config.docker) return;
            const cwd = process.cwd();
            await cli.exec(`cd ${Process.config.docker?.path} && sudo docker compose down && sudo docker compose up -d`);
            if (Process.options.verbose) {
                console.log(chalk.dim(`  ✅ docker compose exécuté !`));
            }
            process.chdir(cwd);
        },
        async generateNginxFile(withSsl: boolean){
            if(!Process.config.nginx) return ;

            const filename = path.join(Process.config.nginx.path, Process.config.name+".default.conf");
            fs.writeFile(filename, Process.generate.nginxConfFile(withSsl));
            if (Process.options.verbose) {
                console.log(chalk.dim(`  ✅ Fichier de configuration nginx créé: ${filename}`));
            }
        },
        async runCertbot(){
            if(!Process.config.certbot) return;
            const cwd = process.cwd();
            await this.execScript(Process.config.certbot, "pre_script");
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
        space(qty: number = 0){
            return " ".repeat(qty);
        },
        nextLine(qty: number = 1){
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
                        // @ts-ignore
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
                        // @ts-ignore
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
            if(Process.config.nginx?.socket && !Process.config.nginx?.ssl){
                content += this.nextLine();
                content += this.nginxConfigSocket();
                content += this.nextLine();
            }
            content += this.addLine("location / {", 1);
            if(secure){
                content += this.addLine(`return 302 https://${Process.config.domain}$request_uri;`,1,2);
            }
            else{
                content += this.addLine(`proxy_pass ${Process.config.nginx?.proxy};`,1,2);
                content += this.addLine("include /etc/nginx/conf.d/proxy.conf;", 1,2);
            }
            content += this.addLine("}", 1);
            content += this.addLine("}");
            return content;
        },
        nginxConfigSocket(){
            let content = "";
            if(!Process.config.nginx?.socket) return content;
            content += this.addLine(`location ${Process.config.nginx?.socket} {`, 1);
            content += this.addLine(`proxy_pass ${Process.config.nginx?.proxy};`,1,2);
            content += this.addLine("proxy_http_version 1.1;", 1,2);
            content += this.addLine("proxy_set_header Host $host;", 1,2);
            content += this.addLine("proxy_set_header X-Real-IP $remote_addr;", 1,2);
            content += this.addLine("proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;", 1,2);
            content += this.addLine("proxy_set_header X-Forwarded-Proto $scheme;", 1,2);
            content += this.addLine("proxy_set_header Upgrade $http_upgrade;", 1,2);
            content += this.addLine("proxy_set_header Connection \"upgrade\";", 1,2);
            content += this.addLine("}", 1);
            return content;
        },
        nginxConfFileSecure(){
            let content = "";
            content += this.addLine("server{");
            content += this.addLine("listen 443 ssl;", 1);
            content += this.addLine(`server_name ${Process.config.domain};`, 1);
            content += this.nextLine(1);
            content += this.addLine(`ssl_certificate /etc/letsencrypt/live/${Process.config.domain}/fullchain.pem;`, 1);
            content += this.addLine(`ssl_certificate_key /etc/letsencrypt/live/${Process.config.domain}/privkey.pem;`, 1);
            content += this.addLine("include /etc/nginx/conf.d/ssl.conf;", 1);
            content += this.nextLine(1);
            if(Process.config.nginx?.socket && Process.config.nginx?.ssl){
                content += this.nextLine();
                content += this.nginxConfigSocket();
                content += this.nextLine();
            }
            content += this.addLine("location / {", 1);
            content += this.addLine(`proxy_pass ${Process.config.nginx?.proxy};`,1,2);
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