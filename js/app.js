
// ================= بيانات Google Sheets =================
const SHEETS_ID = "1TDSSCDfAQJxz_zeulBrM6M79p9fw7mE1xTSvD-P_fuQ";
let database = { skid_steers: [], pumps: [] };

// ===== تعريف الجداول (مطابق للشرائح): كل صف [عمود الشيت، التسمية]؛ "a|b" = أول عمود غير فارغ =====
const lst = (p, n) => Array.from({ length: n }, (_, i) => [`${p}_${i + 1}`, '']);
const T = {
  // --- معدات انزلاقية ---
  engine: { title: 'المحرك', rows: [['engine_type','النوع'],['engine_model','الموديل'],['engine_capacity','السعة'],['engine_power','القدرة القصوى'],['engine_torque','عزم الدوران الأقصى'],['engine_emissions','معايير الانبعاثات']] },
  hydraulic: { title: 'النظام الهيدروليكي', rows: [['hydraulic_system_type','نوع النظام'],['main_pump','المضخة الرئيسية'],['standard_flow','التدفق القياسي'],['max_pressure','الضغط الأقصى'],['aux_hydraulic_system','النظام الهيدروليكي الإضافي'],['aux_system_flow','تدفق النظام الإضافي'],['quick_couplers','توصيلات سريعة للملحقات']] },
  drive: { title: 'نظام الحركة', rows: [['drive_type','نوع الدفع'],['travel_speed','سرعة السير القصوى'],['gradeability','قدرة التسلق القصوى'],['tires','الإطارات'],['steering_type','نمط التوجيه']] },
  performance: { title: 'الأداء التشغيلي', rows: [['rated_payload','الحمولة التشغيلية المقدرة'],['bucket_capacity','سعة الدلو القياسية'],['dump_height','ارتفاع التفريغ'],['arm_length','طول الذراع'],['breakout_force','قوة الكسر (الدلو)'],['lifting_capacity','قدرة الرفع القصوى']] },
  performance2: { title: 'الأداء التشغيلي (2)', rows: [['rated_load','الحمولة التشغيلية المقننة'],['std_bucket_capacity','سعة الدلو القياسية'],['operating_weight_2','وزن التشغيل'],['bucket_breakout_force','قوة الكسر (الدلو)'],['max_lifting_force','قوة الرفع القصوى'],['max_travel_speed','سرعة السير القصوى'],['max_gradeability','قدرة التسلق القصوى'],['steering_type_2','نمط التوجيه']] },
  angles: { title: 'زوايا العمل', rows: [['rollback_angle_ground','زاوية إرجاع الدلو عند الأرض'],['max_dump_angle','زاوية التفريغ عند أقصى ارتفاع'],['rear_departure_angle','زاوية الخروج الخلفية'],['front_approach_angle','زاوية الاقتراب الأمامية']] },
  weights: { title: 'السعات والأوزان', rows: [['fuel_tank_capacity','خزان الوقود'],['hydraulic_capacity','النظام الهيدروليكي'],['operating_weight','الوزن التشغيلي']] },
  std_equipment: { title: 'التجهيزات القياسية', layout: 'list', rows: lst('std_equip', 10) },
  opt_equipment: { title: 'التجهيزات الاختيارية', layout: 'list', rows: lst('opt_equip', 6) },
  notes: { title: 'ملاحظات', layout: 'list', rows: lst('note', 3) },
  dimensions: { title: 'الأبعاد الرئيسية', layout: 'dims', rows: ["الطول الكلي مع الدلو", "الطول بدون الدلو", "قاعدة العجلات", "الارتفاع الكلي", "ارتفاع الكابينة", "ارتفاع محور الدوران", "ارتفاع الدلو في أقصى وضع", "ارتفاع التفريغ", "مدى التفريغ", "زاوية إرجاع الدلو عند الرفع", "زاوية التفريغ عند أقصى ارتفاع", "عمق الحفر أسفل مستوى الأرض", "الخلوص الأرضي", "العرض الكلي", "عرض المسار", "عرض الدلو", "عرض الدلو الداخلي", "نصف قطر الدوران الأمامي (بدون دلو)", "نصف قطر الدوران الأمامي (مع دلو)"].map((l, i) => [`dim_${String.fromCharCode(97 + i)}`, l]) },
  // --- مضخات بيتون ---
  general: { title: 'المواصفات العامة', rows: [['general_model','الموديل'],['equipment_type','نوع المعدة'],['general_design','التصميم'],['operating_system','نظام التشغيل'],['general_usage','الاستخدام']] },
  engine_p: { title: 'المحرك', rows: [['engine_type','نوع المحرك'],['engine_model','موديل / تفاصيل المحرك'],['engine_power','القدرة'],['engine_cooling','نظام التبريد'],['engine_start_system','نظام التحكم/التشغيل']] },
  mixer: { title: 'نظام الخلط', rows: [['mixer_type','نوع الخلاط'],['mixer_capacity','سعة الخلاط'],['max_mixing_volume','أقصى حجم للخلط'],['mixing_system','نظام العمل']] },
  dimweights: { title: 'الأبعاد والأوزان', rows: [['dim_length','الطول الكلي'],['dim_width','العرض الكلي'],['dim_height','الارتفاع الكلي'],['total_weight','الوزن الكلي']] },
  pperformance: { title: 'الأداء التشغيلي', rows: [['performance_productivity','الإنتاجية القصوى'],['performance_pressure','أقصى ضغط ضخ'],['pump_vertical_fine','مسافة الضخ الرأسي (ركام ناعم/مونة)'],['pump_horizontal_fine','مسافة الضخ الأفقي (ركام ناعم/مونة)'],['pump_vertical_coarse','مسافة الضخ الرأسي (ركام كبير)'],['pump_horizontal_coarse','مسافة الضخ الأفقي (ركام كبير)'],['max_aggregate_size','أقصى حجم للركام'],['cooling_system_performance','نظام تبريد الزيت']] },
  mechanical: { title: 'النظام الميكانيكي', rows: [['mech_oil_cylinder','أسطوانة الزيت'],['mech_material_cylinder','أسطوانة المادة'],['mech_valve_type','نوع الصمام'],['mech_inner_pipe_diameter','القطر الداخلي للأنبوب']] },
  features: { title: 'الميزات', layout: 'list', rows: lst('feature', 6) }
};
const CAT_TABLES = {
  skid_steers: ['engine','hydraulic','drive','performance','performance2','angles','std_equipment','opt_equipment','weights','notes','dimensions'],
  pumps: ['general','engine_p','mixer','dimweights','pperformance','mechanical','features','notes']
};
const oneColKeys = Object.keys(T).filter(k => (T[k].layout || 'kv') !== 'kv');
const tableOptionsHTML = (cat = currentCat()) => (CAT_TABLES[cat] || []).map(k => `<option value="table:${k}">${T[k].title}</option>`).join('');
const gridOptionsHTML = (cat = currentCat()) => (CAT_TABLES[cat] || []).map(k => `<option value="${k}">${T[k].title}</option>`).join('');
const CAT_TEXT = {
  skid_steers: [['model_name','اسم الموديل (عنوان)'],['marketing_slogan','العبارة التسويقية (نص)'],['short_description','الوصف المختصر (نص)']],
  pumps: [['model_name','اسم الموديل (عنوان)'],['sub_type','النوع الفرعي (نص)'],['marketing_description','الوصف التسويقي (نص)']]
};
function buildTableOptions() {
  $('textOptGroup').innerHTML = (CAT_TEXT[currentCat()] || []).map(([k, t]) => `<option value="text:${k}">${t}</option>`).join('');
  $('tableOptGroup').innerHTML = tableOptionsHTML();
}
const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

async function fetchSheetData() {
  const badge = document.getElementById('dataStatus');
  const load = gid => new Promise((resolve, reject) => Papa.parse(`https://docs.google.com/spreadsheets/d/${SHEETS_ID}/export?format=csv&gid=${gid}`, { download: true, header: true, complete: r => resolve(r.data), error: reject }));
  try {
    [database.skid_steers, database.pumps] = await Promise.all([load(546876457), load(1201691755)]);
    badge.innerHTML = 'متصل بالبيانات 🟢'; badge.className = 'text-xs bg-green-700 text-white px-2 py-1 rounded';
    updateModelsList();
  } catch (e) {
    badge.innerHTML = 'خطأ بالاتصال 🔴'; badge.className = 'text-xs bg-red-700 text-white px-2 py-1 rounded';
  }
}

function updateModelsList() {
  const sel = document.getElementById('modelSelector');
  sel.innerHTML = '';
  const models = database[document.getElementById('sheetCategory').value];
  if (!models || !models.length) { sel.innerHTML = '<option value="">لا يوجد موديلات</option>'; return; }
  models.forEach((row, i) => { if (row.model_name && row.model_name.trim()) sel.add(new Option(row.model_name, i)); });
}

// ================= الترويسة والتذييل =================
let state = { headerImg: '', footerImg: '', lastFooterImg: '' };
['globalHeader:headerImg','globalFooter:footerImg','lastFooter:lastFooterImg'].forEach(s => {
  const [id, key] = s.split(':');
  document.getElementById(id).addEventListener('change', e => {
    const f = e.target.files[0]; if (!f) return;
    const r = new FileReader(); r.onload = ev => { state[key] = ev.target.result; updateHeadersAndFooters(); saveAssets(); }; r.readAsDataURL(f);
  });
});
function updateHeadersAndFooters() {
  document.querySelectorAll('.page-header').forEach(el => { if (state.headerImg) el.style.backgroundImage = `url(${state.headerImg})`; });
  document.querySelectorAll('.is-normal-footer').forEach(el => { if (state.footerImg) el.style.backgroundImage = `url(${state.footerImg})`; });
  document.querySelectorAll('.is-last-footer').forEach(el => {
    const img = state.lastFooterImg || state.footerImg; if (img) el.style.backgroundImage = `url(${img})`;
  });
  obs.takeRecords(); // تطبيق الصور المشتركة لا يُعدّ تعديلاً على القالب
}

// ================= أدوات مساعدة للإنشاء =================
/* pageScale() معرّفة في index.html وتقرأ --page-scale من CSS */
const mmToPx = 3.7795275591;
function pageOf(){ return document.getElementById(`page-${document.getElementById('targetPageSelect').value}`); }
function textBox(cls, html, style) {
  const w = document.createElement('div');
  w.className = 'draggable-wrapper flex flex-col p-2 ' + (cls || '');
  w.style.cssText = style; if (html) w.innerHTML = html;
  return w;
}
function addEl(page, el) { page.appendChild(el); attachResizers(el); selectEl(el, null); }

// ================= إدراج الحاويات الفارغة =================
function insertPlaceholder() {
  const req = document.getElementById('dataSourceSelect').value;
  const title = document.getElementById('sectionTitle').value || document.querySelector(`#dataSourceSelect option[value="${req}"]`).text;
  const page = pageOf(); if (!page) return;
  const [action, key] = req.split(':');

  if (action === 'text') {
    const w = textBox('', '', 'top:50mm;left:5mm;width:140mm;');
    w.dataset.dynamicType = 'text'; w.dataset.dynamicKey = key;
    const t = document.createElement('div');
    t.className = 'dynamic-content outline-none break-words';
    t.style.cssText = "color:#000;font-size:24px;font-weight:700;font-family:'Cairo',sans-serif;";
    t.textContent = `[ حاوية نص: ${title} ]`;
    w.appendChild(t); addEl(page, w);
  } else {
    const c = document.createElement('div');
    c.className = 'free-container';
    c.style.cssText = 'width:97.5mm;height:auto;min-height:30mm;top:100mm;left:5mm;padding:0;background:transparent;border:1px dashed transparent;';
    c.dataset.dynamicType = 'table'; c.dataset.dynamicKey = key;
    const oneCol = oneColKeys.includes(key);
    const msg = key === 'dimensions' ? '[ سيتم تعبئة أبعاد الموديل بدون عناوين للأعمدة ]' : oneCol ? '[ سيتم تعبئة البيانات في عمود واحد هنا تلقائياً ]' : '[ سيتم تعبئة البيانات هنا تلقائياً ]';
    c.innerHTML = `<div class="spec-block w-full h-full" style="--key-width:50%">
      ${oneCol ? '' : '<div class="table-col-resizer no-print" style="right:50%"></div>'}
      <div class="spec-header"><span style="position:relative;z-index:2" contenteditable="true">${esc(title)}</span></div>
      <div class="flex-1 flex flex-col relative"><div class="table-rows-wrapper"><div class="p-4 text-center text-gray-400 font-bold bg-gray-50 flex-1 flex items-center justify-center border-t border-gray-200">${msg}</div></div></div></div>`;
    page.appendChild(c); attachResizers(c);
    const rs = c.querySelector('.table-col-resizer'); if (rs) makeTableColResizable(rs, c.querySelector('.spec-block'));
    selectEl(c, null);
  }
  document.getElementById('sectionTitle').value = '';
}

// ================= التعبئة الآلية =================
function fillAllPlaceholders() {
  const idx = document.getElementById('modelSelector').value;
  if (idx === "") { alert("الرجاء اختيار موديل من القائمة أولاً لتعبئة القالب."); return; }
  const row = database[document.getElementById('sheetCategory').value][idx]; if (!row) return;

  document.querySelectorAll('[data-dynamic-type="text"]').forEach(el => {
    const d = el.querySelector('.dynamic-content'); if (!d) return;
    const v = row[el.dataset.dynamicKey] || '';
    d.innerText = v.trim() ? v : '[ لا توجد بيانات ]';
  });

  const missing = new Set();
  document.querySelectorAll('[data-dynamic-type="table"]').forEach(el => {
    const def = T[el.dataset.dynamicKey], wrapper = el.querySelector('.table-rows-wrapper'); if (!def || !wrapper) return;
    const layout = def.layout || 'kv'; let html = '';
    def.rows.forEach(([k, label], i) => {
      const parts = k.split('|');
      if (!parts.some(x => x in row)) missing.add(parts[0]);
      const v = (parts.map(x => row[x]).find(x => x && x.trim()) || '').trim(); if (!v) return;
      if (layout === 'dims') {
        html += `<div class="spec-row flex-1" style="padding:4px 12px">
          <span contenteditable="true" style="width:22%;text-align:center;border-left:1px solid #e5e7eb;flex-shrink:0">${esc(v)}</span>
          <span contenteditable="true" style="text-align:right;padding-right:10px;flex-grow:1">${esc(label)}</span>
          <span contenteditable="true" style="width:12%;text-align:center;border-right:1px solid #e5e7eb;flex-shrink:0">${String.fromCharCode(65 + i)}</span></div>`;
      } else if (layout === 'list') {
        html += `<div class="spec-row flex-1"><span class="spec-val" contenteditable="true" style="width:100%;text-align:right;padding:4px 10px">${esc(v)}</span></div>`;
      } else {
        html += `<div class="spec-row flex-1"><span class="spec-key" contenteditable="true">${esc(label)}</span><span class="spec-val" contenteditable="true">${esc(v)}</span></div>`;
      }
    });
    wrapper.innerHTML = html || `<div class="p-4 text-center text-red-400 font-bold bg-red-50 flex-1 border-t border-red-200">لا توفر المواصفات لهذا الموديل</div>`;
  });
  if (missing.size) setMsg('أعمدة غير موجودة في الشيت: ' + [...missing].join('، '));
  if (selEl) updatePanel();
}

// ================= حاويات الأعمدة والصور والنصوص =================
const gridChooser = `<div class="flex flex-col gap-1 items-center justify-center h-full no-print bg-gray-100 rounded border border-gray-300 p-2">
  <span class="text-[10px] text-gray-500 font-bold mb-1">إدراج محتوى:</span>
  <button onclick="insertGridContent(this,'text')" class="w-full bg-[#181b22] text-[#f5b700] text-[10px] py-1 rounded">📝 نص</button>
  <button onclick="insertGridContent(this,'image')" class="w-full bg-[#181b22] text-[#f5b700] text-[10px] py-1 rounded">🖼️ صورة</button>
  <button onclick="insertGridContent(this,'table')" class="w-full bg-[#181b22] text-[#f5b700] text-[10px] py-1 rounded">📊 إدراج جدول</button></div>`;

function addFloatingContainer(n) {
  const page = pageOf(); if (!page) return;
  const c = document.createElement('div');
  c.className = 'free-container';
  c.style.cssText = 'width:200mm;height:45mm;top:100mm;left:5mm;';
  const row = document.createElement('div'); row.className = 'grid-row';
  for (let i = 0; i < n; i++) {
    const col = document.createElement('div'); col.className = 'grid-col'; col.innerHTML = gridChooser; row.appendChild(col);
    if (i < n - 1) { const g = document.createElement('div'); g.className = 'col-resizer'; row.appendChild(g); makeColResizable(col, g, row); }
  }
  c.appendChild(row); page.appendChild(c); attachResizers(c); selectEl(c, null);
}

function insertGridContent(btn, type) {
  const col = btn.closest('.grid-col');
  if (type === 'text') {
    col.innerHTML = `<div contenteditable="true" class="w-full h-full outline-none text-sm text-black p-1 break-words">اكتب النص هنا...</div>`;
  } else if (type === 'image') {
    col.innerHTML = `<label class="w-full h-full flex flex-col items-center justify-center bg-gray-50 cursor-pointer text-gray-400 text-xs border-2 border-dashed border-gray-300 hover:bg-gray-100 no-print"><span class="font-bold">+ اختر صورة</span><input type="file" class="hidden" accept="image/*" onchange="loadGridImage(this)"></label>`;
  } else {
    col.innerHTML = `<div class="flex flex-col gap-2 p-2 w-full h-full justify-center bg-gray-50 border border-dashed border-gray-300 no-print">
      <label class="text-xs text-gray-700 font-bold text-center">اختر الجدول المرتبط بالبيانات:</label>
      <select class="grid-table-select text-xs p-1.5 border border-gray-300 rounded w-full outline-none">
        ${gridOptionsHTML()}
      </select>
      <button onclick="insertGridTableConfirmed(this)" class="bg-[#f5b700] text-black text-xs font-bold py-1.5 rounded">تأكيد الإدراج</button>
      <button onclick="cancelGridTable(this)" class="bg-gray-300 text-black text-xs font-bold py-1 rounded">إلغاء</button></div>`;
  }
}
function cancelGridTable(btn) { btn.closest('.grid-col').innerHTML = gridChooser; }

function insertGridTableConfirmed(btn) {
  const col = btn.closest('.grid-col'), sel = col.querySelector('.grid-table-select');
  const key = sel.value, title = sel.options[sel.selectedIndex].text, oneCol = oneColKeys.includes(key);
  col.innerHTML = `<div class="spec-block w-full h-full relative" data-dynamic-type="table" data-dynamic-key="${key}" style="--key-width:50%">
    ${oneCol ? '' : '<div class="table-col-resizer no-print" style="right:50%"></div>'}
    <div class="spec-header"><span style="position:relative;z-index:2" contenteditable="true">${title}</span></div>
    <div class="flex-1 flex flex-col relative"><div class="table-rows-wrapper flex-1 bg-white flex flex-col"><div class="p-4 text-center text-gray-400 text-xs flex-1 flex items-center justify-center border-t border-gray-200">[ سيتم تعبئة ${title} هنا ]</div></div></div></div>`;
  const rs = col.querySelector('.table-col-resizer'); if (rs) makeTableColResizable(rs, col.querySelector('.spec-block'));
}

function loadGridImage(input) {
  const f = input.files[0]; if (!f) return;
  const r = new FileReader();
  r.onload = e => { input.closest('.grid-col').innerHTML = `<img src="${e.target.result}" draggable="false" style="width:100%;height:100%;object-fit:contain;pointer-events:none">`; };
  r.readAsDataURL(f);
}

document.getElementById('freeImageUpload').addEventListener('change', function (e) {
  const f = e.target.files[0], page = pageOf(); if (!f || !page) return;
  const r = new FileReader();
  r.onload = ev => {
    const w = textBox('p-1', '', 'width:100mm;top:100mm;left:5mm;');
    const img = document.createElement('img'); img.src = ev.target.result; img.draggable = false;
    img.style.cssText = 'width:100%;height:100%;object-fit:fill;'; // تمديد حر: الصورة تتبع الصندوق تماماً
    w.appendChild(img); addEl(page, w); e.target.value = '';
  };
  r.readAsDataURL(f);
});

function addFreeText() {
  const page = pageOf(); if (!page) return;
  const w = textBox('', '', 'top:50mm;left:5mm;width:120mm;');
  const t = document.createElement('div');
  t.contentEditable = true; t.className = 'dynamic-content outline-none break-words'; t.innerText = 'نص حر قابل للتعديل...';
  t.style.cssText = "color:#000;font-size:22px;font-weight:700;font-family:'Cairo',sans-serif;";
  w.appendChild(t); addEl(page, w);
}

function addContactBlock() {
  const page = pageOf(); if (!page) return;
  const opt = document.getElementById('contactPresetSelect').selectedOptions[0];
  const text = opt.text, link = opt.value, isPhone = opt.dataset.type === 'phone';
  const w = textBox('items-center justify-center', '', 'top:275mm;left:50mm;width:max-content;');
  const box = document.createElement('div'); box.className = 'flex items-center gap-2 justify-center whitespace-nowrap';
  const base = "color:#000;font-size:18px;font-weight:700;font-family:'Cairo',sans-serif;";
  if (isPhone) {
    box.innerHTML = `<a href="https://wa.me/${link}" target="_blank" class="flex items-center"><svg viewBox="0 0 24 24" width="12" height="12" fill="#25D366"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg></a>
      <a href="tel:+${link}" target="_blank" class="flex items-center"><svg viewBox="0 0 24 24" width="12" height="12" fill="#ef4444"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg></a>`;
    const s = document.createElement('span'); s.className = 'contact-text whitespace-nowrap'; s.style.cssText = base; s.contentEditable = true; s.innerText = text; box.appendChild(s);
  } else {
    const a = document.createElement('a'); a.href = link; a.target = '_blank'; a.className = 'contact-text block w-full text-center whitespace-nowrap'; a.style.cssText = base; a.contentEditable = true; a.innerText = text; box.appendChild(a);
  }
  w.appendChild(box); addEl(page, w);
}

// ================= التحديد + لوحة الخصائص =================
let selEl = null, selSub = null;
const FONTS = { cairo: "'Cairo', sans-serif", scor: "'SCORFont', 'Cairo', sans-serif" };
const $ = id => document.getElementById(id);

function clearSel() { if (selEl) selEl.classList.remove('selected'); selEl = null; selSub = null; updatePanel(); }
function selectEl(el, sub) {
  if (selEl && selEl !== el) selEl.classList.remove('selected');
  selEl = el; selSub = sub; el.classList.add('selected'); updatePanel();
}

// الهدف النصي للوحة: جدول (عبر متغيرات CSS) أو عناصر نصية
function textTargets() {
  const blk = selSub && selSub.closest('.spec-block');
  const b = blk || (!selSub && selEl.dataset.dynamicType === 'table' && selEl.querySelector('.spec-block'));
  if (b) return { block: b };
  const scope = (selSub && selSub.closest('.grid-col')) || selEl;
  return { els: [...scope.querySelectorAll('.dynamic-content,.contact-text,[contenteditable="true"]')].filter(x => !x.closest('.spec-block')) };
}
const rgb2hex = c => '#' + (c.match(/\d+/g) || [0,0,0]).slice(0,3).map(n => (+n).toString(16).padStart(2,'0')).join('');

function syncText() {
  const t = textTargets();
  const s = t.block ? t.block.querySelector('.spec-row span') : t.els[0];
  let color = '#000000', size = 10, weight = '700', fam = 'cairo';
  if (s) {
    const cs = getComputedStyle(s), w = parseInt(cs.fontWeight);
    color = rgb2hex(cs.color); size = Math.round(parseFloat(cs.fontSize)); weight = String([400,600,700,800,900].reduce((a, b) => Math.abs(b - w) < Math.abs(a - w) ? b : a));
    fam = /scor/i.test(cs.fontFamily) ? 'scor' : 'cairo';
  }
  $('pColor').value = color; $('pSize').value = size; $('pWeight').value = weight; $('pFamily').value = fam;
}
function syncGeom() {
  if (!selEl) return;
  $('pW').value = (selEl.offsetWidth / mmToPx).toFixed(1); $('pH').value = (selEl.offsetHeight / mmToPx).toFixed(1);
}
function updatePanel() {
  const has = !!selEl;
  $('propsEmpty').style.display = has ? 'none' : 'block';
  $('propsBody').style.display = has ? 'flex' : 'none';
  if (!has) { $('selLabel').textContent = 'لا يوجد تحديد'; return; }
  const isImg = !!selEl.querySelector(':scope > img');
  $('selLabel').textContent = isImg ? 'صورة' : selEl.querySelector('.grid-row') ? 'حاوية أعمدة' : selEl.dataset.dynamicType === 'table' ? 'جدول' : 'نص';
  $('propsText').style.display = isImg ? 'none' : 'flex';
  if (!isImg) syncText();
  syncGeom();
}

function applyText(prop, val) {
  if (!selEl || val === '') return;
  const t = textTargets(), v = prop === 'size' ? val + 'px' : prop === 'family' ? FONTS[val] : val;
  if (t.block) t.block.style.setProperty({ color:'--t-color', size:'--t-size', weight:'--t-weight', family:'--t-family' }[prop], v);
  else t.els.forEach(el => { el.style[{ color:'color', size:'fontSize', weight:'fontWeight', family:'fontFamily' }[prop]] = v; });
}
function applyAlign(a) {
  if (!selEl) return;
  const t = textTargets();
  (t.block ? [...t.block.querySelectorAll('.spec-row span')] : t.els).forEach(x => x.style.textAlign = a);
}
function zOrder(m) {
  if (!selEl) return;
  const cur = parseInt(getComputedStyle(selEl).zIndex) || 6;
  selEl.style.zIndex = m === 'front' ? 99 : m === 'back' ? 1 : m === 'up' ? cur + 1 : cur - 1;
}
function setGeom(prop, v) { v = parseFloat(v); if (selEl && v > 0) selEl.style[prop] = v * mmToPx + 'px'; }
function delSel() { if (selEl) { selEl.remove(); selEl = null; selSub = null; updatePanel(); } }

document.addEventListener('keydown', e => {
  if (e.key === 'Delete' && selEl && !e.target.isContentEditable && !/INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) delSel();
});

// ================= التحريك والتحجيم: من أي مكان، بلا قيود =================
function attachResizers(el) {
  if (el.querySelector(':scope > .resizer')) return;
  ['t','b','l','r','tl','tr','bl','br'].forEach(p => { const h = document.createElement('div'); h.className = 'resizer ' + p; el.appendChild(h); });
}
function makeBoundedDraggable() {} // للتوافق فقط — التحريك الآن عبر المستمع العام أدناه

const box = $('pagesContainer');
box.addEventListener('dragstart', e => e.preventDefault());

function onDown(e) {
  if (e.button !== undefined && e.button !== 0) return;
  const el = e.target.closest('.draggable-wrapper, .free-container');
  if (!el) { clearSel(); return; }
  const page = el.closest('.a4-page'), rz = e.target.closest('.resizer');
  selectEl(el, rz ? null : e.target.closest('.spec-block, .grid-col'));
  if (rz) startResize(e, el, rz);
  else if (!e.target.closest('button,input,select,label')) startDrag(e, el, page);
}
box.addEventListener('mousedown', onDown);

/* اللمس: نفس المسار — السحب والتحجيم يعملان بالإصبع */
box.addEventListener('touchstart', e => {
  const t = e.touches[0]; if (!t) return;
  const el = e.target.closest('.draggable-wrapper, .free-container');
  if (el && !e.target.closest('button,input,select,label')) e.preventDefault(); // منع تمرير الصفحة أثناء السحب
  onDown({ button: 0, clientX: t.clientX, clientY: t.clientY, target: e.target,
           preventDefault: () => e.preventDefault(), stopPropagation: () => e.stopPropagation() });
}, { passive: false });

function guide(page, cls) {
  let g = page.querySelector('.' + cls);
  if (!g) { g = document.createElement('div'); g.className = cls; page.appendChild(g); }
  return g;
}

function startDrag(e, el, page) {
  const sx = e.clientX, sy = e.clientY, sl = el.offsetLeft, st = el.offsetTop;
  const vG = guide(page, 'snap-guide-v'), hG = guide(page, 'snap-guide-h');
  let moving = false;
  const snap = (pos, size, targets) => {
    for (const a of [0, size / 2, size]) for (const t of targets) if (Math.abs(pos + a - t) < 5) return [t - a, t];
    return null;
  };
  function move(ev) {
    const sc = pageScale();
    const dx = (ev.clientX - sx) / sc, dy = (ev.clientY - sy) / sc;
    if (!moving) {
      if (Math.abs(dx * sc) + Math.abs(dy * sc) < 4) return; // نقرة عادية = تحرير نص
      moving = true; getSelection().removeAllRanges(); document.body.style.userSelect = 'none';
    }
    const w = el.offsetWidth, h = el.offsetHeight;
    let l = sl + dx, t = st + dy;
    const xs = [page.clientWidth / 2], ys = [];
    page.querySelectorAll('.draggable-wrapper,.free-container').forEach(s => {
      if (s === el) return;
      xs.push(s.offsetLeft, s.offsetLeft + s.offsetWidth / 2, s.offsetLeft + s.offsetWidth);
      ys.push(s.offsetTop, s.offsetTop + s.offsetHeight / 2, s.offsetTop + s.offsetHeight);
    });
    vG.style.display = hG.style.display = 'none';
    const sX = snap(l, w, xs), sY = snap(t, h, ys);
    if (sX) { l = sX[0]; vG.style.left = sX[1] + 'px'; vG.style.display = 'block'; }
    if (sY) { t = sY[0]; hG.style.top = sY[1] + 'px'; hG.style.display = 'block'; }
    // حرية كاملة؛ فقط يبقى 20px من العنصر داخل الصفحة حتى لا يضيع
    l = Math.max(20 - w, Math.min(l, page.clientWidth - 20));
    t = Math.max(20 - h, Math.min(t, page.clientHeight - 20));
    el.style.left = l + 'px'; el.style.top = t + 'px';
  }
  function end() {
    vG.style.display = hG.style.display = 'none'; document.body.style.userSelect = '';
    document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', end);
  }
  document.addEventListener('mousemove', move); document.addEventListener('mouseup', end);
  const tm = ev => { const t = ev.touches[0]; if (!t) return; ev.preventDefault(); move(t); };
  const te = () => { end(); document.removeEventListener('touchmove', tm); document.removeEventListener('touchend', te); };
  document.addEventListener('touchmove', tm, { passive: false });
  document.addEventListener('touchend', te);
}

function startResize(e, el, rz) {
  e.preventDefault();
  const pos = ['tl','tr','bl','br','t','b','l','r'].find(p => rz.classList.contains(p));
  const sx = e.clientX, sy = e.clientY, sw = el.offsetWidth, sh = el.offsetHeight, sl = el.offsetLeft, st = el.offsetTop;
  function move(ev) {
    const sc = pageScale();
    const dx = (ev.clientX - sx) / sc, dy = (ev.clientY - sy) / sc;
    let w = sw, h = sh;
    if (pos.includes('r')) w = sw + dx;
    if (pos.includes('l')) w = sw - dx;
    if (pos.includes('b')) h = sh + dy;
    if (pos.includes('t')) h = sh - dy;
    if (pos.length === 2) { const k = Math.max(w / sw, h / sh, 10 / sw, 10 / sh); w = sw * k; h = sh * k; } // الزوايا: نفس النسبة
    w = Math.max(10, w); h = Math.max(10, h);
    el.style.width = w + 'px'; el.style.height = h + 'px';
    if (pos.includes('l')) el.style.left = (sl + sw - w) + 'px';
    if (pos.includes('t')) el.style.top = (st + sh - h) + 'px';
    syncGeom();
  }
  function end() { document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', end); }
  document.addEventListener('mousemove', move); document.addEventListener('mouseup', end);
  const tm = ev => { const t = ev.touches[0]; if (!t) return; ev.preventDefault(); move(t); };
  const te = () => { document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', end);
                     document.removeEventListener('touchmove', tm); document.removeEventListener('touchend', te); };
  document.addEventListener('touchmove', tm, { passive: false });
  document.addEventListener('touchend', te);
}

function makeTableColResizable(resizer, block) {
  let on = false;
  resizer.addEventListener('mousedown', e => { e.preventDefault(); e.stopPropagation(); on = true; document.body.style.cursor = 'col-resize'; });
  document.addEventListener('mousemove', e => {
    if (!on) return;
    const r = block.getBoundingClientRect(), pct = ((r.right - e.clientX) / r.width) * 100;
    if (pct > 15 && pct < 85) { block.style.setProperty('--key-width', pct + '%'); resizer.style.right = pct + '%'; resizer.style.left = 'auto'; }
  });
  document.addEventListener('mouseup', () => { if (on) { on = false; document.body.style.cursor = 'default'; } });
}

function makeColResizable(leftCol, gutter, row) {
  let on = false;
  gutter.addEventListener('mousedown', e => { e.preventDefault(); e.stopPropagation(); on = true; document.body.style.cursor = 'col-resize'; });
  document.addEventListener('mousemove', e => {
    if (!on) return;
    const r = row.getBoundingClientRect(), pct = ((r.right - e.clientX) / r.width) * 100;
    if (pct > 5 && pct < 95) leftCol.style.flex = `0 0 ${pct}%`;
  });
  document.addEventListener('mouseup', () => { if (on) { on = false; document.body.style.cursor = 'default'; } });
}

// ================= القوالب والصفحات =================
const params = new URLSearchParams(location.search);
const DOC = params.get('doc') || 'catalog';                    // معرّف المستند (سيمرّره الـHub لاحقاً)
const DOC_TITLE = params.get('title') || (DOC === 'catalog' ? 'الكتالوج' : DOC);
const currentCat = () => $('sheetCategory').value;
const catName = (c = currentCat()) => [...$('sheetCategory').options].find(o => o.value === c)?.text || c;
const tplKey = (c = currentCat()) => `${DOC}::${c}`;
let lastCat = currentCat(), dirty = false, db = null;

// ---- IndexedDB: templates (key = مستند::تصنيف) + kv (الترويسة والتذييل المشتركة) ----
function idb() {
  return new Promise((res, rej) => {
    const r = indexedDB.open('scor_studio', 1);
    r.onupgradeneeded = () => { r.result.createObjectStore('templates', { keyPath: 'key' }); r.result.createObjectStore('kv'); };
    r.onsuccess = () => { db = r.result; res(); };
    r.onerror = () => rej(r.error);
  });
}
function tx(store, mode, fn) {
  if (!db) return Promise.reject(new Error('التخزين المحلي غير متاح في هذا المتصفح'));
  return new Promise((res, rej) => {
    const t = db.transaction(store, mode), rq = fn(t.objectStore(store));
    t.oncomplete = () => res(rq && rq.result); t.onerror = t.onabort = () => rej(t.error);
  });
}
const dbGet = (st, k) => tx(st, 'readonly', o => o.get(k));
const dbAll = st => tx(st, 'readonly', o => o.getAll());
const dbPut = (st, v, k) => tx(st, 'readwrite', o => k === undefined ? o.put(v) : o.put(v, k));
const saveAssets = () => dbPut('kv', state, 'assets').catch(() => {});

// ---- المراقبة: مؤشر "غير محفوظ" ----
const obs = new MutationObserver(() => setDirty(true));
obs.observe(box, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['style'] });
function setDirty(v) { dirty = v; $('tplDirty').style.display = v ? 'inline' : 'none'; }
window.addEventListener('beforeunload', e => { if (dirty) { e.preventDefault(); e.returnValue = ''; } });

function updateTplUI(rec) {
  $('tplTarget').textContent = `${DOC_TITLE} ← ${catName()}`;
  $('tplStatus').textContent = rec ? 'محفوظ: ' + new Date(rec.savedAt).toLocaleString('ar') + (rec.prev ? ' • توجد نسخة سابقة' : '') : 'لا يوجد قالب محفوظ لهذا التصنيف';
}
const setMsg = t => { $('tplStatus').textContent = t; };

// ---- بناء/تطبيق السجل ----
function serializePages() {
  clearSel();
  const c = box.cloneNode(true);
  c.querySelectorAll('.snap-guide-v,.snap-guide-h').forEach(x => x.remove());
  c.querySelectorAll('.selected').forEach(x => x.classList.remove('selected'));
  // صور الترويسة والتذييل تُحفظ مرة واحدة (مشتركة) ولا تُكرَّر داخل كل قالب
  c.querySelectorAll('.page-header,.is-normal-footer,.is-last-footer').forEach(x => x.style.backgroundImage = '');
  // وسم لغة القالب: يسمح بإعلام المستخدم عند فتح قالب محفوظ بلغة أخرى
  const lang = localStorage.getItem('scor_lang') || 'ar';
  c.querySelectorAll('.a4-page').forEach(p => { p.dataset.lang = lang; });
  return c.innerHTML;
}
const buildRecord = (key, cat) => ({ key, doc: DOC, category: cat, pageCount: parseInt($('pageCount').value) || 1, hasCover: $('hasCover').checked, html: serializePages(), savedAt: Date.now(), v: 1 });
const slimPrev = o => o ? { html: o.html, pageCount: o.pageCount, hasCover: o.hasCover, savedAt: o.savedAt } : undefined;

function rewire() { // إعادة ربط الأحداث بعد تحميل HTML محفوظ
  box.querySelectorAll('.draggable-wrapper, .free-container').forEach(el => attachResizers(el));
  box.querySelectorAll('.spec-block').forEach(b => { const rs = b.querySelector(':scope > .table-col-resizer'); if (rs) makeTableColResizable(rs, b); });
  box.querySelectorAll('.grid-row').forEach(row => row.querySelectorAll('.col-resizer').forEach(g => { if (g.previousElementSibling) makeColResizable(g.previousElementSibling, g, row); }));
}
function applyRecord(rec) {
  clearSel();
  $('pageCount').value = rec.pageCount; $('hasCover').checked = rec.hasCover;
  box.innerHTML = rec.html;
  box.querySelectorAll('.selected').forEach(x => x.classList.remove('selected'));
  const ts = $('targetPageSelect'); ts.innerHTML = '';
  box.querySelectorAll('.a4-page').forEach(p => { const id = p.id.replace('page-', ''); ts.add(new Option(id === 'cover' ? 'الغلاف' : `صفحة ${id}`, id)); });
  updateHeadersAndFooters(); rewire();
  obs.takeRecords(); setDirty(false);
}

// ---- العمليات ----
async function loadCurrentTemplate(switching) {
  let rec = null;
  try { rec = await dbGet('templates', tplKey()); } catch (e) {}
  if (rec) applyRecord(rec);
  else if (switching && !window.__scorDbMode) setDirty(true); // المحتوى الحالي غير محفوظ لهذا التصنيف (وضع التخزين المحلي فقط؛ القاعدة هي المصدر عند توفرها)
  updateTplUI(rec);
  if (!rec && switching) setMsg('لا يوجد قالب لهذا التصنيف — المحتوى الحالي لم يُحفظ له بعد (احفظ لإنشائه)');
}
async function onCategoryChange() {
  const sel = $('sheetCategory');
  if (dirty && !confirm(`توجد تعديلات غير محفوظة على قالب «${catName(lastCat)}». المتابعة دون حفظ؟`)) { sel.value = lastCat; return; }
  lastCat = sel.value;
  buildTableOptions(); updateModelsList();
  await loadCurrentTemplate(true);
}
async function saveTemplate() {
  const key = tplKey();
  try {
    const old = await dbGet('templates', key);
    if (old && !confirm(`يوجد قالب محفوظ لـ«${DOC_TITLE} ← ${catName()}». استبداله؟\n(تبقى نسخة سابقة واحدة للتراجع)`)) return;
    const rec = buildRecord(key, currentCat()); if (old) rec.prev = slimPrev(old);
    await dbPut('templates', rec); setDirty(false); updateTplUI(rec);
  } catch (e) { alert('فشل الحفظ: ' + (e.message || e) + '\nجرّب «تصدير» لحفظ نسخة كملف.'); }
}
async function saveTemplateAs() {
  const opts = [...$('sheetCategory').options].filter(o => o.value !== currentCat());
  const ans = prompt('نسخ القالب الحالي إلى أي تصنيف؟ (اكتب الرقم)\n' + opts.map((o, i) => `${i + 1}) ${o.text}`).join('\n'));
  const o = opts[(parseInt(ans) || 0) - 1]; if (!o) return;
  try {
    const key = tplKey(o.value), old = await dbGet('templates', key);
    if (old && !confirm(`يوجد قالب محفوظ لتصنيف «${o.text}». استبداله؟`)) return;
    const rec = buildRecord(key, o.value); if (old) rec.prev = slimPrev(old);
    await dbPut('templates', rec); setMsg(`تم نسخ القالب إلى «${o.text}». القالب المفتوح الآن ما زال: ${catName()}`);
  } catch (e) { alert('فشل الحفظ: ' + (e.message || e)); }
}
async function revertPrev() {
  try {
    const rec = await dbGet('templates', tplKey());
    if (!rec || !rec.prev) { setMsg('لا توجد نسخة سابقة لهذا القالب'); return; }
    if (!confirm('تحميل النسخة السابقة في المحرر؟ (لن تُثبَّت إلا إذا ضغطت حفظ)')) return;
    applyRecord(rec.prev); setDirty(true); setMsg('عُرضت النسخة السابقة — اضغط حفظ لتثبيتها');
  } catch (e) { alert(e.message || e); }
}
function exportTemplate() {
  const rec = buildRecord(tplKey(), currentCat());
  const out = { format: 'scor-template', v: 1, doc: DOC, category: currentCat(), pageCount: rec.pageCount, hasCover: rec.hasCover, html: rec.html, assets: state, exportedAt: Date.now() };
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(out)], { type: 'application/json' }));
  a.download = `${DOC}-${currentCat()}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
$('tplImport').addEventListener('change', async e => {
  const f = e.target.files[0]; e.target.value = ''; if (!f) return;
  try {
    const d = JSON.parse(await f.text());
    if (d.format !== 'scor-template') throw new Error('الملف ليس قالب SCOR');
    if (dirty && !confirm('سيُستبدل المحتوى الحالي غير المحفوظ. متابعة؟')) return;
    applyRecord(d);
    const a = d.assets || {};
    if (['headerImg', 'footerImg', 'lastFooterImg'].some(k => a[k]) && confirm('استبدال الترويسة والتذييل المشتركة بالموجودة في الملف؟')) {
      ['headerImg', 'footerImg', 'lastFooterImg'].forEach(k => { if (a[k]) state[k] = a[k]; });
      updateHeadersAndFooters(); saveAssets();
    }
    setDirty(true); setMsg(`استُورد القالب إلى «${catName()}» — اضغط حفظ لتثبيته`);
  } catch (err) { alert('تعذّر الاستيراد: ' + err.message); }
});

// ترحيل قالب النسخة القديمة (localStorage) مرة واحدة إن وُجد
async function migrateLegacy() {
  try {
    const lg = localStorage.getItem('scor_master_template_v10');
    if (!lg || (await dbAll('templates')).length) return;
    if (!confirm(`عُثر على قالب محفوظ بالنسخة القديمة. استيراده إلى «${catName()}»؟`)) return;
    const d = JSON.parse(lg);
    if (d.state) ['headerImg', 'footerImg', 'lastFooterImg'].forEach(k => { if (!state[k] && d.state[k]) state[k] = d.state[k]; });
    applyRecord({ html: d.pages, pageCount: d.pageCount, hasCover: d.hasCover });
    saveAssets(); setDirty(true); setMsg('استُورد القالب القديم — اضغط حفظ لتثبيته');
  } catch (e) {}
}

function renderPages() {
  clearSel();
  const ts = $('targetPageSelect'), hasCover = $('hasCover').checked, n = parseInt($('pageCount').value) || 1;
  box.innerHTML = ''; ts.innerHTML = '';
  if (hasCover) { box.appendChild(createPageElement('cover')); ts.add(new Option('الغلاف', 'cover')); }
  for (let i = 1; i <= n; i++) { box.appendChild(createPageElement(i, i === n)); ts.add(new Option(`صفحة ${i}`, i)); }
  updateHeadersAndFooters();
}

function createPageElement(num, isLast = false) {
  const page = document.createElement('div');
  page.className = 'a4-page'; page.id = `page-${num}`;
  const wm = document.createElement('div'); wm.className = 'no-print';
  wm.textContent = num === 'cover' ? 'الغلاف' : `صفحة ${num}`;
  wm.style.cssText = 'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);color:#e5e7eb;font-size:40px;font-weight:900;z-index:0;opacity:0.2;pointer-events:none';
  page.appendChild(wm);
  if (num !== 'cover') {
    const h = document.createElement('div'); h.className = 'page-header'; page.appendChild(h);
    const f = document.createElement('div'); f.className = isLast ? 'is-last-footer' : 'is-normal-footer'; page.appendChild(f);
  }
  return page;
}

async function checkFonts() {
  const names = { 400: 'Regular', 600: 'SemiBold', 700: 'Bold', 800: 'ExtraBold', 900: 'Black' }, bad = [];
  await Promise.all(Object.keys(names).map(async w => { try { const r = await document.fonts.load(`${w} 16px SCORFont`, 'SCOR'); if (!r.length) bad.push(names[w]); } catch (e) { bad.push(names[w]); } }));
  const b = $('fontStatus');
  b.textContent = bad.length ? 'SCOR ✗' : 'SCOR ✓';
  b.className = 'text-xs text-white px-2 py-1 rounded ' + (bad.length ? 'bg-red-700' : 'bg-green-700');
  b.title = bad.length ? 'لم تُحمَّل: ' + bad.join('، ') + ' — ضع ملفات woff2 في مجلد fonts/ بجانب هذا الملف' : 'جميع أوزان SCOR محمّلة';
}

window.onload = async () => {
  try { await idb(); if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); const a = await dbGet('kv', 'assets'); if (a) state = { ...state, ...a }; }
  catch (e) { console.warn(e); }
  buildTableOptions(); checkFonts();
  renderPages(); obs.takeRecords(); setDirty(false);
  await loadCurrentTemplate(false);
  await migrateLegacy();
  // Google Sheets صار خياراً احتياطياً فقط — افتراضياً نقرأ من data/ المحلية
  if (localStorage.getItem('scor_source') === 'sheet') fetchSheetData();
  else {
    const b = document.getElementById('dataStatus');
    if (b) { b.innerHTML = 'جاهز 🟢'; b.className = 'text-xs bg-green-700 text-white px-2 py-1 rounded'; }
  }
  // إشارة لطبقة البيانات: التهيئة اكتملت — الآن يمكن استعادة القالب المحفوظ
  window.__scorReady = true;
  window.dispatchEvent(new Event('scor-app-ready'));
};
