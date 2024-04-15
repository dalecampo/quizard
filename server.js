import cors from 'cors';
import express from 'express';
import fs from 'fs';

const app = express();
const port = process.env.PORT || 5500;

app.use(cors());

// Enable CORS middleware
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    next();
});

app.get('/script.js', (req, res) => {
    const apiKey = process.env.API_KEY;
    const clientId = process.env.CLIENT_ID;
    const deploymentId = process.env.DEPLOYMENT_ID;
    const correctPassword = process.env.CORRECT_PASSWORD;
    const sheetId = process.env.SHEET_ID;

    // Set CORS headers for the response
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    fs.readFile('./script.js', 'utf8', (err, data) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Internal Server Error');
        }
    
        const scriptWithEnvVariables = data.replace(
            /const\s+API_KEY\s+=\s+'.*?';/,
            "const apiKey = '" + apiKey + "';"
        ).replace(
            /const\s+CLIENT_ID\s+=\s+'.*?';/,
            "const clientId = '" + clientId + "';"
        ).replace(
            /const\s+DEPLOYMENT_ID\s+=\s+'.*?';/,
            "const deploymentId = '" + deploymentId + "';"
        ).replace(
            /const\s+CORRECT_PASSWORD\s+=\s+'.*?';/,
            "const correctPassword = '" + correctPassword + "';"
        ).replace(
            /const\s+SHEET_ID\s+=\s+'.*?';/,
            "const sheetId = '" + sheetId + "';"
        );
    
        res.type('application/javascript');
        res.send(scriptWithEnvVariables);
    });

    // fs.readFile('./script.js', 'utf8', (err, data) => {
    //     if (err) {
    //         console.error(err);
    //         return res.status(500).send('Internal Server Error');
    //     }

    //     const scriptWithEnvVariables = data.replace(
    //         /const\s+API_KEY\s+=\s+'.*?';/,
    //         `const apiKey = '${apiKey}';`
    //     ).replace(
    //         /const\s+CLIENT_ID\s+=\s+'.*?';/,
    //         `const clientId = '${clientId}';`
    //     ).replace(
    //         /const\s+DEPLOYMENT_ID\s+=\s+'.*?';/,
    //         `const deploymentId = '${deploymentId}';`
    //     ).replace(
    //         /const\s+CORRECT_PASSWORD\s+=\s+'.*?';/,
    //         `const correctPassword = '${correctPassword}';`
    //     ).replace(
    //         /const\s+SHEET_ID\s+=\s+'.*?';/,
    //         `const sheetId = '${sheetId}';`
    //     );

    //     res.type('application/javascript');
    //     res.send(scriptWithEnvVariables);
    // });
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});