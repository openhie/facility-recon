const FRIP = process.env.FRIP || "localhost";
console.log(`facility-recon gui is running on ${FRIP}`);

const url = `http://${FRIP}:3000`;
console.log(`url is ${url}`);

const url_configure_settings = `http://${FRIP}:3000/#/configure`;

const USERNAME_SELECTOR = '#app > div > main > div > div > center > div > div > form > div > div > div > div > input[type=text]';
const PASSWORD_SELECTOR = '#app > div > main > div > div > center > div > div > form > div > div > div > div > input[type=password]';
const BUTTON_SELECTOR = '#app > div > main > div > div > center > div > div > nav > div > button > div';


// leave this test in to verify basic jest functionality works
describe('This is the Jest version of "Hello, World!"', () => {
  beforeAll(async () => {
    await page.goto('https://google.com');
  });

  it('Google front page should be titled "Google"', async () => {
    await expect(page.title()).resolves.toMatch('Google');
  });
});


// get to login page
describe('reach facility-recon login page', () => {
  beforeAll(async () => {
    await page.goto(url);
  });

  it('page should include "GOFR"', async () => {
    await expect(page.title()).resolves.toMatch('GOFR');
  });
});


// login and see landing page
describe('login and confirm we see the main landing page', () => {
  beforeAll(async () => {
    await page.goto(url);
    await page.screenshot({
      path: 'screenshot.png'
    });
    await page.click(USERNAME_SELECTOR);
    await page.keyboard.type('root@gofr.org');
    await page.click(PASSWORD_SELECTOR);
    await page.keyboard.type('gofr');
    await page.click(BUTTON_SELECTOR);
    await page.waitForNavigation();
  });

  it('page should include "Upload CSV"', async () => {
    await expect(page).toMatch('Upload CSV');
  });
});


// reach configure settings page
describe('can reach configure settings page', () => {
  beforeAll(async () => {
    await page.screenshot({
      path: 'screenshot2.png'
    });
    await page.goto(url_configure_settings);
  });
  it('page should include "Disable Authentication"', async () => {
    await expect(page).toMatch('Disable Authentication');
  });
});