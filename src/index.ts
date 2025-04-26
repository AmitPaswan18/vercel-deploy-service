import 'dotenv/config'
import { createClient, commandOptions } from "redis"

const subscriber = createClient()
subscriber.connect()
import { listFilesWithPrefix } from "./aws"

async function main() {
    while (true) {
        const response = await subscriber.brPop(
            commandOptions({ isolated: true }),
            "build-repo",
            0
        )
        //@ts-ignore
        const id = response?.element
        const prefix = await listFilesWithPrefix(`output/${id}`)
        console.log("Returened from prefix", prefix)
        // console.log(response)
    }
}
main()