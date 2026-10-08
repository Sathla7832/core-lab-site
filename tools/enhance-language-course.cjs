const lessons=require('./language-applied-lessons.json');
module.exports=async function enhance(page,vi){
 await page.evaluate(({lessons,vi})=>{
  const l=vi?1:0;
  const text=(zh,v)=>vi?v:zh;
  const make=(tag,value)=>{const n=document.createElement(tag);n.textContent=value;return n;};
  const date=offset=>new Date(Date.UTC(2026,9,8+offset));
  const format=d=>d.toISOString().slice(0,10);
  const weekdays=vi?['Chủ Nhật','Thứ Hai','Thứ Ba','Thứ Tư','Thứ Năm','Thứ Sáu','Thứ Bảy']:['星期日','星期一','星期二','星期三','星期四','星期五','星期六'];
  const intro=document.createElement('section');intro.className='course-dates';
  intro.append(make('p',text('起訖日：2026/10/08（四）—2026/12/30（三）｜12 週、60 個平日學習日。','Thời gian: 08/10/2026 (Thứ Năm) — 30/12/2026 (Thứ Tư) | 12 tuần, 60 ngày học trong tuần.')));
  intro.append(make('p',text('每週以週四至下週三為一個學習週：週四上課 60 分鐘；其他日子皆為練習日。週五、週一、週二、週三完成主要任務，前兩週每次 25–35 分鐘，第 3–12 週 35–50 分鐘；週六、週日各做 10–15 分鐘短練習，不另計入 60 個平日核心教材。','Mỗi tuần học từ Thứ Năm đến Thứ Tư kế tiếp: Thứ Năm lên lớp 60 phút; tất cả ngày còn lại là ngày luyện tập. Thứ Sáu, Hai, Ba và Tư làm nhiệm vụ chính: hai tuần đầu 25–35 phút/ngày, tuần 3–12 là 35–50 phút/ngày. Thứ Bảy và Chủ Nhật mỗi ngày luyện ngắn 10–15 phút, không tính thêm vào 60 bài học cốt lõi trong ngày thường.')));
  const details=document.createElement('details');details.append(make('summary',text('查看 12 週上課日期與每週主題','Xem ngày lên lớp và chủ đề trong 12 tuần')));
  const list=document.createElement('ol');lessons.forEach((x,i)=>list.append(make('li',format(date(i*7))+' — '+format(date(i*7+6))+' | '+text('上課：','Lên lớp: ')+format(date(i*7))+' | '+x.topic[l])));details.append(list);intro.append(details);
  intro.append(make('p',text('每週四流程：10 分鐘舊詞／數字複習 → 15 分鐘本週詞句 → 20 分鐘商業與工程角色扮演 → 10 分鐘數據／文件確認 → 5 分鐘回饋與練習分派。工程活動只做紙卡、模擬資料及安全日用品的語言練習；實際設備、安全與作業條件一律依現場規範。課表未自動排除國定假日，如需停課由師生另行調整。','Quy trình Thứ Năm: 10 phút ôn từ/số → 15 phút từ và câu mới → 20 phút đóng vai thương mại/kỹ thuật → 10 phút xác nhận dữ liệu/tài liệu → 5 phút phản hồi và giao bài. Hoạt động kỹ thuật chỉ luyện ngôn ngữ bằng thẻ, dữ liệu giả và đồ dùng an toàn; thiết bị, an toàn và điều kiện thực tế phải theo quy định tại chỗ. Lịch chưa tự loại ngày lễ; giáo viên và học viên điều chỉnh nếu cần nghỉ.')));
  document.querySelector('article h1').after(intro);
  const offsets=[0,1,4,5,6];
  lessons.forEach((lesson,i)=>{
   const panel=document.querySelector('#week-'+(i+1));
   const weekHeading=panel.querySelector('h3');weekHeading.textContent=text('第 '+(i+1)+' 週','Tuần '+(i+1))+' | '+lesson.topic[l]+' | '+format(date(i*7))+' — '+format(date(i*7+6));
   const bank=document.createElement('section');bank.className='applied-language';
   bank.append(make('h4',text(i<2?'基礎常用生字與數字｜先會讀，再帶進工作句':'本週商業與工程生字','Từ vựng '+(i<2?'cơ bản và số: đọc trước, dùng trong câu công việc sau':'thương mại và kỹ thuật trong tuần'))));
   const table=document.createElement('table');const head=document.createElement('thead');const hr=document.createElement('tr');['中文','拼音','越南文'].forEach((t,j)=>hr.append(make('th',vi?['Tiếng Hoa','Pinyin','Tiếng Việt'][j]:t)));head.append(hr);table.append(head);const body=document.createElement('tbody');lesson.words.forEach(row=>{const tr=document.createElement('tr');row.forEach(t=>tr.append(make('td',t)));body.append(tr);});table.append(body);const wrap=document.createElement('div');wrap.className='table-wrap';wrap.append(table);bank.append(wrap);
   bank.append(make('h4',text('商業／工程實用對話｜同伴輪替角色','Hội thoại thương mại/kỹ thuật | Đổi vai với bạn học')));
   const dialogue=document.createElement('ol');lesson.dialogue.forEach(row=>dialogue.append(make('li',row[0]+' — '+row[1])));bank.append(dialogue);
   bank.append(make('p',text('每週驗收：','Kết quả cần đạt mỗi tuần: ')+lesson.goal[l]));
   bank.append(make('p',text('週末短練習：','Luyện ngắn cuối tuần: ')+format(date(i*7+2))+' / '+format(date(i*7+3))+' | '+text('各 10–15 分鐘：週六抽讀本週生字／數字並錄音；週日替換對話中的數量、規格或期限，完成四輪問答。','Mỗi ngày 10–15 phút: Thứ Bảy rút đọc từ/số và ghi âm; Chủ Nhật đổi số lượng, quy cách hoặc thời hạn trong hội thoại, hỏi đáp bốn lượt.')));
   bank.append(make('p',text('練習方法：先聽／讀 5–10 分鐘 → 詞語與數字抽讀 5–10 分鐘 → 角色扮演 10–20 分鐘 → 寫簡短訊息／錄音並核對 5–10 分鐘。每次至少改一項數量、尺寸或期限，不只背同一段。','Cách luyện: nghe/đọc 5–10 phút → rút đọc từ và số 5–10 phút → đóng vai 10–20 phút → viết tin/ghi âm và kiểm tra 5–10 phút. Mỗi lần đổi ít nhất một số lượng, kích thước hoặc thời hạn, không chỉ thuộc cùng một đoạn.')));
   weekHeading.after(bank);
   const days=[...panel.querySelectorAll('h4')].filter(h=>/^D\d\d/.test(h.textContent));
   days.forEach((h,j)=>{
    const old=h.textContent.split(/[｜|]/).slice(2).join('｜').replace(/週四[：:]\s*/g,'').trim();
    const d=date(i*7+offsets[j]);h.textContent='D'+String(i*5+j+1).padStart(2,'0')+' | '+format(d)+' '+weekdays[d.getUTCDay()]+' | '+text(j===0?'上課日':'練習日',j===0?'Ngày lên lớp':'Ngày luyện tập')+' | '+old;
    const task=make('p',text('本日商業／工程任務：','Nhiệm vụ thương mại/kỹ thuật hôm nay: ')+lesson.tasks[j][l]);task.className='daily-applied-task';h.after(task);
   });
   // The old weekday-specific online/test directions are now ordinary practice.
   panel.querySelectorAll('p:not(.daily-applied-task)').forEach(p=>{
    if(p.closest('.applied-language'))return;
    const walk=document.createTreeWalker(p,NodeFilter.SHOW_TEXT);let node;
    while(node=walk.nextNode())node.nodeValue=vi?node.nodeValue.replace(/trực tuyến/g,'theo tình huống').replace(/bài kiểm tra/g,'bài luyện tập').replace(/kiểm tra tuần/g,'luyện tập tuần').replace(/thứ Năm/g,'buổi học'):node.nodeValue.replace(/線上/g,'情境').replace(/週四錯題/g,'上課日需修正項目').replace(/總測驗/g,'綜合練習').replace(/測驗/g,'練習').replace(/期中檢核/g,'階段複習');
   });
   const button=document.querySelector('#week-tab-'+(i+1));button.textContent=text('第 '+(i+1)+' 週','Tuần '+(i+1))+' | '+lesson.topic[l]+' | '+format(date(i*7)).slice(5);
  });
  const style=document.createElement('style');style.textContent='.course-dates{padding:16px 20px;background:#eef6f6;border-left:4px solid #2dc9b9;border-radius:10px;margin:20px 0}.course-dates p{margin:8px 0}.course-dates summary{cursor:pointer;font-weight:700}.applied-language{padding:16px;background:#f3f8fb;border:1px solid #c9dce7;border-radius:10px;margin:18px 0}.daily-applied-task{border-left:4px solid #2dc9b9;padding:12px 16px;background:#eef7f6;font-weight:700}';document.head.append(style);
 },{lessons,vi});
};
