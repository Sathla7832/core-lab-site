const {chromium}=require('C:/Users/user/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const path=require('node:path');
(async()=>{
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const page=await browser.newPage({viewport:{width:1280,height:900}});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
for(const file of ['course-language.html','course-language-vi.html']){
await page.goto(process.argv[2]?new URL(file,process.argv[2]).href:'file:///'+path.resolve(__dirname,'..',file).replace(/\\/g,'/'));
const counts=await page.evaluate(()=>({lang:document.documentElement.lang,tabs:document.querySelectorAll('.week-tabs button').length,panels:document.querySelectorAll('.week-panel').length,days:[...document.querySelectorAll('.week-panel h4')].filter(h=>/^D\d\d/.test(h.textContent)).length,undefined:document.body.textContent.includes('undefined'),overflow:document.documentElement.scrollWidth>innerWidth}));
if(counts.tabs!==12||counts.panels!==12||counts.days!==60||counts.undefined)throw Error(JSON.stringify(counts));
for(let i=1;i<=12;i++){await page.locator('#week-tab-'+i).click();if(await page.locator('.week-panel:visible').count()!==1)throw Error('Panel visibility');if(!await page.locator('#week-'+i).isVisible())throw Error('Wrong week');if(await page.locator('#week-'+i+' h4').count()<5)throw Error('Missing daily lessons');}
if(!(await page.locator('.language-switch a').first().getAttribute('href')).endsWith('#week-12'))throw Error('Language link lost selected week');
await page.setViewportSize({width:390,height:844});
await page.locator('#week-tab-1').click();
await page.screenshot({path:path.resolve(__dirname,'../../output',file+'.png'),fullPage:false});
console.log(file,JSON.stringify(counts));await page.setViewportSize({width:1280,height:900});
}
if(errors.length)throw Error(errors.join('\n'));
await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
