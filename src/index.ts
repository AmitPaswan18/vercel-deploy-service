import "dotenv/config"
import { createClient, commandOptions } from "redis"
import { listFilesWithPrefix } from "./aws"
import { buildProject } from "./builder"
import { uploadDistFile } from "./uploadDistFile"
import path from "path"


const subscriber = createClient()
subscriber.connect()


async function main() {
    while (true) {
        console.log("⏳ Waiting for next build request...")
        const response = await subscriber.brPop(commandOptions({ isolated: true }), "build-repo", 0)


        // @ts-ignore
        const id = response?.element

        const prefix = await listFilesWithPrefix(`output/${id}`)
        if (id) {
            console.log("Building project", id, "with prefix", prefix)
            await buildProject(id)
            await uploadDistFile(id)
        }


        console.log("Returened from prefix", prefix)
    }
}
main()