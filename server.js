import express from 'express';

const app = express();
const port = process.env.PORT || 3000;

app.get('/script.js', (req, res) => {
    const apiKey = process.env.API_KEY;
    const script = `const apiKey = '${apiKey}';`;

    res.type('application/javascript');
    res.send(script);
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});