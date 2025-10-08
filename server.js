const express = require('express');
const { chromium } = require('playwright');
const app = express();

app.use(express.json());

app.post('/get-cookies', async (req, res) => {
    const { email, password } = req.body;
    
    if (!email || !password) {
        return res.status(400).json({
            success: false,
            error: 'Email and password are required'
        });
    }

    let browser;
    try {
        console.log('Launching browser...');
        browser = await chromium.launch({ 
            headless: true // false kung gusto mo makita browser
        });
        const page = await browser.newPage();
        
        console.log('Navigating to Facebook...');
        await page.goto('https://facebook.com', { 
            waitUntil: 'networkidle',
            timeout: 30000 
        });
        
        console.log('Filling login form...');
        // Wait for email field
        await page.waitForSelector('#email, input[name="email"]', { timeout: 10000 });
        await page.fill('#email, input[name="email"]', email);
        await page.fill('#pass, input[name="pass"]', password);
        
        console.log('Clicking login...');
        await page.click('button[type="submit"], [name="login"]');
        
        // Wait for navigation or error
        await page.waitForTimeout(5000);
        
        // Check if login successful
        const currentUrl = page.url();
        console.log('Current URL:', currentUrl);
        
        if (currentUrl.includes('login') || currentUrl.includes('checkpoint')) {
            await browser.close();
            return res.json({
                success: false,
                error: 'Login failed - check credentials or 2FA'
            });
        }
        
        // Get cookies
        const cookies = await page.context().cookies();
        const facebookCookies = cookies.filter(cookie => 
            cookie.domain.includes('facebook')
        );
        
        await browser.close();
        
        console.log('Success! Found', facebookCookies.length, 'cookies');
        
        res.json({
            success: true,
            cookies: facebookCookies,
            cookieString: facebookCookies.map(c => `${c.name}=${c.value}`).join('; ')
        });
        
    } catch (error) {
        console.error('Error:', error);
        if (browser) await browser.close();
        
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Test route
app.get('/', (req, res) => {
    res.send(`
        <h1>Facebook Cookie API</h1>
        <p>Use POST /get-cookies with JSON body:</p>
        <pre>
{
    "email": "your_email@example.com",
    "password": "your_password"
}
        </pre>
    `);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 API running on http://localhost:${PORT}`);
});
