const db = new Dexie('tiketBus');
db.version(1).stores({
    tickets: 'no_tiket, tgl_beli, nama_penumpang, armada, status'
});

const API = {
    async read() {
        try {
            return await db.tickets.toArray();
        } catch (err) {
            console.error('DB Error:', err);
            showToast('Gagal membaca data.', 'danger');
            return null;
        }
    },

    async create(data) {
        try {
            await db.tickets.add(data);
            return { status: 'success' };
        } catch (err) {
            console.error('DB Error:', err);
            showToast('Gagal menyimpan data.', 'danger');
            return null;
        }
    },

    async update(no_tiket, field, value) {
        try {
            await db.tickets.update(no_tiket, { [field]: value });
            return { status: 'success' };
        } catch (err) {
            console.error('DB Error:', err);
            showToast('Gagal mengupdate data.', 'danger');
            return null;
        }
    },

    async delete(no_tiket) {
        try {
            await db.tickets.delete(no_tiket);
            return { status: 'success' };
        } catch (err) {
            console.error('DB Error:', err);
            showToast('Gagal menghapus data.', 'danger');
            return null;
        }
    },

    async dummy() {
        try {
            await db.tickets.clear();
            const names = ['BUDI SANTOSO', 'SITI NURHALIZA', 'AJAT ROSADI', 'DEWI LESTARI', 'HENDRA GUNAWAN', 'RINA MARLINA', 'AGUS SUPRIYATNO', 'SARI DEVI', 'TEGUH PRASETYO', 'ANITA KUSUMA', 'DIMAS ARDIANTO', 'RATNA SARI', 'FAJAR NUGROHO', 'MEGA WATI', 'ADI SAPUTRA', 'LINA MARDIANA', 'BAMBANG HERMANTO', 'YUNI ASTUTI', 'EKO PRASETYO', 'SRI WAHYUNI'];
            const armadas = ['PO JASA MARGA', 'PO SUMBER ALAM', 'PO HARYANTO', 'PO BUDI PRIMA', 'PO GARUDA MAS'];
            const terminals = ['PURWAKARTA', 'KAMPUNG RAMBUTAN', 'LEUWI PANJANG', 'CICAHEUM', 'PURABAYA', 'GIWANGAN', 'TIRTONADI', 'TERBOYO', 'BATUJAYA', 'BANJAR'];
            const kursi = ['A01','A02','A03','A04','A05','B01','B02','B03','C01','C02','D01','D02'];
            const now = new Date();
            for (let i = 0; i < 20; i++) {
                const d = new Date(now);
                d.setDate(d.getDate() - Math.floor(Math.random() * 7));
                const off = d.getTimezoneOffset();
                const tglBeli = new Date(d.getTime() - off * 60000).toISOString().slice(0, 10) + 'T08:' + String(Math.floor(Math.random() * 59)).padStart(2, '0');
                const tglBerangkat = new Date(d.getTime() + 86400000 * (1 + Math.floor(Math.random() * 3))).toISOString().slice(0, 10) + 'T' + String(7 + Math.floor(Math.random() * 12)).padStart(2, '0') + ':' + String(Math.floor(Math.random() * 59)).padStart(2, '0');
                const noTiket = 'TKT-' + tglBeli.slice(0, 10).replace(/-/g, '') + '-' + String(i + 1).padStart(4, '0');
                await db.tickets.add({
                    no_tiket: noTiket,
                    tgl_beli: tglBeli,
                    nama_penumpang: names[i % names.length],
                    no_hp: String(81200000000 + i + Math.floor(Math.random() * 100)),
                    armada: armadas[i % armadas.length],
                    keberangkatan: terminals[i % terminals.length],
                    kedatangan: terminals[(i + 4) % terminals.length],
                    no_kursi: kursi[i % kursi.length],
                    harga: String(75000 + Math.floor(Math.random() * 200000)),
                    tgl_berangkat: tglBerangkat,
                    pic_agen: 'PETUGAS ' + (Math.floor(i / 4) + 1),
                    status: 'aktif'
                });
            }
            return { status: 'success' };
        } catch (err) {
            console.error('DB Error:', err);
            return { status: 'error', message: err.message };
        }
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
        const all = await API.read();
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

function showTab(tab) {
    const btns = {
        tambah: getEl('tabTambah'),
        daftar: getEl('tabDaftar'),
        laporan: getEl('tabLaporan'),
        pengaturan: getEl('tabPengaturan')
    };
    const secs = {
        tambah: getEl('sectionForm'),
        daftar: getEl('sectionDaftar'),
        laporan: getEl('sectionLaporan'),
        pengaturan: getEl('sectionPengaturan')
    };

    for (const k in btns) {
        btns[k].classList.toggle('active', k === tab);
        secs[k].classList.toggle('active', k === tab);
    }

    if (tab === 'laporan') {
        if (laporanAuthed) {
            getEl('laporanPinGate').style.display = 'none';
            getEl('laporanContent').style.display = '';
            renderLaporan();
        } else {
            getEl('laporanPinGate').style.display = '';
            getEl('laporanContent').style.display = 'none';
        }
    }
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
        showToast('Tiket berhasil disimpan!', 'success');
        e.target.reset();
        await generateNoTiket();
        getEl('tgl_beli').value = getCurrentDatetime();
        getEl('tgl_berangkat').value = getTomorrowDate();
        await loadTickets();
        currentPage = 1;
        if (getEl('tabDaftar').classList.contains('active')) {
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
    const hpAgen = localStorage.getItem('hpAgen') || '';

    let headerInfo = `<h3 style="font-weight:700">${up(namaAgen)}</h3>`;
    if (alamatAgen) headerInfo += `<p class="text-center" style="font-weight:700;font-size:8px;margin:0.5mm 0;">${up(alamatAgen)}</p>`;
    if (hpAgen) headerInfo += `<p class="text-center" style="font-weight:700;font-size:8px;margin:0.5mm 0;">📞 ${esc(hpAgen)}</p>`;

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
    const hp = localStorage.getItem('hpAgen') || '';

    const el = getEl('headerContent');
    let html = `<h1><i class="fas fa-bus"></i> ${esc(nama)}</h1>`;
    if (alamat) html += `<p class="header-alamat"><i class="fas fa-location-dot"></i> ${esc(alamat)}</p>`;
    if (hp) html += `<p class="header-hp"><i class="fas fa-phone"></i> ${esc(hp)}</p>`;
    el.innerHTML = html;
}

function loadSettings() {
    getEl('settingNama').value = localStorage.getItem('namaAgen') || '';
    getEl('settingAlamat').value = localStorage.getItem('alamatAgen') || '';
    getEl('settingHp').value = localStorage.getItem('hpAgen') || '';

    const savedWidth = localStorage.getItem('printWidth') || '58';
    const radio = document.querySelector(`input[name="printWidth"][value="${savedWidth}"]`);
    if (radio) radio.checked = true;
    applyPrintWidth(savedWidth);

    const showArsip = localStorage.getItem('showArsip') !== 'false';
    const toggle = getEl('toggleArsip');
    toggle.classList.toggle('active', showArsip);
    toggle.querySelector('.toggle-track').classList.toggle('active', showArsip);

    updateHeader();
}

function applyPrintWidth(width) {
    document.body.classList.remove('print-58mm', 'print-80mm');
    document.body.classList.add('print-' + width + 'mm');
}

function saveSettings() {
    const nama = getEl('settingNama').value.trim();
    const alamat = getEl('settingAlamat').value.trim();
    const hp = getEl('settingHp').value.trim();
    const width = document.querySelector('input[name="printWidth"]:checked').value;

    if (nama) localStorage.setItem('namaAgen', nama);
    else localStorage.removeItem('namaAgen');
    if (alamat) localStorage.setItem('alamatAgen', alamat);
    else localStorage.removeItem('alamatAgen');
    if (hp) localStorage.setItem('hpAgen', hp);
    else localStorage.removeItem('hpAgen');

    localStorage.setItem('printWidth', width);
    const showArsip = getEl('toggleArsip').classList.contains('active');
    localStorage.setItem('showArsip', showArsip);
    applyPrintWidth(width);
    updateHeader();

    showToast('Pengaturan disimpan!', 'success');
}

function getPin() {
    return localStorage.getItem('laporanPin') || '1234';
}

function renderLaporan() {
    const start = getEl('laporanTglStart').value;
    const end = getEl('laporanTglEnd').value;

    let data = allTickets.filter(function (t) { return t.status === 'aktif'; });

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
    getEl('tgl_beli').value = getCurrentDatetime();
    getEl('tgl_berangkat').value = getTomorrowDate();
    await generateNoTiket();
    loadSettings();

    getEl('tabTambah').addEventListener('click', function () { showTab('tambah'); });
    getEl('tabDaftar').addEventListener('click', async function () {
        showTab('daftar');
        await loadTickets();
        currentPage = 1;
        renderTickets();
    });
    getEl('tabPengaturan').addEventListener('click', function () { showTab('pengaturan'); });
    getEl('tabLaporan').addEventListener('click', function () { showTab('laporan'); });

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

    await loadTickets();
});
