const db = new Dexie('tiketBus');
db.version(1).stores({
    tickets: 'no_tiket, tgl_beli, nama_penumpang, armada, status'
});
db.version(2).stores({
    tickets: 'no_tiket, tgl_beli, nama_penumpang, armada, status, agen_id',
    agen: 'id, nama',
    users: '++id, nama, role, agen_id, pin'
}).upgrade(async function (tx) {
    await tx.table('tickets').toCollection().modify(function (t) { t.agen_id = 'AG001'; });
    await tx.table('agen').add({ id: 'AG001', nama: 'Agen Utama', alamat: '', hp: '[]' });
    await tx.table('users').add({ nama: 'Super Admin', role: 'superadmin', pin: '1234', agen_id: null });
});

async function seedDefaults() {
    if ((await db.agen.count()) === 0) await db.agen.add({ id: 'AG001', nama: 'Agen Utama', alamat: '', hp: '[]' });
    if ((await db.users.count()) === 0) await db.users.add({ nama: 'Super Admin', role: 'superadmin', pin: '1234', agen_id: null });
}

function getSession() { try { return JSON.parse(sessionStorage.getItem('userSession')) || null; } catch (e) { return null; } }
function setSession(u) { sessionStorage.setItem('userSession', JSON.stringify(u)); }
function clearSession() { sessionStorage.removeItem('userSession'); }
function isLoggedIn() { return !!getSession(); }
function isSuperadmin() { var u = getSession(); return u && u.role === 'superadmin'; }
function myAgenId() { var u = getSession(); return u ? u.agen_id : null; }
function requireSession() { if (!isLoggedIn()) { showLogin(); return false; } return true; }

let supabaseClient = null;

function getSupabaseClient() {
    if (supabaseClient) return supabaseClient;
    var url = localStorage.getItem('supabaseUrl') || '';
    var key = localStorage.getItem('supabaseKey') || '';
    if (url && key && typeof supabase !== 'undefined') {
        supabaseClient = supabase.createClient(url, key);
    }
    return supabaseClient;
}

function getDBMode() {
    return localStorage.getItem('dbMode') || 'dexie';
}

function isSupabaseReady() {
    var c = getSupabaseClient();
    return c && localStorage.getItem('supabaseUrl') && localStorage.getItem('supabaseKey');
}

// ---- Dexie adapter ----
const dexieAPI = {
    async read(filters) {
        try {
            if (filters && filters.agen_id) return await db.tickets.where('agen_id').equals(filters.agen_id).toArray();
            return await db.tickets.toArray();
        } catch (err) { console.error('DB Error:', err); showToast('Gagal membaca data.', 'danger'); return null; }
    },
    async create(data) {
        try { await db.tickets.add(data); return { status: 'success' }; }
        catch (err) { console.error('DB Error:', err); showToast('Gagal menyimpan data.', 'danger'); return null; }
    },
    async update(no_tiket, field, value) {
        try { await db.tickets.update(no_tiket, { [field]: value }); return { status: 'success' }; }
        catch (err) { console.error('DB Error:', err); showToast('Gagal mengupdate data.', 'danger'); return null; }
    },
    async delete(no_tiket) {
        try { await db.tickets.delete(no_tiket); return { status: 'success' }; }
        catch (err) { console.error('DB Error:', err); showToast('Gagal menghapus data.', 'danger'); return null; }
    },
    async dummy(agenId) {
        try {
            await db.tickets.clear();
            var names = ['BUDI SANTOSO', 'SITI NURHALIZA', 'AJAT ROSADI', 'DEWI LESTARI', 'HENDRA GUNAWAN', 'RINA MARLINA', 'AGUS SUPRIYATNO', 'SARI DEVI', 'TEGUH PRASETYO', 'ANITA KUSUMA', 'DIMAS ARDIANTO', 'RATNA SARI', 'FAJAR NUGROHO', 'MEGA WATI', 'ADI SAPUTRA', 'LINA MARDIANA', 'BAMBANG HERMANTO', 'YUNI ASTUTI', 'EKO PRASETYO', 'SRI WAHYUNI'];
            var armadas = ['PO JASA MARGA', 'PO SUMBER ALAM', 'PO HARYANTO', 'PO BUDI PRIMA', 'PO GARUDA MAS'];
            var terminals = ['PURWAKARTA', 'KAMPUNG RAMBUTAN', 'LEUWI PANJANG', 'CICAHEUM', 'PURABAYA', 'GIWANGAN', 'TIRTONADI', 'TERBOYO', 'BATUJAYA', 'BANJAR'];
            var kursi = ['A01','A02','A03','A04','A05','B01','B02','B03','C01','C02','D01','D02'];
            var now = new Date();
            for (var i = 0; i < 20; i++) {
                var d = new Date(now);
                d.setDate(d.getDate() - Math.floor(Math.random() * 7));
                var off = d.getTimezoneOffset();
                var tglBeli = new Date(d.getTime() - off * 60000).toISOString().slice(0, 10) + 'T08:' + String(Math.floor(Math.random() * 59)).padStart(2, '0');
                var tglBerangkat = new Date(d.getTime() + 86400000 * (1 + Math.floor(Math.random() * 3))).toISOString().slice(0, 10) + 'T' + String(7 + Math.floor(Math.random() * 12)).padStart(2, '0') + ':' + String(Math.floor(Math.random() * 59)).padStart(2, '0');
                var noTiket = 'TKT-' + tglBeli.slice(0, 10).replace(/-/g, '') + '-' + String(i + 1).padStart(4, '0');
                await db.tickets.add({ no_tiket: noTiket, tgl_beli: tglBeli, nama_penumpang: names[i % names.length], no_hp: String(81200000000 + i + Math.floor(Math.random() * 100)), armada: armadas[i % armadas.length], keberangkatan: terminals[i % terminals.length], kedatangan: terminals[(i + 4) % terminals.length], no_kursi: kursi[i % kursi.length], harga: String(75000 + Math.floor(Math.random() * 200000)), tgl_berangkat: tglBerangkat, pic_agen: 'PETUGAS ' + (Math.floor(i / 4) + 1), status: 'aktif', agen_id: agenId || 'AG001' });
            }
            return { status: 'success' };
        } catch (err) { console.error('DB Error:', err); return { status: 'error', message: err.message }; }
    }
};

// ---- Supabase adapter ----
const supabaseAPI = {
    async read(filters) {
        try {
            var c = getSupabaseClient(); if (!c) return dexieAPI.read(filters);
            var q = c.from('tickets').select('*');
            if (filters && filters.agen_id) q = q.eq('agen_id', filters.agen_id);
            var { data, error } = await q.order('created_at', { ascending: false });
            if (error) throw error;
            return data;
        } catch (err) { console.error('Supabase Error:', err); showToast('Gagal membaca data.', 'danger'); return null; }
    },
    async create(data) {
        try {
            var c = getSupabaseClient(); if (!c) return dexieAPI.create(data);
            var { error } = await c.from('tickets').insert(data);
            if (error) throw error;
            return { status: 'success' };
        } catch (err) { console.error('Supabase Error:', err); showToast('Gagal menyimpan data.', 'danger'); return null; }
    },
    async update(no_tiket, field, value) {
        try {
            var c = getSupabaseClient(); if (!c) return dexieAPI.update(no_tiket, field, value);
            var { error } = await c.from('tickets').update({ [field]: value }).eq('no_tiket', no_tiket);
            if (error) throw error;
            return { status: 'success' };
        } catch (err) { console.error('Supabase Error:', err); showToast('Gagal mengupdate data.', 'danger'); return null; }
    },
    async delete(no_tiket) {
        try {
            var c = getSupabaseClient(); if (!c) return dexieAPI.delete(no_tiket);
            var { error } = await c.from('tickets').delete().eq('no_tiket', no_tiket);
            if (error) throw error;
            return { status: 'success' };
        } catch (err) { console.error('Supabase Error:', err); showToast('Gagal menghapus data.', 'danger'); return null; }
    },
    async dummy(agenId) {
        try {
            var c = getSupabaseClient(); if (!c) return dexieAPI.dummy(agenId);
            // Hapus semua data tickets dari Supabase
            var { error: delErr } = await c.from('tickets').delete().neq('no_tiket', '');
            if (delErr) throw delErr;
            // Generate 20 data contoh
            var names = ['BUDI SANTOSO', 'SITI NURHALIZA', 'AJAT ROSADI', 'DEWI LESTARI', 'HENDRA GUNAWAN', 'RINA MARLINA', 'AGUS SUPRIYATNO', 'SARI DEVI', 'TEGUH PRASETYO', 'ANITA KUSUMA', 'DIMAS ARDIANTO', 'RATNA SARI', 'FAJAR NUGROHO', 'MEGA WATI', 'ADI SAPUTRA', 'LINA MARDIANA', 'BAMBANG HERMANTO', 'YUNI ASTUTI', 'EKO PRASETYO', 'SRI WAHYUNI'];
            var armadas = ['PO JASA MARGA', 'PO SUMBER ALAM', 'PO HARYANTO', 'PO BUDI PRIMA', 'PO GARUDA MAS'];
            var terminals = ['PURWAKARTA', 'KAMPUNG RAMBUTAN', 'LEUWI PANJANG', 'CICAHEUM', 'PURABAYA', 'GIWANGAN', 'TIRTONADI', 'TERBOYO', 'BATUJAYA', 'BANJAR'];
            var kursi = ['A01','A02','A03','A04','A05','B01','B02','B03','C01','C02','D01','D02'];
            var now = new Date();
            var rows = [];
            for (var i = 0; i < 20; i++) {
                var d = new Date(now);
                d.setDate(d.getDate() - Math.floor(Math.random() * 7));
                var off = d.getTimezoneOffset();
                var tglBeli = new Date(d.getTime() - off * 60000).toISOString().slice(0, 10) + 'T08:' + String(Math.floor(Math.random() * 59)).padStart(2, '0');
                var tglBerangkat = new Date(d.getTime() + 86400000 * (1 + Math.floor(Math.random() * 3))).toISOString().slice(0, 10) + 'T' + String(7 + Math.floor(Math.random() * 12)).padStart(2, '0') + ':' + String(Math.floor(Math.random() * 59)).padStart(2, '0');
                var noTiket = 'TKT-' + tglBeli.slice(0, 10).replace(/-/g, '') + '-' + String(i + 1).padStart(4, '0');
                rows.push({ no_tiket: noTiket, tgl_beli: tglBeli, nama_penumpang: names[i % names.length], no_hp: String(81200000000 + i + Math.floor(Math.random() * 100)), armada: armadas[i % armadas.length], keberangkatan: terminals[i % terminals.length], kedatangan: terminals[(i + 4) % terminals.length], no_kursi: kursi[i % kursi.length], harga: String(75000 + Math.floor(Math.random() * 200000)), tgl_berangkat: tglBerangkat, pic_agen: 'PETUGAS ' + (Math.floor(i / 4) + 1), status: 'aktif', agen_id: agenId || 'AG001' });
            }
            var { error: insErr } = await c.from('tickets').insert(rows);
            if (insErr) throw insErr;
            return { status: 'success' };
        } catch (err) { console.error('Supabase Error:', err); return { status: 'error', message: err.message }; }
    }
};

// ---- Active adapter selector ----
function getDB() {
    return getDBMode() === 'supabase' && isSupabaseReady() ? supabaseAPI : dexieAPI;
}

function buildFilters(opts) {
    if (opts && opts.all) return {};
    if (opts && opts.agen_id) return { agen_id: opts.agen_id };
    var user = getSession();
    if (user && user.role === 'pic') return { agen_id: user.agen_id };
    return {};
}

// ---- Public API facade (role-aware) ----
const API = {
    async read(opts) { return getDB().read(buildFilters(opts)); },
    async create(data) {
        var user = getSession();
        if (user) data.agen_id = user.role === 'pic' ? user.agen_id : (data.agen_id || null);
        return getDB().create(data);
    },
    async update(no_tiket, field, value) { return getDB().update(no_tiket, field, value); },
    async delete(no_tiket) { return getDB().delete(no_tiket); },
    async dummy() {
        var user = getSession();
        return getDB().dummy(user && user.role === 'pic' ? user.agen_id : 'AG001');
    }
};

let allTickets = [];
let currentTicket = null;
let laporanAuthed = false;
let currentPage = 1;
const perPage = 10;

function getEl(id) { return document.getElementById(id); }

function getCurrentDatetime() {
    const now = new Date();
    const off = now.getTimezoneOffset();
    const local = new Date(now.getTime() - off * 60000);
    return local.toISOString().slice(0, 16);
}

function getTomorrowDate() {
    const now = new Date();
    now.setDate(now.getDate() + 1);
    const off = now.getTimezoneOffset();
    const local = new Date(now.getTime() - off * 60000);
    return local.toISOString().slice(0, 16);
}

function formatRupiah(n) {
    if (!n && n !== 0) return '';
    return 'RP. ' + parseInt(n).toLocaleString('id-ID') + ',-';
}

function formatTgl(val) {
    if (!val) return '';
    if (typeof val === 'string' && val.includes('T')) {
        const d = new Date(val);
        const date = String(d.getDate()).padStart(2, '0') + '/' +
                     String(d.getMonth() + 1).padStart(2, '0') + '/' +
                     d.getFullYear();
        if (d.getHours() || d.getMinutes()) {
            const time = String(d.getHours()).padStart(2, '0') + ':' +
                         String(d.getMinutes()).padStart(2, '0');
            return date + ' ' + time;
        }
        return date;
    }
    if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}/.test(val)) {
        const p = val.split('-');
        return p[2] + '/' + p[1] + '/' + p[0];
    }
    return String(val);
}

function rupiahInput(e) {
    const raw = e.target.value.replace(/[^0-9]/g, '');
    if (!raw) { e.target.value = ''; return; }
    const num = parseInt(raw, 10);
    e.target.value = 'RP. ' + num.toLocaleString('id-ID') + ',-';
}

async function generateNoTiket() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const prefix = 'TKT-' + y + m + d + '-';

    let next = 1;
    try {
        const all = await API.read({ all: true });
        if (all && all.length) {
            const todayTickets = all.filter(function (t) { return t.no_tiket && t.no_tiket.indexOf(prefix) === 0; });
            if (todayTickets.length) {
                const maxSeq = Math.max.apply(null, todayTickets.map(function (t) { return parseInt(t.no_tiket.slice(-4), 10) || 0; }));
                next = maxSeq + 1;
            }
        }
    } catch (e) { /* fallback */ }

    getEl('no_tiket').value = prefix + String(next).padStart(4, '0');
}

function showConfirm(title, msg, btnLabel, btnClass) {
    return new Promise(function (resolve) {
        getEl('confirmTitle').textContent = title;
        getEl('confirmMessage').textContent = msg;
        var btn = getEl('confirmYes');
        btn.textContent = btnLabel || 'Ya';
        btn.className = 'btn ' + (btnClass || 'btn-danger');
        btn.onclick = function () { closeConfirm(); resolve(true); };
        getEl('overlayConfirm').querySelector('.btn-outline').onclick = function () { closeConfirm(); resolve(false); };
        getEl('overlayConfirm').style.display = 'flex';
    });
}

function closeConfirm() {
    getEl('overlayConfirm').style.display = 'none';
}

function showToast(msg, type) {
    const el = getEl('toast');
    el.textContent = msg;
    el.className = 'toast-notif show ' + type;
    clearTimeout(el._timer);
    el._timer = setTimeout(() => el.classList.remove('show'), 3000);
}

var _savedData = null;

function showTicketSaved(data) {
    _savedData = data;
    getEl('savedNoTiket').textContent = data.no_tiket;
    getEl('savedNama').textContent = data.nama_penumpang;
    getEl('savedArmada').textContent = data.armada;
    getEl('savedRute').textContent = (data.keberangkatan || '-') + ' → ' + (data.kedatangan || '-');
    getEl('savedKursi').textContent = data.no_kursi || '-';
    getEl('savedHarga').textContent = formatRupiah(data.harga);
    getEl('overlaySaved').style.display = 'flex';
}
function closeSavedOverlay() { getEl('overlaySaved').style.display = 'none'; _savedData = null; }

var menuItems = [
    { id: 'tambah',    icon: 'fa-plus-circle',     title: 'Tambah Tiket',    desc: 'Buat tiket baru',              section: 'sectionForm',       color: '#43a047' },
    { id: 'tiket',     icon: 'fa-ticket',           title: 'Daftar Tiket',    desc: 'Lihat, cari & kelola tiket',   section: 'sectionDaftar',     color: '#1565c0' },
    { id: 'laporan',   icon: 'fa-chart-line',       title: 'Laporan',         desc: 'Keuangan & statistik',         section: 'sectionLaporan',    color: '#e65100' },
    { id: 'agen',      icon: 'fa-store',            title: 'Kelola Agen',     desc: 'Tambah/hapus cabang',          section: 'sectionAgen',       color: '#6a1b9a', role: 'superadmin' },
    { id: 'user',      icon: 'fa-users',            title: 'Kelola User',     desc: 'Tambah/hapus operator',        section: 'sectionUser',       color: '#00838f', role: 'superadmin' },
    { id: 'pengaturan',icon: 'fa-gear',             title: 'Pengaturan',      desc: 'Cetak, database & lainnya',    section: 'sectionPengaturan', color: '#546e7a' },
    { id: 'logout',    icon: 'fa-right-from-bracket', title: 'Logout',        desc: 'Keluar dari akun',             action: 'logout',             color: '#c62828' },
];

function renderMenu() {
    var user = getSession();
    var grid = getEl('menuGrid');
    var html = '';
    menuItems.forEach(function (m) {
        if (m.role === 'superadmin' && (!user || user.role !== 'superadmin')) return;
        // Generate gradient from base color
        var c = m.color || '#1565c0';
        var grad = 'linear-gradient(135deg, ' + lighten(c, 30) + ', ' + c + ')';
        var sectionAttr = m.section ? ' data-section="' + m.section + '"' : '';
        var actionAttr = m.action ? ' data-action="' + m.action + '"' : '';
        html += '<div class="menu-card"' + sectionAttr + actionAttr + '>' +
            '<div class="menu-icon" style="background:' + grad + '"><i class="fas ' + m.icon + '"></i></div>' +
            '<span class="menu-title">' + m.title + '</span>' +
            '<p class="menu-desc">' + m.desc + '</p>' +
            '</div>';
    });
    grid.innerHTML = html;
}

// Simple hex color lightener
function lighten(hex, pct) {
    var r = parseInt(hex.slice(1,3), 16), g = parseInt(hex.slice(3,5), 16), b = parseInt(hex.slice(5,7), 16);
    r = Math.min(255, r + Math.round((255 - r) * pct / 100));
    g = Math.min(255, g + Math.round((255 - g) * pct / 100));
    b = Math.min(255, b + Math.round((255 - b) * pct / 100));
    return '#' + [r,g,b].map(function (x) { return x.toString(16).padStart(2,'0'); }).join('');
}

function showSection(id) {
    document.querySelectorAll('.section').forEach(function (s) { s.classList.remove('active'); });
    var el = getEl(id);
    if (el) el.classList.add('active');
    if (id === 'sectionBeranda') renderMenu();
    if (id === 'sectionForm') { generateNoTiket(); }
    if (id === 'sectionDaftar') {
        var user = getSession();
        if (user && user.role === 'superadmin' && getEl('agenFilterTiket').value) loadTicketsWithFilter();
        else loadTickets().then(function () { renderTickets(); });
    }
    if (id === 'sectionLaporan') {
        if (laporanAuthed) { getEl('laporanPinGate').style.display = 'none'; getEl('laporanContent').style.display = ''; renderLaporan(); }
        else { getEl('laporanPinGate').style.display = ''; getEl('laporanContent').style.display = 'none'; }
    }
    if (id === 'sectionPengaturan') {
        loadSettings();
        var user = getSession();
        if (user && user.role === 'superadmin') { renderAgenList(); renderUserList(); }
    }
}

function goHome() {
    showSection('sectionBeranda');
    document.querySelectorAll('.bottom-nav-btn').forEach(function (b) { b.classList.remove('active'); });
    getEl('tabBeranda').classList.add('active');
}

function getFormData() {
    return {
        no_tiket: getEl('no_tiket').value.trim(),
        tgl_beli: getEl('tgl_beli').value,
        nama_penumpang: getEl('nama_penumpang').value.trim().toUpperCase(),
        no_hp: getEl('no_hp').value.trim(),
        armada: getEl('armada').value.trim().toUpperCase(),
        keberangkatan: getEl('keberangkatan').value.trim().toUpperCase(),
        kedatangan: getEl('kedatangan').value.trim().toUpperCase(),
        no_kursi: getEl('no_kursi').value.trim().toUpperCase(),
        harga: getEl('harga').value.replace(/[^0-9]/g, ''),
        tgl_berangkat: getEl('tgl_berangkat').value,
        pic_agen: getEl('pic_agen').value.trim().toUpperCase()
    };
}

function validateForm(d) {
    for (const k in d) {
        if (!d[k]) {
            showToast('Harap isi semua field!', 'warning');
            return false;
        }
    }
    return true;
}

async function handleSubmit(e) {
    e.preventDefault();
    const data = getFormData();
    if (!validateForm(data)) return;
    data.status = 'aktif';

    const btn = getEl('btnSubmit');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menyimpan...';

    const result = await API.create(data);

    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-floppy-disk"></i> Simpan Tiket';

    if (result && result.status === 'success') {
        showTicketSaved(data);
        e.target.reset();
        await generateNoTiket();
        getEl('tgl_beli').value = getCurrentDatetime();
        getEl('tgl_berangkat').value = getTomorrowDate();
        await loadTickets();
        currentPage = 1;
        if (getEl('sectionDaftar').classList.contains('active')) {
            renderTickets();
        }
    } else {
        showToast('Gagal menyimpan tiket. Coba lagi.', 'danger');
    }
}

async function loadTickets() {
    const data = await API.read();
    if (data) allTickets = data;
}

async function loadTicketsWithFilter() {
    var agenId = getEl('agenFilterTiket').value;
    var data = agenId ? await API.read({ agen_id: agenId }) : await API.read();
    if (data) allTickets = data;
    renderTickets();
}

function renderTickets() {
    const kw = (getEl('filterInput').value || '').toLowerCase();

    let filtered = allTickets;
    if (kw) {
        filtered = allTickets.filter(t =>
            (t.no_tiket && t.no_tiket.toLowerCase().includes(kw)) ||
            (t.nama_penumpang && t.nama_penumpang.toLowerCase().includes(kw)) ||
            (t.armada && t.armada.toLowerCase().includes(kw)) ||
            (t.keberangkatan && t.keberangkatan.toLowerCase().includes(kw)) ||
            (t.kedatangan && t.kedatangan.toLowerCase().includes(kw))
        );
    }

    const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
    if (currentPage > totalPages) currentPage = totalPages;

    const start = (currentPage - 1) * perPage;
    const pageData = filtered.slice(start, start + perPage);
    const cardList = getEl('cardTiket');

    if (!filtered.length) {
        const btnHtml = `<button class="btn btn-sm btn-outline" onclick="generateDummy()" style="margin-top:8px;"><i class="fas fa-box-open"></i> Isi Contoh Data</button>`;
        cardList.innerHTML = `<div class="empty-state">
            <div class="icon"><i class="fas fa-ticket"></i></div>
            <p>Belum ada data tiket</p>
            ${btnHtml}
        </div>`;
        getEl('paginationBar').style.display = 'none';
        return;
    }

    cardList.innerHTML = pageData.map(t => `
        <div class="ticket-card ${t.status !== 'aktif' ? 'batal' : ''}">
            <div class="tc-header">
                <span class="tc-no">${esc(t.no_tiket)}</span>
                <span class="badge badge-${t.status === 'aktif' ? 'aktif' : 'batal'}">${esc(t.status)}</span>
            </div>
            <div class="tc-body">
                <div class="row-item"><span class="label">Tgl Beli</span><span class="value">${formatTgl(t.tgl_beli)}</span></div>
                <div class="row-item"><span class="label">Nama</span><span class="value">${esc(t.nama_penumpang)}</span></div>
                <div class="row-item"><span class="label">Armada</span><span class="value">${esc(t.armada)}</span></div>
                <div class="row-item"><span class="label">Rute</span><span class="value">${esc(t.keberangkatan)} → ${esc(t.kedatangan)}</span></div>
                <div class="row-item"><span class="label">Kursi</span><span class="value">${esc(t.no_kursi)}</span></div>
                <div class="row-item"><span class="label">Harga</span><span class="value">${formatRupiah(t.harga)}</span></div>
            </div>
            <div class="tc-actions">
                <button class="btn btn-sm btn-primary" title="Cetak Tiket" data-print="${esc(t.no_tiket)}"><i class="fas fa-print"></i> Cetak</button>
                ${t.status === 'aktif'
                    ? `<button class="btn btn-sm btn-warning" title="Batalkan Tiket" data-cancel="${esc(t.no_tiket)}"><i class="fas fa-ban"></i> Batal</button>`
                    : ''}
                <button class="btn btn-sm btn-danger" title="Hapus Tiket" data-delete="${esc(t.no_tiket)}"><i class="fas fa-trash-can"></i> Hapus</button>
            </div>
        </div>
    `).join('');

    getEl('paginationBar').style.display = totalPages > 1 ? '' : 'none';
    getEl('pageInfo').textContent = 'Halaman ' + currentPage + ' dari ' + totalPages;
    getEl('pagePrev').disabled = currentPage <= 1;
    getEl('pageNext').disabled = currentPage >= totalPages;
}

function esc(s) {
    if (!s) return '';
    const d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
}

async function cancelTicket(noTiket) {
    var ok = await showConfirm('Batalkan Tiket', 'Batalkan tiket ' + noTiket + '?', 'Ya, Batalkan', 'btn-warning');
    if (!ok) return;
    const r = await API.update(noTiket, 'status', 'batal');
    if (r && r.status === 'success') {
        showToast(`Tiket ${noTiket} dibatalkan`, 'success');
        await loadTickets();
        currentPage = 1;
        renderTickets();
    } else {
        showToast('Gagal membatalkan tiket', 'danger');
    }
}

async function deleteTicket(noTiket) {
    var ok = await showConfirm('Hapus Tiket', 'Hapus tiket ' + noTiket + '? Tindakan ini tidak bisa dibatalkan.', 'Ya, Hapus', 'btn-danger');
    if (!ok) return;
    const r = await API.delete(noTiket);
    if (r && r.status === 'success') {
        showToast(`Tiket ${noTiket} dihapus`, 'success');
        await loadTickets();
        currentPage = 1;
        renderTickets();
    } else {
        showToast('Gagal menghapus tiket', 'danger');
    }
}

async function generateDummy() {
    var ok = await showConfirm('Isi Data Contoh', 'Semua data yang ada akan dihapus dan diganti 20 data contoh. Lanjutkan?', 'Ya, Lanjutkan', 'btn-primary');
    if (!ok) return;

    const btn = document.querySelector('.empty-state .btn');
    if (btn) { btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Memuat...'; }

    const r = await API.dummy();
    if (r && r.status === 'success') {
        showToast('Data contoh berhasil dibuat!', 'success');
        await loadTickets();
        currentPage = 1;
        renderTickets();
    } else {
        showToast('Gagal membuat data contoh.', 'danger');
    }
    if (btn) { btn.innerHTML = '<i class="fas fa-box-open"></i> Isi Contoh Data'; }
}

let currentPrintNoTiket = null;

function up(v) { return esc(v).toUpperCase(); }

function buildTicketHTML(t) {
    const namaAgen = localStorage.getItem('namaAgen') || 'LOKET BUS';
    const alamatAgen = localStorage.getItem('alamatAgen') || '';
    const hpAgenList = getHpList();

    let headerInfo = `<h3 style="font-weight:700">${up(namaAgen)}</h3>`;
    if (alamatAgen) headerInfo += `<p class="text-center" style="font-weight:700;font-size:8px;margin:0.5mm 0;">${up(alamatAgen)}</p>`;
    hpAgenList.forEach(function (h) {
        if (h) headerInfo += `<p class="text-center" style="font-weight:700;font-size:8px;margin:0.5mm 0;">📞 ${esc(h)}</p>`;
    });

    const f = (label, val) =>
        `<p style="margin:0;">${label} :</p><p style="font-weight:700;margin:0 0 2px 0;">${val}</p>`;

    const rules =
        `<p style="font-weight:700;font-size:7.5px;line-height:1.5;margin:0;">• Dilarang membawa hewan / satwa, bahan kimia, sejenis narkotika, senjata tajam, dan lain-lain.<br>• Barang-barang dan surat berharga (emas, sertifikat, dsb) menjadi tanggungan sendiri.<br>• Bagasi penumpang max. 20 kg / penumpang.</p>`;

    return `
        <div class="bagian-tiket">
            ${headerInfo}
            <hr>
            ${f('No Tiket', up(t.no_tiket))}
            ${f('Tgl Beli', formatTgl(t.tgl_beli))}
            <hr>
            ${f('Penumpang', up(t.nama_penumpang))}
            ${f('No HP', esc(t.no_hp))}
            <hr>
            ${f('Armada', up(t.armada))}
            ${f('Keberangkatan', up(t.keberangkatan))}
            ${f('Terminal Tujuan', up(t.kedatangan))}
            ${f('Kursi', up(t.no_kursi))}
            <hr>
            ${f('Harga', formatRupiah(t.harga))}
            ${f('Berangkat', formatTgl(t.tgl_berangkat))}
            ${f('PIC Agen', up(t.pic_agen))}
            <hr>
            ${rules}
            <hr>
            <p class="text-center" style="font-weight:700;">TERIMA KASIH</p>
            <p class="text-center" style="font-weight:700;font-size:8px;">— ${up(namaAgen)} —</p>
        </div>

        <div class="separator-gunting"><span>✂</span></div>

        <div class="bagian-tiket">
            <h3 style="font-weight:700">VOUCHER MAKAN</h3>
            <hr>
            ${f('Tiket', up(t.no_tiket))}
            ${f('Nama', up(t.nama_penumpang))}
            ${f('Armada', up(t.armada))}
            <hr>
            ${f('Harga', formatRupiah(t.harga))}
            ${f('Berangkat', formatTgl(t.tgl_berangkat))}
            <hr>
            <p class="text-center" style="font-weight:700;">— SELAMAT MENIKMATI —</p>
        </div>

        ${localStorage.getItem('showArsip') !== 'false' ? `
        <div class="separator-gunting"><span>✂</span></div>

        <div class="bagian-tiket">
            <h3 style="font-weight:700">ARSIP AGEN</h3>
            <hr>
            ${f('No Tiket', up(t.no_tiket))}
            ${f('Tgl Beli', formatTgl(t.tgl_beli))}
            ${f('Penumpang', up(t.nama_penumpang))}
            ${f('No HP', esc(t.no_hp))}
            ${f('Armada', up(t.armada))}
            ${f('Keberangkatan', up(t.keberangkatan))}
            ${f('Terminal Tujuan', up(t.kedatangan))}
            ${f('Kursi', up(t.no_kursi))}
            ${f('Harga', formatRupiah(t.harga))}
            ${f('Berangkat', formatTgl(t.tgl_berangkat))}
            ${f('PIC Agen', up(t.pic_agen))}
            <hr>
            <div class="arsip-watermark" style="font-weight:700;">* * * ARSIP * * *</div>
            <p class="text-center" style="font-weight:700;">(TIDAK UNTUK BOARDING)</p>
        </div>
        ` : ''}
    `;
}

function printTicket(noTiket) {
    const t = allTickets.find(x => x.no_tiket === noTiket);
    if (!t) { showToast('Data tiket tidak ditemukan', 'danger'); return; }

    currentPrintNoTiket = noTiket;

    const width = localStorage.getItem('printWidth') || '58';
    const preview = getEl('previewBody');
    preview.innerHTML = `<div class="preview-ticket-wrap" style="width:${width}mm;box-sizing:border-box;">${buildTicketHTML(t)}</div>`;
    getEl('overlayCetak').style.display = 'flex';
}

function closePreview() {
    getEl('overlayCetak').style.display = 'none';
}

function doPrint(widthClass) {
    const styleId = 'print-page-style';
    const old = document.getElementById(styleId);
    if (old) old.remove();

    const w = localStorage.getItem('printWidth') || '58';
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `@page { size: ${w}mm auto; margin: 0; }`;
    document.head.appendChild(style);

    document.body.classList.add(widthClass);
    setTimeout(() => {
        window.print();
        document.body.classList.remove(widthClass);
        const s = document.getElementById(styleId);
        if (s) s.remove();
    }, 300);
}

function confirmPrint() {
    const t = allTickets.find(x => x.no_tiket === currentPrintNoTiket);
    if (!t) return;
    getEl('area-cetak-tiket').innerHTML = buildTicketHTML(t);
    closePreview();
    doPrint('print-' + (localStorage.getItem('printWidth') || '58') + 'mm');
}

function downloadPDF() {
    const t = allTickets.find(x => x.no_tiket === currentPrintNoTiket);
    if (!t) return;
    showToast('Mengunduh PDF...', 'info');

    const w = parseInt(localStorage.getItem('printWidth') || '58');
    const orig = getEl('previewBody').querySelector('.preview-ticket-wrap');
    if (!orig) return;
    closePreview();

    const tmp = orig.cloneNode(true);
    tmp.style.cssText = 'width:' + w + 'mm;margin:0 auto;background:#fff;';
    document.body.appendChild(tmp);

    setTimeout(function () {
        const h = Math.ceil((tmp.offsetHeight / tmp.offsetWidth) * w) + 3;
        html2pdf(tmp, {
            margin: 0,
            filename: (t.no_tiket || 'tiket') + '.pdf',
            image: { type: 'jpeg', quality: 0.95 },
            html2canvas: { scale: 2, useCORS: true, logging: true },
            jsPDF: { unit: 'mm', format: [w, h], orientation: 'portrait' }
        }).catch(function (e) {
            console.error('html2pdf error:', e);
        }).then(function () {
            document.body.removeChild(tmp);
        });
    }, 200);
}

function handleTableClick(e) {
    const target = e.target.closest('button');
    if (!target) return;

    const noTiket = target.dataset.print || target.dataset.cancel || target.dataset.delete;

    if (target.dataset.print) printTicket(noTiket);
    else if (target.dataset.cancel) cancelTicket(noTiket);
    else if (target.dataset.delete) deleteTicket(noTiket);
}

function updateHeader() {
    const nama = localStorage.getItem('namaAgen') || 'LOKET BUS';
    const alamat = localStorage.getItem('alamatAgen') || '';
    const hpList = getHpList();

    const el = getEl('headerContent');
    let html = `<h1><i class="fas fa-bus"></i> ${esc(nama)}</h1>`;
    if (alamat) html += `<p class="header-alamat"><i class="fas fa-location-dot"></i> ${esc(alamat)}</p>`;
    if (hpList.length) {
        html += '<p class="header-hp">';
        hpList.forEach(function (h, i) {
            if (i > 0) html += '<span class="hp-sep">•</span>';
            html += `<i class="fas fa-phone"></i> ${esc(h)}`;
        });
        html += '</p>';
    }
    el.innerHTML = html;
    document.title = nama;
}

// ===== LOGIN SYSTEM =====
function showLogin() {
    getEl('overlayLogin').style.display = 'flex';
    getEl('loginPinSection').style.display = 'none';
    getEl('loginUserList').style.display = '';
    renderLoginUsers();
    document.body.style.paddingTop = '0';
}

function closeLogin() {
    getEl('overlayLogin').style.display = 'none';
    document.body.style.paddingTop = '';
}

async function renderLoginUsers() {
    var list = getEl('loginUserList');
    try {
        var users = await db.users.toArray();
        if (!users || !users.length) {
            list.innerHTML = '<p style="color:var(--text-hint);text-align:center;">Belum ada user. Hubungi super admin.</p>';
            return;
        }
        list.innerHTML = users.map(function (u) {
            return '<div class="login-user-item" data-user-id="' + u.id + '" data-user-nama="' + esc(u.nama) + '" data-user-role="' + u.role + '" data-user-agen="' + (u.agen_id || '') + '">' +
                '<div class="login-user-avatar"><i class="fas fa-user"></i></div>' +
                '<div class="login-user-info"><strong>' + esc(u.nama) + '</strong><small>' + (u.role === 'superadmin' ? 'Super Admin' : 'PIC - ' + esc(u.agen_id || '')) + '</small></div>' +
                '</div>';
        }).join('');
    } catch (e) {
        list.innerHTML = '<p style="color:var(--danger);">Gagal memuat data user.</p>';
    }
}

function handleLoginSelect(userId, userName, userRole, userAgen) {
    getEl('loginUserList').style.display = 'none';
    getEl('loginPinSection').style.display = '';
    getEl('loginUserName').textContent = userName;
    getEl('loginPinInput').value = '';
    getEl('loginPinInput').focus();
    getEl('loginPinInput').dataset.targetUserId = userId;
}

async function handleLoginSubmit() {
    var userId = parseInt(getEl('loginPinInput').dataset.targetUserId);
    var pin = getEl('loginPinInput').value;
    var errEl = getEl('loginError');
    if (!pin) { errEl.textContent = 'Masukkan PIN'; errEl.style.display = ''; return; }
    try {
        var user = await db.users.get(userId);
        if (!user || user.pin !== pin) {
            errEl.textContent = 'PIN salah!'; errEl.style.display = '';
            return;
        }
        errEl.style.display = 'none';
        setSession(user);
        closeLogin();
        renderMenu();
        getEl('agenFilterBar').style.display = user.role === 'superadmin' ? '' : 'none';
        getEl('agenFilterLaporanBar').style.display = user.role === 'superadmin' ? '' : 'none';
        if (user.role === 'superadmin') { renderAgenList(); renderUserList(); }
        await loadTickets();
        renderTickets();
        goHome();
        showToast('Selamat datang, ' + user.nama + '!', 'success');
    } catch (e) {
        errEl.textContent = 'Terjadi kesalahan.'; errEl.style.display = '';
    }
}

function doLogout() {
    clearSession();
    showLogin();
    allTickets = [];
    renderTickets();
}

// ===== AGEN MANAGEMENT =====
async function getAgenList() {
    try { return await db.agen.toArray(); } catch (e) { return []; }
}

async function renderAgenList() {
    var list = getEl('agenList');
    if (!list) return;
    var agen = await getAgenList();
    list.innerHTML = agen.map(function (a) {
        return '<div class="agen-item">' +
            '<span><strong>' + esc(a.id) + '</strong> — ' + esc(a.nama) + '</span>' +
            '<button class="btn-icon-sm btn-agen-del" data-agen-id="' + a.id + '" title="Hapus"><i class="fas fa-trash-can"></i></button>' +
            '</div>';
    }).join('');
    // Also update agen filter dropdowns + user management dropdown
    var selects = ['agenFilterTiket', 'agenFilterLaporan', 'newUserAgen'];
    selects.forEach(function (selId) {
        var sel = getEl(selId);
        if (!sel) return;
        var isFilter = selId !== 'newUserAgen';
        sel.innerHTML = isFilter ? '<option value="">Semua Agen</option>' : '<option value="">Pilih Agen (untuk PIC)</option>';
        agen.forEach(function (a) { sel.innerHTML += '<option value="' + a.id + '">' + esc(a.id) + ' - ' + esc(a.nama) + '</option>'; });
    });
}

async function addAgen() {
    var id = getEl('newAgenId').value.trim().toUpperCase();
    var nama = getEl('newAgenNama').value.trim();
    var alamat = getEl('newAgenAlamat').value.trim();
    if (!id || !nama) { showToast('ID dan Nama agen wajib diisi!', 'warning'); return; }
    try {
        var existing = await db.agen.get(id);
        if (existing) { showToast('ID agen sudah digunakan!', 'warning'); return; }
        await db.agen.add({ id: id, nama: nama, alamat: alamat, hp: '[]' });
        getEl('newAgenId').value = '';
        getEl('newAgenNama').value = '';
        getEl('newAgenAlamat').value = '';
        await renderAgenList();
        showToast('Agen ' + id + ' berhasil ditambahkan!', 'success');
    } catch (e) { showToast('Gagal menambah agen.', 'danger'); }
}

async function removeAgen(agenId) {
    var confirmed = await showConfirm('Hapus Agen', 'Hapus agen ' + agenId + '? Semua tiket agen ini tetap tersimpan (tidak dihapus).', 'Ya, Hapus', 'btn-danger');
    if (!confirmed) return;
    try {
        await db.agen.delete(agenId);
        await renderAgenList();
        showToast('Agen ' + agenId + ' dihapus.', 'success');
    } catch (e) { showToast('Gagal menghapus agen.', 'danger'); }
}

// ===== USER MANAGEMENT =====
async function getUserList() {
    try { return await db.users.toArray(); } catch (e) { return []; }
}

async function renderUserList() {
    var list = getEl('userList');
    if (!list) return;
    var users = await getUserList();
    var agenMap = {};
    (await getAgenList()).forEach(function (a) { agenMap[a.id] = a.nama; });
    list.innerHTML = users.map(function (u) {
        return '<div class="user-item">' +
            '<span><strong>' + esc(u.nama) + '</strong> — ' + (u.role === 'superadmin' ? 'Super Admin' : 'PIC ' + esc(agenMap[u.agen_id] || u.agen_id)) + '</span>' +
            '<div style="display:flex;gap:4px;">' +
            '<button class="btn-icon-sm btn-user-pin" data-user-id="' + u.id + '" title="Ganti PIN"><i class="fas fa-key"></i></button>' +
            (u.role !== 'superadmin' ? '<button class="btn-icon-sm btn-user-del" data-user-id="' + u.id + '" title="Hapus"><i class="fas fa-trash-can"></i></button>' : '') +
            '</div></div>';
    }).join('');
}

async function addUser() {
    var nama = getEl('newUserName').value.trim();
    var role = document.querySelector('input[name="newUserRole"]:checked').value;
    var agenId = getEl('newUserAgen').value;
    var pin = getEl('newUserPin').value.trim();
    if (!nama || !pin) { showToast('Nama dan PIN wajib diisi!', 'warning'); return; }
    if (pin.length < 4 || pin.length > 6) { showToast('PIN harus 4-6 digit!', 'warning'); return; }
    if (role === 'pic' && !agenId) { showToast('Pilih agen untuk role PIC!', 'warning'); return; }
    try {
        await db.users.add({ nama: nama, role: role, pin: pin, agen_id: role === 'pic' ? agenId : null });
        getEl('newUserName').value = '';
        getEl('newUserPin').value = '';
        await renderUserList();
        showToast('User ' + nama + ' berhasil ditambahkan!', 'success');
    } catch (e) { showToast('Gagal menambah user.', 'danger'); }
}

async function removeUser(userId) {
    var confirmed = await showConfirm('Hapus User', 'Hapus user ini?', 'Ya, Hapus', 'btn-danger');
    if (!confirmed) return;
    try {
        await db.users.delete(userId);
        await renderUserList();
        showToast('User dihapus.', 'success');
    } catch (e) { showToast('Gagal menghapus user.', 'danger'); }
}

async function changeUserPin(userId) {
    var user = await db.users.get(userId);
    if (!user) return;
    getEl('changePinUserId').value = userId;
    getEl('changePinNama').textContent = user.nama;
    getEl('changePinNew').value = '';
    getEl('changePinConfirm').value = '';
    getEl('overlayChangePin').style.display = 'flex';
}

async function submitChangePin() {
    var userId = parseInt(getEl('changePinUserId').value);
    var baru = getEl('changePinNew').value.trim();
    var konfirm = getEl('changePinConfirm').value.trim();
    if (!baru || baru.length < 4 || baru.length > 6) { showToast('PIN baru harus 4-6 digit!', 'warning'); return; }
    if (baru !== konfirm) { showToast('Konfirmasi PIN tidak cocok!', 'warning'); return; }
    try {
        await db.users.update(userId, { pin: baru });
        getEl('overlayChangePin').style.display = 'none';
        showToast('PIN berhasil diubah!', 'success');
    } catch (e) { showToast('Gagal mengubah PIN.', 'danger'); }
}

// ===== BACKUP / EXPORT =====
async function exportData() {
    try {
        var data = await db.tickets.toArray();
        if (!data || !data.length) { showToast('Tidak ada data untuk diexport.', 'warning'); return; }
        var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'tiket-backup-' + new Date().toISOString().slice(0, 10) + '.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast('Data berhasil diexport!', 'success');
    } catch (e) { showToast('Gagal export data.', 'danger'); }
}

async function importData(file) {
    if (!file) return;
    try {
        var text = await file.text();
        var data = JSON.parse(text);
        if (!Array.isArray(data) || !data.length) { showToast('File tidak valid atau kosong.', 'warning'); return; }
        await db.tickets.bulkAdd(data);
        showToast(data.length + ' tiket berhasil diimport!', 'success');
        await loadTickets();
        renderTickets();
    } catch (e) { showToast('Gagal import data: ' + e.message, 'danger'); }
}

function loadSettings() {
    getEl('settingNama').value = localStorage.getItem('namaAgen') || '';
    getEl('settingAlamat').value = localStorage.getItem('alamatAgen') || '';

    const savedWidth = localStorage.getItem('printWidth') || '58';
    const radio = document.querySelector(`input[name="printWidth"][value="${savedWidth}"]`);
    if (radio) radio.checked = true;
    applyPrintWidth(savedWidth);

    const showArsip = localStorage.getItem('showArsip') !== 'false';
    const toggle = getEl('toggleArsip');
    toggle.classList.toggle('active', showArsip);
    toggle.querySelector('.toggle-track').classList.toggle('active', showArsip);

    // DB mode
    const dbMode = localStorage.getItem('dbMode') || 'dexie';
    const dbRadio = document.querySelector(`input[name="dbMode"][value="${dbMode}"]`);
    if (dbRadio) dbRadio.checked = true;

    // Supabase credentials
    getEl('settingSupabaseUrl').value = localStorage.getItem('supabaseUrl') || '';
    getEl('settingSupabaseKey').value = localStorage.getItem('supabaseKey') || '';

    // Show/hide supabase fields
    getEl('supabaseFields').style.display = dbMode === 'supabase' ? 'block' : 'none';

    renderHpList();
    updateHeader();
}

function applyPrintWidth(width) {
    document.body.classList.remove('print-58mm', 'print-80mm');
    document.body.classList.add('print-' + width + 'mm');
}

function getHpList() {
    try {
        var val = JSON.parse(localStorage.getItem('hpAgen') || '[]');
        if (Array.isArray(val)) return val.filter(Boolean);
    } catch (e) {}
    var old = localStorage.getItem('hpAgen') || '';
    return old ? [old] : [];
}

function saveHpList(arr) {
    localStorage.setItem('hpAgen', JSON.stringify(arr.filter(Boolean)));
}

function renderHpList() {
    var list = getHpList();
    var html = '';
    list.forEach(function (v, i) {
        html += '<div class="hp-item">' +
            '<input type="tel" class="form-control" data-hp-index="' + i + '" value="' + esc(v) + '" placeholder="Contoh: 021-12345678" inputmode="numeric">' +
            '<button class="btn-hp-del" data-hp-del="' + i + '"><i class="fas fa-trash-can"></i></button>' +
            '</div>';
    });
    if (!html) html = '<p style="color:var(--text-hint);font-size:13px;margin:0 0 6px;">Belum ada nomor HP</p>';
    getEl('hpList').innerHTML = html;
}

function addHpItem() {
    var container = getEl('hpList');
    var emptyMsg = container.querySelector('p');
    if (emptyMsg) container.innerHTML = '';
    var idx = container.querySelectorAll('.hp-item').length;
    var div = document.createElement('div');
    div.className = 'hp-item';
    div.innerHTML = '<input type="tel" class="form-control" placeholder="Contoh: 021-12345678" inputmode="numeric">' +
        '<button class="btn-hp-del"><i class="fas fa-trash-can"></i></button>';
    container.appendChild(div);
    var inp = div.querySelector('.form-control');
    if (inp) inp.focus();
}

function removeHpItem(btn) {
    var item = btn.closest('.hp-item');
    if (item) item.remove();
    var container = getEl('hpList');
    if (!container.querySelector('.hp-item')) {
        container.innerHTML = '<p style="color:var(--text-hint);font-size:13px;margin:0 0 6px;">Belum ada nomor HP</p>';
    }
    collectHpInputs();
}

function collectHpInputs() {
    var container = getEl('hpList');
    var inputs = container.querySelectorAll('.hp-item .form-control');
    return Array.from(inputs).map(function (inp) { return inp.value.trim(); }).filter(Boolean);
}

function saveSettings() {
    const nama = getEl('settingNama').value.trim();
    const alamat = getEl('settingAlamat').value.trim();
    const width = document.querySelector('input[name="printWidth"]:checked').value;

    if (nama) localStorage.setItem('namaAgen', nama);
    else localStorage.removeItem('namaAgen');
    if (alamat) localStorage.setItem('alamatAgen', alamat);
    else localStorage.removeItem('alamatAgen');

    var hpList = collectHpInputs();
    saveHpList(hpList);

    localStorage.setItem('printWidth', width);
    const showArsip = getEl('toggleArsip').classList.contains('active');
    localStorage.setItem('showArsip', showArsip);

    // DB settings
    const dbMode = document.querySelector('input[name="dbMode"]:checked').value;
    localStorage.setItem('dbMode', dbMode);
    localStorage.setItem('supabaseUrl', getEl('settingSupabaseUrl').value.trim());
    localStorage.setItem('supabaseKey', getEl('settingSupabaseKey').value.trim());

    // Reset supabase client so it re-initializes with new credentials
    supabaseClient = null;

    applyPrintWidth(width);
    renderHpList();
    updateHeader();

    showToast('Pengaturan disimpan!', 'success');
}

function getPin() {
    return localStorage.getItem('laporanPin') || '1234';
}

function renderLaporan() {
    const start = getEl('laporanTglStart').value;
    const end = getEl('laporanTglEnd').value;
    var agenId = getEl('agenFilterLaporan') ? getEl('agenFilterLaporan').value : '';

    let data = allTickets.filter(function (t) { return t.status === 'aktif'; });
    if (agenId) data = data.filter(function (t) { return t.agen_id === agenId; });

    if (start && end) {
        data = data.filter(function (t) {
            return t.tgl_beli && t.tgl_beli.slice(0, 10) >= start && t.tgl_beli.slice(0, 10) <= end;
        });
    }

    var total = 0;
    var armadaMap = {};
    data.forEach(function (t) {
        var h = parseInt(t.harga) || 0;
        total += h;
        if (t.armada) {
            if (!armadaMap[t.armada]) armadaMap[t.armada] = { count: 0, total: 0 };
            armadaMap[t.armada].count++;
            armadaMap[t.armada].total += h;
        }
    });

    getEl('laporanTotal').textContent = formatRupiah(total);
    getEl('laporanCount').textContent = data.length;

    var armadaKeys = Object.keys(armadaMap);
    var armadaHtml = '';
    if (armadaKeys.length) {
        armadaHtml = armadaKeys.map(function (k) {
            return '<div class="laporan-armada-item">' +
                '<span class="laporan-armada-nama">' + esc(k) + '</span>' +
                '<span class="laporan-armada-jumlah">' + armadaMap[k].count + ' tiket</span>' +
                '<span class="laporan-armada-total">' + formatRupiah(armadaMap[k].total) + '</span>' +
                '</div>';
        }).join('');
    } else {
        armadaHtml = '<p style="color:var(--text-hint);font-size:13px;">Belum ada data</p>';
    }
    getEl('laporanArmadaList').innerHTML = armadaHtml;
}

function closeGantiPin() {
    getEl('overlayGantiPin').style.display = 'none';
    getEl('gantiPinLama').value = '';
    getEl('gantiPinBaru').value = '';
    getEl('gantiPinKonfirm').value = '';
}

document.addEventListener('DOMContentLoaded', async function () {
    try {
        getEl('tgl_beli').value = getCurrentDatetime();
        getEl('tgl_berangkat').value = getTomorrowDate();
        await generateNoTiket();
    } catch (e) { console.error('Init error:', e); }
    loadSettings();

    getEl('tabBeranda').addEventListener('click', function () { goHome(); });

    getEl('formTiket').addEventListener('submit', handleSubmit);
    getEl('btnGenerateNo').addEventListener('click', generateNoTiket);
    getEl('harga').addEventListener('input', rupiahInput);
    getEl('filterInput').addEventListener('input', function () {
        getEl('filterClear').style.display = this.value ? '' : 'none';
        currentPage = 1;
        renderTickets();
    });
    getEl('filterClear').addEventListener('click', function () {
        getEl('filterInput').value = '';
        getEl('filterInput').focus();
        this.style.display = 'none';
        currentPage = 1;
        renderTickets();
    });
    getEl('pagePrev').addEventListener('click', function () {
        if (currentPage > 1) { currentPage--; renderTickets(); }
    });
    getEl('pageNext').addEventListener('click', function () {
        var total = Math.max(1, Math.ceil(allTickets.length / perPage));
        if (currentPage < total) { currentPage++; renderTickets(); }
    });
    getEl('btnSaveSettings').addEventListener('click', saveSettings);

    // DB mode toggle — show/hide supabase fields
    document.querySelectorAll('input[name="dbMode"]').forEach(function (r) {
        r.addEventListener('change', function () {
            getEl('supabaseFields').style.display = this.value === 'supabase' ? 'block' : 'none';
        });
    });

    // Test Supabase connection
    getEl('btnTestSupabase').addEventListener('click', async function () {
        var url = getEl('settingSupabaseUrl').value.trim();
        var key = getEl('settingSupabaseKey').value.trim();
        var statusEl = getEl('supabaseStatus');
        if (!url || !key) {
            statusEl.innerHTML = '<span style="color:var(--danger)">Isi URL dan Anon Key terlebih dahulu.</span>';
            return;
        }
        statusEl.innerHTML = 'Menguji...';
        try {
            var client = supabase.createClient(url, key);
            var { error } = await client.from('tickets').select('count', { count: 'exact', head: true });
            if (error) throw error;
            statusEl.innerHTML = '<span style="color:var(--success)"><i class="fas fa-check-circle"></i> Koneksi berhasil!</span>';
            // store temporarily for save
            localStorage.setItem('supabaseUrl', url);
            localStorage.setItem('supabaseKey', key);
            supabaseClient = client;
        } catch (err) {
            statusEl.innerHTML = '<span style="color:var(--danger)"><i class="fas fa-times-circle"></i> Koneksi gagal: ' + esc(err.message) + '</span>';
        }
    });

    document.getElementById('cardActionsWrap').addEventListener('click', handleTableClick);

    getEl('toast').addEventListener('click', function () { this.classList.remove('show'); });
    getEl('btnConfirmPrint').addEventListener('click', confirmPrint);

    getEl('btnLaporanUnlock').addEventListener('click', function () {
        var pin = getEl('laporanPinInput').value;
        if (pin === getPin()) {
            laporanAuthed = true;
            getEl('laporanPinGate').style.display = 'none';
            getEl('laporanContent').style.display = '';
            renderLaporan();
        } else {
            showToast('PIN salah!', 'danger');
        }
    });

    getEl('laporanPinInput').addEventListener('keydown', function (e) {
        if (e.key === 'Enter') getEl('btnLaporanUnlock').click();
    });

    getEl('btnLaporanFilter').addEventListener('click', renderLaporan);
    getEl('btnGantiPin').addEventListener('click', function () {
        getEl('overlayGantiPin').style.display = 'flex';
    });
    getEl('btnSimpanPin').addEventListener('click', function () {
        var lama = getEl('gantiPinLama').value;
        var baru = getEl('gantiPinBaru').value;
        var konfirm = getEl('gantiPinKonfirm').value;
        if (lama !== getPin()) {
            showToast('PIN lama salah!', 'danger');
            return;
        }
        if (!baru || baru.length < 4 || baru.length > 6) {
            showToast('PIN baru harus 4-6 digit!', 'warning');
            return;
        }
        if (baru !== konfirm) {
            showToast('Konfirmasi PIN baru tidak cocok!', 'warning');
            return;
        }
        localStorage.setItem('laporanPin', baru);
        showToast('PIN berhasil diubah!', 'success');
        closeGantiPin();
    });
    getEl('toggleArsip').addEventListener('click', function () {
        var on = this.classList.toggle('active');
        this.querySelector('.toggle-track').classList.toggle('active', on);
    });

    getEl('btnAddHp').addEventListener('click', addHpItem);
    getEl('hpList').addEventListener('click', function (e) {
        var btn = e.target.closest('.btn-hp-del');
        if (btn) removeHpItem(btn);
    });

    // ===== LOGIN EVENTS =====
    getEl('loginUserList').addEventListener('click', function (e) {
        var item = e.target.closest('.login-user-item');
        if (item) handleLoginSelect(
            item.dataset.userId,
            item.dataset.userNama,
            item.dataset.userRole,
            item.dataset.userAgen
        );
    });
    getEl('btnLogin').addEventListener('click', handleLoginSubmit);
    getEl('loginPinInput').addEventListener('keydown', function (e) { if (e.key === 'Enter') handleLoginSubmit(); });
    getEl('btnLoginBack').addEventListener('click', function () {
        getEl('loginPinSection').style.display = 'none';
        getEl('loginUserList').style.display = '';
    });

    // ===== BERANDA MENU EVENTS =====
    getEl('menuGrid').addEventListener('click', function (e) {
        var card = e.target.closest('.menu-card');
        if (card) {
            var action = card.dataset.action;
            if (action === 'logout') {
                showConfirm('Logout', 'Yakin ingin logout?', 'Logout', 'btn-danger').then(function (ok) {
                    if (ok) doLogout();
                });
                return;
            }
            var section = card.dataset.section;
            if (section) showSection(section);
        }
    });

    // ===== AGEN MANAGEMENT EVENTS =====
    getEl('btnAddAgen').addEventListener('click', addAgen);
    getEl('agenList').addEventListener('click', function (e) {
        var btn = e.target.closest('.btn-agen-del');
        if (btn) removeAgen(btn.dataset.agenId);
    });
    getEl('agenFilterTiket').addEventListener('change', function () {
        currentPage = 1;
        loadTicketsWithFilter();
    });
    getEl('agenFilterLaporan').addEventListener('change', function () {
        if (laporanAuthed) renderLaporan();
    });

    // ===== USER MANAGEMENT EVENTS =====
    getEl('btnAddUser').addEventListener('click', addUser);
    getEl('userList').addEventListener('click', function (e) {
        var btn = e.target.closest('.btn-user-del');
        if (btn) removeUser(parseInt(btn.dataset.userId));
        var pinBtn = e.target.closest('.btn-user-pin');
        if (pinBtn) changeUserPin(parseInt(pinBtn.dataset.userId));
    });
    getEl('btnSubmitChangePin').addEventListener('click', submitChangePin);
    getEl('changePinNew').addEventListener('keydown', function (e) { if (e.key === 'Enter') submitChangePin(); });
    getEl('changePinConfirm').addEventListener('keydown', function (e) { if (e.key === 'Enter') submitChangePin(); });
    document.querySelectorAll('input[name="newUserRole"]').forEach(function (r) {
        r.addEventListener('change', function () {
            getEl('newUserAgen').style.display = this.value === 'pic' ? '' : 'none';
        });
    });

    // ===== SAVED OVERLAY EVENTS =====
    getEl('savedBtnCetak').addEventListener('click', function () {
        if (!_savedData) return;
        var data = _savedData;
        closeSavedOverlay();
        currentPrintNoTiket = data.no_tiket;
        var width = localStorage.getItem('printWidth') || '58';
        var preview = getEl('previewBody');
        preview.innerHTML = '<div class="preview-ticket-wrap" style="width:' + width + 'mm;box-sizing:border-box;">' + buildTicketHTML(data) + '</div>';
        getEl('overlayCetak').style.display = 'flex';
    });
    getEl('savedBtnDaftar').addEventListener('click', function () {
        closeSavedOverlay();
        showSection('sectionDaftar');
    });
    getEl('overlaySaved').addEventListener('click', function (e) {
        if (e.target === this) closeSavedOverlay();
    });

    // ===== EXPORT/IMPORT EVENTS =====
    getEl('btnExportData').addEventListener('click', exportData);
    getEl('fileImport').addEventListener('change', function (e) {
        if (e.target.files && e.target.files[0]) importData(e.target.files[0]);
        e.target.value = '';
    });

    // ===== STARTUP =====
    try {
        await seedDefaults();
        renderMenu();
        var user = getSession();
        if (user) {
            getEl('agenFilterBar').style.display = user.role === 'superadmin' ? '' : 'none';
            getEl('agenFilterLaporanBar').style.display = user.role === 'superadmin' ? '' : 'none';
            if (user.role === 'superadmin') { renderAgenList(); renderUserList(); }
        }
        if (!isLoggedIn()) {
            showLogin();
            if (isSuperadmin()) { renderAgenList(); renderUserList(); }
        }
        await loadTickets();
    } catch (e) { console.error('Startup error:', e); }
});
