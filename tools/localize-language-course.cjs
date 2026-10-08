const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('C:/Users/user/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root = path.resolve(__dirname, '..');
const common = {
  '目錄':'Mục lục','課程使用方法與學習目標':'Cách sử dụng giáo trình và mục tiêu học tập',
  '發音練習資源與操作方法':'Tài nguyên luyện phát âm và cách sử dụng','12 週課程總表':'Tổng quan chương trình 12 tuần',
  '每週四線上教學流程':'Quy trình học trực tuyến vào thứ Năm hằng tuần','60 天每日教材':'Nội dung học từng ngày trong 60 ngày',
  '每週測驗：學生題目':'Bài kiểm tra hằng tuần dành cho học viên','教師答案、聽力稿與評分':'Đáp án, lời đọc bài nghe và cách chấm điểm dành cho giáo viên',
  '學習紀錄、補救練習及下一階段':'Theo dõi học tập, luyện tập bổ trợ và giai đoạn tiếp theo',
  '日子':'Ngày','學習安排':'Nội dung học','建議時間':'Thời lượng gợi ý','星期一':'Thứ Hai','星期二':'Thứ Ba','星期三':'Thứ Tư','星期四':'Thứ Năm','星期五':'Thứ Sáu','星期六、日':'Thứ Bảy và Chủ Nhật',
  '週次':'Tuần','天數':'Ngày học','主題':'Chủ đề','能力目標':'Mục tiêu năng lực','發音重點':'Trọng tâm phát âm',
  '核心詞語':'Từ vựng trọng tâm','核心句':'Câu trọng tâm','漢語拼音':'Pinyin','越南文':'Tiếng Việt','繁體中文':'Tiếng Hoa phồn thể','拼音':'Pinyin',
  '發音與資源：':'Phát âm và tài nguyên:','練習與產出：':'Thực hành và sản phẩm cần hoàn thành:','替換練習：':'Luyện thay thế:','自我檢查：':'Tự kiểm tra:','參考答案：':'Đáp án tham khảo:','今日完成：':'Hoàn thành hôm nay:','週四測驗：':'Bài kiểm tra thứ Năm:',
  '情境任務：':'Nhiệm vụ theo tình huống:','示範對話':'Hội thoại mẫu','成果任務：':'Nhiệm vụ cuối bài:','整合情境：':'Tình huống tổng hợp:',
  '代號':'Mã','資源與連結':'Tài nguyên và đường dẫn','用途與操作':'Công dụng và cách sử dụng','使用限制':'Giới hạn sử dụng',
  '項目':'Nội dung','初學提醒':'Lưu ý cho người mới học','練習':'Luyện tập','分鐘':'Phút','活動':'Hoạt động','師生操作':'Hoạt động của giáo viên và học viên',
  '暖身':'Khởi động','發音':'Phát âm','週四新句':'Câu mới vào thứ Năm','情境':'Tình huống','測驗':'Kiểm tra','回饋':'Phản hồi',
  '題型':'Dạng bài','分數':'Điểm','操作與評分':'Cách thực hiện và chấm điểm','聽力':'Nghe hiểu','情境表達':'Diễn đạt theo tình huống','選詞':'Chọn từ','口說':'Nói',
  '聽力（4分）：':'Nghe hiểu (4 điểm):','情境表達（4分）：':'Diễn đạt theo tình huống (4 điểm):','選詞（4分）：':'Chọn từ (4 điểm):','口說（6分）：':'Nói (6 điểm):','發音（2分）：':'Phát âm (2 điểm):',
  '聽力稿：':'Lời đọc bài nghe bằng tiếng Hoa:','聽力答案（每項2分）：':'Đáp án nghe hiểu (2 điểm mỗi ý):','情境表達示例：':'Ví dụ diễn đạt theo tình huống:','選詞答案：':'Đáp án chọn từ:','口說觀察：':'Nội dung quan sát phần nói:','發音觀察：':'Nội dung quan sát phát âm:',
  '面向':'Tiêu chí','0分':'0 điểm','1分':'1 điểm','2分':'2 điểm','任務完成':'Hoàn thành nhiệm vụ','聽懂與回應':'Nghe hiểu và phản hồi','可理解度':'Mức độ dễ hiểu',
  '16–20分：':'16–20 điểm:','12–15分：':'12–15 điểm:','0–11分：':'0–11 điểm:',
  '學習日':'Ngày học','日期':'Ngày tháng','完成項目':'Nội dung đã hoàn thành','今日會說的一句':'Một câu nói được hôm nay','要修正的音':'Âm cần sửa','待問問題':'Câu hỏi cần hỏi',
  '上課日期':'Ngày lên lớp','聽力/4':'Nghe hiểu/4','表達/4':'Diễn đạt/4','選詞/4':'Chọn từ/4','口說/6':'Nói/6','發音/2':'Phát âm/2','合計/20':'Tổng/20','補練項目':'Nội dung cần luyện bổ sung','困難':'Khó khăn',
  '一般自學日的固定流程：':'Quy trình cố định cho một ngày tự học:','越南文學習提示：':'Gợi ý học tập bằng tiếng Việt:','每天的資源路徑：':'Cách dùng tài nguyên mỗi ngày:','錄音自查四問：':'Bốn câu hỏi tự kiểm tra bản ghi âm:','來源與查核說明：':'Nguồn biên soạn và thông tin kiểm tra:',
};
const topics = ['Chào hỏi và giới thiệu bản thân','Số, thời gian và liên lạc','Ăn uống và gọi món','Mua sắm và thanh toán','Giao thông và hỏi đường','Nhà ở và sinh hoạt hằng ngày','Giao tiếp công việc và an toàn','Sức khỏe và đi khám','Giao tiếp với đồng nghiệp và lời mời','Xin nghỉ và xử lý vấn đề sinh hoạt','Trải nghiệm, so sánh và kế hoạch','Vận dụng tổng hợp và đánh giá kết quả'];
const suffixes = [
 ['用 R1 找相應音節，R2 查本日詞語，R5 跟讀核心句。','Dùng R1 tìm âm tiết tương ứng, R2 tra từ vựng hôm nay, rồi nghe và đọc theo các câu trọng tâm bằng R5.'],
 ['用 R2 查詞語，R5 模仿停頓並錄音；需要時回 R1 修正聲母或韻尾。','Dùng R2 tra từ, R5 luyện ngắt nhịp và ghi âm; khi cần, quay lại R1 để sửa phụ âm đầu hoặc âm cuối.'],
 ['用 R5 跟讀並比較自己的舊錄音；本週另選 R3 同主題入門材料聽一小段。','Nghe và đọc theo R5, so sánh với bản ghi âm cũ; trong tuần này, chọn thêm một đoạn ngắn cùng chủ đề dành cho người mới học từ R3.']
];
function automatic(t) {
  if (common[t]) return common[t];
  let m=t.match(/^(\d+(?:\.\d+)?)\.?(\s+)(.*)$/); if(m&&common[m[3]]) return m[1]+'. '+common[m[3]];
  m=t.match(/^第\s*(\d+)\s*週([｜|]|測驗[｜|])(.*)$/);if(m)return (m[2].startsWith('測驗')?'Kiểm tra tuần ':'Tuần ')+m[1]+' | '+topics[Number(m[1])-1];
  m=t.match(/^第\s*(\d+)\s*週教師用答案$/);if(m)return 'Đáp án dành cho giáo viên — tuần '+m[1];
  m=t.match(/^完成第\s*(\d+)\s*週測驗，把錯題留到明天重新作答。$/);if(m)return 'Hoàn thành bài kiểm tra tuần '+m[1]+'. Ngày mai làm lại các câu đã trả lời sai.';
  m=t.match(/^(\d+(?:[––-]\d+)?)\s*分鐘$/);if(m)return m[1]+' phút';
  return null;
}
async function main(){
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 const page=await browser.newPage();
 const archive=path.join(__dirname,'language-course-source.html');
 const html=fs.readFileSync(archive,'utf8').replace(/<script[\s\S]*?<\/script>/g,'');
 await page.setContent(html);
 const data=await page.evaluate(()=>{
  const article=document.querySelector('article');
  const answers=['安；越南人','八點半；星期四','兩杯；外帶','一百元；現金','左轉；十分鐘','七點；沒有熱水','檢查；還沒完成','兩天；這個藥','星期六；星期日','公車晚到；九點','水果；繼續學中文','兩杯、少冰；一天'];
  const questions=['學生叫什麼名字？是哪一國人？','幾點上班？星期幾上課？','要幾杯咖啡？要內用還是外帶？','商品多少元？用什麼付款？','直走後做什麼？走路多久？','每天幾點起床？家中有什麼問題？','第一步做什麼？工作完成了嗎？','不舒服多久？對什麼過敏？','先問哪一天有空？提議哪一天吃飯？','為什麼遲到？大概幾點到？','昨天買了什麼？下個月打算做什麼？','要幾杯、什麼冰量？請假多久？'];
  let ai=0;article.querySelectorAll('li').forEach(li=>{if(li.textContent.includes('聽力答案（每項2分）：')&&li.textContent.includes('undefined'))li.lastChild.nodeValue=' '+answers[ai++];});
  let qi=0;article.querySelectorAll('li').forEach(li=>{if(li.querySelector('strong')?.textContent==='聽力（4分）：')li.lastChild.nodeValue=' '+questions[qi++];});
  // The original source placed pronunciation words under speaking and speaking questions under pronunciation.
  article.querySelectorAll('h3').forEach(h=>{if(!/^第\s*\d+\s*週測驗/.test(h.textContent))return;const ol=h.nextElementSibling;if(ol?.tagName!=='OL')return;const items=ol.querySelectorAll('li');if(items.length!==5)return;const words=items[3].lastChild.nodeValue;const oral=questions[Number(h.textContent.match(/\d+/)[0])-1];items[3].lastChild.nodeValue=' 請用本週核心句回答：'+oral;items[4].lastChild.nodeValue=' 讀「'+words.trim()+'」，再將其中一詞放進本週核心句。';});
  const result=[];const walk=document.createTreeWalker(article,NodeFilter.SHOW_TEXT);let node;
  while(node=walk.nextNode()){
   const t=node.nodeValue.trim();if(!/[\u3400-\u9fff]/.test(t))continue;
   const table=node.parentElement.closest('table');
   if(table&&node.parentElement.closest('td')&&table.querySelector('thead')?.textContent.includes('越南文')){node.parentElement.closest('td').setAttribute('data-example','true');continue;}
   const li=node.parentElement.closest('li');if(li?.textContent.includes('｜')&&li.textContent.split('｜').length>=3){li.setAttribute('data-example','true');continue;}
   result.push(t);
  }
  return {source:[...new Set(result)],html:document.documentElement.outerHTML};
 });
 const unresolved=[];
 for(const t of data.source){if(automatic(t))continue;let base=t;for(const [zh] of suffixes)if(base.endsWith(zh))base=base.slice(0,-zh.length).trim();if(!automatic(base)&&!unresolved.includes(base))unresolved.push(base);}
 const sourcePath=path.join(__dirname,'language-vi-source.json');
 if(process.argv.includes('--catalog')){fs.writeFileSync(sourcePath,JSON.stringify(unresolved,null,2));console.log('Catalog: '+unresolved.length+' entries');await browser.close();return;}
 const expected=JSON.parse(fs.readFileSync(sourcePath,'utf8'));
 if(JSON.stringify(expected)!==JSON.stringify(unresolved))throw Error('Translation source changed; regenerate and review the catalog.');
 const entries=Object.assign({},...[0,1,2,3].map(i=>JSON.parse(fs.readFileSync(path.join(__dirname,'language-vi-'+i+'.json'),'utf8'))));
 const vi=expected.map((_,i)=>entries[String(i)]);
 if(vi.length!==expected.length||vi.some(x=>!x))throw Error('Incomplete translations: '+vi.length+'/'+expected.length);
 const map=new Map(expected.map((t,i)=>[t,vi[i]]));
 const translate=t=>{let direct=automatic(t);if(direct)return direct;let base=t,end='';for(const [zh,v]of suffixes)if(base.endsWith(zh)){base=base.slice(0,-zh.length).trim();end=' '+v;break;}return (automatic(base)||map.get(base)||(()=>{throw Error('Missing: '+t)})())+end;};
 await page.setContent(data.html);
 await page.evaluate(({common,topics})=>{
  document.querySelector('.language-switch').outerHTML='<nav class="language-switch" aria-label="教材語言"><a href="course-language.html" lang="zh-Hant" aria-current="page">繁體中文</a><a href="course-language-vi.html" lang="vi">Tiếng Việt</a></nav>';
  const a=document.querySelector('article');const hs=[...a.children].filter(n=>/^H[1-6]$/.test(n.tagName));
  const daily=hs.find(n=>/^5\./.test(n.textContent)),tests=hs.find(n=>/^6\./.test(n.textContent)),teacher=hs.find(n=>/^7\./.test(n.textContent));
  const collect=(s,e)=>{const ns=[];for(let n=s.nextElementSibling;n&&n!==e;n=n.nextElementSibling)ns.push(n);return ns};
  const panels=Array.from({length:12},(_,i)=>{const p=document.createElement('section');p.className='week-panel';p.id='week-'+(i+1);p.setAttribute('role','tabpanel');p.setAttribute('aria-labelledby','week-tab-'+(i+1));p.hidden=i!==0;return p;});
  const nav=document.createElement('div');nav.className='week-tabs';nav.setAttribute('role','tablist');nav.setAttribute('aria-label','12 週教學內容');
  panels.forEach((p,i)=>{const b=document.createElement('button');b.type='button';b.id='week-tab-'+(i+1);b.dataset.week=String(i+1);b.setAttribute('role','tab');b.setAttribute('aria-controls',p.id);b.setAttribute('aria-selected',String(i===0));b.tabIndex=i===0?0:-1;b.textContent='第 '+(i+1)+' 週';nav.append(b)});
  for(const nodes of[collect(daily,tests),collect(tests,teacher)]){let week=0;for(const n of nodes){const m=/^H[34]$/.test(n.tagName)&&n.textContent.match(/^第\s*(\d+)\s*週/);if(m)week=Number(m[1]);if(week)panels[week-1].append(n)}}
  daily.after(nav,...panels);tests.remove();
 },{common,topics});
 const zh=await page.content();
 await page.evaluate(({translations})=>{
  const map=new Map(translations);const walk=document.createTreeWalker(document.querySelector('article'),NodeFilter.SHOW_TEXT);let n;
  while(n=walk.nextNode()){if(n.parentElement.closest('[data-example]'))continue;const key=n.nodeValue.trim();if(map.has(key)){const leading=n.nodeValue.match(/^\s*/)[0],trailing=n.nodeValue.match(/\s*$/)[0];n.nodeValue=leading+map.get(key)+trailing;}}
  document.documentElement.lang='vi';document.title='Giáo trình tiếng Hoa: 12 tuần / 60 ngày | CORE Lab';
  document.querySelector('meta[name="description"]').content='Giáo trình tiếng Hoa dành cho người lớn Việt Nam: 60 ngày học, giao tiếp công việc, bài kiểm tra và đáp án.';
  document.querySelector('.back').textContent='← Quay lại khóa học ngôn ngữ';
  document.querySelector('.language-switch').setAttribute('aria-label','Ngôn ngữ giáo trình');
  document.querySelector('.language-switch [aria-current]').removeAttribute('aria-current');document.querySelector('.language-switch a[lang="vi"]').setAttribute('aria-current','page');
  document.querySelector('.week-tabs').setAttribute('aria-label','Chương trình 12 tuần');
 },{translations:data.source.map(t=>[t,translate(t)])});
 await page.evaluate(topics=>document.querySelectorAll('.week-tabs button').forEach((b,i)=>{b.textContent='Tuần '+(i+1)+' | '+topics[i]}),topics);
 const viHTML=await page.content();
 const script='<script src="assets/language-course.js?v=20261008-bilingual"></script>';
 fs.writeFileSync(path.join(root,'course-language.html'),zh.replace('</body>',script+'</body>'));
 fs.writeFileSync(path.join(root,'course-language-vi.html'),viHTML.replace('</body>',script+'</body>'));
 console.log('Built both static pages; translated '+data.source.length+' unique instructional text fragments.');
 await browser.close();
}
main().catch(e=>{console.error(e);process.exit(1)});
