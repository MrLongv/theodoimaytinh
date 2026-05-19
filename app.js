let IT_TOKEN = localStorage.getItem('IT_TOKEN') || '';
let CURRENT_API_BASE = localStorage.getItem('IT_ASSET_API_BASE') || API_BASE || '';

const departments = [
  {id:1,name:'Phòng hành chính quản trị',code:'HCQT',children:['Bảo vệ','Tạp vụ','Nhà ăn']},
  {id:2,name:'Phòng nhân sự',code:'NS',children:[]},
  {id:3,name:'Phòng kế toán',code:'KT',children:[]},
  {id:4,name:'Phòng kế hoạch',code:'KH',children:[]},
  {id:5,name:'Phòng kỹ thuật công nghệ',code:'KTCN',children:[]},
  {id:6,name:'Kho NPL',code:'NPL',children:[]},
  {id:7,name:'Kho thành phẩm',code:'TP',children:[]},
  {id:8,name:'Tổ cắt',code:'CAT',children:[]},
  {id:9,name:'Cơ điện',code:'CD',children:['Thợ điện','Thợ máy']},
  {id:10,name:'XN1',code:'XN1',children:['Tổ 1','Tổ 3','Tổ 5','Tổ 7','Tổ 9']},
  {id:11,name:'XN2',code:'XN2',children:['Tổ 11','Tổ 13','Tổ 15','Tổ 17']},
  {id:12,name:'XN3',code:'XN3',children:['Tổ 19','Tổ 21','Tổ 23','Tổ 25','Tổ 27']}
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
let assetPage = 1;
let assetPageSize = 25;
let lastAssetRows = [];

const $ = id => document.getElementById(id);
let confirmResolve = null;

function showToast(message, type='success', title='Thông báo'){
  const box = $('toastBox');
  if(!box) return;

  const icons = {
    success:'✅',
    error:'❌',
    warn:'⚠️',
    info:'ℹ️'
  };

  const div = document.createElement('div');
  div.className = `toast ${type}`;
  div.innerHTML = `
    <div>${icons[type] || 'ℹ️'}</div>
    <div>
      <b>${title}</b>
      <span>${message}</span>
    </div>
  `;

  box.appendChild(div);

  setTimeout(() => {
    div.style.opacity = '0';
    div.style.transform = 'translateX(18px)';
    div.style.transition = '.2s';
    setTimeout(() => div.remove(), 220);
  }, 2600);
}

function showConfirm(message, title='Xác nhận'){
  $('confirmTitle').textContent = title;
  $('confirmMessage').textContent = message;
  $('confirmModal').classList.add('show');

  return new Promise(resolve => {
    confirmResolve = resolve;
  });
}

function closeConfirm(result){
  $('confirmModal').classList.remove('show');

  if(confirmResolve){
    confirmResolve(result);
    confirmResolve = null;
  }
}
const norm = s => String(s || '')
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g,'');

function todayISO(){
  return new Date().toISOString().slice(0,10);
}

function money(n){
  return Number(n || 0).toLocaleString('vi-VN') + ' đ';
}

function statusLabel(v){
  return (statuses.find(s => s.value === v) || {}).label || v || '';
}

function statusClass(v){
  return v || 'stock';
}

/* Chuẩn hóa để đọc được cả data demo và data từ D1 API */
function assetCode(a){ return a.asset_code ?? a.code ?? ''; }
function assetType(a){ return a.asset_type ?? a.type ?? ''; }
function assetName(a){ return a.asset_name ?? a.name ?? ''; }
function assetSerial(a){ return a.serial_number ?? a.serial ?? ''; }
function assetDept(a){ return a.department_name ?? a.dept ?? ''; }
function assetUser(a){ return a.assigned_to ?? a.user ?? ''; }
function assetPurchase(a){ return a.purchase_date ?? a.purchase ?? ''; }
function assetWarranty(a){
  return a.warranty_end ?? '';
}

function typeBadge(type){
  const t = String(type || '').toLowerCase();

  let cls = 'type-badge';

  if(t.includes('pc')) cls += ' pc';
  else if(t.includes('laptop')) cls += ' laptop';
  else if(t.includes('máy in')) cls += ' printer';
  else if(t.includes('camera')) cls += ' camera';
  else if(t.includes('switch') || t.includes('router') || t.includes('wifi')) cls += ' network';

  return `<span class="${cls}">${type || '-'}</span>`;
}

function warrantyBadge(dateText){
  if(!dateText){
    return '<span class="warranty none">Không có</span>';
  }

  const today = new Date();
  const end = new Date(dateText);
  const diff = Math.ceil((end - today) / (1000 * 60 * 60 * 24));

  if(diff < 0){
    return '<span class="warranty expired">Hết hạn</span>';
  }

  if(diff <= 60){
    return `<span class="warranty warn">Còn ${diff} ngày</span>`;
  }

  return '<span class="warranty ok">Còn hạn</span>';
}
function assetNote(a){ return a.note ?? ''; }

function deptIdByName(name){
  const found = departments.find(d => d.name === name);
  return found ? found.id || null : null;
}

function fillSelect(id, arr, getVal=x=>x, getText=x=>x, first=''){
  const el = $(id);
  if(!el) return;

  el.innerHTML = first ? `<option value="">${first}</option>` : '';

  arr.forEach(x => {
    const op = document.createElement('option');
    op.value = getVal(x);
    op.textContent = getText(x);
    el.appendChild(op);
  });
}

function init(){
  checkLogin();
  $('todayText').textContent = new Date().toLocaleDateString('vi-VN',{
    weekday:'long',
    day:'2-digit',
    month:'2-digit',
    year:'numeric'
  });

  if ($('apiBaseInput')) {
    $('apiBaseInput').value = CURRENT_API_BASE;
  }

  fillSelect('dashStatus', statuses, s=>s.value, s=>s.label, 'Tất cả trạng thái');
  fillSelect('filterStatus', statuses, s=>s.value, s=>s.label, 'Tất cả trạng thái');
  fillSelect('filterType', assetTypes, x=>x, x=>x, 'Tất cả loại');
  fillSelect('filterDept', departments, d=>d.name, d=>d.name, 'Tất cả phòng ban');

  fillSelect('fType', assetTypes);
  fillSelect('fDept', departments, d=>d.name, d=>d.name);
  fillSelect('fStatus', statuses, s=>s.value, s=>s.label);

  fillSelect('aDept', departments, d=>d.name, d=>d.name);

  document.querySelectorAll('.nav button').forEach(btn => {
    btn.onclick = () => setView(btn.dataset.view);
  });

  loadRemote().finally(renderAll);
}

async function loadRemote(){

  if(!CURRENT_API_BASE) return;

  try{

    const res = await fetch(
      CURRENT_API_BASE + '/api/assets',
      {
        headers:{
          Authorization:'Bearer ' + IT_TOKEN
        }
      }
    );

    if(res.status === 401){

      localStorage.removeItem('IT_TOKEN');
      IT_TOKEN = '';

      $('loginScreen').style.display = 'flex';

      showToast(
        'Phiên đăng nhập đã hết hạn',
        'warn',
        'Đăng nhập lại'
      );

      return;
    }

    if(res.ok){

      const data = await res.json();

      if(Array.isArray(data)){
        assets = data;
      }

      if(Array.isArray(data.assets)){
        assets = data.assets;
      }

    }

    const rep = await fetch(
      CURRENT_API_BASE + '/api/repairs',
      {
        headers:{
          Authorization:'Bearer ' + IT_TOKEN
        }
      }
    );

    if(rep.ok){
      const repairData = await rep.json();

      if(Array.isArray(repairData)){
        repairs = repairData;
      }
    }

    const ass = await fetch(
      CURRENT_API_BASE + '/api/assignments',
      {
        headers:{
          Authorization:'Bearer ' + IT_TOKEN
        }
      }
    );

    if(ass.ok){
      const assignmentData = await ass.json();

      if(Array.isArray(assignmentData)){
        assignments = assignmentData;
      }
    }

  }catch(e){

    console.warn(
      'API chưa sẵn sàng, dùng demo data',
      e
    );

    showToast(
      'Không kết nối được API',
      'error',
      'Lỗi kết nối'
    );

  }
}
function yearsOld(dateText){
  if(!dateText) return 0;

  const d = new Date(dateText);
  if(isNaN(d)) return 0;

  const now = new Date();
  return now.getFullYear() - d.getFullYear();
}

function warrantyDaysLeft(dateText){
  if(!dateText) return null;

  const d = new Date(dateText);
  if(isNaN(d)) return null;

  return Math.ceil((d - new Date()) / (1000 * 60 * 60 * 24));
}

function renderDashboardStats(){
  const typeMap = {};

  assets.forEach(a => {
    const type = assetType(a) || 'Khác';
    typeMap[type] = (typeMap[type] || 0) + 1;
  });

  const typeRows = Object.entries(typeMap)
    .sort((a,b) => b[1] - a[1])
    .map(([type,count]) => `
      <div class="stat-row">
        <b>${typeBadge(type)}</b>
        <span>${count}</span>
      </div>
    `)
    .join('');

  if($('typeStats')){
    $('typeStats').innerHTML = typeRows || '<div class="stat-row"><b>Chưa có dữ liệu</b><span>0</span></div>';
  }

  if($('typeStatsCount')){
    $('typeStatsCount').textContent = assets.length + ' tài sản';
  }

  const warrantySoon = assets.filter(a => {
    const days = warrantyDaysLeft(assetWarranty(a));
    return days !== null && days >= 0 && days <= 60;
  }).length;

  const warrantyExpired = assets.filter(a => {
    const days = warrantyDaysLeft(assetWarranty(a));
    return days !== null && days < 0;
  }).length;

  const oldAssets = assets.filter(a => {
    return yearsOld(assetPurchase(a)) >= 5;
  }).length;

  const noWarranty = assets.filter(a => !assetWarranty(a)).length;

  if($('warningStats')){
    $('warningStats').innerHTML = `
      <div class="stat-row stat-warn">
        <b>⚠️ Bảo hành sắp hết trong 60 ngày</b>
        <span>${warrantySoon}</span>
      </div>

      <div class="stat-row stat-danger">
        <b>⛔ Đã hết bảo hành</b>
        <span>${warrantyExpired}</span>
      </div>

      <div class="stat-row stat-warn">
        <b>🕰️ Tài sản trên 5 năm</b>
        <span>${oldAssets}</span>
      </div>

      <div class="stat-row">
        <b>❔ Chưa nhập hạn bảo hành</b>
        <span>${noWarranty}</span>
      </div>
    `;
  }
if($('upgradeStats')){
  const lowRam = assets.filter(isLowRam).length;
  const hdd = assets.filter(isHdd).length;
  const old = assets.filter(isOldAsset).length;
  const totalNeed = assets.filter(needUpgrade).length;

  $('upgradeStats').innerHTML = `
    <div class="stat-row stat-danger">
      <b>🚨 Tổng cần nâng cấp</b>
      <span>${totalNeed}</span>
    </div>

    <div class="stat-row stat-warn">
      <b>RAM dưới 8GB</b>
      <span>${lowRam}</span>
    </div>

    <div class="stat-row stat-warn">
      <b>Còn dùng HDD</b>
      <span>${hdd}</span>
    </div>

    <div class="stat-row stat-warn">
      <b>Máy trên 5 năm</b>
      <span>${old}</span>
    </div>
  `;
}
}
function renderAll(){
  renderKpi();
  renderDashboardStats();
  renderDashboardTable();
  renderAssets();
  renderDept();
  renderRepairs();
  renderAssignments();
  renderActivity();
  refreshAssetOptions();
}

function renderKpi(){
  $('kpiTotal').textContent = assets.length;
  $('kpiUse').textContent = assets.filter(a => a.status === 'use').length;
  $('kpiRepair').textContent = assets.filter(a => a.status === 'repair').length;
  $('kpiStock').textContent = assets.filter(a => a.status === 'stock').length;
  $('assetCountText').textContent = assets.length + ' tài sản';
}

function matchAsset(a,q){
  q = norm(q);

  const text = [
  assetCode(a),
  assetType(a),
  assetName(a),
  assetSerial(a),
  assetCpu(a),
  assetRam(a),
  assetStorage(a),
  assetOs(a),
  assetDept(a),
  assetUser(a),
  a.status
].join(' ');

  return !q || norm(text).includes(q);
}
function ramGB(a){
  const m = String(assetRam(a)).match(/(\d+)/);
  return m ? Number(m[1]) : 0;
}

function isLowRam(a){
  return ramGB(a) > 0 && ramGB(a) < 8;
}

function isHdd(a){
  return norm(assetStorage(a)).includes('hdd');
}

function isOldAsset(a){
  return yearsOld(assetPurchase(a)) >= 5;
}

function needUpgrade(a){
  return isLowRam(a) || isHdd(a) || isOldAsset(a);
}

function upgradeReason(a){
  const reasons = [];

  if(isLowRam(a)) reasons.push('RAM thấp');
  if(isHdd(a)) reasons.push('Còn HDD');
  if(isOldAsset(a)) reasons.push('Máy cũ >5 năm');

  return reasons.join(', ') || 'Ổn';
}
function renderDashboardTable(){
  const q = $('dashSearch').value;
  const st = $('dashStatus').value;

  const rows = assets
    .filter(a => matchAsset(a,q))
    .filter(a => !st || norm(a.status) === norm(st))
    .slice(0,10);

  $('dashRows').innerHTML = rows.map(a => `
    <tr>
      <td><b>${assetCode(a)}</b></td>
      <td>${typeBadge(assetType(a))}</td>
      <td>${assetName(a)}</td>
      <td>${assetDept(a)}</td>
      <td>${assetUser(a) || '-'}</td>
      <td>
        <span class="status ${statusClass(a.status)}">
          ${statusLabel(a.status)}
        </span>
      </td>
    </tr>
  `).join('') || '<tr><td colspan="6">Không có dữ liệu</td></tr>';
}
function updatePager(total){
  const totalPages = Math.max(1, Math.ceil(total / assetPageSize));

  if(assetPage > totalPages){
    assetPage = totalPages;
  }

  if($('pagerInfo')){
    $('pagerInfo').textContent = `${total} dòng`;
  }

  if($('pagerPage')){
    $('pagerPage').textContent = `Trang ${assetPage}/${totalPages}`;
  }
}

function prevPage(){
  if(assetPage > 1){
    assetPage--;
    renderAssets();
  }
}

function nextPage(){
  const totalPages = Math.max(1, Math.ceil(lastAssetRows.length / assetPageSize));

  if(assetPage < totalPages){
    assetPage++;
    renderAssets();
  }
}

function changePageSize(){
  assetPageSize = Number($('pageSize').value || 25);
  assetPage = 1;
  renderAssets();
}
function renderAssets(){
  const q = $('assetSearch')?.value || '';
  const type = $('filterType')?.value || '';
  const dept = $('filterDept')?.value || '';
  const st = $('filterStatus')?.value || '';
  const upgrade = $('filterUpgrade')?.value || '';

  const rows = assets
    .filter(a => matchAsset(a,q))
.filter(a => !type || norm(assetType(a)) === norm(type))
.filter(a => !dept || norm(assetDept(a)) === norm(dept))
.filter(a => !st || norm(a.status) === norm(st))
.filter(a => {
  if(!upgrade) return true;
  if(upgrade === 'low_ram') return isLowRam(a);
  if(upgrade === 'hdd') return isHdd(a);
  if(upgrade === 'old') return isOldAsset(a);
  if(upgrade === 'need_upgrade') return needUpgrade(a);
  return true;
});

  lastAssetRows = rows;

  const total = rows.length;
  const totalPages = Math.max(1, Math.ceil(total / assetPageSize));

  if(assetPage > totalPages){
    assetPage = totalPages;
  }

  const start = (assetPage - 1) * assetPageSize;
  const pageRows = rows.slice(start, start + assetPageSize);

  updatePager(total);

  $('assetRows').innerHTML = pageRows.map(a => `
    <tr>
      <td><b>${assetCode(a)}</b></td>
      <td>${typeBadge(assetType(a))}</td>
      <td>${assetName(a)}</td>
      <td>${assetSerial(a) || '-'}</td>
      <td>${assetDept(a)}</td>
      <td>${assetUser(a) || '-'}</td>
      <td>${warrantyBadge(assetWarranty(a))}</td>
      <td>
        <span class="status ${statusClass(a.status)}">
          ${statusLabel(a.status)}
        </span>
      </td>
      <td>
        <button class="btn ghost" onclick="editAsset(${a.id})">Sửa</button>
        <button class="btn danger" onclick="deleteAsset(${a.id})">Xóa</button>
      </td>
    </tr>
  `).join('') || '<tr><td colspan="9">Không có dữ liệu</td></tr>';
}
function renderDept(){
  $('deptGrid').innerHTML = departments.map(d => {
    const count = assets.filter(a => assetDept(a) === d.name).length;
    const child = d.children.length
      ? `<p>Nhóm: ${d.children.join(', ')}</p>`
      : '<p>Không có nhóm con</p>';

    return `
      <div class="dept">
        <h4>${d.name}</h4>
        <p>Mã: ${d.code}</p>
        ${child}
        <div class="count">${count}</div>
        <p>tài sản đang ghi nhận</p>
      </div>
    `;
  }).join('');
}

function renderRepairs(){

  $('repairRows').innerHTML = repairs.map(r => `
    <tr>
      <td>${repairDate(r)}</td>

      <td>
        <b>${repairAssetCode(r)}</b>
        <div style="font-size:12px;color:var(--muted)">
          ${r.asset_name || ''}
        </div>
      </td>

      <td>${repairIssue(r)}</td>

      <td>${repairTech(r)}</td>

      <td>${money(repairCost(r))}</td>

      <td>${repairStatusLabel(repairStatus(r))}</td>

      <td>
        <button class="btn ghost" onclick="editRepair(${r.id})">Sửa</button>
        <button class="btn ghost" onclick="markRepairDone(${r.id})">Hoàn tất</button>
        <button class="btn danger" onclick="deleteRepair(${r.id})">Xóa</button>
      </td>
    </tr>
  `).join('') || '<tr><td colspan="7">Chưa có sửa chữa</td></tr>';
}
function renderAssignments(){

  $('assignRows').innerHTML = assignments.map(a => `
    <tr>
      <td>${assignmentDate(a)}</td>

      <td>
        <b>${assignmentAssetCode(a)}</b>
        <div style="font-size:12px;color:var(--muted)">
          ${a.asset_name || ''}
        </div>
      </td>

      <td>${assignmentType(a)}</td>

      <td>${assignmentUser(a)}</td>

      <td>${assignmentDept(a)}</td>

      <td>${assignmentNote(a)}</td>

      <td>
        <button class="btn ghost" onclick="editAssignment(${a.id})">Sửa</button>
        <button class="btn danger" onclick="deleteAssignment(${a.id})">Xóa</button>
      </td>
    </tr>
  `).join('') || '<tr><td colspan="7">Chưa có phiếu</td></tr>';
}
function renderActivity(){
  const list = [
    ['Cập nhật tài sản','Đồng bộ danh sách tài sản từ D1'],
    ['Sửa chữa','IT-PC-014 đang xử lý lỗi ổ cứng'],
    ['Cấp phát','IT-LT-006 cấp cho phòng kế hoạch'],
    ['Kiểm kê','Bổ sung cơ cấu phòng ban đầy đủ']
  ];

  $('activityList').innerHTML = list.map(x => `
    <div class="activity">
      <div class="dot"></div>
      <div>
        <b>${x[0]}</b>
        <span>${x[1]}</span>
      </div>
    </div>
  `).join('');
}

function refreshAssetOptions(){
  fillSelect('rAsset', assets, a => assetCode(a), a => `${assetCode(a)} - ${assetName(a)}`);
  fillSelect('aAsset', assets, a => assetCode(a), a => `${assetCode(a)} - ${assetName(a)}`);
}

function setView(id){
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  $(id).classList.add('active');

  document.querySelectorAll('.nav button').forEach(b => {
    b.classList.toggle('active', b.dataset.view === id);
  });

  const map = {
    dashboard:['Tổng quan tài sản IT','Theo dõi tổng quan thiết bị và tình trạng sử dụng.'],
    assets:['Danh sách tài sản','Quản lý chi tiết từng thiết bị.'],
    departments:['Phòng ban / đơn vị','Cơ cấu phòng ban đầy đủ để gắn tài sản.'],
    repairs:['Sửa chữa / bảo trì','Theo dõi lỗi, chi phí và người xử lý.'],
    assignments:['Cấp phát / Thu hồi','Lịch sử bàn giao thiết bị.'],
    reports:['Báo cáo','Báo cáo kiểm kê và xuất dữ liệu.'],
    settings:['Cấu hình API','Kết nối Cloudflare Worker + D1.']
  };

  $('pageTitle').textContent = map[id][0];
  $('pageSub').textContent = map[id][1];

  toggleMenu(false);
}

function toggleMenu(show){
  $('sidebar').classList.toggle('open', show);
  $('drawerMask').classList.toggle('show', show);
}

function openAssetModal(){
  editingId = null;

  $('assetModalTitle').textContent = 'Thêm tài sản';

  [
  'fCode',
  'fName',
  'fSerial',
  'fCpu',
  'fRam',
  'fStorage',
  'fOs',
  'fUser',
  'fPurchase',
  'fNote'
].forEach(id => {
  $(id).value = '';
});

  $('fStatus').value = 'stock';
  $('fWarrantyMonths').value = 12;
  $('assetModal').classList.add('show');
}

function editAsset(id){

  const a = assets.find(
    x => x.id === id
  );

  if(!a) return;

  editingId = id;

  $('assetModalTitle').textContent =
    'Sửa tài sản';

  $('fCode').value =
    assetCode(a);

  $('fType').value =
    assetType(a);

  $('fName').value =
    assetName(a);

  $('fSerial').value =
    assetSerial(a);
$('fCpu').value =
  assetCpu(a);

$('fRam').value =
  assetRam(a);

$('fStorage').value =
  assetStorage(a);

$('fOs').value =
  assetOs(a);
  $('fDept').value =
    assetDept(a);

  $('fUser').value =
    assetUser(a);

  $('fPurchase').value =
    a.purchase_date || '';

  $('fWarrantyMonths').value =
    a.warranty_months || 12;

  $('fStatus').value =
    a.status || 'stock';

  $('fNote').value =
    assetNote(a);

  $('assetModal').classList.add('show');
}
function calcWarrantyEnd(purchaseDate, months){

  if(!purchaseDate) return '';

  const d = new Date(purchaseDate);

  d.setMonth(
    d.getMonth() + Number(months || 0)
  );

  return d.toISOString().split('T')[0];
}

function formAssetPayload(){

  const deptName = $('fDept').value;

  const dept = departments.find(
    d => d.name === deptName
  );

  const purchaseDate =
    $('fPurchase').value;

  const warrantyMonths =
    $('fWarrantyMonths').value;

  return {

    asset_code:
      $('fCode').value.trim(),

    asset_type:
      $('fType').value,

    asset_name:
      $('fName').value.trim(),

    serial_number:
      $('fSerial').value.trim(),

    brand: '',
model: '',

cpu:
  $('fCpu').value.trim(),

ram:
  $('fRam').value.trim(),

storage:
  $('fStorage').value.trim(),

os:
  $('fOs').value.trim(),

    department_id:
      dept ? dept.id : null,

    assigned_to:
      $('fUser').value.trim(),

    purchase_date:
      purchaseDate,

    warranty_months:
      warrantyMonths,

    warranty_end:
      calcWarrantyEnd(
        purchaseDate,
        warrantyMonths
      ),

    status:
      $('fStatus').value,

    note:
      $('fNote').value.trim()
  };
}

async function saveAsset(){
  const payload = formAssetPayload();

  if(!payload.asset_code || !payload.asset_name){
   showToast('Nhập mã tài sản và tên/cấu hình', 'warn', 'Thiếu thông tin');
    return;
  }

  const localItem = {
    id: editingId || Date.now(),
    ...payload,
    department_name: $('fDept').value
  };

  if(editingId){
    assets = assets.map(a => a.id === editingId ? localItem : a);
  }else{
    if(assets.some(a => norm(assetCode(a)) === norm(payload.asset_code))){
      showToast('Mã tài sản đã tồn tại', 'warn', 'Trùng mã tài sản');
      return;
    }

    assets.unshift(localItem);
  }

  closeModal('assetModal');
  renderAll();

 if(editingId){

  await saveRemote('/api/assets/' + editingId, payload, 'PUT');

  showToast(
    'Đã cập nhật tài sản',
    'success',
    'Thành công'
  );

}else{

  await saveRemote('/api/assets', payload, 'POST');

  showToast(
    'Đã thêm tài sản mới',
    'success',
    'Thành công'
  );
}
}

async function deleteAsset(id){
  const ok = await showConfirm('Bạn có chắc muốn xóa tài sản này không?', 'Xóa tài sản');

  if(!ok) return;

  assets = assets.filter(a => a.id !== id);

  renderAll();
  await saveRemote('/api/assets/' + id, null, 'DELETE');

  showToast('Đã xóa tài sản', 'success', 'Thành công');
}

function openRepairModal(){
  editingRepairId = null;

  $('rDate').value = todayISO();
  $('rIssue').value = '';
  $('rTech').value = 'IT';
  $('rCost').value = 0;

  refreshAssetOptions();

  $('repairModal').classList.add('show');
}

function openAssignModal(){

  editingAssignmentId = null;

  $('aDate').value = todayISO();
  $('aUser').value = '';
  $('aNote').value = '';
  $('aType').value = 'Cấp phát';

  refreshAssetOptions();

  $('assignModal').classList.add('show');
}

function closeModal(id){
  $(id).classList.remove('show');
}

async function saveRemote(path, payload, method, reload=true){
  if(!CURRENT_API_BASE) return false;

  try{
    const res = await fetch(CURRENT_API_BASE + path, {
      method,
      headers:{
  'Content-Type':'application/json',
  Authorization:'Bearer ' + IT_TOKEN
},
      body: payload ? JSON.stringify(payload) : undefined
    });

    const data = await res.json();

    if(!res.ok || data.success === false){
      showToast(data.error || 'Không rõ lỗi', 'error', 'Lỗi lưu D1');
      return false;
    }

    if(reload){
      await loadRemote();
      renderAll();
    }

    return true;

  }catch(e){
    showToast(e.message, 'error', 'Không kết nối được API');
    return false;
  }
}
function saveApiBase(){
  CURRENT_API_BASE = $('apiBaseInput').value.trim().replace(/\/$/,'');
  localStorage.setItem('IT_ASSET_API_BASE', CURRENT_API_BASE);
  showToast('Đã lưu API_BASE', 'success', 'Thành công');
}

function exportCsv(){
  const headers = [
    'asset_code',
    'asset_type',
    'asset_name',
    'serial_number',
    'department_name',
    'assigned_to',
    'purchase_date',
    'status',
    'note'
  ];

  const csv = [headers.join(',')]
    .concat(
      assets.map(a => headers.map(h => {
        let value = a[h] || '';

        if(h === 'asset_code') value = assetCode(a);
        if(h === 'asset_type') value = assetType(a);
        if(h === 'asset_name') value = assetName(a);
        if(h === 'serial_number') value = assetSerial(a);
        if(h === 'department_name') value = assetDept(a);
        if(h === 'assigned_to') value = assetUser(a);
        if(h === 'purchase_date') value = assetPurchase(a);

        return '"' + String(value).replaceAll('"','""') + '"';
      }).join(','))
    )
    .join('\n');

  const blob = new Blob(['\ufeff' + csv], {
    type:'text/csv;charset=utf-8'
  });

  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = 'it-assets.csv';
  a.click();

  URL.revokeObjectURL(url);
}

init();
async function importExcel(event){

  const file = event.target.files[0];

  if(!file) return;

  try{

    showToast(
      'Đang đọc file Excel...',
      'info',
      'Import dữ liệu'
    );

    const buffer = await file.arrayBuffer();

    const workbook = XLSX.read(buffer, {
      type:'array'
    });

    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    const rows = XLSX.utils.sheet_to_json(sheet, {
      defval: ''
    });

    if(!rows.length){
      showToast(
        'File Excel không có dữ liệu',
        'warn',
        'Import thất bại'
      );
      return;
    }

    let success = 0;
    let duplicate = 0;
    let fail = 0;

    const existingCodes = new Set(
      assets.map(a => norm(assetCode(a)))
    );

    for(let i = 0; i < rows.length; i++){

      const row = rows[i];

      const code = String(
        row['Mã tài sản'] ||
        row['Mã TS'] ||
        row['Ma tai san'] ||
        row['Ma TS'] ||
        ''
      ).trim();

      const type = String(
        row['Loại'] ||
        row['Loai'] ||
        'PC'
      ).trim();

      const name = String(
        row['Tên tài sản'] ||
        row['Tên'] ||
        row['Ten tai san'] ||
        row['Ten'] ||
        ''
      ).trim();

      const deptName = String(
        row['Phòng ban'] ||
        row['Phong ban'] ||
        ''
      ).trim();

      const dept = departments.find(
        d => norm(d.name) === norm(deptName)
      );

      if(!code || !name){
        fail++;
        continue;
      }

      if(existingCodes.has(norm(code))){
        duplicate++;
        continue;
      }

      const payload = {
        asset_code: code,
        asset_type: type,
        asset_name: name,
        serial_number: String(row['Serial'] || '').trim(),
        brand: String(row['Hãng'] || row['Hang'] || '').trim(),
        model: String(row['Model'] || '').trim(),
        cpu: String(row['CPU'] || '').trim(),
        ram: String(row['RAM'] || '').trim(),
        storage: String(row['Ổ cứng'] || row['O cung'] || row['Storage'] || '').trim(),
        os: String(row['Hệ điều hành'] || row['He dieu hanh'] || row['OS'] || '').trim(),
        department_id: dept ? dept.id : null,
        assigned_to: String(row['Người dùng'] || row['Nguoi dung'] || '').trim(),
        purchase_date: String(row['Ngày mua'] || row['Ngay mua'] || '').trim(),
        warranty_end: String(row['Bảo hành'] || row['Bao hanh'] || '').trim(),
        status: String(row['Trạng thái'] || row['Trang thai'] || 'stock').trim(),
        note: String(row['Ghi chú'] || row['Ghi chu'] || '').trim()
      };

      const ok = await saveRemote(
        '/api/assets',
        payload,
        'POST',
        false
      );

      if(ok){
        success++;
        existingCodes.add(norm(code));
      }else{
        fail++;
      }
    }

    await loadRemote();
    renderAll();

    showToast(
      `Thành công ${success} dòng, trùng ${duplicate}, lỗi ${fail}`,
      success ? 'success' : 'warn',
      'Kết quả import'
    );

  }catch(e){

    showToast(
      e.message,
      'error',
      'Lỗi đọc Excel'
    );

  }

  event.target.value = '';
}
async function loginAdmin(){
  const username = $('loginUser').value.trim();
  const password = $('loginPass').value.trim();

  if(!username || !password){
    showToast('Nhập tài khoản và mật khẩu', 'warn', 'Thiếu thông tin');
    return;
  }

  try{
    const res = await fetch(CURRENT_API_BASE + '/api/login', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({username, password})
    });

    const data = await res.json();

    if(!res.ok || !data.success){
      showToast(data.error || 'Đăng nhập thất bại', 'error', 'Lỗi đăng nhập');
      return;
    }

    IT_TOKEN = data.token;
    localStorage.setItem('IT_TOKEN', IT_TOKEN);

    $('loginScreen').style.display = 'none';

    await loadRemote();
    renderAll();

    showToast('Đăng nhập thành công', 'success', 'Xin chào');

  }catch(e){
    showToast(e.message, 'error', 'Không kết nối được API');
  }
}

function logoutAdmin(){
  localStorage.removeItem('IT_TOKEN');
  IT_TOKEN = '';
  location.reload();
}

function checkLogin(){
  if(!IT_TOKEN){
    $('loginScreen').style.display = 'flex';
  }else{
    $('loginScreen').style.display = 'none';
  }
}
function exportExcel(){

  if(!assets.length){
    showToast(
      'Không có dữ liệu để xuất',
      'warn',
      'Xuất Excel'
    );
    return;
  }

  const now = new Date();

  const title = [
    ['CÔNG TY TNHH MAY XK VIỆT HỒNG'],
    ['BÁO CÁO TÀI SẢN IT'],
    ['Ngày xuất: ' + now.toLocaleDateString('vi-VN')],
    []
  ];

  const headers = [
    'STT',
    'Mã tài sản',
    'Loại',
    'Tên tài sản',
    'Serial',
    'Phòng ban',
    'Người dùng',
    'Ngày mua',
    'Hạn bảo hành',
    'Trạng thái',
    'Ghi chú'
  ];

  const rows = assets.map((a, index) => [
    index + 1,
    assetCode(a),
    assetType(a),
    assetName(a),
    assetSerial(a),
    assetDept(a),
    assetUser(a),
    assetPurchase(a),
    assetWarranty(a),
    ({
  use: 'Đang sử dụng',
  stock: 'Trong kho',
  repair: 'Đang sửa'
}[a.status] || a.status),
    assetNote(a)
  ]);

  const data = [
    ...title,
    headers,
    ...rows
  ];

  const ws = XLSX.utils.aoa_to_sheet(data);

  ws['!cols'] = [
    {wch:6},
    {wch:16},
    {wch:14},
    {wch:42},
    {wch:18},
    {wch:26},
    {wch:22},
    {wch:14},
    {wch:16},
    {wch:16},
    {wch:32}
  ];

  ws['!merges'] = [
    {s:{r:0,c:0}, e:{r:0,c:10}},
    {s:{r:1,c:0}, e:{r:1,c:10}},
    {s:{r:2,c:0}, e:{r:2,c:10}}
  ];

  const wb = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    wb,
    ws,
    'Bao_cao_tai_san_IT'
  );

  const fileName =
    'bao_cao_tai_san_it_' +
    now.getFullYear() + '-' +
    String(now.getMonth() + 1).padStart(2,'0') + '-' +
    String(now.getDate()).padStart(2,'0') +
    '.xlsx';

  XLSX.writeFile(wb, fileName);

  showToast(
    'Đã xuất file Excel',
    'success',
    'Thành công'
  );
}
function calcWarrantyEnd(purchaseDate, months){

  if(!purchaseDate) return '';

  const d = new Date(purchaseDate);

  d.setMonth(
    d.getMonth() + Number(months || 0)
  );

  return d.toISOString().split('T')[0];
}
function assetCpu(a){ return a.cpu ?? ''; }
function assetRam(a){ return a.ram ?? ''; }
function assetStorage(a){ return a.storage ?? ''; }
function assetOs(a){ return a.os ?? ''; }
function repairAssetCode(r){
  return r.asset_code ?? r.asset ?? '';
}

function repairDate(r){
  return r.repair_date ?? r.date ?? '';
}

function repairIssue(r){
  return r.issue ?? '';
}

function repairTech(r){
  return r.technician ?? r.tech ?? '';
}

function repairCost(r){
  return r.cost ?? 0;
}

function repairStatus(r){
  return r.status ?? '';
}

function repairStatusLabel(v){
  if(v === 'processing') return 'Đang xử lý';
  if(v === 'done') return 'Hoàn tất';
  if(v === 'cancel') return 'Hủy';
  return v || '';
}
let editingRepairId = null;

function repairPayload(){
  const code = $('rAsset').value;
  const asset = assets.find(a => assetCode(a) === code);

  return {
    asset_id: asset ? asset.id : null,
    repair_date: $('rDate').value,
    issue: $('rIssue').value.trim(),
    solution: '',
    technician: $('rTech').value.trim() || 'IT',
    cost: Number($('rCost').value || 0),
    status: 'processing',
    note: ''
  };
}

function editRepair(id){
  const r = repairs.find(x => x.id === id);
  if(!r) return;

  editingRepairId = id;

  $('rDate').value = repairDate(r);
  $('rAsset').value = repairAssetCode(r);
  $('rIssue').value = repairIssue(r);
  $('rTech').value = repairTech(r);
  $('rCost').value = repairCost(r);

  $('repairModal').classList.add('show');
}

async function saveRepair(){
  const payload = repairPayload();

  if(!payload.asset_id){
    showToast('Chọn tài sản cần sửa', 'warn', 'Thiếu tài sản');
    return;
  }

  if(!payload.issue){
    showToast('Nhập nội dung lỗi', 'warn', 'Thiếu thông tin');
    return;
  }

  if(editingRepairId){
    await saveRemote('/api/repairs/' + editingRepairId, payload, 'PUT');
    showToast('Đã cập nhật sửa chữa', 'success', 'Thành công');
  }else{
    await saveRemote('/api/repairs', payload, 'POST');
    showToast('Đã ghi nhận sửa chữa', 'success', 'Thành công');
  }

  editingRepairId = null;
  closeModal('repairModal');

  await loadRemote();
  renderAll();
}

async function markRepairDone(id){
  const r = repairs.find(x => x.id === id);
  if(!r) return;

  const ok = await showConfirm('Đánh dấu phiếu sửa chữa này là hoàn tất?', 'Hoàn tất sửa chữa');
  if(!ok) return;

  await saveRemote('/api/repairs/' + id, {
    asset_id: r.asset_id,
    repair_date: repairDate(r),
    issue: repairIssue(r),
    solution: r.solution || '',
    technician: repairTech(r),
    cost: repairCost(r),
    status: 'done',
    note: r.note || ''
  }, 'PUT');

  showToast('Đã hoàn tất sửa chữa', 'success', 'Thành công');

  await loadRemote();
  renderAll();
}

async function deleteRepair(id){
  const ok = await showConfirm('Bạn có chắc muốn xóa phiếu sửa chữa này?', 'Xóa sửa chữa');
  if(!ok) return;

  await saveRemote('/api/repairs/' + id, null, 'DELETE');

  showToast('Đã xóa phiếu sửa chữa', 'success', 'Thành công');

  await loadRemote();
  renderAll();
}
function assignmentAssetCode(a){
  return a.asset_code ?? a.asset ?? '';
}

function assignmentDate(a){
  return a.assigned_date ?? a.date ?? '';
}

function assignmentType(a){
  return a.type ?? '';
}

function assignmentUser(a){
  return a.assigned_to ?? a.user ?? '';
}

function assignmentDept(a){
  return a.department ?? a.dept ?? '';
}

function assignmentNote(a){
  return a.note ?? '';
}
let editingAssignmentId = null;

function assignmentPayload(){

  const code = $('aAsset').value;

  const asset = assets.find(
    a => assetCode(a) === code
  );

  const deptName = $('aDept').value;

  const dept = departments.find(
    d => d.name === deptName
  );

  return {
    asset_id: asset ? asset.id : null,
    assigned_date: $('aDate').value,
    type: $('aType').value,
    assigned_to: $('aUser').value.trim(),
    department: deptName,
    department_id: dept ? dept.id : null,
    note: $('aNote').value.trim()
  };
}

function editAssignment(id){

  const a = assignments.find(
    x => x.id === id
  );

  if(!a) return;

  editingAssignmentId = id;

  $('aDate').value =
    assignmentDate(a);

  $('aAsset').value =
    assignmentAssetCode(a);

  $('aType').value =
    assignmentType(a);

  $('aUser').value =
    assignmentUser(a);

  $('aDept').value =
    assignmentDept(a);

  $('aNote').value =
    assignmentNote(a);

  $('assignModal').classList.add('show');
}

async function saveAssignment(){

  const payload = assignmentPayload();

  if(!payload.asset_id){
    showToast(
      'Chọn tài sản cần cấp phát / thu hồi',
      'warn',
      'Thiếu tài sản'
    );
    return;
  }

  if(payload.type !== 'Thu hồi' && !payload.assigned_to){
    showToast(
      'Nhập người nhận thiết bị',
      'warn',
      'Thiếu người nhận'
    );
    return;
  }

  if(editingAssignmentId){

    await saveRemote(
      '/api/assignments/' + editingAssignmentId,
      payload,
      'PUT'
    );

    showToast(
      'Đã cập nhật phiếu',
      'success',
      'Thành công'
    );

  }else{

    await saveRemote(
      '/api/assignments',
      payload,
      'POST'
    );

    showToast(
      'Đã tạo phiếu',
      'success',
      'Thành công'
    );
  }

  editingAssignmentId = null;

  closeModal('assignModal');

  await loadRemote();
  renderAll();
}

async function deleteAssignment(id){

  const ok = await showConfirm(
    'Bạn có chắc muốn xóa phiếu này?',
    'Xóa phiếu'
  );

  if(!ok) return;

  await saveRemote(
    '/api/assignments/' + id,
    null,
    'DELETE'
  );

  showToast(
    'Đã xóa phiếu',
    'success',
    'Thành công'
  );

  await loadRemote();
  renderAll();
}
