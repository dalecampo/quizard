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

app.get('/api/credentials', (req, res) => {
    // Retrieve the sensitive values from the server-side storage (e.g., environment variables)
    const clientId = process.env.CLIENT_ID;
    const deploymentId = process.env.DEPLOYMENT_ID;
    const apiKey = process.env.API_KEY;
    const correctPassword = process.env.CORRECT_PASSWORD;
    const sheetId = process.env.SHEET_ID;

    // Set CORS headers for the response
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Return the sensitive values as a JSON response
    res.json({
        clientId,
        deploymentId,
        apiKey,
        correctPassword,
        sheetId,
    });
});

// app.get('/script.js', (req, res) => {
//     const API_KEY = process.env.API_KEY;
//     const CLIENT_ID = process.env.CLIENT_ID;
//     const DEPLOYMENT_ID = process.env.DEPLOYMENT_ID;
//     const CORRECT_PASSWORD = process.env.CORRECT_PASSWORD;
//     const SHEET_ID = process.env.SHEET_ID;

//     // Set CORS headers for the response
//     res.setHeader('Access-Control-Allow-Origin', '*');
//     res.setHeader('Access-Control-Allow-Methods', 'GET');
//     res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

//     fs.readFile('./script.js', 'utf8', (err, data) => {
//         if (err) {
//             console.error(err);
//             return res.status(500).send('Internal Server Error');
//         }
    
//         let scriptWithEnvVariables = data;
//         scriptWithEnvVariables = scriptWithEnvVariables.replace(
//             'CLIENT_ID_PLACEHOLDER',
//             CLIENT_ID
//         ).replace(
//             'DEPLOYMENT_ID_PLACEHOLDER',
//             DEPLOYMENT_ID
//         ).replace(
//             'API_KEY_PLACEHOLDER',
//             API_KEY
//         ).replace(
//             'CORRECT_PASSWORD_PLACEHOLDER',
//             CORRECT_PASSWORD
//         ).replace(
//             'SHEET_ID_PLACEHOLDER',
//             SHEET_ID
//         );
    
//         res.type('application/javascript');
//         res.send(scriptWithEnvVariables);
//     });
// });

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});