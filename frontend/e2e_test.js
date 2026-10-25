// frontend/e2e_test.js
import puppeteer from 'puppeteer-core';

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const BASE_URL = 'http://localhost:5173';

async function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

// Find and click the first enabled button whose text includes `needle`
async function clickButton(page, needle) {
  const buttons = await page.$$('button');
  for (const btn of buttons) {
    const txt = await page.evaluate(el => el.innerText, btn);
    const disabled = await page.evaluate(el => el.disabled, btn);
    if (!disabled && txt.includes(needle)) {
      await btn.click();
      return true;
    }
  }
  return false;
}

async function runTests() {
  console.log('🚀 Launching Microsoft Edge for E2E verification...');
  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  page.setDefaultNavigationTimeout(60000);
  page.on('console', msg => {
    if (msg.type() === 'error') console.log('  [page error]', msg.text().slice(0, 120));
  });

  try {
    // ─── 1. Landing page ────────────────────────────────────────────────────
    console.log('\n--- 1. Landing Page ---');
    await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await wait(800);
    const title = (await page.$eval('h1', el => el.innerText)).replace(/\s+/g, ' ');
    console.log(`  headline: "${title}"`);
    if (!title.includes('Skip the waiting room')) throw new Error(`Bad headline: ${title}`);

    const clinicHref = await page.$eval('header nav a:last-child', el => el.getAttribute('href'));
    if (clinicHref !== '/clinic/login') throw new Error(`Navbar clinic href = ${clinicHref}`);
    console.log('  ✓ Navbar Clinic link → /clinic/login');

    // ─── 2. Route guard ─────────────────────────────────────────────────────
    console.log('\n--- 2. Route Guard /clinic → /clinic/login ---');
    await page.goto(`${BASE_URL}/clinic`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await wait(700);
    if (!page.url().includes('/clinic/login')) throw new Error(`Route guard failed, url=${page.url()}`);
    console.log('  ✓ Unauthenticated /clinic redirected to /clinic/login');

    // ─── 3. Login page ──────────────────────────────────────────────────────
    console.log('\n--- 3. Clinic Login ---');
    const loginH = await page.$eval('h1', el => el.innerText);
    if (!loginH.includes('Clinic staff sign in')) throw new Error(`Heading: ${loginH}`);

    // Invalid credentials
    await page.type('input[type="text"]', 'admin');
    await page.type('input[type="password"]', 'WrongPassword999');
    await page.click('button[type="submit"]');
    await wait(1500);
    const errText = await page.$eval('body', el => el.innerText);
    if (!errText.includes('Invalid username or password'))
      throw new Error('No inline error message for invalid credentials');
    console.log('  ✓ Invalid creds → inline error');

    // Valid credentials
    await page.goto(`${BASE_URL}/clinic/login`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await wait(300);
    await page.type('input[type="text"]', 'admin');
    await page.type('input[type="password"]', 'Clinic@123');
    await page.click('button[type="submit"]');
    await page.waitForFunction(() => window.location.pathname === '/clinic', { timeout: 8000 });
    await wait(1500);

    if (!page.url().includes('/clinic')) throw new Error(`Login did not redirect to /clinic, url=${page.url()}`);
    const dashText = await page.$eval('body', el => el.innerText);
    if (!dashText.includes('Clinic Admin')) throw new Error('Staff name not on dashboard');
    console.log('  ✓ Valid login → /clinic dashboard with "Clinic Admin"');

    // ─── 4. Sign out ────────────────────────────────────────────────────────
    console.log('\n--- 4. Sign Out ---');
    const signedOut = await clickButton(page, 'Sign out');
    if (!signedOut) throw new Error('Sign out button not found');
    await page.waitForFunction(() => window.location.pathname === '/clinic/login', { timeout: 5000 });
    console.log('  ✓ Sign out → /clinic/login');

    // ─── 5. Booking wizard ──────────────────────────────────────────────────
    console.log('\n--- 5. Booking Wizard ---');
    await page.goto(`${BASE_URL}/book`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await wait(600);

    // Step 1: patient info + symptoms + triage
    const testPhone = '9123456789';
    const allInputs = await page.$$('input');
    await allInputs[0].type('Arjun Das');   // name
    await allInputs[1].type('35');          // age
    await allInputs[2].type(testPhone);     // phone
    await page.type('textarea', 'acne and red skin rash');

    console.log('  Analysing symptoms...');
    const triageBtn = await page.$('button:has(svg.lucide-sparkles)');
    if (!triageBtn) throw new Error('Triage button not found');
    await triageBtn.click();
    await wait(2000);

    const triageBody = await page.$eval('body', el => el.innerText);
    if (!triageBody.includes('Dermatology')) throw new Error(`Triage did not suggest Dermatology, got: ${triageBody}`);
    console.log('  ✓ Triage → Dermatology');

    // Continue to step 2 (doctor selection)
    if (!await clickButton(page, 'Select doctor')) throw new Error('"Select doctor" button not found or disabled');
    await wait(1000);

    // Step 2: click first doctor card that has a Dr. name
    console.log('  Selecting doctor...');
    // Doctor cards are motion.div elements — click the first one in the list
    const clicked = await page.evaluate(() => {
      // Find elements containing "Dr." text
      const all = [...document.querySelectorAll('div')];
      const card = all.find(el =>
        el.innerText.includes('Dr.') &&
        el.children.length >= 2 &&
        el.style.cursor === 'pointer'
      );
      if (card) { card.click(); return true; }
      return false;
    });
    if (!clicked) {
      // Fallback: find any element with "Dr." text
      const docEl = await page.$x('//*[contains(text(),"Dr.")]');
      if (docEl.length > 0) {
        await docEl[0].click();
        console.log('  (used xpath fallback for doctor click)');
      } else {
        throw new Error('No doctor card found to click');
      }
    }
    await wait(600);

    if (!await clickButton(page, 'Select slot')) throw new Error('"Select slot" button not found or disabled');
    await wait(1500);

    // Step 3: wait for slot chips to appear and select an available one
    console.log('  Selecting slot...');
    // Wait for slot buttons to appear (they have time format like 09:00)
    try {
      await page.waitForFunction(() => {
        const btns = [...document.querySelectorAll('button')];
        return btns.some(b => /^\d{2}:\d{2}/.test(b.innerText.trim()) && !b.disabled);
      }, { timeout: 6000 });
    } catch {
      // Log current DOM for debugging
      const debugText = await page.$eval('body', el => el.innerText);
      throw new Error(`Slot chips never appeared. Body: ${debugText.slice(0, 300)}`);
    }

    const slotClicked = await page.evaluate(() => {
      const btns = [...document.querySelectorAll('button')];
      const chip = btns.find(b => /^\d{2}:\d{2}/.test(b.innerText.trim()) && !b.disabled);
      if (chip) { chip.click(); return chip.innerText.trim(); }
      return null;
    });
    if (!slotClicked) throw new Error('No available slot chip to click');
    console.log(`  ✓ Selected slot: ${slotClicked}`);
    await wait(500);

    if (!await clickButton(page, 'Review booking')) throw new Error('"Review booking" button not found or disabled');
    await wait(800);

    // Step 4: confirm
    if (!await clickButton(page, 'Confirm & generate token')) throw new Error('"Confirm & generate token" button not found or disabled');
    await wait(2500);

    const confirmText = await page.$eval('body', el => el.innerText);
    if (!confirmText.includes('Appointment confirmed')) throw new Error(`No confirmation screen. Text: ${confirmText.slice(0, 300)}`);

    const tokenMatch = confirmText.match(/QC-[A-Z0-9]{5}/);
    if (!tokenMatch) throw new Error(`No QC-XXXXX token found in: ${confirmText}`);
    const token = tokenMatch[0];
    console.log(`  ✓ Appointment confirmed, token: ${token}`);

    // ─── 6. Track page ──────────────────────────────────────────────────────
    console.log('\n--- 6. Track Page ---');
    if (!await clickButton(page, 'Track appointment live')) throw new Error('"Track appointment live" button not found');
    await wait(2000);

    const trackUrl = page.url();
    if (!trackUrl.includes(`/track/${token}`)) throw new Error(`Track URL mismatch: ${trackUrl}`);

    const trackText = await page.$eval('body', el => el.innerText);
    if (!trackText.includes(token)) throw new Error(`Token ${token} not visible on track page`);
    if (!trackText.includes('Arjun Das')) throw new Error('Patient name not on track page');
    console.log(`  ✓ Track page shows token ${token} and patient "Arjun Das"`);

    // ─── 7. Privacy: wrong phone ─────────────────────────────────────────────
    console.log('\n--- 7. Patient Privacy (wrong phone) ---');
    await page.goto(`${BASE_URL}/track/${token}?phone=0000000000`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await wait(1500);

    const privText = await page.$eval('body', el => el.innerText);
    if (!privText.includes("We couldn't find a booking with those details."))
      throw new Error(`Privacy guard failed. Text: ${privText.slice(0, 300)}`);
    console.log('  ✓ Wrong phone → "We couldn\'t find a booking with those details."');

    // ─── 8. Privacy: correct phone shows data ────────────────────────────────
    console.log('\n--- 8. Patient Privacy (correct phone) ---');
    await page.goto(`${BASE_URL}/track/${token}?phone=${testPhone}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await wait(1500);
    const correctText = await page.$eval('body', el => el.innerText);
    if (!correctText.includes('Arjun Das')) throw new Error('Patient data not shown with correct phone');
    if (correctText.includes('9876543210') || correctText.includes('9123456789'))
      console.log('  ⚠ Phone number visible on patient page (check if this is intentional)');
    console.log('  ✓ Correct phone shows appointment data');

    console.log('\n══════════════════════════════════════════════════════');
    console.log('🎉  ALL 8 E2E CHECKS PASSED SUCCESSFULLY!');
    console.log('══════════════════════════════════════════════════════\n');

  } finally {
    await browser.close();
  }
}

runTests().catch(err => {
  console.error('\n❌ E2E TEST FAILED:', err.message || err);
  process.exit(1);
});
