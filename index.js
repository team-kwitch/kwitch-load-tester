import puppeteer from 'puppeteer';

// Get username from command line arguments
const username = process.argv[2];
const viewerCount = parseInt(process.argv[3] || '50', 10);
const batchSize = parseInt(process.argv[4] || '10', 10);

if (!username) {
    console.error('Please provide a username as an argument');
    console.error('Usage: node index.js <username> [viewerCount] [batchSize]');
    process.exit(1);
}

console.log(`Starting load test for channel: ${username}`);
console.log(`Creating ${viewerCount} viewers in batches of ${batchSize}`);

const browser = await puppeteer.launch({
    executablePath: '/usr/bin/google-chrome',
    args: [
        '--disable-gpu',
        '--disable-dev-shm-usage',
        '--disable-setuid-sandbox',
        '--no-sandbox',
        '--disable-extensions',
        '--disable-audio-output',
    ]
});

async function createViewer(username, index) {
    try {
        const page = await browser.newPage();

        // Reduce resource usage
        await page.setRequestInterception(true);
        page.on('request', (request) => {
            // Block unnecessary resources
            const resourceType = request.resourceType();
            if (['image', 'stylesheet', 'font', 'media'].includes(resourceType)) {
                request.abort();
            } else {
                request.continue();
            }
        });

        // Reduce memory usage
        await page.setViewport({ width: 800, height: 600 });

        console.log(`Viewer ${index}: Navigating to channel...`);
        await page.goto(`https://kwitch.online/channels/${username}`, {
            waitUntil: 'domcontentloaded', // Use a less strict wait condition
            timeout: 60000
        });

        // Use a more reliable selector strategy with retry logic
        let viewerCount = null;
        let retries = 0;
        const maxRetries = 3;

        while (retries < maxRetries && viewerCount === null) {
            try {
                await page.waitForSelector('::-p-xpath(//*[@id="root"]/div/div[2]/div[1]/div[2]/div/div/span)', {
                    timeout: 20000
                });

                const viewerCountEle = await page.$('::-p-xpath(//*[@id="root"]/div/div[2]/div[1]/div[2]/div/div/span)');
                if (viewerCountEle) {
                    viewerCount = await page.evaluate(element => element.textContent, viewerCountEle);
                    console.log(`Viewer ${index}: 시청자 수: ${viewerCount}`);
                }
            } catch (err) {
                retries++;
                console.log(`Viewer ${index}: Retry ${retries}/${maxRetries} - ${err.message}`);
                // Short delay before retry
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }

        if (viewerCount === null) {
            console.log(`Viewer ${index}: Failed to get viewer count after ${maxRetries} retries`);
        }

        return page;
    } catch (error) {
        console.error(`Error creating viewer ${index}:`, error.message);
        return null;
    }
}

// Create viewers in batches
async function createViewersInBatches() {
    const allPages = [];
    let completedBatches = 0;

    for (let batchStart = 0; batchStart < viewerCount; batchStart += batchSize) {
        const batchEnd = Math.min(batchStart + batchSize, viewerCount);
        console.log(`Creating batch ${completedBatches + 1}: viewers ${batchStart + 1} to ${batchEnd}`);

        const batchPromises = [];
        for (let i = batchStart; i < batchEnd; i++) {
            batchPromises.push(createViewer(username, i + 1));
        }

        const batchPages = await Promise.all(batchPromises);
        const validPages = batchPages.filter(page => page !== null);
        allPages.push(...validPages);

        completedBatches++;
        console.log(`Completed batch ${completedBatches}: ${validPages.length} viewers created successfully`);

        // Add a small delay between batches to avoid overwhelming the server
        if (batchStart + batchSize < viewerCount) {
            console.log(`Waiting 3 seconds before next batch...`);
            await new Promise(resolve => setTimeout(resolve, 3000));
        }
    }

    console.log(`All ${allPages.length} viewers created. Will close in 10 seconds...`);

    // Close all pages and browser 10 seconds after the last viewer is created
    setTimeout(async () => {
        console.log('Closing all pages and browser...');
        for (const page of allPages) {
            await page.close().catch(err => console.error('Error closing page:', err.message));
        }
        await browser.close();
        console.log('All pages and browser closed.');
    }, 10000);
}

// Start the process
createViewersInBatches();
