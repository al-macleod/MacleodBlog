const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const { Worker } = require('bullmq');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { getRedisConnection } = require('../connection');

const BACKUP_DIR = path.join(__dirname, '../../../backups');

const runMongodump = (mongoUri, outFile) => new Promise((resolve, reject) => {
  const args = ['--uri', mongoUri, '--gzip', `--archive=${outFile}`];
  const proc = spawn('mongodump', args, { stdio: ['ignore', 'pipe', 'pipe'] });
  let stderr = '';

  proc.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
  proc.on('close', (code) => {
    if (code === 0) {
      resolve(outFile);
    } else {
      reject(new Error(`mongodump exited with code ${code}: ${stderr}`));
    }
  });
  proc.on('error', (err) => reject(err));
});

const uploadToS3 = async (filePath, key) => {
  const { S3_BUCKET, S3_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY } = process.env;

  if (!S3_BUCKET) {
    throw new Error('S3_BUCKET environment variable is not set');
  }

  const client = new S3Client({
    region: S3_REGION || 'us-east-1',
    credentials: AWS_ACCESS_KEY_ID ? {
      accessKeyId: AWS_ACCESS_KEY_ID,
      secretAccessKey: AWS_SECRET_ACCESS_KEY
    } : undefined // Falls back to IAM role / env credentials
  });

  const fileStream = fs.createReadStream(filePath);
  await client.send(new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: key,
    Body: fileStream,
    ContentType: 'application/gzip'
  }));
};

const processBackupJob = async (job) => {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/buzzforge';
  const destination = job.data.destination || process.env.BACKUP_DESTINATION || 'local';
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `buzzforge-backup-${timestamp}.gz`;

  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }

  const outFile = path.join(BACKUP_DIR, filename);

  console.log(`Backup worker: starting ${destination} backup → ${filename}`);

  try {
    await runMongodump(mongoUri, outFile);
  } catch (err) {
    if (err.code === 'ENOENT') {
      throw new Error(
        'mongodump not found. Install MongoDB Database Tools ' +
        '(https://www.mongodb.com/try/download/database-tools) to enable backups.'
      );
    }
    throw err;
  }

  if (destination === 's3') {
    const s3Key = `backups/${filename}`;
    await uploadToS3(outFile, s3Key);
    fs.unlinkSync(outFile); // Remove local copy after upload
    console.log(`Backup worker: uploaded ${filename} to S3 key ${s3Key}`);
  } else {
    console.log(`Backup worker: saved ${filename} to ${BACKUP_DIR}`);
  }
};

const createBackupWorker = () => new Worker('backup', processBackupJob, {
  connection: getRedisConnection(),
  concurrency: 1
});

module.exports = { createBackupWorker };
