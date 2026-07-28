import { exec, spawn } from 'child_process';
import { promisify } from 'util';

export const execAsync = promisify(exec);

export const cli = {
    async default(command : string){
        const {stdout, stderr} = await execAsync(command);
        return [stdout, stderr];
    },
    async exec(command: string, callback? : (e:string)=>void){
        return new Promise((res)=>{
            if(/^cd\s+((?:\/|~\/|[a-zA-Z]:\\)?(?:[\w\s\-_.]+(\/[\w\s\-_.]+)*\/?))$/.test(command)){
                return res(process.chdir(RegExp.$1));
            }
            const child = spawn(command, [], {
                shell: true,
                stdio: 'inherit'
            });

            // Stream stdout en temps réel
            child.stdout?.on('data', (data) => {
                if(callback) callback(data);
            });

            child.stderr?.on('data', (data) => {
                process.stderr.write(`[STDERR] ${data}`);
            });
            child.on('close', (code) => {
                res(code);
                console.warn("Closed !", code);
            });
        })
    }
}