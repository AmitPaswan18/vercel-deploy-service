import { exec, spawn } from "child_process";
import path from "path";

export function buildProject(id: string) {
    // const projectPath = path.join(__dirname, 'downloads/output');
    // console.log(projectPath, ">>>>>>>>>>")
    const child = exec(`cd ${path.join(__dirname, `downloads/output/${id}`)} && npm install && npm run build`)

    child.stdout?.on('data', function (data) {
        console.log('stdout: ' + data);
    });
    child.stderr?.on('data', function (data) {
        console.log('stderr: ' + data);
    });

    child.on('close', function (code) {
        // resolve("")
    });

}

// buildProject("1")