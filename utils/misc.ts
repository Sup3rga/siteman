import { exec } from 'child_process';
import { promisify } from 'util';

export const execAsync = promisify(exec);

export async function cli(command : string){
    const {stdout, stderr} = await execAsync(command);
    return [stdout, stderr];
}