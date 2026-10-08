const {chromium}=require('C:/Users/user/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const path=require('node:path');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 const page=await browser.newPage();
 const url=process.argv[2]||'file:///'+path.resolve(__dirname,'../course.html').replace(/\\/g,'/');
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('https://vercount.one/**',r=>r.abort());
 await page.goto(url,{waitUntil:'domcontentloaded'});
 for(const id of ['online-quiz','materials-thermodynamics','language']){
  await page.locator('#tab-'+id).click();
  if(await page.locator('.course-panel:visible').count()!==1||!await page.locator('#'+id).isVisible())throw Error('Incorrect panel '+id);
  if(await page.locator('#tab-'+id).getAttribute('aria-selected')!=='true')throw Error('Incorrect active tab');
 }
 await page.goBack({waitUntil:'domcontentloaded'});
 if(!await page.locator('#materials-thermodynamics').isVisible())throw Error('Back button failed');
 await page.goto(url.split('#')[0]+'#language',{waitUntil:'domcontentloaded'});
 if(!await page.locator('#language').isVisible())throw Error('Direct link failed');
 await page.locator('#tab-language').focus();await page.keyboard.press('Home');
 if(!await page.locator('#online-quiz').isVisible())throw Error('Keyboard failed');
 await page.setViewportSize({width:390,height:844});
 for(const id of ['materials-thermodynamics','language','online-quiz'])await page.locator('#tab-'+id).click();
 await page.screenshot({path:path.resolve(__dirname,'../../output/course-tabs.png'),fullPage:false});
 if(errors.length)throw Error(errors.join('\n'));
 console.log('PASS: three exclusive tabs, direct links, browser history, keyboard and mobile.');
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
