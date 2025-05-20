import { exec } from "child_process";
import path from "path";
import fs from "fs/promises";

export function buildProject(id: string): Promise<string> {
    const projectPath = path.join(__dirname, `output/${id}`);
    console.log(`Starting build for project ${id} at path: ${projectPath}`);

    return new Promise((resolve, reject) => {
        const child = exec(`cd ${projectPath} && npm install && npm run build`);

        child.stdout?.on('data', function (data) {
            console.log(`[Build ${id}] stdout: ${data}`);
        });

        child.stderr?.on('data', function (data) {
            console.log(`[Build ${id}] stderr: ${data}`);
        });

        child.on('close', async function (code) {
            console.log(`[Build ${id}] Process exited with code ${code}`);

            if (code !== 0) {
                return reject(new Error(`Build process failed with code ${code}`));
            }
        });
    });
}