import 'dotenv/config';
import { S3Client, ListObjectsV2Command, GetObjectCommand } from "@aws-sdk/client-s3";
import path from "path";
import fs from "fs";
import { pipeline } from "stream/promises";

const s3 = new S3Client({
    endpoint: process.env.ENDPOINT_URL!,
    region: process.env.REGION!,
    credentials: {
        accessKeyId: process.env.ACCESS_KEY_ID! as string,
        secretAccessKey: process.env.SECRET_ACCESS_KEY! as string,
    },
    requestChecksumCalculation: 'WHEN_REQUIRED',
    responseChecksumValidation: 'WHEN_REQUIRED',
    forcePathStyle: true
});

export async function listFilesWithPrefix(prefix: string, downloadFiles = true) {
    // Convert forward slashes to backslashes for searching
    const searchPrefix = prefix.replace(/\//g, '\\');

    console.log(`🔍 Searching for files with prefix: "${searchPrefix}"`);

    const command = new ListObjectsV2Command({
        Bucket: process.env.BUCKET_NAME!,
        Prefix: searchPrefix,
    });

    try {
        const response = await s3.send(command);

        if (!response.Contents || response.Contents.length === 0) {
            console.log(`⚠️ No files found with prefix "${searchPrefix}"`);

            // Try the original prefix as a fallback
            if (searchPrefix !== prefix) {
                console.log(`🔄 Trying original prefix format: "${prefix}"`);
                const fallbackCommand = new ListObjectsV2Command({
                    Bucket: process.env.BUCKET_NAME!,
                    Prefix: prefix,
                });

                const fallbackResponse = await s3.send(fallbackCommand);
                if (fallbackResponse.Contents && fallbackResponse.Contents.length > 0) {
                    console.log(`✅ Found ${fallbackResponse.Contents.length} files with original prefix`);
                    return processResults(fallbackResponse.Contents, downloadFiles);
                } else {
                    console.log("⚠️ No files found with either prefix format");
                    return [];
                }
            }

            return [];
        }

        console.log(`✅ Found ${response.Contents.length} files with prefix "${searchPrefix}"`);
        return processResults(response.Contents, downloadFiles);

    } catch (err) {
        console.error("❌ Error listing/downloading files:", err);
        throw err;
    }

    async function processResults(contents: any[], downloadFiles: boolean) {
        // Log the first few files found
        contents.slice(0, 5).forEach(item => {
            console.log(`- ${item.Key} (${item.Size} bytes)`);
        });

        if (!downloadFiles) {
            return contents;
        }

        // Download the files
        console.log("📥 Downloading files...");
        const downloadResults = [];

        for (const { Key, Size } of contents) {
            if (!Key) continue;

            try {
                const getObjectCommand = new GetObjectCommand({
                    Bucket: process.env.BUCKET_NAME!,
                    Key,
                });

                const { Body } = await s3.send(getObjectCommand);

                if (!Body) {
                    console.error(`❌ No body returned for ${Key}`);
                    continue;
                }

                // Create a local path that matches the structure but uses the correct OS path separator
                const localPath = path.join(__dirname, Key.replace(/\\/g, path.sep));
                const dirPath = path.dirname(localPath);

                if (!fs.existsSync(dirPath)) {
                    fs.mkdirSync(dirPath, { recursive: true });
                }

                const writeStream = fs.createWriteStream(localPath);
                await pipeline(Body as NodeJS.ReadableStream, writeStream);

                console.log(`✅ Downloaded: ${Key} (${Size} bytes)`);
                downloadResults.push({ key: Key, localPath, size: Size });
            } catch (err) {
                console.error(`❌ Error downloading ${Key}:`, err);
            }
        }

        console.log(`📦 Downloaded ${downloadResults.length} of ${contents.length} files`);
        return downloadResults;
    }
}

// Helper function to list all objects in the bucket
export async function listAllObjects() {
    try {
        const command = new ListObjectsV2Command({
            Bucket: process.env.BUCKET_NAME!,
        });

        const response = await s3.send(command);

        console.log(`Found ${response.Contents?.length || 0} objects in bucket:`);
        (response.Contents || []).slice(0, 20).forEach(item => {
            console.log(`- ${item.Key} (${item.Size} bytes)`);
        });

        if ((response.Contents?.length || 0) > 20) {
            console.log(`... and ${(response.Contents?.length || 0) - 20} more objects`);
        }

        return response.Contents || [];
    } catch (error) {
        console.error("Error listing all objects:", error);
        throw error;
    }
}