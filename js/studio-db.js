/* =========================================================================
   SCOR Studio — طبقة قاعدة البيانات
   تربط الاستوديو بـ scor.* : تصنيف ← جداول ← اختيار وإدراج ← رفع صور ←
   حفظ قالب (تصنيف/موديل) ← لغات (ar/en/de/tr).
   لا تحذف أي وظيفة قائمة: تعمل فوقها وتترك Google Sheets كخيار احتياطي.
   ========================================================================= */
(function () {
  'use strict';

  /* ── مصدر البيانات ────────────────────────────────────────────────
     افتراضياً: ملفات JSON ثابتة في data/ — موقع ثابت بالكامل،
                يُرفع على Netlify بـ git push فقط، بلا خادم ولا قاعدة بيانات.
     اختيارياً: إن ضُبط window.SCOR_API_BASE في js/config.js تذهب الطلبات
                إلى API حقيقي (server.py) كما كان.                    */
  const API = (window.SCOR_API_BASE || '').replace(/\/$/, '');
  /* حفظ القوالب في قاعدة البيانات مباشرة (Supabase) — بلا خادم.
     يعمل إن كان window.SCOR_SUPABASE مضبوطاً في js/config.js. */
  const SB = window.SCOR_SUPABASE || null;
  const DB = !!(SB && SB.url && SB.key);
  window.__scorDbMode = DB;                 // app.js: لا تعلّم القالب «غير محفوظ» عند تبديل التصنيف في وضع القاعدة
  const STATIC = !API && !DB;
  const K_TPL = 'scor_tpl::', K_IMG = 'scor_img::';
  const LS = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; }
                catch (e) { alert('مساحة المتصفح امتلأت — احذف صوراً قديمة أو صدّر القالب.'); return false; } }
  };
  const S = {
    source: localStorage.getItem('scor_source') || 'db',
    lang: localStorage.getItem('scor_lang') || 'ar',
    templates: [],
    cat: null,                          // {code, category, name}
    data: null,                         // نتيجة /api/catalog
    model: '',                          // كود الموديل المختار
    modelTemplate: null,                // قالب موديل محفوظ
    chrome: []                          // ترويسة/تذييل
  };
  const $ = id => document.getElementById(id);
  const api = (p, o) => DB ? dbApi(p, o) : STATIC ? staticApi(p, o) : fetch(API + p, o).then(r => r.json());

  /* ── محوّل Supabase: نفس المسارات ← دوال RPC في القاعدة ─────────── */
  async function rpc(name, args) {
    const r = await fetch(SB.url.replace(/\/$/, '') + '/rest/v1/rpc/' + name, {
      method: 'POST',
      headers: {
        'apikey': SB.key,
        'Authorization': 'Bearer ' + SB.key,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(args || {})
    });
    const txt = await r.text();
    if (!r.ok) throw new Error((JSON.parse(txt || '{}').message) || ('HTTP ' + r.status));
    return txt ? JSON.parse(txt) : null;
  }

  async function dbApi(p, o) {
    const method = (o && o.method) || 'GET';
    const [path, query] = p.split('?');
    const qs = new URLSearchParams(query || '');

    if (method === 'POST') {
      const d = JSON.parse((o && o.body) || '{}');

      if (path === '/api/template/save') {
        const r = await rpc('scor_studio_save', { p: {
          scope: d.scope, category: d.category, model: d.model || null,
          doc_type: d.doc_type || 'bulletin_2p', html: d.html || '',
          pageCount: d.pageCount || 2, hasCover: !!d.hasCover,
          blocks: d.blocks || [], chrome: d.chrome || []
        } });
        return { ok: true, template_id: r.template_id, db: true };
      }

      if (path === '/api/upload') {
        const m = /^data:([^;]+);base64,(.*)$/s.exec(d.dataUrl || '');
        if (!m) return { ok: false, error: 'صيغة صورة غير مفهومة' };
        const r = await rpc('scor_studio_upload', {
          p_data: m[2], p_mime: m[1], p_model: d.model || 'shared',
          p_role: d.role || 'main', p_template: d.template || null,
          p_caption: d.caption || null
        });
        // تُضمَّن الصورة في القالب حتى يبقى مستقلاً عند التصدير
        return { ok: true, asset_id: r.asset_id, path: r.path, public_url: d.dataUrl };
      }
      return { ok: false, error: 'غير مدعوم' };
    }

    if (path === '/api/template') {
      const layout = await rpc('scor_studio_load', {
        p_category: qs.get('category'), p_model: qs.get('model') || null,
        p_doc: qs.get('doc_type') || 'bulletin_2p'
      });
      return { template: layout ? { layout, db: true } : null };
    }

    if (path === '/api/assets') {
      const rows = await rpc('scor_studio_assets', { p_model: qs.get('model') || null });
      return { assets: (rows || []).map(a => ({ role: a.role, asset_id: a.asset_id,
                                                public_url: '', model_code: a.model })) };
    }

    // بقية القراءات من الملفات الثابتة (أسرع ولا تستهلك القاعدة)
    return staticApi(p, o);
  }

  /* ── محوّل الوضع الثابت: نفس المسارات، لكن من ملفات JSON والمتصفح ── */
  async function staticApi(p, o) {
    const method = (o && o.method) || 'GET';
    const [path, query] = p.split('?');
    const qs = new URLSearchParams(query || '');

    if (method === 'POST') {
      const d = JSON.parse((o && o.body) || '{}');

      if (path === '/api/template/save') {
        const doc = d.doc_type || 'bulletin_2p';
        const key = K_TPL + (d.scope === 'model' ? d.model : d.category) + '::' + doc;
        const ok = LS.set(key, {
          html: d.html || '', pageCount: d.pageCount || 2, hasCover: !!d.hasCover,
          blocks: d.blocks || [], chrome: d.chrome || [], savedAt: Date.now()
        });
        return ok ? { ok: true, template_id: key, scope: d.scope || 'category', local: true }
                  : { ok: false, error: 'مساحة التخزين ممتلئة' };
      }

      if (path === '/api/upload') {
        const url = d.dataUrl || '';
        const mb = url.length * 0.75 / 1048576;
        if (mb > 1.5) return { ok: false, error: `الصورة ${mb.toFixed(1)} ميجابايت — اضغطها تحت 1.5 م.ب` };
        const id = 'img' + Date.now();
        const list = LS.get(K_IMG + 'index', []);
        list.push({ id, model: d.model, role: d.role, url, ts: Date.now() });
        if (!LS.set(K_IMG + 'index', list)) return { ok: false, error: 'مساحة التخزين ممتلئة' };
        return { ok: true, asset_id: id, path: id, public_url: url };
      }
      return { ok: false, error: 'غير مدعوم في الوضع الثابت' };
    }

    /* GET */
    const j = async u => {
      const r = await fetch(u, { cache: 'no-cache' });
      if (!r.ok) throw new Error('تعذّر تحميل ' + u);
      return r.json();
    };

    if (path === '/api/templates') return j('data/templates.json');
    if (path === '/api/languages') return j('data/languages.json');
    if (path === '/api/catalog') {
      const cat = qs.get('category'), lang = qs.get('lang') || 'ar';
      try { return await j(`data/catalog/${cat}.${lang}.json`); }
      catch (e) {
        // الملف غير متوفر لهذه اللغة: نعرض العربية ونعلّم ذلك صراحةً (لا سقوط صامت)
        const base = await j(`data/catalog/${cat}.ar.json`);
        return Object.assign(base, { _fallback_from: lang });
      }
    }
    if (path === '/api/template') {
      const doc = qs.get('doc_type') || 'bulletin_2p';
      const who = qs.get('model') || qs.get('category');
      const rec = LS.get(K_TPL + who + '::' + doc, null);
      return { template: rec ? { code: who, layout: rec, local: true } : null };
    }
    if (path === '/api/assets') {
      const model = qs.get('model');
      const all = LS.get(K_IMG + 'index', []);
      return { assets: all.filter(a => !model || a.model === model)
                           .map(a => ({ role: a.role, public_url: a.url, model_code: a.model })) };
    }
    if (path === '/api/health') return { ok: true, mode: 'static' };
    return { error: 'مسار غير معروف: ' + path };
  }

  /* ─────────────────────────── واجهة ─────────────────────────── */

  function injectUI() {
    const side = $('sidebar');
    const box = document.createElement('div');
    box.id = 'dbPanel';
    box.className = 'bg-[#0e1014] p-3 rounded-lg border-2 border-[#22c55e] flex flex-col gap-2 shadow-lg';
    box.innerHTML = `
      <div class="flex justify-between items-center border-b border-[#282c35] pb-1">
        <h2 class="text-[#22c55e] font-black text-xs">🗄️ المصدر: قاعدة البيانات</h2>
        <span id="dbStatus" class="text-[9px] bg-gray-700 text-white px-1.5 py-0.5 rounded">…</span>
      </div>

      <div class="flex gap-1 items-center">
        <label class="text-[10px] text-gray-400">المصدر:</label>
        <select id="dbSource" class="flex-1 pin text-[10px]">
          <option value="db">قاعدة البيانات</option>
          <option value="sheet">Google Sheets</option>
        </select>
        <label class="text-[10px] text-gray-400">اللغة:</label>
        <select id="dbLang" class="pin text-[10px]">
          <option value="ar">العربية</option><option value="en">English</option>
          <option value="de">Deutsch</option><option value="tr">Türkçe</option>
        </select>
      </div>

      <div class="flex gap-1">
        <button id="dbReload" class="pbtn flex-1">⟳ تحديث من القاعدة</button>
        <button id="dbLangApply" class="pbtn flex-1">🌐 توليد باللغة</button>
      </div>

      <div class="border-t border-[#282c35] pt-1">
        <div class="flex justify-between items-center">
          <span class="text-[10px] font-bold text-[#f5b700]">📊 الجداول المتاحة (اختر وأدرج)</span>
          <span id="dbBlockCount" class="text-[9px] text-gray-500"></span>
        </div>
        <div id="dbBlocks" class="flex flex-col gap-1 mt-1 max-h-52 overflow-y-auto pr-1">
          <div class="text-[10px] text-gray-500 text-center py-2">اختر تصنيفاً أولاً</div>
        </div>
      </div>

      <div class="border-t border-[#282c35] pt-1 flex flex-col gap-1">
        <span class="text-[10px] font-bold text-[#22c55e]">💾 حفظ في قاعدة البيانات</span>
        <div class="flex gap-1">
          <button id="dbSaveCat" class="pbtn flex-1">حفظ قالب التصنيف</button>
          <button id="dbSaveModel" class="pbtn flex-1">حفظ قالب الموديل</button>
        </div>
        <div class="text-[9px] text-gray-500" id="dbSaveInfo">—</div>
      </div>

      <div class="border-t border-[#282c35] pt-1 flex flex-col gap-1">
        <span class="text-[10px] font-bold text-[#f5b700]">🖼️ صور النشرة (تُحفظ كروابط)</span>
        <div class="flex gap-1">
          <label class="pbtn flex-1 text-center cursor-pointer">الصورة الرئيسية
            <input type="file" id="dbMainImg" accept="image/*" class="hidden"></label>
          <label class="pbtn flex-1 text-center cursor-pointer">المخطط الهندسي
            <input type="file" id="dbSchemaImg" accept="image/*" class="hidden"></label>
        </div>
        <label class="pbtn text-center cursor-pointer">صورة حرة
          <input type="file" id="dbFreeImg" accept="image/*" class="hidden"></label>
        <div id="dbImgList" class="text-[9px] text-gray-400"></div>
      </div>

      <details class="border-t border-[#282c35] pt-1">
        <summary class="text-[10px] font-bold text-[#f5b700] cursor-pointer">✍️ الترويسة والتذييل (تُحفظ مع القالب)</summary>
        <div class="flex flex-col gap-1 mt-1">
          <input id="ch_brand"   class="pin text-[10px]" placeholder="العلامة (Brand)">
          <input id="ch_address" class="pin text-[10px]" placeholder="العنوان">
          <input id="ch_phones"  class="pin text-[10px]" placeholder="الهاتف">
          <input id="ch_email"   class="pin text-[10px]" placeholder="البريد">
          <input id="ch_site"    class="pin text-[10px]" placeholder="الموقع">
          <input id="ch_note"    class="pin text-[10px]" placeholder="ملاحظة التذييل">
          <button id="chSave" class="pbtn">أدرج في الصفحة + احفظ</button>
        </div>
      </details>
    `;
    side.insertBefore(box, side.children[1] || null);

    $('dbSource').value = S.source;
    $('dbLang').value = S.lang;

    $('dbSource').onchange = e => {
      S.source = e.target.value; localStorage.setItem('scor_source', S.source);
      init();
    };
    $('dbLang').onchange = () => switchLanguage();   // جلب القالب المحفوظ باللغة الجديدة فوراً
    $('dbReload').onclick = () => listTemplates();
    $('dbLangApply').onclick = () => switchLanguage();
    $('dbSaveCat').onclick = () => saveToDB('category');
    $('dbSaveModel').onclick = () => saveToDB('model');
    $('dbMainImg').onchange = e => uploadImage(e, 'main');
    $('dbSchemaImg').onchange = e => uploadImage(e, 'schematic');
    $('dbFreeImg').onchange = e => uploadImage(e, 'free');
    $('chSave').onclick = saveChrome;
  }

  function status(txt, ok) {
    const el = $('dbStatus'); if (!el) return;
    el.textContent = txt;
    el.className = 'text-[9px] px-1.5 py-0.5 rounded ' + (ok ? 'bg-green-700' : 'bg-red-700');
  }

  /* ─────────────────── التصنيفات (قوالب التصنيف) ─────────────────── */

  async function listTemplates() {
    if (S.source === 'sheet') { status('Sheets', true); return; }
    try {
      const r = await api('/api/templates');
      if (!r.templates) throw new Error(r.error || 'no data');
      S.templates = r.templates;
      const sel = $('sheetCategory');
      const cur = sel.value;
      sel.innerHTML = '';
      S.templates.forEach(t => {
        sel.add(new Option(`${t.category_name || t.code} — ${t.code} (${t.models})`, t.code));
      });
      if ([...sel.options].some(o => o.value === cur)) sel.value = cur;
      status(STATIC ? 'جاهز 🟢' : 'متصل 🟢', true);
      onCategoryChanged();
    } catch (e) { status('خطأ 🔴', false); console.warn(e); }
  }

  async function loadCatalog(catCode) {
    const t = S.templates.find(x => x.code === catCode);
    const category = t ? t.category : catCode;
    const r = await api(`/api/catalog?category=${encodeURIComponent(category)}&lang=${S.lang}`);
    if (r.error) throw new Error(r.error);
    S.cat = { code: catCode, category, name: r.category.name_ar };
    S.data = r;
    S.chrome = r.chrome || [];
    syncGlobals(r);
    return r;
  }

  /* تحويل بيانات القاعدة إلى الأشكال التي يفهمها الاستوديو الأصلي */
  function syncGlobals(r) {
    const cat = $('sheetCategory').value;

    // 1) database[cat] = صفوف الموديلات بمفاتيح أكواد الحقول
    Object.keys(database).forEach(k => delete database[k]);
    database[cat] = r.models.map(m => Object.assign({ model_name: m.code, __code: m.code }, m.values));

    // 2) T = الجداول
    Object.keys(T).forEach(k => delete T[k]);
    r.blocks.forEach(b => {
      T[b.key] = {
        title: b.title,
        layout: b.layout || 'kv',
        rows: (b.rows || []).map(([code, label]) => [code, label])
      };
    });

    // 3) CAT_TABLES
    Object.keys(CAT_TABLES).forEach(k => delete CAT_TABLES[k]);
    CAT_TABLES[cat] = r.blocks.map(b => b.key);

    // 4) CAT_TEXT — أول جدولين نصّيين نموذجياً
    Object.keys(CAT_TEXT).forEach(k => delete CAT_TEXT[k]);
    const firstBlock = r.blocks[0];
    CAT_TEXT[cat] = (firstBlock ? firstBlock.rows : []).slice(0, 4);

    // 5) المفاتيح أحادية العمود
    oneColKeys.length = 0;
    r.blocks.filter(b => (b.layout || 'kv') !== 'kv').forEach(b => oneColKeys.push(b.key));

    if (typeof buildTableOptions === 'function') buildTableOptions();
    if (typeof updateModelsList === 'function') updateModelsList();
    renderBlocks(r);
    fillChrome(r);
  }

  function renderBlocks(r) {
    const host = $('dbBlocks'); if (!host) return;
    $('dbBlockCount').textContent = `${r.blocks.length} جدولاً · ${r.models.length} موديل`;
    if (!r.blocks.length) { host.innerHTML = '<div class="text-[10px] text-gray-500 text-center py-2">لا جداول لهذا التصنيف</div>'; return; }
    host.innerHTML = r.blocks.map(b => `
      <div class="flex items-center gap-1 bg-[#181b22] border border-[#343946] rounded px-1.5 py-1">
        <input type="checkbox" data-en="${b.key}" ${b.is_enabled === false ? '' : 'checked'} title="إظهار في النشرة" class="w-3 h-3 accent-[#f5b700]">
        <span class="flex-1 text-[10px] font-bold text-white truncate" title="${b.title}">${b.title}</span>
        <span class="text-[9px] text-gray-500">${(b.rows || []).length}</span>
        <span class="text-[9px] text-gray-600">ص${b.page_no || 1}</span>
        <button class="pbtn text-[9px] px-1 py-0.5" data-ins="${b.key}" data-title="${b.title}">＋</button>
      </div>`).join('');

    host.querySelectorAll('[data-ins]').forEach(btn => {
      btn.onclick = () => insertBlock(btn.dataset.ins, btn.dataset.title);
    });
    host.querySelectorAll('[data-en]').forEach(cb => {
      cb.onchange = () => {
        const b = r.blocks.find(x => x.key === cb.dataset.en);
        if (b) b.is_enabled = cb.checked;
      };
    });
  }

  /* إدراج جدول واحد بالمكان المطلوب — يُعيد استخدام آلية الإدراج الأصلية */
  function insertBlock(key, title) {
    if (S.source === 'db' && (!S.data || !(S.data.blocks || []).some(b => b.key === key))) {
      alert('انتظر تحميل جداول هذا التصنيف ثم أعد المحاولة.');
      return;
    }
    const sel = $('dataSourceSelect');
    const opt = [...sel.options].find(o => o.value === `table:${key}`);
    if (opt) { sel.value = opt.value; }
    else {
      // الجدول غير موجود في القائمة (لغة/تصنيف مختلف) — أضفه مؤقتاً
      const g = $('tableOptGroup');
      const o = document.createElement('option');
      o.value = `table:${key}`; o.textContent = title || key;
      g.appendChild(o); sel.value = o.value;
    }
    $('sectionTitle').value = title || '';
    insertPlaceholder();
  }

  /* ─────────────────────────── اللغة ───────────────────────────
     المبدأ: القالب المحفوظ يُجلب من القاعدة في كل مرة، ثم يُعاد تنسيقه باللغة المختارة:
       • عناوين الجداول وتسميات الصفوف تُستبدل بترجمتها ما دامت نصاً قياسياً
         (النص المكتوب يدوياً لا يُمسّ أبداً).
       • اتجاه الصفحة يتبع اللغة (العربية RTL، والباقي LTR). واجهة الاستوديو تبقى كما هي.
       • الموديل المختار يبقى مختاراً، وتُعاد تعبئة قيمه باللغة الجديدة.
       • النصوص الحرة لا تُترجم آلياً؛ إن كان القالب محفوظاً بلغة أخرى يُعلَن ذلك صراحةً. */

  const LANGS = ['ar', 'en', 'de', 'tr'];
  const LANG_NAME = { ar: 'العربية', en: 'English', de: 'Deutsch', tr: 'Türkçe' };
  const variantCache = {};   // category -> نصوص القياس لكل اللغات (لتمييز النص القياسي من اليدوي)
  let langSeq = 0;           // يمنع تداخل طلبات اللغة المتتالية

  /* كل النصوص القياسية (عناوين، تسميات، قيم) بكل اللغات. إن طابق نص الصفحة أحدها
     فهو نص قياسي فيُستبدل بترجمته؛ وإلا فهو نص مكتوب يدوياً فيُترك كما هو. */
  async function loadVariants(category) {
    if (variantCache[category]) return variantCache[category];
    const res = await Promise.all(LANGS.map(l =>
      api(`/api/catalog?category=${encodeURIComponent(category)}&lang=${l}`).catch(() => null)));
    const v = { titleOf: {}, labelOf: {}, titles: {}, labels: {}, fieldsOf: {}, valueOf: {} };
    res.forEach((r, i) => {
      const lang = LANGS[i];
      if (!r || !r.blocks || r._fallback_from) return;
      v.titleOf[lang] = {}; v.labelOf[lang] = {};
      r.blocks.forEach(b => {
        const rows = {};
        (b.rows || []).forEach(([code, label]) => { rows[code] = label; });
        v.titleOf[lang][b.key] = b.title;
        v.labelOf[lang][b.key] = rows;
        (v.titles[b.key] = v.titles[b.key] || new Set()).add(b.title);
        const lm = (v.labels[b.key] = v.labels[b.key] || new Map());
        Object.entries(rows).forEach(([code, label]) => { if (label) lm.set(label, code); });
        const fs = (v.fieldsOf[b.key] = v.fieldsOf[b.key] || new Set());
        Object.keys(rows).forEach(f => fs.add(f));
      });
      v.valueOf[lang] = {};
      (r.models || []).forEach(m => { v.valueOf[lang][m.code] = m.values || {}; });
    });
    variantCache[category] = v;
    return v;
  }

  /* قيم موديل محدد لكل حقل داخل جدول: نص ← رمز الحقل، بكل اللغات */
  function valueFieldMap(v, model, blockKey) {
    const map = new Map();
    const fields = v.fieldsOf[blockKey] || new Set();
    Object.keys(v.valueOf).forEach(lang => {
      const vals = (v.valueOf[lang] || {})[model]; if (!vals) return;
      fields.forEach(f => {
        const t = vals[f] == null ? '' : String(vals[f]).trim();
        if (t && !map.has(t)) map.set(t, f);
      });
    });
    return map;
  }

  function isStdValue(v, model, field, t) {
    return Object.keys(v.valueOf).some(L => {
      const x = ((v.valueOf[L] || {})[model] || {})[field];
      return x != null && String(x).trim() === t;
    });
  }

  /* يعيد الجداول والنصوص المعروضة إلى ترجمتها القياسية باللغة المختارة */
  function localizePage(lang, v, model) {
    const dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.querySelectorAll('#pagesContainer .a4-page').forEach(p => {
      p.setAttribute('dir', dir); p.dataset.lang = lang;
    });
    if (!v || !v.titleOf[lang]) return;
    const titleOf = v.titleOf[lang], labelOf = v.labelOf[lang];
    const hasModel = !!model && model !== 'shared' && !!(v.valueOf[lang] || {})[model];
    const valsNow = hasModel ? v.valueOf[lang][model] : null;

    // نصوص الحاويات الحرة المرتبطة بحقل (مثل العبارة التسويقية)
    if (hasModel) {
      document.querySelectorAll('#pagesContainer [data-dynamic-type="text"] .dynamic-content').forEach(d => {
        const f = d.closest('[data-dynamic-key]').dataset.dynamicKey;
        const cur = (d.innerText || '').trim();
        if (!cur || valsNow[f] == null) return;
        const same = Object.keys(v.valueOf).some(L => ((v.valueOf[L] || {})[model] || {})[f] === cur);
        if (same) d.innerText = valsNow[f];
      });
    }

    document.querySelectorAll('#pagesContainer [data-dynamic-type="table"]').forEach(el => {
      const key = el.dataset.dynamicKey;
      const h = el.querySelector('.spec-header span');
      if (h && titleOf[key] && v.titles[key] && v.titles[key].has(h.textContent.trim())) {
        h.textContent = titleOf[key];
      }
      const lm = v.labels[key];
      const rowsNow = labelOf[key] || {};
      const vmap = hasModel ? valueFieldMap(v, model, key) : null;

      el.querySelectorAll('.spec-row').forEach(row => {
        // kv: .spec-key + .spec-val ، dims: [قيمة، تسمية، حرف] ، list: قيمة فقط
        const isDims = row.children.length === 3;
        const lab = row.querySelector('.spec-key') || (isDims ? row.children[1] : null);
        const valEl = row.querySelector('.spec-val') || (isDims ? row.children[0] : row.querySelector('span'));
        let field = null;
        if (lab && lm) {
          const code = lm.get(lab.textContent.trim());
          if (code && rowsNow[code]) { lab.textContent = rowsNow[code]; field = code; }
        }
        if (hasModel && valEl) {
          const t = valEl.textContent.trim();
          // نترجم القيمة فقط إن كانت قيمة قياسية معروفة (القيم اليدوية تبقى كما هي)
          let f = null;
          if (t) {
            if (field && isStdValue(v, model, field, t)) f = field;
            else if (vmap) f = vmap.get(t) || null;
          }
          if (f && valsNow[f] != null && String(valsNow[f]).trim() && String(valsNow[f]) !== t) {
            valEl.textContent = String(valsNow[f]);
          }
        }
      });
    });
  }

  /* يجلب القالب المحفوظ: قالب الموديل أولاً ثم قالب التصنيف */
  async function fetchTemplate() {
    if (!S.cat) return null;
    const model = currentModelCode();
    if (model !== 'shared') {
      const r = await api(`/api/template?model=${encodeURIComponent(model)}&category=${encodeURIComponent(S.cat.category)}`);
      if (r.template && r.template.layout && r.template.layout.html) return r.template.layout;
    }
    const r2 = await api(`/api/template?category=${encodeURIComponent(S.cat.category)}`);
    return (r2.template && r2.template.layout && r2.template.layout.html) ? r2.template.layout : null;
  }

  function applyFetched(layout) {
    applyRecord({ html: layout.html, pageCount: layout.pageCount || 2, hasCover: !!layout.hasCover });
  }

  /* يعلن للمستخدم لغة القالب المحفوظ مقارنةً باللغة المعروضة */
  function describeTemplate(srcLang, hasTemplate, fallbackFrom) {
    const parts = [];
    if (fallbackFrom) parts.push(`ملف ${LANG_NAME[fallbackFrom] || fallbackFrom} غير متوفر لهذا التصنيف — عُرضت العربية`);
    if (!hasTemplate) parts.push(`لا يوجد قالب محفوظ لهذا التصنيف بعد — الجداول معروضة بـ${LANG_NAME[S.lang]}`);
    else if (srcLang && srcLang !== S.lang) parts.push(`القالب محفوظ بـ${LANG_NAME[srcLang]} — الجداول والعناوين مترجمة، والنصوص الحرة تبقى كما كتبت`);
    return parts.join(' • ');
  }

  async function switchLanguage() {
    const sel = $('dbLang');
    const seq = ++langSeq;
    const newLang = sel.value;
    if (S.source !== 'db') { S.lang = newLang; localStorage.setItem('scor_lang', newLang); return; }
    if (!S.cat) await listTemplates();
    if (!S.cat) return;

    const prevLang = S.lang;
    const wasDirty = dirty;
    if (wasDirty &&
        !confirm('توجد تعديلات غير محفوظة. تغيير اللغة يجلب القالب المحفوظ من القاعدة، وستُفقد التعديلات غير المحفوظة. المتابعة؟')) {
      sel.value = prevLang; return;
    }
    S.lang = newLang; localStorage.setItem('scor_lang', newLang);
    status('جارٍ جلب ' + LANG_NAME[newLang] + '…', true);

    try {
      const keep = currentModelCode();                    // الموديل المختار يبقى مختاراً
      const r = await loadCatalog(S.cat.code);            // جداول الصنف + موديلاته باللغة الجديدة
      if (seq !== langSeq) return;

      if (keep !== 'shared') {
        const idx = (database[$('sheetCategory').value] || []).findIndex(m => m.__code === keep);
        if (idx >= 0) $('modelSelector').value = String(idx);
      }
      const v = await loadVariants(S.cat.category);
      const layout = await fetchTemplate();
      if (seq !== langSeq) return;

      const srcLang = layout ? srcLangOf(layout.html) : null;
      if (layout) { applyFetched(layout); }
      // لا تعبئة تلقائية هنا: التعبئة بزر «تعبئة» كما هي، ونترجم فقط ما هو معروض
      localizePage(S.lang, v, keep);
      obs.takeRecords();                                  // التنسيق ليس تعديلاً من المستخدم
      setDirty(layout ? false : wasDirty);

      sel.value = S.lang;
      status('لغة: ' + LANG_NAME[S.lang], true);
      $('dbSaveInfo').textContent = describeTemplate(srcLang, !!layout, r._fallback_from) || '—';
    } catch (e) {
      status('خطأ 🔴', false); console.warn(e);
    }
  }
  /* توافق مع الواجهة القديمة */
  const applyLanguage = switchLanguage;

  /* لغة القالب المحفوظ (توسمها الصفحة عند الحفظ، والقوالب القديمة بلا وسم) */
  function srcLangOf(html) {
    try {
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const l = doc.querySelector('.a4-page') && doc.querySelector('.a4-page').dataset.lang;
      return LANG_NAME[l] ? l : null;
    } catch (e) { return null; }
  }

  /* ────────────────────── حفظ / تحميل القوالب ────────────────────── */

  function collectBlocks() {
    const out = [];
    document.querySelectorAll('#pagesContainer [data-dynamic-type="table"]').forEach((el, i) => {
      const page = el.closest('.a4-page');
      const pg = page ? (page.id === 'page-cover' ? 0 : parseInt(page.id.replace('page-', '')) || 1) : 1;
      const pRect = page ? page.getBoundingClientRect() : null;
      const r = el.getBoundingClientRect();
      const pct = v => Math.max(0, Math.min(100, Math.round(v * 10) / 10));
      out.push({
        key: el.dataset.dynamicKey,
        enabled: true,
        page: pg,
        x: pRect ? pct((r.left - pRect.left) / pRect.width * 100) : null,
        y: pRect ? pct((r.top - pRect.top) / pRect.height * 100) : null,
        w: pRect ? pct(r.width / pRect.width * 100) : null,
        h: pRect ? pct(r.height / pRect.height * 100) : null,
        order: i
      });
    });
    return out;
  }

  function collectChrome() {
    const keys = ['brand', 'address', 'phones', 'email', 'site', 'note'];
    const zone = { brand: 'header' };
    return keys.filter(k => $('ch_' + k) && $('ch_' + k).value.trim()).map((k, i) => ({
      zone: zone[k] || 'footer', key: k, label: $('ch_' + k).placeholder,
      value: $('ch_' + k).value.trim(), kind: 'text', order: i
    }));
  }

  async function saveToDB(scope) {
    if (S.source === 'sheet') { alert('المصدر الحالي Google Sheets — بدّل إلى قاعدة البيانات.'); return; }
    const cat = $('sheetCategory').value;
    let model = null;
    if (scope === 'model') {
      model = $('modelSelector').value === '' ? null
        : (database[cat] || [])[parseInt($('modelSelector').value)]?.__code;
      if (!model) { alert('اختر موديلاً أولاً لحفظ قالب خاص به.'); return; }
    }
    try {
      const payload = {
        scope, category: S.cat ? S.cat.category : cat, model,
        doc_type: 'bulletin_2p',
        html: serializePages(),
        pageCount: parseInt($('pageCount').value) || 2,
        hasCover: $('hasCover').checked,
        blocks: collectBlocks(),
        chrome: collectChrome(),
        savedAt: Date.now()
      };
      const r = await api('/api/template/save', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!r.ok) throw new Error(r.error || 'فشل');
      $('dbSaveInfo').textContent =
        `✓ ${scope === 'model' ? 'قالب الموديل «' + model + '»' : 'قالب التصنيف'} — #${r.template_id}`;
      status('محفوظ 🟢', true);
    } catch (e) { alert('فشل الحفظ في القاعدة: ' + e.message); }
  }

  async function loadSavedTemplate() {
    if (S.source === 'sheet' || !S.cat) return false;
    const seq = ++langSeq;                     // طلب أحدث (لغة أو موديل) يلغي هذا الطلب
    try {
      const layout = await fetchTemplate();
      if (seq !== langSeq || !layout) return false;
      const srcLang = srcLangOf(layout.html);
      const v = await loadVariants(S.cat.category);
      if (seq !== langSeq) return false;
      applyFetched(layout);
      localizePage(S.lang, v, currentModelCode());
      obs.takeRecords(); setDirty(false);
      const note = describeTemplate(srcLang, true, null);
      if (note) $('dbSaveInfo').textContent = note;
      return true;
    } catch (e) { return false; }
  }

  /* ─────────────────────────── الصور ─────────────────────────── */

  function currentModelCode() {
    const cat = $('sheetCategory').value;
    const idx = $('modelSelector').value;
    if (idx === '') return 'shared';
    return (database[cat] || [])[parseInt(idx)]?.__code || 'shared';
  }

  async function uploadImage(ev, role) {
    const f = ev.target.files[0]; ev.target.value = '';
    if (!f) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const model = currentModelCode();
        const r = await api('/api/upload', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            dataUrl: reader.result, model, role,
            filename: f.name, ts: Date.now(),
            template: S.cat ? S.cat.code : null,
            caption: role === 'main' ? 'الصورة الرئيسية' : role === 'schematic' ? 'المخطط الهندسي' : 'صورة إضافية',
            sort: role === 'free' ? Date.now() % 1000 : 0
          })
        });
        if (!r.ok) throw new Error(r.error);
        placeImage(r.public_url, role);
        listImages();
      } catch (e) { alert('فشل الرفع: ' + e.message); }
    };
    reader.readAsDataURL(f);
  }

  function placeImage(url, role) {
    const page = pageOf(); if (!page) return;
    const w = document.createElement('div');
    w.className = 'draggable-wrapper';
    const size = role === 'schematic' ? 'width:120mm;height:70mm;top:180mm;left:45mm;'
      : role === 'main' ? 'width:90mm;height:60mm;top:60mm;left:5mm;'
        : 'width:60mm;height:45mm;top:120mm;left:5mm;';
    w.style.cssText = size;
    const img = document.createElement('img');
    img.src = url; img.style.cssText = 'width:100%;height:100%;object-fit:contain;';
    w.appendChild(img);
    page.appendChild(w);
    if (typeof attachResizers === 'function') attachResizers(w);
    if (typeof selectEl === 'function') selectEl(w, null);
  }

  async function listImages() {
    try {
      const r = await api('/api/assets?model=' + encodeURIComponent(currentModelCode()));
      const host = $('dbImgList'); if (!host) return;
      host.innerHTML = (r.assets || []).length
        ? r.assets.map((a, i) => `<div>• ${a.role} — صورة ${i + 1}</div>`).join('')
        : 'لا صور محفوظة لهذا الموديل';
    } catch (e) { }
  }

  /* ─────────────────── الترويسة والتذييل ─────────────────── */

  function fillChrome(r) {
    (r.chrome || []).forEach(ch => {
      const el = $('ch_' + ch.key);
      if (el && !el.value) el.value = ch.value || '';
    });
  }

  function saveChrome() {
    const data = collectChrome();
    if (!data.length) { alert('اكتب قيمة واحدة على الأقل.'); return; }
    const page = pageOf();
    const last = document.querySelectorAll('.a4-page');
    const target = last[last.length - 1] || page;
    const box = document.createElement('div');
    box.className = 'draggable-wrapper';
    box.style.cssText = 'bottom:8mm;right:5mm;width:120mm;';
    box.innerHTML = data.map(d =>
      `<div style="font-size:9px;color:#000;font-weight:700">${d.value}</div>`).join('');
    target.appendChild(box);
    if (typeof attachResizers === 'function') attachResizers(box);
    $('dbSaveInfo').textContent = 'الترويسة/التذييل أُدرجت — اضغط «حفظ» لتثبيتها في القاعدة';
  }

  /* ─────────────────────────── الربط ─────────────────────────── */

  async function onCategoryChanged() {
    if (S.source === 'sheet') return;
    try {
      await loadCatalog($('sheetCategory').value);
      await loadSavedTemplate();
      listImages();
      status('جاهز 🟢', true);
    } catch (e) { status('خطأ 🔴', false); console.warn(e); }
  }

  function hookCategorySelect() {
    const sel = $('sheetCategory');
    const orig = window.onCategoryChange;
    sel.addEventListener('change', () => setTimeout(onCategoryChanged, 50));
  }

  function hookModelSelect() {
    const sel = $('modelSelector');
    sel.addEventListener('change', () => {
      S.model = currentModelCode();
      loadSavedTemplate(); listImages();
    });
  }

  function guardSheetSource() {
    const orig = window.fetchSheetData;
    if (typeof orig !== 'function' || orig.__guarded) return;
    const wrapped = async function () {
      if (S.source === 'db') { status('متصل بقاعدة البيانات 🟢', true); return; }
      return orig.apply(window, arguments);
    };
    wrapped.__guarded = true;
    window.fetchSheetData = wrapped;
  }

  async function init() {
    injectUI();
    guardSheetSource();
    hookCategorySelect();
    hookModelSelect();
    document.documentElement.dir = (S.lang === 'ar') ? 'rtl' : 'ltr';
    if (S.source === 'db') {
      await listTemplates();
    } else {
      status('Sheets', true);
    }
  }

  /* لا نبدأ قبل انتهاء تهيئة الاستوديو (app.js) — وإلا استعاد التطبيق
     قالبه الفارغ فوق القالب المحفوظ في القاعدة/المتصفح. */
  function whenAppReady() {
    return new Promise(resolve => {
      if (window.__scorReady) return resolve();
      window.addEventListener('scor-app-ready', resolve, { once: true });
      setTimeout(resolve, 4000);            // أمان إن تعطّل app.js
    });
  }
  const boot = () => whenAppReady()
    .then(() => new Promise(r => setTimeout(r, 150)))
    .then(() => init())
    .catch(e => console.warn('[SCOR]', e));

  if (document.readyState === 'complete') boot();
  else window.addEventListener('load', boot);

  window.SCOR = { S, api, listTemplates, onCategoryChanged, loadCatalog, applyLanguage, switchLanguage, saveToDB };
})();
