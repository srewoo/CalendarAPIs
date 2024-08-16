const { exec } = require('child_process');
const { Client } = require('pg');
require('dotenv').config(); // Load environment variables from .env file

function runCommand(command) {
    return new Promise((resolve, reject) => {
        const child = exec(command);

        child.stdout.on('data', (data) => {
            console.log(data);
            if (data.includes('Password:')) {
                child.stdin.write(`${process.env.SYSTEM_PASSWORD}\n`);
            }
            if (data.includes('Enter passphrase for key')) {
                child.stdin.write(`${process.env.RSA_KEY}\n`);
            }
        });

        child.stderr.on('data', (data) => {
            console.error(data);
        });

        child.on('close', (code) => {
            if (code === 0) {
                resolve();
            } else {
                reject(new Error(`Command exited with code ${code}`));
            }
        });
    });
}

function queryDatabase() {
    const client = new Client({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    client.connect()
        .then(() => {
            console.log('Connected to the database');
            return client.query('SELECT * FROM meetings LIMIT 10');
        })
        .then(res => {
            console.table(res.rows);
        })
        .catch(err => {
            console.error(`Database error: ${err.message}`);
        })
        .finally(() => {
            client.end();
            console.log('Database connection closed');
        });
}

async function main() {
    try {
        // Use the IP address instead of 'hopper'
        const command = `echo ${process.env.SYSTEM_PASSWORD} | sudo -S sshuttle 10.10.0.0/16 -r sharaj.rewoo@mindtickle.com@10.10.0.1`;
        await runCommand(command);
        queryDatabase();
    } catch (err) {
        console.error(err.message);
    }
}

main();
