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
    const res = await fetch(CURRENT_API_BASE + '/api/assets');
    if(res.ok){
      const data = await res.json();
      if(Array.isArray(data)) assets = data;
      if(Array.isArray(data.assets)) assets = data.assets;
    }
  }catch(e){
    console.warn('API chưa sẵn sàng, dùng demo data', e);
  }
}

function renderAll(){
  renderKpi();
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
    assetDept(a),
    assetUser(a),
    a.status
  ].join(' ');

  return !q || norm(text).includes(q);
}

function renderDashboardTable(){
  const q = $('dashSearch').value;
  const st = $('dashStatus').value;

  const rows = assets
    .filter(a => matchAsset(a,q))
    .filter(a => !st || a.status === st)
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

  const rows = assets
    .filter(a => matchAsset(a,q))
    .filter(a => !type || assetType(a) === type)
    .filter(a => !dept || assetDept(a) === dept)
    .filter(a => !st || a.status === st);

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
      <td>${r.date}</td>
      <td><b>${r.asset}</b></td>
      <td>${r.issue}</td>
      <td>${r.tech}</td>
      <td>${money(r.cost)}</td>
      <td>${r.status}</td>
    </tr>
  `).join('') || '<tr><td colspan="6">Chưa có sửa chữa</td></tr>';
}

function renderAssignments(){
  $('assignRows').innerHTML = assignments.map(a => `
    <tr>
      <td>${a.date}</td>
      <td><b>${a.asset}</b></td>
      <td>${a.type}</td>
      <td>${a.user}</td>
      <td>${a.dept}</td>
      <td>${a.note || ''}</td>
    </tr>
  `).join('') || '<tr><td colspan="6">Chưa có phiếu</td></tr>';
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

  ['fCode','fName','fSerial','fUser','fPurchase','fNote'].forEach(id => {
    $(id).value = '';
  });

  $('fStatus').value = 'stock';
  $('assetModal').classList.add('show');
}

function editAsset(id){
  const a = assets.find(x => x.id === id);
  if(!a) return;

  editingId = id;

  $('assetModalTitle').textContent = 'Sửa tài sản';

  $('fCode').value = assetCode(a);
  $('fType').value = assetType(a);
  $('fName').value = assetName(a);
  $('fSerial').value = assetSerial(a);
  $('fDept').value = assetDept(a);
  $('fUser').value = assetUser(a);
  $('fPurchase').value = assetPurchase(a);
  $('fStatus').value = a.status;
  $('fNote').value = assetNote(a);

  $('assetModal').classList.add('show');
}

function formAssetPayload(){
  const deptName = $('fDept').value;
  const dept = departments.find(d => d.name === deptName);

  return {
    asset_code: $('fCode').value.trim(),
    asset_type: $('fType').value,
    asset_name: $('fName').value.trim(),
    serial_number: $('fSerial').value.trim(),
    brand: '',
    model: '',
    cpu: '',
    ram: '',
    storage: '',
    os: '',
    department_id: dept ? dept.id : null,
    assigned_to: $('fUser').value.trim(),
    purchase_date: $('fPurchase').value,
    warranty_end: '',
    status: $('fStatus').value,
    note: $('fNote').value.trim()
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
  $('rDate').value = todayISO();
  $('rIssue').value = '';
  $('rCost').value = 0;
  refreshAssetOptions();
  $('repairModal').classList.add('show');
}

function saveRepair(){
  repairs.unshift({
    date: $('rDate').value,
    asset: $('rAsset').value,
    issue: $('rIssue').value,
    tech: $('rTech').value,
    cost: $('rCost').value,
    status: 'Đang xử lý'
  });

  const a = assets.find(x => assetCode(x) === $('rAsset').value);
  if(a) a.status = 'repair';

  closeModal('repairModal');
  renderAll();
}

function openAssignModal(){
  $('aDate').value = todayISO();
  refreshAssetOptions();
  $('assignModal').classList.add('show');
}

function saveAssignment(){
  assignments.unshift({
    date: $('aDate').value,
    asset: $('aAsset').value,
    type: $('aType').value,
    user: $('aUser').value,
    dept: $('aDept').value,
    note: $('aNote').value
  });

  const a = assets.find(x => assetCode(x) === $('aAsset').value);
  if(a){
    a.assigned_to = $('aUser').value;
    a.department_name = $('aDept').value;
    a.status = $('aType').value === 'Thu hồi' ? 'stock' : 'use';
  }

  closeModal('assignModal');
  renderAll();
}

function closeModal(id){
  $(id).classList.remove('show');
}

async function saveRemote(path, payload, method){
  if(!CURRENT_API_BASE) return;

  try{
    const res = await fetch(CURRENT_API_BASE + path, {
      method,
      headers:{'Content-Type':'application/json'},
      body: payload ? JSON.stringify(payload) : undefined
    });

    const data = await res.json();

    if(!res.ok || data.success === false){
      showToast(data.error || 'Không rõ lỗi', 'error', 'Lỗi lưu D1');
      return;
    }

    await loadRemote();
    renderAll();

  }catch(e){
   showToast(e.message, 'error', 'Không kết nối được API');
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
