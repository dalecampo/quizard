// import express from 'express';

// const app = express();
// const port = process.env.PORT || 3000;

// app.get('/script.js', (req, res) => {
//     const apiKey = process.env.API_KEY;
//     const script = `const apiKey = '${apiKey}';`;

//     res.type('application/javascript');
//     res.send(script);
// });

// app.listen(port, () => {
//     console.log(`Server running on port ${port}`);
// });

import express from 'express';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config(); // Load environment variables from .env file

const app = express();
const port = process.env.PORT || 3000;

app.get('/script.js', (req, res) => {
    const apiKey = process.env.API_KEY;
    const clientId = process.env.CLIENT_ID;
    const deploymentId = process.env.DEPLOYMENT_ID;
    const correctPassword = process.env.CORRECT_PASSWORD;
    const sheetId = process.env.SHEET_ID;

    fs.readFile('./script.js', 'utf8', (err, data) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Internal Server Error');
        }

        const scriptWithEnvVariables = data.replace(
            /const\s+API_KEY\s+=\s+'.*?';/,
            `const apiKey = '${apiKey}';`
        ).replace(
            /const\s+CLIENT_ID\s+=\s+'.*?';/,
            `const clientId = '${clientId}';`
        ).replace(
            /const\s+DEPLOYMENT_ID\s+=\s+'.*?';/,
            `const deploymentId = '${deploymentId}';`
        ).replace(
            /const\s+CORRECT_PASSWORD\s+=\s+'.*?';/,
            `const correctPassword = '${correctPassword}';`
        ).replace(
            /const\s+SHEET_ID\s+=\s+'.*?';/,
            `const sheetId = '${sheetId}';`
        );

        res.type('application/javascript');
        res.send(scriptWithEnvVariables);
    });
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});