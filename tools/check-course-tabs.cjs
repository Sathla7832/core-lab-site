const {chromium}=require('C:/Users/user/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const path=require('node:path');
const fs=require('node:fs');
const http=require('node:http');
(async()=>{
 let server;
 if(!process.argv[2]){
  const root=path.resolve(__dirname,'..');
  server=http.createServer((req,res)=>{const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(!file.startsWith(root+path.sep)||!fs.existsSync(file)){res.writeHead(404);res.end();return;}res.setHeader('Content-Type',file.endsWith('.html')?'text/html; charset=utf-8':file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':'application/octet-stream');fs.createReadStream(file).pipe(res);});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 }
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 const page=await browser.newPage();
 const url=process.argv[2]||'http://127.0.0.1:'+server.address().port+'/course.html';
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
 const lesson=page.frameLocator('#language-lesson');
 await lesson.locator('#week-tab-1').waitFor();
 if(!await lesson.locator('h1').isVisible())throw Error('Language content not shown directly');
 if(await lesson.locator('.back').isVisible())throw Error('Extra entrance in embedded lesson');
 await lesson.locator('#week-tab-3').click();
 if(!await lesson.locator('#week-3').isVisible())throw Error('Embedded week switch failed');
 await lesson.locator('.language-switch a[lang="vi"]').click();
 await lesson.locator('html[lang="vi"]').waitFor();
 await lesson.locator('#week-3').waitFor({state:'visible'});
 if(await page.locator('.course-panel:visible').count()!==1)throw Error('Language switch left course tab');
 await page.locator('#tab-language').focus();await page.keyboard.press('Home');
 if(!await page.locator('#online-quiz').isVisible())throw Error('Keyboard failed');
 await page.setViewportSize({width:390,height:844});
 for(const id of ['materials-thermodynamics','language','online-quiz'])await page.locator('#tab-'+id).click();
 await page.screenshot({path:path.resolve(__dirname,'../../output/course-tabs.png'),fullPage:false});
 if(errors.length)throw Error(errors.join('\n'));
 console.log('PASS: three exclusive tabs, direct links, browser history, keyboard and mobile.');
 await browser.close();
 if(server)server.close();
})().catch(e=>{console.error(e);process.exit(1)});
