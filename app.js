const db = new Dexie('NauraTrans');
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
db.version(3).stores({
    tickets: 'no_tiket, tgl_beli, nama_penumpang, armada, status, agen_id',
    agen: 'id, nama',
    users: '++id, nama, role, agen_id, pin',
    counters: 'id'
});

async function seedDefaults() {
    var sdb = getAgenDB();
    var udb = getUserDB();
    var agenCount = sdb ? (await sdb.getAll()).length : await db.agen.count();
    var userCount = udb ? (await udb.getAll()).length : await db.users.count();
    if (agenCount === 0) {
        var agenData = { id: 'AG001', nama: 'Agen Utama', alamat: '', hp: '[]' };
        if (sdb) await sdb.add(agenData);
        var dexExists = await db.agen.get('AG001');
        if (!dexExists) await db.agen.add(agenData);
    }
    if (userCount === 0) {
        var userData = { nama: 'Super Admin', role: 'superadmin', pin: '1234', agen_id: null };
        if (udb) await udb.add(userData);
        var dexUsers = await db.users.toArray();
        if (!dexUsers.some(function (u) { return u.role === 'superadmin'; })) await db.users.add(userData);
    }
}

function getSession() { try { return JSON.parse(sessionStorage.getItem('userSession')) || null; } catch (e) { return null; } }
function setSession(u) { sessionStorage.setItem('userSession', JSON.stringify(u)); }
function clearSession() { sessionStorage.removeItem('userSession'); }
function isLoggedIn() { return !!getSession(); }
function isSuperadmin() { var u = getSession(); return u && u.role === 'superadmin'; }

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
    return !!getSupabaseClient();
}

function randomHex(len) {
    var s = '';
    for (var i = 0; i < len; i++) s += '0123456789ABCDEF'.charAt(Math.floor(Math.random() * 16));
    return s;
}

function todayPrefix() {
    var now = new Date();
    return 'TKT-' + now.getFullYear() + pad2(now.getMonth() + 1) + pad2(now.getDate()) + '-';
}

// ---- Dexie adapter ----
const dexieAPI = {
    async nextTicketNo(tgl) {
        try {
            var key = 'tiket_seq_' + (tgl || new Date().toISOString().slice(0, 10));
            var no = await db.transaction('rw', db.counters, async function () {
                var row = await db.counters.get(key);
                var next = (row ? row.val : 0) + 1;
                await db.counters.put({ id: key, val: next });
                return next;
            });
            return todayPrefix() + String(no).padStart(4, '0') + '-' + randomHex(4);
        } catch (err) { console.error('Dexie Seq Error:', err); return todayPrefix() + randomHex(6); }
    },
    async read(filters) {
        try {
            var data;
            if (filters && filters.agen_id) data = await db.tickets.where('agen_id').equals(filters.agen_id).toArray();
            else data = await db.tickets.toArray();
            data.sort(function (a, b) { return (b.no_tiket || '').localeCompare(a.no_tiket || ''); });
            return data;
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
                var noTiket = i === 0 ? await dexieAPI.nextTicketNo() : todayPrefix() + String(i + 1).padStart(4, '0') + '-' + randomHex(4);
                await db.tickets.add({ no_tiket: noTiket, tgl_beli: tglBeli, nama_penumpang: names[i % names.length], no_hp: String(81200000000 + i + Math.floor(Math.random() * 100)), armada: armadas[i % armadas.length], keberangkatan: terminals[i % terminals.length], kedatangan: terminals[(i + 4) % terminals.length], no_kursi: kursi[i % kursi.length], harga: String(75000 + Math.floor(Math.random() * 200000)), tgl_berangkat: tglBerangkat, pic_agen: 'PETUGAS ' + (Math.floor(i / 4) + 1), status: 'aktif', agen_id: agenId || 'AG001' });
            }
            return { status: 'success' };
        } catch (err) { console.error('DB Error:', err); return { status: 'error', message: err.message }; }
    }
};

// ---- Supabase adapter ----
function _sbFallback(errMsg) {
    var mode = getDBMode();
    var msg = 'Data disimpan secara lokal, tidak ke cloud.';
    if (mode === 'supabase') {
        showToast(msg, 'warning');
    }
}

const supabaseAPI = {
    async nextTicketNo(tgl) {
        try {
            var c = getSupabaseClient();
            if (!c) return dexieAPI.nextTicketNo(tgl);
            var { data, error } = await c.rpc('next_ticket_no', { tgl_date: tgl || new Date().toISOString().slice(0, 10) });
            if (error) throw error;
            return data;
        } catch (err) {
            console.error('Supabase RPC Error:', err);
            _sbFallback(err.message);
            return dexieAPI.nextTicketNo(tgl);
        }
    },
    async read(filters) {
        try {
            var c = getSupabaseClient(); if (!c) return dexieAPI.read(filters);
            var q = c.from('tickets').select('*');
            if (filters && filters.agen_id) q = q.eq('agen_id', filters.agen_id);
            var { data, error } = await q.order('no_tiket', { ascending: false });
            if (error) throw error;
            return data;
        } catch (err) {
            console.error('Supabase Error:', err);
            _sbFallback(err.message);
            return dexieAPI.read(filters);
        }
    },
    async create(data, retries) {
        retries = retries || 3;
        try {
            var c = getSupabaseClient(); if (!c) return dexieAPI.create(data);
            var payload = Object.assign({}, data);
            if (payload.tgl_beli) payload.tgl_beli = formatToISO(payload.tgl_beli);
            if (payload.tgl_berangkat) payload.tgl_berangkat = formatToISO(payload.tgl_berangkat);
            var { error } = await c.from('tickets').insert(payload);
            if (error) throw error;
            return { status: 'success' };
        } catch (err) {
            // Unique constraint violation (PG code 23505) — retry with new no_tiket
            if (err && (err.code === '23505' || (err.message && err.message.indexOf('duplicate') > -1))) {
                if (retries > 0) {
                    var newData = Object.assign({}, data);
                    newData.no_tiket = await supabaseAPI.nextTicketNo();
                    return supabaseAPI.create(newData, retries - 1);
                }
                showToast('Gagal: terlalu banyak konflik nomor tiket. Coba lagi.', 'danger');
                return null;
            }
            // Network / other error — fallback to dexie
            console.error('Supabase Error:', err);
            _sbFallback(err.message);
            return dexieAPI.create(data);
        }
    },
    async update(no_tiket, field, value) {
        try {
            var c = getSupabaseClient(); if (!c) return dexieAPI.update(no_tiket, field, value);
            var { error } = await c.from('tickets').update({ [field]: value }).eq('no_tiket', no_tiket);
            if (error) throw error;
            return { status: 'success' };
        } catch (err) {
            console.error('Supabase Error:', err);
            _sbFallback(err.message);
            return dexieAPI.update(no_tiket, field, value);
        }
    },
    async delete(no_tiket) {
        try {
            var c = getSupabaseClient(); if (!c) return dexieAPI.delete(no_tiket);
            var { error } = await c.from('tickets').delete().eq('no_tiket', no_tiket);
            if (error) throw error;
            return { status: 'success' };
        } catch (err) {
            console.error('Supabase Error:', err);
            _sbFallback(err.message);
            return dexieAPI.delete(no_tiket);
        }
    },
    async dummy(agenId) {
        try {
            var c = getSupabaseClient(); if (!c) return dexieAPI.dummy(agenId);
            var { error: delErr } = await c.from('tickets').delete().neq('no_tiket', '');
            if (delErr) throw delErr;
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
                var noTiket = i === 0 ? await supabaseAPI.nextTicketNo() : todayPrefix() + String(i + 1).padStart(4, '0') + '-' + randomHex(4);
                rows.push({ no_tiket: noTiket, tgl_beli: formatToISO(tglBeli), nama_penumpang: names[i % names.length], no_hp: String(81200000000 + i + Math.floor(Math.random() * 100)), armada: armadas[i % armadas.length], keberangkatan: terminals[i % terminals.length], kedatangan: terminals[(i + 4) % terminals.length], no_kursi: kursi[i % kursi.length], harga: String(75000 + Math.floor(Math.random() * 200000)), tgl_berangkat: formatToISO(tglBerangkat), pic_agen: 'PETUGAS ' + (Math.floor(i / 4) + 1), status: 'aktif', agen_id: agenId || 'AG001' });
            }
            var { error: insErr } = await c.from('tickets').insert(rows);
            if (insErr) throw insErr;
            return { status: 'success' };
        } catch (err) { console.error('Supabase Error:', err); return { status: 'error', message: err.message }; }
    },
    // ---- Agen operations ----
    agen: {
        async getAll() {
            try {
                var c = getSupabaseClient(); if (!c) return db.agen.toArray();
                var { data, error } = await c.from('agen').select('*').order('id', { ascending: true });
                if (error) throw error;
                return data || [];
            } catch (err) {
                console.error('Supabase Agen Error:', err);
                _sbFallback(err.message);
                return db.agen.toArray();
            }
        },
        async get(id) {
            try {
                var c = getSupabaseClient(); if (!c) return db.agen.get(id);
                var { data, error } = await c.from('agen').select('*').eq('id', id).single();
                if (error) throw error;
                return data;
            } catch (err) {
                console.error('Supabase Agen Error:', err);
                _sbFallback(err.message);
                return db.agen.get(id);
            }
        },
        async add(data) {
            try {
                var c = getSupabaseClient(); if (!c) return db.agen.add(data);
                var { error } = await c.from('agen').insert(data);
                if (error) throw error;
                return data.id;
            } catch (err) {
                console.error('Supabase Agen Error:', err);
                _sbFallback(err.message);
                return db.agen.add(data);
            }
        },
        async update(id, data) {
            try {
                var c = getSupabaseClient(); if (!c) return db.agen.update(id, data);
                var { error } = await c.from('agen').update(data).eq('id', id);
                if (error) throw error;
                return 1;
            } catch (err) {
                console.error('Supabase Agen Error:', err);
                _sbFallback(err.message);
                return db.agen.update(id, data);
            }
        },
        async delete(id) {
            try {
                var c = getSupabaseClient(); if (!c) return db.agen.delete(id);
                var { error } = await c.from('agen').delete().eq('id', id);
                if (error) throw error;
            } catch (err) {
                console.error('Supabase Agen Error:', err);
                _sbFallback(err.message);
                return db.agen.delete(id);
            }
        }
    },
    // ---- Users operations ----
    users: {
        async getAll() {
            try {
                var c = getSupabaseClient(); if (!c) return db.users.toArray();
                var { data, error } = await c.from('users').select('*').order('nama', { ascending: true });
                if (error) throw error;
                return data || [];
            } catch (err) {
                console.error('Supabase Users Error:', err);
                _sbFallback(err.message);
                return db.users.toArray();
            }
        },
        async get(id) {
            try {
                var c = getSupabaseClient(); if (!c) return db.users.get(id);
                var { data, error } = await c.from('users').select('*').eq('id', id).single();
                if (error) throw error;
                return data;
            } catch (err) {
                console.error('Supabase Users Error:', err);
                _sbFallback(err.message);
                return db.users.get(id);
            }
        },
        async add(data) {
            try {
                var c = getSupabaseClient(); if (!c) return db.users.add(data);
                var { data: inserted, error } = await c.from('users').insert(data).select();
                if (error) throw error;
                return inserted && inserted[0] ? inserted[0].id : null;
            } catch (err) {
                console.error('Supabase Users Error:', err);
                _sbFallback(err.message);
                return db.users.add(data);
            }
        },
        async update(id, data) {
            try {
                var c = getSupabaseClient(); if (!c) return db.users.update(id, data);
                var { error } = await c.from('users').update(data).eq('id', id);
                if (error) throw error;
                return 1;
            } catch (err) {
                console.error('Supabase Users Error:', err);
                _sbFallback(err.message);
                return db.users.update(id, data);
            }
        },
        async delete(id) {
            try {
                var c = getSupabaseClient(); if (!c) return db.users.delete(id);
                var { error } = await c.from('users').delete().eq('id', id);
                if (error) throw error;
            } catch (err) {
                console.error('Supabase Users Error:', err);
                _sbFallback(err.message);
                return db.users.delete(id);
            }
        }
    }
};

// ---- Active adapter selector ----
function getDB() {
    return getDBMode() === 'supabase' && isSupabaseReady() ? supabaseAPI : dexieAPI;
}

function getAgenDB() {
    return getDBMode() === 'supabase' && isSupabaseReady() ? supabaseAPI.agen : null;
}

function getUserDB() {
    return getDBMode() === 'supabase' && isSupabaseReady() ? supabaseAPI.users : null;
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
    async nextTicketNo(tgl) { return getDB().nextTicketNo(tgl); },
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
let laporanAuthed = false;
let currentPage = 1;
let penumpangPage = 1;
let penumpangTotalData = [];
const perPage = 10;

function getEl(id) { return document.getElementById(id); }

function getCurrentDatetime() {
    var now = new Date();
    return now.getFullYear() + '-' + pad2(now.getMonth() + 1) + '-' +
        pad2(now.getDate()) + 'T' + pad2(now.getHours()) + ':' + pad2(now.getMinutes());
}

function getLocalOffset() {
    var off = new Date().getTimezoneOffset();
    var sign = off <= 0 ? '+' : '-';
    off = Math.abs(off);
    return sign + pad2(Math.floor(off / 60)) + ':' + pad2(off % 60);
}

function formatToISO(val) {
    if (!val) return val;
    if (typeof val === 'string' && val.includes('T') && !(/[+-]\d{2}:\d{2}$/.test(val)) && !val.endsWith('Z')) {
        return val + getLocalOffset();
    }
    return val;
}

function formatRupiah(n) {
    if (!n && n !== 0) return '';
    var num = parseInt(n, 10);
    if (isNaN(num)) num = 0;
    return 'RP. ' + num.toLocaleString('id-ID') + ',-';
}

function pad2(n) { return String(n).padStart(2, '0'); }

function formatTgl(val) {
    if (!val) return '';
    if (typeof val === 'string' && val.includes('T')) {
        var d = new Date(val);
        if (!isNaN(d.getTime())) {
            return pad2(d.getDate()) + '/' + pad2(d.getMonth() + 1) + '/' +
                d.getFullYear() + ' ' + pad2(d.getHours()) + ':' + pad2(d.getMinutes());
        }
        // Fallback: manual parse
        var parts = val.split('T');
        var dp = parts[0].split('-');
        var date = dp[2] + '/' + dp[1] + '/' + dp[0];
        if (parts[1]) { var tp = parts[1].split(':'); if (tp.length >= 2) return date + ' ' + tp[0] + ':' + tp[1]; }
        return date;
    }
    if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}/.test(val)) {
        var p = val.split('-');
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
    try {
        var no = await API.nextTicketNo();
        if (no) { getEl('no_tiket').value = no; return; }
    } catch (e) { console.warn('generateNoTiket error:', e); }
    // Fallback
    getEl('no_tiket').value = todayPrefix() + randomHex(6);
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
    { id: 'laporan',   icon: 'fa-chart-line',       title: 'Laporan',         desc: 'Keuangan & statistik',         section: 'sectionLaporan',    color: '#e65100', role: 'superadmin' },
    { id: 'agen',      icon: 'fa-store',            title: 'Kelola Agen',     desc: 'Tambah/hapus cabang',          section: 'sectionAgen',       color: '#6a1b9a', role: 'superadmin' },
    { id: 'user',      icon: 'fa-users',            title: 'Kelola User',     desc: 'Tambah/hapus operator',        section: 'sectionUser',       color: '#00838f', role: 'superadmin' },
    { id: 'penumpang', icon: 'fa-address-book',     title: 'Data Penumpang',  desc: 'Lihat data pelanggan',         section: 'sectionPenumpang',  color: '#2e7d32', role: 'superadmin' },
    { id: 'pengaturan',icon: 'fa-gear',             title: 'Pengaturan',      desc: 'Cetak, database & lainnya',    section: 'sectionPengaturan', color: '#546e7a', role: 'superadmin' },
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

async function showSection(id) {
    _savedData = null;
    document.querySelectorAll('.section').forEach(function (s) { s.classList.remove('active'); });
    var el = getEl(id);
    if (el) el.classList.add('active');
    if (id === 'sectionBeranda') renderMenu();
    if (id === 'sectionForm') { generateNoTiket(); autoFillPic(); }
    if (id === 'sectionDaftar') {
        var user = getSession();
        if (user && user.role === 'superadmin' && getEl('agenFilterTiket').value) await loadTicketsWithFilter();
        else loadTickets().then(function () { renderTickets(); }).catch(function (e) { console.error('Load error:', e); });
    }
    if (id === 'sectionLaporan') {
        if (laporanAuthed) { getEl('laporanPinGate').style.display = 'none'; getEl('laporanContent').style.display = ''; loadTickets().then(function () { renderLaporan(); }).catch(function (e) { console.error('Load error:', e); }); }
        else { getEl('laporanPinGate').style.display = ''; getEl('laporanContent').style.display = 'none'; }
    }
    if (id === 'sectionPengaturan') {
        loadSettings();
        var user = getSession();
        if (user && user.role === 'superadmin') { renderAgenList(); renderUserList(); }
    }
    if (id === 'sectionAgen' && isSuperadmin()) renderAgenList();
    if (id === 'sectionUser' && isSuperadmin()) renderUserList();
    if (id === 'sectionPenumpang' && isSuperadmin()) loadTickets().then(function () { renderPenumpang(); }).catch(function (e) { console.error('Load error:', e); });
}

function autoFillPic() {
    var user = getSession();
    if (user) getEl('pic_agen').value = user.nama.toUpperCase();
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

    try {
        const result = await API.create(data);

        if (result && result.status === 'success') {
            showTicketSaved(data);
            e.target.reset();
            await generateNoTiket();
            getEl('tgl_beli').value = getCurrentDatetime();
            getEl('tgl_berangkat').value = getCurrentDatetime();
            autoFillPic();
            await loadTickets();
            currentPage = 1;
            if (getEl('sectionDaftar').classList.contains('active')) {
                renderTickets();
            }
        } else {
            showToast('Gagal menyimpan tiket. Coba lagi.', 'danger');
        }
    } catch (err) {
        console.error('Submit error:', err);
        showToast('Gagal menyimpan tiket. Coba lagi.', 'danger');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-floppy-disk"></i> Simpan Tiket';
    }
}

async function loadTickets() {
    try {
        const data = await API.read();
        if (data) allTickets = data;
        else allTickets = [];
    } catch (err) {
        console.error('loadTickets error:', err);
        allTickets = [];
    }
}

async function loadTicketsWithFilter() {
    try {
        var agenId = getEl('agenFilterTiket').value;
        var data = agenId ? await API.read({ agen_id: agenId }) : await API.read();
        if (data) allTickets = data;
        else allTickets = [];
        renderTickets();
    } catch (err) {
        console.error('loadTicketsWithFilter error:', err);
        showToast('Gagal memuat data tiket', 'danger');
    }
}

function renderTickets() {
    const kw = (getEl('filterInput').value || '').toLowerCase();
    const startDate = getEl('filterDateStart').value;
    const endDate = getEl('filterDateEnd').value;

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
    if (startDate) {
        filtered = filtered.filter(t => t.tgl_beli && t.tgl_beli.slice(0, 10) >= startDate);
    }
    if (endDate) {
        filtered = filtered.filter(t => t.tgl_beli && t.tgl_beli.slice(0, 10) <= endDate);
    }

    getEl('totalAmount').textContent = filtered.length + ' tiket';

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

function showSuperPinPrompt(msg) {
    return new Promise(function (resolve) {
        getEl('superPinInput').value = '';
        getEl('superPinError').style.display = 'none';
        getEl('superPinDesc').textContent = msg || 'Masukkan PIN Super Admin';
        getEl('overlaySuperPin').style.display = 'flex';
        getEl('superPinInput').focus();
        window._resolveSuperPin = resolve;
    });
}

function closeSuperPin() {
    getEl('overlaySuperPin').style.display = 'none';
    if (window._resolveSuperPin) { var r = window._resolveSuperPin; window._resolveSuperPin = null; r(false); }
}

async function cancelTicket(noTiket) {
    var u = getSession();
    if (u && u.role === 'pic') {
        var auth = await showSuperPinPrompt('Batalkan tiket ' + noTiket + '? Masukkan PIN Super Admin');
        if (!auth) return;
    } else {
        var ok = await showConfirm('Batalkan Tiket', 'Batalkan tiket ' + noTiket + '?', 'Ya, Batalkan', 'btn-warning');
        if (!ok) return;
    }
    try {
        const r = await API.update(noTiket, 'status', 'batal');
        if (r && r.status === 'success') {
            showToast(`Tiket ${noTiket} dibatalkan`, 'success');
            await loadTickets();
            renderTickets();
        } else {
            showToast('Gagal membatalkan tiket', 'danger');
        }
    } catch (err) {
        console.error('Cancel error:', err);
        showToast('Gagal membatalkan tiket', 'danger');
    }
}

async function deleteTicket(noTiket) {
    try {
        var u2 = getSession();
        if (u2 && u2.role === 'pic') {
            var auth = await showSuperPinPrompt('Hapus tiket ' + noTiket + '? Masukkan PIN Super Admin');
            if (!auth) return;
        } else {
            var ok = await showConfirm('Hapus Tiket', 'Hapus tiket ' + noTiket + '? Tindakan ini tidak bisa dibatalkan.', 'Ya, Hapus', 'btn-danger');
            if (!ok) return;
        }
        const r = await API.delete(noTiket);
        if (r && r.status === 'success') {
            showToast('Tiket ' + noTiket + ' dihapus', 'success');
            await loadTickets();
            renderTickets();
        } else {
            showToast('Gagal menghapus tiket', 'danger');
        }
    } catch (e) { console.error('deleteTicket error:', e); showToast('Gagal menghapus tiket', 'danger'); }
}

async function generateDummy() {
    try {
        var dbMode = getDBMode();
        var warning = dbMode === 'supabase' ? ' (PERHATIAN: data di Cloud akan dihapus!)' : '';
        var ok = await showConfirm('Isi Data Contoh', 'Semua data yang ada akan dihapus dan diganti 20 data contoh.' + warning + ' Lanjutkan?', 'Ya, Lanjutkan', 'btn-primary');
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
    } catch (e) { console.error('generateDummy error:', e); showToast('Gagal membuat data contoh.', 'danger'); }
}

let currentPrintNoTiket = null;

function getQRImgTag(value, maxSize) {
    if (typeof qrcode === 'undefined' || !value) return '';
    try {
        var qr = qrcode(0, 'L');
        qr.addData(value);
        qr.make();
        var count = qr.getModuleCount();
        var cellSize = Math.max(2, Math.floor((maxSize || 75) / count));
        return qr.createImgTag(cellSize, 1);
    } catch (e) {
        console.warn('QR error:', e);
        return '';
    }
}

function up(v) { return esc(v).toUpperCase(); }

function buildTicketHTML(t) {
    const namaAgen = localStorage.getItem('namaAgen') || 'LOKET BUS';
    const alamatAgen = localStorage.getItem('alamatAgen') || '';
    const hpAgenList = getHpList();

    let headerInfo = `<h3 style="font-weight:700">${up(namaAgen)}</h3>`;
    if (alamatAgen) headerInfo += `<p class="text-center" style="font-weight:700;font-size:12px;margin:1mm 0;">${up(alamatAgen)}</p>`;
    hpAgenList.forEach(function (h) {
        if (h) headerInfo += `<p class="text-center" style="font-weight:700;font-size:12px;margin:1mm 0;">📞 ${esc(h)}</p>`;
    });

    const f = (label, val) =>
        `<p style="margin:0;">${label} :</p><p style="font-weight:700;margin:0 0 2px 0;">${val}</p>`;

    const rules =
        `<ol style="margin:0;padding-left:14px;font-weight:700;font-size:11px;line-height:1.4;">` +
        `<li style="margin:0 0 2px 0;">Apabila batal uang pesanan tidak bisa dikembalikan atau hangus</li>` +
        `<li style="margin:0;">Para penumpang harus siap (stand by) setengah jam sebelum pemberangkatan dan bilamana datang terlambat pada jam tersebut diatas terpaksa kami tinggal dan uang tidak dapat dikembalikan.</li>` +
        `</ol>`;

    return `
        <div class="bagian-tiket">
            ${headerInfo}
            <hr>
            ${f('No Tiket', up(t.no_tiket))}
            ${f('Tgl Beli', formatTgl(t.tgl_beli))}
            <hr>
            ${f('Penumpang', up(t.nama_penumpang))}
            <hr>
            ${f('Armada', up(t.armada))}
            ${f('Keberangkatan', up(t.keberangkatan))}
            ${f('Terminal Tujuan', up(t.kedatangan))}
            ${f('Kursi', up(t.no_kursi))}
            <hr>
            <div style="display:flex;gap:8px;align-items:stretch;">
                <div style="display:flex;align-items:center;justify-content:center;flex-shrink:0;padding:2px 0;">
                    ${getQRImgTag(t.no_tiket, 75)}
                </div>
                <div style="border-left:2px dashed #888;"></div>
                <div style="flex:1;min-width:0;padding-left:4px;">
                    ${f('Harga', formatRupiah(t.harga))}
                    ${f('Berangkat', formatTgl(t.tgl_berangkat))}
                    ${f('PIC Agen', up(t.pic_agen))}
                </div>
            </div>
            <hr>
            ${rules}
            <hr>
            <p class="text-center" style="font-weight:700;">TERIMA KASIH</p>
            <p class="text-center" style="font-weight:700;font-size:12px;">— ${up(namaAgen)} —</p>
        </div>

        ${localStorage.getItem('showVoucher') !== 'false' ? `
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
        ` : ''}

        ${localStorage.getItem('showArsip') !== 'false' ? `
        <div class="separator-gunting"><span>✂</span></div>

        <div class="bagian-tiket">
            <h3 style="font-weight:700">ARSIP AGEN</h3>
            <hr>
            ${f('No Tiket', up(t.no_tiket))}
            ${f('Tgl Beli', formatTgl(t.tgl_beli))}
            ${f('Penumpang', up(t.nama_penumpang))}
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
    currentPrintNoTiket = null;
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
    const copies = parseInt(localStorage.getItem('printCopies') || '1');
    let html = '';
    for (var i = 0; i < copies; i++) {
        html += buildTicketHTML(t);
        if (i < copies - 1) html += '<div class="separator-gunting" style="page-break-after:always;">- - - - - - - - ✂ - - - - - - - -</div>';
    }
    getEl('area-cetak-tiket').innerHTML = html;
    closePreview();
    doPrint('print-' + (localStorage.getItem('printWidth') || '58') + 'mm');
}

function downloadPDF() {
    const t = allTickets.find(x => x.no_tiket === currentPrintNoTiket);
    if (!t) return;
    showToast('Mengunduh PDF...', 'info');

    const w = parseInt(localStorage.getItem('printWidth') || '58');
    closePreview();

    var div = document.createElement('div');
    div.className = 'preview-ticket-wrap';
    div.style.cssText = 'width:' + w + 'mm;box-sizing:border-box;margin:0;background:#fff;';
    div.innerHTML = buildTicketHTML(t);
    document.body.appendChild(div);

    setTimeout(function () {
        var h = Math.ceil((div.offsetHeight / div.offsetWidth) * w) + 3;
        html2pdf(div, {
            margin: 0,
            filename: (t.no_tiket || 'tiket') + '.pdf',
            image: { type: 'jpeg', quality: 0.95 },
            html2canvas: { scale: 2, useCORS: true, logging: true },
            jsPDF: { unit: 'mm', format: [w, h], orientation: 'portrait' }
        }).catch(function (e) {
            console.error('html2pdf error:', e);
            showToast('Gagal generate PDF: ' + (e.message || 'unknown'), 'danger');
        }).then(function () {
            try { document.body.removeChild(div); } catch (ex) {}
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
    var session = getSession();
    var nama, alamat, hpList;

    if (!session) {
        renderHeaderContent('LOKET BUS', '', []);
        return;
    }

    if (session.role === 'pic' && session.agen_id) {
        // PIC: read from agen table
        var sdb = getAgenDB();
        (sdb ? sdb.get(session.agen_id) : db.agen.get(session.agen_id)).then(function (a) {
            if (a) {
                nama = a.nama;
                alamat = a.alamat || '';
                try { hpList = JSON.parse(a.hp || '[]'); } catch (e) { hpList = []; }
            } else {
                nama = 'LOKET BUS'; alamat = ''; hpList = [];
            }
            renderHeaderContent(nama, alamat, hpList);
        }).catch(function () {
            renderHeaderContent('LOKET BUS', '', []);
        });
    } else {
        // Superadmin: static
        nama = 'Naura Trans';
        alamat = '';
        hpList = [];
        renderHeaderContent(nama, alamat, hpList);
    }
}

function renderHeaderContent(nama, alamat, hpList) {
    // Save to localStorage for print template compatibility
    localStorage.setItem('namaAgen', nama);
    localStorage.setItem('alamatAgen', alamat);
    localStorage.setItem('hpAgen', JSON.stringify(hpList || []));

    const el = getEl('headerContent');
    let html = `<h1><i class="fas fa-bus"></i> ${esc(nama)}</h1>`;
    if (alamat) html += `<p class="header-alamat"><i class="fas fa-location-dot"></i> ${esc(alamat)}</p>`;
    if (hpList && hpList.length) {
        html += '<p class="header-hp">';
        hpList.forEach(function (h, i) {
            if (i > 0) html += '<span class="hp-sep">•</span>';
            html += `<i class="fas fa-phone"></i> ${esc(h)}`;
        });
        html += '</p>';
    }
    el.innerHTML = html;
    document.title = nama;
    adjustPadding();
}

function adjustPadding() {
    setTimeout(function () {
        var h = getEl('headerContent').offsetHeight;
        var min = 80;
        if (h > 20) document.body.style.paddingTop = Math.max(h + 24, min) + 'px';
    }, 200);
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
        var sdb = getUserDB();
        var users = sdb ? await sdb.getAll() : await db.users.toArray();
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
    var userIdRaw = getEl('loginPinInput').dataset.targetUserId;
    var userId = /^\d+$/.test(userIdRaw) ? parseInt(userIdRaw) : userIdRaw;
    var pin = getEl('loginPinInput').value;
    var errEl = getEl('loginError');
    var btn = getEl('btnLogin');
    if (!pin) { errEl.textContent = 'Masukkan PIN'; errEl.style.display = ''; return; }
    btn.disabled = true;
    try {
        var sdb = getUserDB();
        var user = sdb ? await sdb.get(userId) : await db.users.get(userId);
        if (!user || user.pin !== pin) {
            errEl.textContent = 'PIN salah!'; errEl.style.display = '';
            return;
        }
        errEl.style.display = 'none';
        var sessionData = Object.assign({}, user);
        delete sessionData.pin;
        setSession(sessionData);
        closeLogin();
        renderMenu();
        getEl('agenFilterBar').style.display = user.role === 'superadmin' ? '' : 'none';
        getEl('agenFilterLaporanBar').style.display = user.role === 'superadmin' ? '' : 'none';
        if (user.role === 'superadmin') { renderAgenList(); renderUserList(); }
        await loadTickets();
        renderTickets();
        updateHeader();
        goHome();
        showToast('Selamat datang, ' + user.nama + '!', 'success');
    } catch (e) {
        errEl.textContent = 'Terjadi kesalahan.'; errEl.style.display = '';
    } finally {
        btn.disabled = false;
    }
}

function doLogout() {
    clearSession();
    laporanAuthed = false;
    showLogin();
    allTickets = [];
    renderTickets();
    updateHeader();
}

// ===== AGEN MANAGEMENT =====
async function getAgenList() {
    try {
        var sdb = getAgenDB();
        if (sdb) return await sdb.getAll();
        return await db.agen.toArray();
    } catch (e) { return []; }
}

async function renderAgenList() {
    var list = getEl('agenList');
    if (!list) return;
    var agen = await getAgenList();
    list.innerHTML = agen.map(function (a) {
        return '<div class="agen-item">' +
            '<span><strong>' + esc(a.id) + '</strong> — ' + esc(a.nama) + '</span>' +
            '<div style="display:flex;gap:4px;">' +
            '<button class="btn-icon-sm btn-agen-edit" data-agen-id="' + a.id + '" title="Edit"><i class="fas fa-pen-to-square"></i></button>' +
            '<button class="btn-icon-sm btn-agen-del" data-agen-id="' + a.id + '" title="Hapus"><i class="fas fa-trash-can"></i></button>' +
            '</div></div>';
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
        var sdb = getAgenDB();
        if (sdb) {
            var existing = await sdb.get(id);
            if (existing) { showToast('ID agen sudah digunakan!', 'warning'); return; }
            await sdb.add({ id: id, nama: nama, alamat: alamat, hp: '[]' });
            // Also sync to Dexie for offline fallback
            var dexExists = await db.agen.get(id);
            if (!dexExists) await db.agen.add({ id: id, nama: nama, alamat: alamat, hp: '[]' });
        } else {
            var existing = await db.agen.get(id);
            if (existing) { showToast('ID agen sudah digunakan!', 'warning'); return; }
            await db.agen.add({ id: id, nama: nama, alamat: alamat, hp: '[]' });
        }
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
        var sdb = getAgenDB();
        if (sdb) await sdb.delete(agenId);
        try { await db.agen.delete(agenId); } catch (ex) {}
        await renderAgenList();
        showToast('Agen ' + agenId + ' dihapus.', 'success');
    } catch (e) { showToast('Gagal menghapus agen.', 'danger'); }
}

async function showAgenEdit(agenId) {
    try {
        var sdb = getAgenDB();
        var a = sdb ? await sdb.get(agenId) : await db.agen.get(agenId);
        if (!a) { showToast('Agen tidak ditemukan', 'danger'); return; }
        getEl('editAgenId').value = a.id;
        getEl('editAgenNama').value = a.nama;
        getEl('editAgenAlamat').value = a.alamat || '';
        var hp = [];
        try { hp = JSON.parse(a.hp || '[]'); } catch (e) {}
        var container = getEl('editAgenHpList');
        container.innerHTML = hp.map(function (h) {
            return '<div class="hp-item"><input type="text" class="form-control" value="' + esc(h) + '" placeholder="No. HP"><button class="btn-hp-del" onclick="removeEditAgenHpItem(this)"><i class="fas fa-xmark"></i></button></div>';
        }).join('');
        getEl('overlayAgenEdit').style.display = 'flex';
    } catch (e) { console.error('showAgenEdit error:', e); showToast('Gagal memuat data agen', 'danger'); }
}

function closeAgenEdit() {
    getEl('overlayAgenEdit').style.display = 'none';
}

function addEditAgenHpItem() {
    var container = getEl('editAgenHpList');
    var emptyMsg = container.querySelector('p');
    if (emptyMsg) emptyMsg.remove();
    var item = document.createElement('div');
    item.className = 'hp-item';
    item.innerHTML = '<input type="text" class="form-control" placeholder="No. HP"><button class="btn-hp-del" onclick="removeEditAgenHpItem(this)"><i class="fas fa-xmark"></i></button>';
    container.appendChild(item);
}

function removeEditAgenHpItem(btn) {
    var item = btn.closest('.hp-item');
    if (item) item.remove();
}

function collectEditAgenHpInputs() {
    var container = getEl('editAgenHpList');
    var inputs = container.querySelectorAll('.hp-item .form-control');
    var result = [];
    inputs.forEach(function (inp) {
        var v = inp.value.trim();
        if (v) result.push(v);
    });
    return result;
}

async function saveAgenEdit() {
    var id = getEl('editAgenId').value;
    var nama = getEl('editAgenNama').value.trim();
    var alamat = getEl('editAgenAlamat').value.trim();
    if (!nama || !alamat) { showToast('Nama dan Alamat wajib diisi!', 'warning'); return; }
    var hp = collectEditAgenHpInputs();
    var updateData = { nama: nama, alamat: alamat, hp: JSON.stringify(hp) };
    try {
        var sdb = getAgenDB();
        if (sdb) await sdb.update(id, updateData);
        try { await db.agen.update(id, updateData); } catch (dexErr) { console.warn('Dexie sync warning:', dexErr); showToast('Data agen tersimpan di cloud, gagal sync ke lokal', 'warning'); }
        closeAgenEdit();
        await renderAgenList();
        updateHeader();
        showToast('Agen ' + id + ' berhasil diperbarui!', 'success');
    } catch (e) { showToast('Gagal menyimpan agen.', 'danger'); }
}

// ===== USER MANAGEMENT =====
async function getUserList() {
    try {
        var sdb = getUserDB();
        if (sdb) return await sdb.getAll();
        return await db.users.toArray();
    } catch (e) { return []; }
}

async function renderUserList() {
    var list = getEl('userList');
    if (!list) return;
    var users = await getUserList();
    var agenMap = {};
    (await getAgenList()).forEach(function (a) { agenMap[a.id] = a.nama; });
    list.innerHTML = users.map(function (u) {
        return '<div class="user-item">' +
            '<span><strong>' + esc(u.nama) + '</strong> — ' + (u.role === 'superadmin' ? 'Super Admin' : 'PIC ' + esc(agenMap[u.agen_id] || u.agen_id)) + ' — ' + (u.pin ? '*'.repeat(u.pin.length) : '') + '</span>' +
            '<div style="display:flex;gap:4px;">' +
            '<button class="btn-icon-sm btn-user-edit" data-user-id="' + u.id + '" title="Edit Nama"><i class="fas fa-pen-to-square"></i></button>' +
            '<button class="btn-icon-sm btn-user-pin" data-user-id="' + u.id + '" title="Ganti PIN"><i class="fas fa-key"></i></button>' +
            (u.role !== 'superadmin' ? '<button class="btn-icon-sm btn-user-del" data-user-id="' + u.id + '" title="Hapus"><i class="fas fa-trash-can"></i></button>' : '') +
            '</div></div>';
    }).join('');
}

// ===== DATA PENUMPANG =====
function renderPenumpang() {
    var list = getEl('penumpangList');
    if (!list) return;
    var filter = (getEl('filterPenumpang').value || '').toLowerCase();
    var passengerMap = {};
    allTickets.forEach(function (t) {
        if (t.status === 'batal' && localStorage.getItem('showArsip') === 'false') return;
        var nama = (t.nama_penumpang || '').trim();
        var hp = (t.no_hp || '').trim();
        if (!nama) return;
        var key = hp || nama;
        if (filter && !nama.toLowerCase().includes(filter) && !hp.toLowerCase().includes(filter)) return;
        if (!passengerMap[key]) passengerMap[key] = { nama: nama, hp: hp || '-', count: 0 };
        passengerMap[key].count++;
    });
    penumpangTotalData = Object.values(passengerMap).sort(function (a, b) { return b.count - a.count; });
    if (penumpangTotalData.length === 0) { list.innerHTML = '<div style="padding:24px;text-align:center;color:var(--text-secondary);"><i class="fas fa-users-slash"></i> Tidak ada data penumpang</div>'; return; }
    var totalPages = Math.ceil(penumpangTotalData.length / perPage);
    if (penumpangPage > totalPages) penumpangPage = totalPages;
    if (penumpangPage < 1) penumpangPage = 1;
    var start = (penumpangPage - 1) * perPage;
    var pageData = penumpangTotalData.slice(start, start + perPage);
    var html = '<div style="margin-bottom:8px;font-size:13px;color:var(--text-secondary);">Total penumpang: ' + penumpangTotalData.length + '</div>';
    pageData.forEach(function (p) {
        html += '<div class="penumpang-item">' +
            '<div style="display:flex;justify-content:space-between;align-items:start;">' +
            '<div><strong>' + esc(p.nama) + '</strong><br><small style="color:var(--text-secondary);">HP: ' + esc(p.hp) + '</small></div>' +
            '<span class="badge" style="background:#e8f5e9;color:#2e7d32;padding:2px 10px;border-radius:12px;font-size:13px;">' + p.count + ' tiket</span>' +
            '</div></div>';
    });
    // Pagination bar
    if (totalPages > 1) {
        html += '<div class="pagination-bar">' +
            '<button class="btn-icon-sm" id="penumpangPagePrev" ' + (penumpangPage <= 1 ? 'disabled' : '') + '><i class="fas fa-chevron-left"></i></button>' +
            '<span id="penumpangPageInfo" style="font-size:13px;color:var(--text-secondary);">Halaman ' + penumpangPage + ' dari ' + totalPages + '</span>' +
            '<button class="btn-icon-sm" id="penumpangPageNext" ' + (penumpangPage >= totalPages ? 'disabled' : '') + '><i class="fas fa-chevron-right"></i></button>' +
            '</div>';
    }
    list.innerHTML = html;
}

function downloadPenumpangCSV() {
    var map = {};
    allTickets.forEach(function (t) {
        var nama = (t.nama_penumpang || '').trim();
        var hp = (t.no_hp || '').trim();
        if (!nama) return;
        var key = hp || nama;
        if (!map[key]) map[key] = { nama: nama, hp: hp };
    });
    var data = Object.values(map).sort(function (a, b) { return a.nama.localeCompare(b.nama); });
    if (!data.length) { showToast('Tidak ada data penumpang', 'warning'); return; }

    var csv = '\uFEFFnama,nomor_hp\n';
    data.forEach(function (p) { csv += '"' + p.nama.replace(/"/g, '""') + '","' + p.hp + '"\n'; });

    var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    var link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'data_penumpang.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
    showToast('CSV diunduh: ' + data.length + ' penumpang', 'success');
}

async function showUserEdit(userId) {
    try {
        var sdb = getUserDB();
        var u = sdb ? await sdb.get(userId) : await db.users.get(userId);
        if (!u) { showToast('User tidak ditemukan', 'danger'); return; }
        getEl('editUserId').value = u.id;
        getEl('editUserName').value = u.nama;
        getEl('overlayUserEdit').style.display = 'flex';
    } catch (e) { console.error('showUserEdit error:', e); showToast('Gagal memuat data user', 'danger'); }
}

function closeUserEdit() {
    getEl('overlayUserEdit').style.display = 'none';
}

async function saveUserEdit() {
    var id = parseInt(getEl('editUserId').value);
    var nama = getEl('editUserName').value.trim();
    if (!nama) { showToast('Nama wajib diisi!', 'warning'); return; }
    try {
        var sdb = getUserDB();
        if (sdb) await sdb.update(id, { nama: nama });
        await db.users.update(id, { nama: nama });
        closeUserEdit();
        await renderUserList();
        var session = getSession();
        if (session && session.id === id) { session.nama = nama; setSession(session); }
        showToast('User berhasil diperbarui!', 'success');
    } catch (e) { showToast('Gagal menyimpan user.', 'danger'); }
}

async function addUser() {
    var nama = getEl('newUserName').value.trim();
    var role = document.querySelector('input[name="newUserRole"]:checked').value;
    var agenId = getEl('newUserAgen').value;
    var pin = getEl('newUserPin').value.trim();
    if (!nama || !pin) { showToast('Nama dan PIN wajib diisi!', 'warning'); return; }
    if (pin.length < 4 || pin.length > 6) { showToast('PIN harus 4-6 digit!', 'warning'); return; }
    if (role === 'pic' && !agenId) { showToast('Pilih agen untuk role PIC!', 'warning'); return; }
    var userData = { nama: nama, role: role, pin: pin, agen_id: role === 'pic' ? agenId : null };
    try {
        var sdb = getUserDB();
        if (sdb) await sdb.add(userData);
        try { await db.users.add(userData); } catch (dexErr) { console.warn('Dexie sync warning:', dexErr); showToast('User tersimpan di cloud, gagal sync ke lokal', 'warning'); }
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
        var sdb = getUserDB();
        if (sdb) await sdb.delete(userId);
        try { await db.users.delete(userId); } catch (ex) {}
        await renderUserList();
        showToast('User dihapus.', 'success');
    } catch (e) { showToast('Gagal menghapus user.', 'danger'); }
}

async function changeUserPin(userId) {
    try {
        var sdb = getUserDB();
        var user = sdb ? await sdb.get(userId) : await db.users.get(userId);
        if (!user) { showToast('User tidak ditemukan', 'danger'); return; }
        getEl('changePinUserId').value = userId;
        getEl('changePinNama').textContent = user.nama;
        getEl('changePinNew').value = '';
        getEl('changePinConfirm').value = '';
        getEl('overlayChangePin').style.display = 'flex';
    } catch (e) { console.error('changeUserPin error:', e); showToast('Gagal memuat data user', 'danger'); }
}

async function submitChangePin() {
    var userId = parseInt(getEl('changePinUserId').value);
    var baru = getEl('changePinNew').value.trim();
    var konfirm = getEl('changePinConfirm').value.trim();
    if (!baru || baru.length < 4 || baru.length > 6) { showToast('PIN baru harus 4-6 digit!', 'warning'); return; }
    if (baru !== konfirm) { showToast('Konfirmasi PIN tidak cocok!', 'warning'); return; }
    try {
        var sdb = getUserDB();
        if (sdb) await sdb.update(userId, { pin: baru });
        try { await db.users.update(userId, { pin: baru }); } catch (dexErr) { console.warn('Dexie sync warning:', dexErr); showToast('PIN diubah di cloud, gagal sync ke lokal', 'warning'); }
        getEl('overlayChangePin').style.display = 'none';
        showToast('PIN berhasil diubah!', 'success');
    } catch (e) { showToast('Gagal mengubah PIN.', 'danger'); }
}

// ===== BACKUP / EXPORT =====
async function exportData() {
    if (!isSuperadmin()) { showToast('Hanya super admin yang bisa export data', 'danger'); return; }
    try {
        var data = await API.read({ all: true });
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
        // Ambil semua tiket yang ada untuk cek duplicate
        var existing = await API.read({ all: true });
        var existingSet = {};
        if (existing) existing.forEach(function (t) { if (t.no_tiket) existingSet[t.no_tiket] = true; });
        var imported = 0;
        var skipped = 0;
        for (var i = 0; i < data.length; i++) {
            var item = data[i];
            if (!item.no_tiket) continue;
            if (existingSet[item.no_tiket]) { skipped++; continue; }
            var r = await API.create(item);
            if (r && r.status === 'success') imported++;
            else console.warn('Import gagal untuk', item.no_tiket, r);
        }
        showToast(imported + ' tiket diimport' + (skipped ? ' (' + skipped + ' skip duplikat)' : '') + '!', 'success');
        await loadTickets();
        renderTickets();
    } catch (e) { showToast('Gagal import data: ' + e.message, 'danger'); }
}

function loadSettings() {
    const savedWidth = localStorage.getItem('printWidth') || '58';
    const radio = document.querySelector(`input[name="printWidth"][value="${savedWidth}"]`);
    if (radio) radio.checked = true;
    applyPrintWidth(savedWidth);

    const showArsip = localStorage.getItem('showArsip') !== 'false';
    const toggle = getEl('toggleArsip');
    toggle.classList.toggle('active', showArsip);
    toggle.querySelector('.toggle-track').classList.toggle('active', showArsip);

    const showVoucher = localStorage.getItem('showVoucher') !== 'false';
    const toggleV = getEl('toggleVoucher');
    if (toggleV) {
        toggleV.classList.toggle('active', showVoucher);
        toggleV.querySelector('.toggle-track').classList.toggle('active', showVoucher);
    }

    // Printer settings
    getEl('printCopies').value = localStorage.getItem('printCopies') || '1';

    // DB mode
    const dbMode = localStorage.getItem('dbMode') || 'dexie';
    const dbRadio = document.querySelector(`input[name="dbMode"][value="${dbMode}"]`);
    if (dbRadio) dbRadio.checked = true;

    // Supabase credentials
    getEl('settingSupabaseUrl').value = localStorage.getItem('supabaseUrl') || '';
    getEl('settingSupabaseKey').value = localStorage.getItem('supabaseKey') || '';

    // Show/hide supabase fields
    getEl('supabaseFields').style.display = dbMode === 'supabase' ? 'block' : 'none';

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

function saveSettings() {
    const width = document.querySelector('input[name="printWidth"]:checked').value;
    localStorage.setItem('printWidth', width);
    const showArsip = getEl('toggleArsip').classList.contains('active');
    localStorage.setItem('showArsip', showArsip);
    const showVoucher = getEl('toggleVoucher') ? getEl('toggleVoucher').classList.contains('active') : true;
    localStorage.setItem('showVoucher', showVoucher);

    // Printer settings
    localStorage.setItem('printCopies', getEl('printCopies').value);

    // DB settings
    const dbMode = document.querySelector('input[name="dbMode"]:checked').value;
    localStorage.setItem('dbMode', dbMode);
    localStorage.setItem('supabaseUrl', getEl('settingSupabaseUrl').value.trim());
    localStorage.setItem('supabaseKey', getEl('settingSupabaseKey').value.trim());

    // Reset supabase client so it re-initializes with new credentials
    supabaseClient = null;

    applyPrintWidth(width);
    updateHeader();

    showToast('Pengaturan disimpan!', 'success');
}

function getPin() {
    return localStorage.getItem('laporanPin') || '1234';
}

async function renderLaporan() {
    try {
        var start = getEl('laporanTglStart').value;
        var end = getEl('laporanTglEnd').value;
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
    var agenMap = {};
    data.forEach(function (t) {
        var h = parseInt(t.harga) || 0;
        total += h;
        if (t.armada) {
            if (!armadaMap[t.armada]) armadaMap[t.armada] = { count: 0, total: 0 };
            armadaMap[t.armada].count++;
            armadaMap[t.armada].total += h;
        }
        var aid = t.agen_id || '-';
        if (!agenMap[aid]) agenMap[aid] = { id: aid, count: 0, total: 0 };
        agenMap[aid].count++;
        agenMap[aid].total += h;
    });

    getEl('laporanTotal').textContent = formatRupiah(total);
    getEl('laporanCount').textContent = data.length;

    // Render per agen
    var agenList = await getAgenList();
    var agenKeys = Object.keys(agenMap);
    var agenHtml = '';
    if (agenKeys.length) {
        agenHtml = agenKeys.map(function (aid) {
            var a = agenMap[aid];
            var ag = agenList.find(function (x) { return x.id === aid; });
            return '<div class="laporan-armada-item">' +
                '<span class="laporan-armada-nama">' + (ag ? esc(ag.nama) : aid) + '</span>' +
                '<span class="laporan-armada-jumlah">' + a.count + ' tiket</span>' +
                '<span class="laporan-armada-total">' + formatRupiah(a.total) + '</span>' +
                '</div>';
        }).join('');
    } else {
        agenHtml = '<p style="color:var(--text-hint);font-size:13px;">Belum ada data</p>';
    }
    getEl('laporanAgenList').innerHTML = agenHtml;

    // Render per armada
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
    } catch (e) { console.error('renderLaporan error:', e); showToast('Gagal memuat laporan', 'danger'); }
}

function getHeaderNama() {
    var user = getSession();
    if (user && user.role === 'superadmin') return 'NAURA TRANS';
    return (localStorage.getItem('namaAgen') || 'LOKET');
}

function downloadLaporanPDF() {
    var start = getEl('laporanTglStart').value;
    var end = getEl('laporanTglEnd').value;
    var agenId = getEl('agenFilterLaporan') ? getEl('agenFilterLaporan').value : '';
    var data = allTickets.filter(function (t) { return t.status === 'aktif'; });
    if (agenId) data = data.filter(function (t) { return t.agen_id === agenId; });
    if (start && end) {
        data = data.filter(function (t) {
            return t.tgl_beli && t.tgl_beli.slice(0, 10) >= start && t.tgl_beli.slice(0, 10) <= end;
        });
    }
    if (!data.length) { showToast('Tidak ada data untuk periode ini', 'warning'); return; }

    var grandTotal = 0;
    var armadaMap = {};
    var agenMap = {};
    data.forEach(function (t) {
        var h = parseInt(t.harga) || 0;
        grandTotal += h;
        var aid = t.agen_id || '-';
        if (!agenMap[aid]) agenMap[aid] = { id: aid, count: 0, total: 0 };
        agenMap[aid].count++;
        agenMap[aid].total += h;
        if (t.armada) {
            if (!armadaMap[t.armada]) armadaMap[t.armada] = { count: 0, total: 0 };
            armadaMap[t.armada].count++;
            armadaMap[t.armada].total += h;
        }
    });

    showToast('Menyiapkan PDF...', 'info');

    var namaUsaha = getHeaderNama();
    var now = new Date();
    var tglCetak = now.toLocaleDateString('id-ID', { year:'numeric', month:'long', day:'numeric' }) + ' ' + now.toLocaleTimeString('id-ID', { hour:'2-digit', minute:'2-digit' });
    var periode = (start || 'Semua tanggal') + ' s/d ' + (end || 'Semua tanggal');

    var agenKeys = Object.keys(agenMap);
    var armadaKeys = Object.keys(armadaMap);

    // Build armada rows (don't need agen names)
    var armadaRows = armadaKeys.map(function (k, i) {
        var a = armadaMap[k];
        return '<tr><td style="border:1px solid #ccc;padding:4px;">' + (i+1) + '</td><td style="border:1px solid #ccc;padding:4px;">' + esc(k) + '</td><td style="border:1px solid #ccc;padding:4px;text-align:center;">' + a.count + '</td><td style="border:1px solid #ccc;padding:4px;text-align:right;">' + formatRupiah(a.total) + '</td></tr>';
    }).join('');
    armadaRows += '<tr style="font-weight:bold;"><td style="border:1px solid #ccc;padding:4px;" colspan="2">GRAND TOTAL</td><td style="border:1px solid #ccc;padding:4px;text-align:center;">' + data.length + '</td><td style="border:1px solid #ccc;padding:4px;text-align:right;">' + formatRupiah(grandTotal) + '</td></tr>';

    getAgenList().then(function (agenList) {
        var agenRows = agenKeys.map(function (aid, i) {
            var a = agenMap[aid];
            var ag = agenList.find(function (x) { return x.id === aid; });
            var nm = ag ? ag.nama : (aid === '-' ? 'Tanpa Agen' : aid);
            return '<tr><td style="border:1px solid #ccc;padding:4px;">' + (i+1) + '</td><td style="border:1px solid #ccc;padding:4px;">' + esc(nm) + '</td><td style="border:1px solid #ccc;padding:4px;text-align:center;">' + a.count + '</td><td style="border:1px solid #ccc;padding:4px;text-align:right;">' + formatRupiah(a.total) + '</td></tr>';
        }).join('');
        agenRows += '<tr style="font-weight:bold;"><td style="border:1px solid #ccc;padding:4px;" colspan="2">GRAND TOTAL</td><td style="border:1px solid #ccc;padding:4px;text-align:center;">' + data.length + '</td><td style="border:1px solid #ccc;padding:4px;text-align:right;">' + formatRupiah(grandTotal) + '</td></tr>';

        var html = '<div id="pdf-report" style="font-family:sans-serif;padding:20px;font-size:12px;color:#000;background:#fff;width:700px;">' +
            '<h2 style="text-align:center;margin:0 0 2px;">LAPORAN KEUANGAN</h2>' +
            '<h3 style="text-align:center;margin:0 0 2px;font-size:14px;font-weight:normal;">' + esc(namaUsaha) + '</h3>' +
            '<p style="text-align:center;font-size:10px;color:#666;margin:0 0 10px;">Periode: ' + periode + ' | Cetak: ' + tglCetak + '</p>' +
            '<hr style="border:0;border-top:2px solid #000;">' +
            '<table style="width:100%;border-collapse:collapse;margin:8px 0;">' +
            '<tr><td style="padding:4px 0;"><b>Total Pendapatan:</b></td><td style="text-align:right;padding:4px 0;"><b>' + formatRupiah(grandTotal) + '</b></td></tr>' +
            '<tr><td style="padding:4px 0;"><b>Total Tiket Terjual:</b></td><td style="text-align:right;padding:4px 0;"><b>' + data.length + ' tiket</b></td></tr>' +
            '</table>' +
            '<hr style="border:0;border-top:1px solid #000;">' +

            '<h4 style="margin:10px 0 4px;">RINCIAN PER AGEN</h4>' +
            '<table style="width:100%;border-collapse:collapse;font-size:11px;margin-bottom:10px;">' +
            '<tr style="background:#eee;"><th style="border:1px solid #ccc;padding:4px;">No</th><th style="border:1px solid #ccc;padding:4px;">Nama Agen</th><th style="border:1px solid #ccc;padding:4px;text-align:center;">Tiket</th><th style="border:1px solid #ccc;padding:4px;text-align:right;">Pendapatan</th></tr>' +
            agenRows +
            '</table>' +

            '<h4 style="margin:10px 0 4px;">RINCIAN PER ARMADA</h4>' +
            '<table style="width:100%;border-collapse:collapse;font-size:11px;">' +
            '<tr style="background:#eee;"><th style="border:1px solid #ccc;padding:4px;">No</th><th style="border:1px solid #ccc;padding:4px;">Armada</th><th style="border:1px solid #ccc;padding:4px;text-align:center;">Tiket</th><th style="border:1px solid #ccc;padding:4px;text-align:right;">Pendapatan</th></tr>' +
            armadaRows +
            '</table>' +

            '<p style="text-align:center;font-size:9px;color:#999;margin-top:15px;">* Laporan digenerate otomatis ' + tglCetak + '</p>' +
            '</div>';

        var div = document.createElement('div');
        div.innerHTML = html;
        document.body.appendChild(div);

        setTimeout(function () {
            html2pdf(div, {
                margin: 10,
                filename: 'Laporan_Keuangan_' + namaUsaha.replace(/\s+/g, '_') + '_' + (start || 'semua') + '.pdf',
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 1.5, useCORS: true, logging: true },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
            }).catch(function (e) {
                console.error('PDF error:', e);
                showToast('Gagal generate PDF: ' + (e.message || 'unknown'), 'danger');
            }).then(function () {
                try { document.body.removeChild(div); } catch (ex) {}
            });
        }, 500);
    }).catch(function (e) {
        console.error('Error loading agen list:', e);
        showToast('Gagal memuat data agen', 'danger');
    });
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
        getEl('tgl_berangkat').value = getCurrentDatetime();
        await generateNoTiket();
    } catch (e) { console.error('Init error:', e); }
    document.querySelectorAll('button:not([type])').forEach(function (b) { b.type = 'button'; });
    loadSettings();
    autoFillPic();

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
        getEl('filterClear').style.display = 'none';
        currentPage = 1;
        renderTickets();
    });

    // Passenger filter
    getEl('filterPenumpang').addEventListener('input', function () {
        penumpangPage = 1;
        renderPenumpang();
    });
    getEl('penumpangList').addEventListener('click', function (e) {
        var target = e.target.closest('button');
        if (!target) return;
        if (target.id === 'penumpangPagePrev' && penumpangPage > 1) { penumpangPage--; renderPenumpang(); }
        if (target.id === 'penumpangPageNext') {
            var total = Math.ceil(penumpangTotalData.length / 10);
            if (penumpangPage < total) { penumpangPage++; renderPenumpang(); }
        }
    });

    getEl('btnDownloadCSVPenumpang').addEventListener('click', downloadPenumpangCSV);
    getEl('filterDateStart').addEventListener('change', function () { currentPage = 1; renderTickets(); });
    getEl('filterDateEnd').addEventListener('change', function () { currentPage = 1; renderTickets(); });
    getEl('filterDateClear').addEventListener('click', function () {
        getEl('filterDateStart').value = '';
        getEl('filterDateEnd').value = '';
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
            var client = supabase.createClient(url, key, { auth: { persistSession: false } });
            var { error } = await client.from('tickets').select('count', { count: 'exact', head: true });
            if (error) throw error;
            // Verify required tables exist
            var tablesOK = true;
            try {
                var { error: aErr } = await client.from('agen').select('count', { count: 'exact', head: true });
                if (aErr) { tablesOK = false; statusEl.innerHTML = '<span style="color:var(--warning)"><i class="fas fa-check-circle"></i> Koneksi OK, tapi tabel <b>agen</b> belum ada. Jalankan SQL CREATE TABLE untuk agen, users, dan tickets.</span>'; }
            } catch (te) { tablesOK = false; }
            if (tablesOK) {
                try {
                    var { error: uErr } = await client.from('users').select('count', { count: 'exact', head: true });
                    if (uErr) { tablesOK = false; statusEl.innerHTML = '<span style="color:var(--warning)"><i class="fas fa-check-circle"></i> Koneksi OK, tapi tabel <b>users</b> belum ada.</span>'; }
                } catch (te) { tablesOK = false; }
            }
            if (tablesOK) {
                statusEl.innerHTML = '<span style="color:var(--success)"><i class="fas fa-check-circle"></i> Koneksi berhasil! Semua tabel tersedia.</span>';
            }
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
    getEl('btnDownloadLaporanPDF').addEventListener('click', downloadLaporanPDF);
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
    var toggleVEl = getEl('toggleVoucher');
    if (toggleVEl) {
        toggleVEl.addEventListener('click', function () {
            var on = this.classList.toggle('active');
            this.querySelector('.toggle-track').classList.toggle('active', on);
        });
    }

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
        var editBtn = e.target.closest('.btn-agen-edit');
        if (editBtn) showAgenEdit(editBtn.dataset.agenId);
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
        var editBtn = e.target.closest('.btn-user-edit');
        if (editBtn) showUserEdit(parseInt(editBtn.dataset.userId));
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
    getEl('overlayAgenEdit').addEventListener('click', function (e) {
        if (e.target === this) closeAgenEdit();
    });
    getEl('overlayUserEdit').addEventListener('click', function (e) {
        if (e.target === this) closeUserEdit();
    });

    // ===== SUPERADMIN PIN EVENTS =====
    getEl('btnSuperPinOk').addEventListener('click', async function () {
        var pin = getEl('superPinInput').value;
        var sdb = getUserDB();
        var users;
        if (sdb) { users = await sdb.getAll(); users = users.filter(function (u) { return u.role === 'superadmin'; }); }
        else { users = await db.users.where('role').equals('superadmin').toArray(); }
        var match = users.some(function (u) { return u.pin === pin; });
        if (match) {
            getEl('overlaySuperPin').style.display = 'none';
            if (window._resolveSuperPin) { var r = window._resolveSuperPin; window._resolveSuperPin = null; r(true); }
        } else {
            getEl('superPinError').style.display = '';
        }
    });
    getEl('superPinInput').addEventListener('keydown', function (e) {
        if (e.key === 'Enter') getEl('btnSuperPinOk').click();
    });

    // ===== AGEN EDIT EVENTS =====
    getEl('btnEditAgenSave').addEventListener('click', saveAgenEdit);
    getEl('btnEditAgenAddHp').addEventListener('click', addEditAgenHpItem);

    getEl('editAgenNama').addEventListener('keydown', function (e) { if (e.key === 'Enter') getEl('editAgenAlamat').focus(); });

    // ===== USER EDIT EVENTS =====
    getEl('btnEditUserSave').addEventListener('click', saveUserEdit);
    getEl('editUserName').addEventListener('keydown', function (e) { if (e.key === 'Enter') saveUserEdit(); });

    // ===== EXPORT/IMPORT EVENTS =====
    getEl('btnExportData').addEventListener('click', exportData);
    getEl('fileImport').addEventListener('change', async function (e) {
        if (e.target.files && e.target.files[0]) await importData(e.target.files[0]);
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
        }
        updateHeader();
        await loadTickets();
    } catch (e) { console.error('Startup error:', e); }
});
