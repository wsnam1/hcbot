const https = require('https');
const cron = require('node-cron');

const RENDER_URL = 'https://hcbot.onrender.com'; // Replace with your actual Render URL

function pingServer() {
    https.get(RENDER_URL, (res) => {
        console.log(`Ping successful. Status code: ${res.statusCode}`);
    }).on('error', (err) => {
        console.error('Ping failed:', err.message);
    });
}

// Schedule a ping every 14 minutes
cron.schedule('*/14 * * * *', () => {
    console.log('Pinging server to keep it alive...');
    pingServer();
});

console.log('Keep-alive script is running.');