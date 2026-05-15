let CURRENT_API_BASE = localStorage.getItem('IT_ASSET_API_BASE') || API_BASE || '';
const departments = [
  {name:'Phòng hành chính quản trị', code:'HCQT', children:['Bảo vệ','Tạp vụ','Nhà ăn']},
  {name:'Phòng nhân sự', code:'NS', children:[]},
  {name:'Phòng kế toán', code:'KT', children:[]},
  {name:'Phòng kế hoạch', code:'KH', children:[]},
  {name:'Phòng kỹ thuật công nghệ', code:'KTCN', children:[]},
  {name:'Kho NPL', code:'NPL', children:[]},
  {name:'Kho thành phẩm', code:'TP', children:[]},
  {name:'Tổ cắt', code:'CAT', children:[]},
  {name:'Cơ điện', code:'CD', children:['Thợ điện','Thợ máy']},
  {name:'XN1', code:'XN1', children:['Tổ 1','Tổ 3','Tổ 5','Tổ 7','Tổ 9']},
  {name:'XN2', code:'XN2', children:['Tổ 11','Tổ 13','Tổ 15','Tổ 17']},
  {name:'XN3', code:'XN3', children:['Tổ 19','Tổ 21','Tổ 23','Tổ 25','Tổ 27']}
];
const assetTypes = ['PC','Laptop','Màn hình','Máy in','Camera','Đầu ghi','Switch','Router/Wifi','UPS','Máy chấm công','Máy scan','Thiết bị khác'];
const statuses = [
  {value:'use', label:'Đang sử dụng'},
  {value:'stock', label:'Trong kho'},
  {value:'repair', label:'Đang sửa'},
  {value:'lost', label:'Mất / thất lạc'},
  {value:'disposal', label:'Thanh lý'}
];
let assets = [
  {id:1, code:'IT-PC-001', type:'PC', name:'PC Core i5 / RAM 8GB / SSD 256GB', serial:'VH-PC001', dept:'Phòng nhân sự', user:'Nguyễn Thị A', purchase:'2024-01-15', status:'use', note:''},
  {id:2, code:'IT-PR-002', type:'Máy in', name:'Canon LBP 2900', serial:'CN2900-02', dept:'Phòng kế toán', user:'Kế toán', purchase:'2023-08-20', status:'use', note:''},
  {id:3, code:'IT-CAM-010', type:'Camera', name:'Hikvision IP 2MP khu vực cổng', serial:'HK010', dept:'Phòng hành chính quản trị', user:'Bảo vệ', purchase:'2023-11-02', status:'use', note:''},
  {id:4, code:'IT-PC-014', type:'PC', name:'PC H81 / i3 / RAM 4GB / HDD 500GB', serial:'VH-PC014', dept:'XN1', user:'Tổ 1', purchase:'2020-04-05', status:'repair', note:'Nên nâng RAM/SSD'},
  {id:5, code:'IT-SW-003', type:'Switch', name:'Switch 24 port Gigabit', serial:'SW24-03', dept:'Cơ điện', user:'Phòng server', purchase:'2022-09-10', status:'stock', note:''},
  {id:6, code:'IT-LT-006', type:'Laptop', name:'Dell Latitude i5 / RAM 16GB', serial:'DL006', dept:'Phòng kế hoạch', user:'Trần Văn B', purchase:'2024-03-18', status:'use', note:''}
];
let repairs = [
  {date:'2026-05-10', asset:'IT-PC-014', issue:'Máy chạy chậm, lỗi ổ cứng', tech:'IT', cost:450000, status:'Đang xử lý'},
  {date:'2026-05-08', asset:'IT-PR-002', issue:'Kẹt giấy, vệ sinh cụm sấy', tech:'IT', cost:0, status:'Hoàn tất'}
];
let assignments = [
  {date:'2026-05-01', asset:'IT-LT-006', type:'Cấp phát', user:'Trần Văn B', dept:'Phòng kế hoạch', note:'Cấp cho công việc kế hoạch'},
  {date:'2026-04-22', asset:'IT-PC-001', type:'Điều chuyển', user:'Nguyễn Thị A', dept:'Phòng nhân sự', note:'Chuyển từ máy cũ sang máy mới'}
];
let editingId = null;
const $ = id => document.getElementById(id);
const norm = s => String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
function todayISO(){ return new Date().toISOString().slice(0,10); }
function money(n){ return Number(n||0).toLocaleString('vi-VN') + ' đ'; }
function statusLabel(v){ return (statuses.find(s=>s.value===v)||{}).label || v; }
function statusClass(v){ return v || 'stock'; }
function fillSelect(id, arr, getVal=x=>x, getText=x=>x, first=''){
  const el=$(id); if(!el) return; el.innerHTML = first ? `<option value="">${first}</option>` : '';
  arr.forEach(x=>{ const op=document.createElement('option'); op.value=getVal(x); op.textContent=getText(x); el.appendChild(op); });
}
function init(){
  $('todayText').textContent = new Date().toLocaleDateString('vi-VN',{weekday:'long', day:'2-digit', month:'2-digit', year:'numeric'});
  $('apiBaseInput').value = CURRENT_API_BASE;
  fillSelect('dashStatus', statuses, s=>s.value, s=>s.label, 'Tất cả trạng thái');
  fillSelect('filterStatus', statuses, s=>s.value, s=>s.label, 'Tất cả trạng thái');
  fillSelect('filterType', assetTypes, x=>x, x=>x, 'Tất cả loại');
  fillSelect('filterDept', departments, d=>d.name, d=>d.name, 'Tất cả phòng ban');
  fillSelect('fType', assetTypes); fillSelect('fDept', departments, d=>d.name, d=>d.name); fillSelect('fStatus', statuses, s=>s.value, s=>s.label);
  fillSelect('aDept', departments, d=>d.name, d=>d.name);
  document.querySelectorAll('.nav button').forEach(btn=>btn.onclick=()=>setView(btn.dataset.view));
  loadRemote().finally(renderAll);
}
async function loadRemote(){
  if(!CURRENT_API_BASE) return;
  try{
    const res = await fetch(CURRENT_API_BASE + '/api/assets');
    if(res.ok){ const data = await res.json(); if(Array.isArray(data)) assets=data; if(Array.isArray(data.assets)) assets=data.assets; }
  }catch(e){ console.warn('API chưa sẵn sàng, dùng demo data', e); }
}
function renderAll(){ renderKpi(); renderDashboardTable(); renderAssets(); renderDept(); renderRepairs(); renderAssignments(); renderActivity(); refreshAssetOptions(); }
function renderKpi(){
  $('kpiTotal').textContent=assets.length;
  $('kpiUse').textContent=assets.filter(a=>a.status==='use').length;
  $('kpiRepair').textContent=assets.filter(a=>a.status==='repair').length;
  $('kpiStock').textContent=assets.filter(a=>a.status==='stock').length;
  $('assetCountText').textContent=assets.length+' tài sản';
}
function matchAsset(a,q){ q=norm(q); return !q || norm([a.code,a.type,a.name,a.serial,a.dept,a.user,a.status].join(' ')).includes(q); }
function renderDashboardTable(){
  const q=$('dashSearch').value, st=$('dashStatus').value;
  const rows=assets.filter(a=>matchAsset(a,q)).filter(a=>!st||a.status===st).slice(0,10);
  $('dashRows').innerHTML = rows.map(a=>`<tr><td><b>${a.code}</b></td><td>${a.type}</td><td>${a.name}</td><td>${a.dept}</td><td>${a.user||'-'}</td><td><span class="status ${statusClass(a.status)}">${statusLabel(a.status)}</span></td></tr>`).join('') || '<tr><td colspan="6">Không có dữ liệu</td></tr>';
}
function renderAssets(){
  const q=$('assetSearch')?.value||'', type=$('filterType')?.value||'', dept=$('filterDept')?.value||'', st=$('filterStatus')?.value||'';
  const rows=assets.filter(a=>matchAsset(a,q)).filter(a=>(!type||a.type===type)&&(!dept||a.dept===dept)&&(!st||a.status===st));
  $('assetRows').innerHTML = rows.map(a=>`<tr><td><b>${a.code}</b></td><td>${a.type}</td><td>${a.name}</td><td>${a.serial||'-'}</td><td>${a.dept}</td><td>${a.user||'-'}</td><td>${a.purchase||'-'}</td><td><span class="status ${statusClass(a.status)}">${statusLabel(a.status)}</span></td><td><button class="btn ghost" onclick="editAsset(${a.id})">Sửa</button> <button class="btn danger" onclick="deleteAsset(${a.id})">Xóa</button></td></tr>`).join('') || '<tr><td colspan="9">Không có dữ liệu</td></tr>';
}
function renderDept(){
  $('deptGrid').innerHTML = departments.map(d=>{
    const count = assets.filter(a=>a.dept===d.name).length;
    const child = d.children.length ? `<p>Nhóm: ${d.children.join(', ')}</p>` : '<p>Không có nhóm con</p>';
    return `<div class="dept"><h4>${d.name}</h4><p>Mã: ${d.code}</p>${child}<div class="count">${count}</div><p>tài sản đang ghi nhận</p></div>`;
  }).join('');
}
function renderRepairs(){
  $('repairRows').innerHTML = repairs.map(r=>`<tr><td>${r.date}</td><td><b>${r.asset}</b></td><td>${r.issue}</td><td>${r.tech}</td><td>${money(r.cost)}</td><td>${r.status}</td></tr>`).join('') || '<tr><td colspan="6">Chưa có sửa chữa</td></tr>';
}
function renderAssignments(){
  $('assignRows').innerHTML = assignments.map(a=>`<tr><td>${a.date}</td><td><b>${a.asset}</b></td><td>${a.type}</td><td>${a.user}</td><td>${a.dept}</td><td>${a.note||''}</td></tr>`).join('') || '<tr><td colspan="6">Chưa có phiếu</td></tr>';
}
function renderActivity(){
  const list = [
    ['Cập nhật tài sản','Đồng bộ danh sách tài sản demo'],
    ['Sửa chữa','IT-PC-014 đang xử lý lỗi ổ cứng'],
    ['Cấp phát','IT-LT-006 cấp cho phòng kế hoạch'],
    ['Kiểm kê','Bổ sung cơ cấu phòng ban đầy đủ']
  ];
  $('activityList').innerHTML=list.map(x=>`<div class="activity"><div class="dot"></div><div><b>${x[0]}</b><span>${x[1]}</span></div></div>`).join('');
}
function refreshAssetOptions(){
  fillSelect('rAsset', assets, a=>a.code, a=>`${a.code} - ${a.name}`);
  fillSelect('aAsset', assets, a=>a.code, a=>`${a.code} - ${a.name}`);
}
function setView(id){
  document.querySelectorAll('.view').forEach(v=>v.classList.remove('active')); $(id).classList.add('active');
  document.querySelectorAll('.nav button').forEach(b=>b.classList.toggle('active', b.dataset.view===id));
  const map={dashboard:['Tổng quan tài sản IT','Theo dõi tổng quan thiết bị và tình trạng sử dụng.'],assets:['Danh sách tài sản','Quản lý chi tiết từng thiết bị.'],departments:['Phòng ban / đơn vị','Cơ cấu phòng ban đầy đủ để gắn tài sản.'],repairs:['Sửa chữa / bảo trì','Theo dõi lỗi, chi phí và người xử lý.'],assignments:['Cấp phát / Thu hồi','Lịch sử bàn giao thiết bị.'],reports:['Báo cáo','Báo cáo kiểm kê và xuất dữ liệu.'],settings:['Cấu hình API','Kết nối Cloudflare Worker + D1.']};
  $('pageTitle').textContent=map[id][0]; $('pageSub').textContent=map[id][1]; toggleMenu(false);
}
function toggleMenu(show){ $('sidebar').classList.toggle('open', show); $('drawerMask').classList.toggle('show', show); }
function openAssetModal(){ editingId=null; $('assetModalTitle').textContent='Thêm tài sản'; ['fCode','fName','fSerial','fUser','fPurchase','fNote'].forEach(id=>$(id).value=''); $('fStatus').value='stock'; $('assetModal').classList.add('show'); }
function editAsset(id){ const a=assets.find(x=>x.id===id); if(!a) return; editingId=id; $('assetModalTitle').textContent='Sửa tài sản'; $('fCode').value=a.code; $('fType').value=a.type; $('fName').value=a.name; $('fSerial').value=a.serial; $('fDept').value=a.dept; $('fUser').value=a.user; $('fPurchase').value=a.purchase; $('fStatus').value=a.status; $('fNote').value=a.note; $('assetModal').classList.add('show'); }
function saveAsset(){
  const item={id:editingId||Date.now(),code:$('fCode').value.trim(),type:$('fType').value,name:$('fName').value.trim(),serial:$('fSerial').value.trim(),dept:$('fDept').value,user:$('fUser').value.trim(),purchase:$('fPurchase').value,status:$('fStatus').value,note:$('fNote').value.trim()};
  if(!item.code || !item.name){ alert('Nhập mã tài sản và tên/cấu hình'); return; }
  if(editingId){ assets=assets.map(a=>a.id===editingId?item:a); } else { if(assets.some(a=>norm(a.code)===norm(item.code))){ alert('Mã tài sản đã tồn tại'); return; } assets.unshift(item); }
  closeModal('assetModal'); renderAll(); saveRemote('/api/assets', item, editingId?'PUT':'POST');
}
function deleteAsset(id){ if(!confirm('Xóa tài sản này?')) return; assets=assets.filter(a=>a.id!==id); renderAll(); saveRemote('/api/assets/'+id, null, 'DELETE'); }
function openRepairModal(){ $('rDate').value=todayISO(); $('rIssue').value=''; $('rCost').value=0; refreshAssetOptions(); $('repairModal').classList.add('show'); }
function saveRepair(){ repairs.unshift({date:$('rDate').value,asset:$('rAsset').value,issue:$('rIssue').value,tech:$('rTech').value,cost:$('rCost').value,status:'Đang xử lý'}); const a=assets.find(x=>x.code===$('rAsset').value); if(a) a.status='repair'; closeModal('repairModal'); renderAll(); saveRemote('/api/repairs', repairs[0], 'POST'); }
function openAssignModal(){ $('aDate').value=todayISO(); refreshAssetOptions(); $('assignModal').classList.add('show'); }
function saveAssignment(){ assignments.unshift({date:$('aDate').value,asset:$('aAsset').value,type:$('aType').value,user:$('aUser').value,dept:$('aDept').value,note:$('aNote').value}); const a=assets.find(x=>x.code===$('aAsset').value); if(a){ a.user=$('aUser').value; a.dept=$('aDept').value; a.status=$('aType').value==='Thu hồi'?'stock':'use'; } closeModal('assignModal'); renderAll(); saveRemote('/api/assignments', assignments[0], 'POST'); }
function closeModal(id){ $(id).classList.remove('show'); }
async function saveRemote(path, payload, method){ if(!CURRENT_API_BASE) return; try{ await fetch(CURRENT_API_BASE+path,{method,headers:{'Content-Type':'application/json'},body:payload?JSON.stringify(payload):undefined}); }catch(e){ console.warn('Chưa lưu D1 vì API chưa sẵn sàng', e); } }
function saveApiBase(){ CURRENT_API_BASE=$('apiBaseInput').value.trim().replace(/\/$/,''); localStorage.setItem('IT_ASSET_API_BASE',CURRENT_API_BASE); alert('Đã lưu CURRENT_API_BASE'); }
function exportCsv(){
  const headers=['code','type','name','serial','dept','user','purchase','status','note'];
  const csv=[headers.join(',')].concat(assets.map(a=>headers.map(h=>'"'+String(a[h]||'').replaceAll('"','""')+'"').join(','))).join('\n');
  const blob=new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='it-assets.csv'; a.click(); URL.revokeObjectURL(url);
}
init();
