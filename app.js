let CURRENT_API_BASE =
    ['Sửa chữa','IT-PC-014 đang xử lý lỗi ổ cứng'],
    ['Cấp phát','IT-LT-006 cấp cho phòng kế hoạch']
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

function exportCsv(){
  const headers=['code','type','name','serial','dept','user','purchase','status'];

  const csv=[headers.join(',')]
    .concat(
      assets.map(a=>
        headers.map(h=>'"'+String(a[h]||'')+'"').join(',')
      )
    )
    .join('\n');

  const blob = new Blob(['\ufeff'+csv], {
    type:'text/csv;charset=utf-8'
  });

  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = 'it-assets.csv';
  a.click();

  URL.revokeObjectURL(url);
}

function init(){
  $('todayText').textContent = new Date().toLocaleDateString('vi-VN',{
    weekday:'long',
    day:'2-digit',
    month:'2-digit',
    year:'numeric'
  });

  renderKpi();
  renderDashboardTable();
  renderActivity();
}

init();
