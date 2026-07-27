import { cli } from '../utils/misc';
import fs from 'fs/promises';
import { type EnvConfig, type CommandOptions, type DockerServiceConfig } from '../types';
import chalk from "chalk";
import path from "path";

export const Process = {
    config : {} as EnvConfig,
    options: {} as CommandOptions,
    async start(config: EnvConfig, options: CommandOptions){
        this.config = config;
        this.options = options;
        await this.services.createSiteFolder();
        await this.services.cloneRepo();
        await this.services.pullRepo();
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
            let [cwd, err] = await cli("pwd");
            let [ops, err2] = await cli(`cd ${Process.config.sitePath} && git clone ${Process.config.repository} && git pull && bun i && bun run build`);
            console.log("curr", cwd, ops);
        },
        async pullRepo(){

        },
        async buildProject(){

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
            }
        },
        async runDockerCompose(){

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

        },
        async runCertbot(){
            if (Process.options.verbose) {
                console.log(chalk.dim(`  ✅ Certbot executé avec succès !`));
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
                    case "ports":
                    case "environment":
                    case "networks":
                    case "volumes":
                    case "command":
                        content += this.addLine(data+": ", start + 1);
                        for(let item of service[data]){
                            content += this.addLine("-"+item, start+1, 2);
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
        }
    }
};