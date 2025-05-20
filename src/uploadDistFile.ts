import fs from "fs/promises";
import * as fsSync from "fs";
import path from "path";
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import 'dotenv/config';

const s3 = new S3Client({
    endpoint: process.env.ENDPOINT_URL,
    region: process.env.REGION,
    credentials: {
        accessKeyId: process.env.ACCESS_KEY_ID!,
        secretAccessKey: process.env.SECRET_ACCESS_KEY!,
    },
    requestChecksumCalculation: 'WHEN_REQUIRED',
    responseChecksumValidation: 'WHEN_REQUIRED',
    forcePathStyle: true
});



async function getAllFilesAsync(dirPath: string): Promise<string[]> {
    let filesList: string[] = [];

    const entries = await fs.readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        if (entry.isDirectory()) {
            const subFiles = await getAllFilesAsync(fullPath);
            filesList = filesList.concat(subFiles);
        } else {
            filesList.push(fullPath);
        }
    }

    return filesList;
}

async function uploadFile(fileName: string, localFilePath: string) {
    try {
        const fileContent = fsSync.readFileSync(localFilePath);
        const command = new PutObjectCommand({
            Bucket: process.env.BUCKET_NAME!,
            Key: fileName,
            Body: fileContent,
        });

        // Send the command to upload the file
        const response = await s3.send(command);
        console.log('File uploaded successfully:', response);
        return response;
    } catch (error) {
        console.error('Error uploading file:', error);
        throw error;
    }
}

export async function uploadDistFile(id: string) {
    const folderPath = path.join(__dirname, `output/${id}/dist`);
    const files = await getAllFilesAsync(folderPath);
    files.forEach(async (file) => {
        await uploadFile(`dist/${id}/` + files.slice(folderPath.length + 1), file)
    })
}