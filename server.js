const express = require('express');
const bwipjs = require('bwip-js');
const fs = require('fs');
const path = require('path');
const fileUpload = require('express-fileupload');

const app = express();
const PORT = process.env.PORT || 3003;

// --- KONFIGURASI RAHASIA (Silakan Ganti Sesuai Keinginan) ---
const SECRET_SLUG = 'srv-dbpcvgon74is73djtsh0'; // Token URL Rahasia Customer
const ADMIN_PASSWORD = 'adminrahasia123';        // Password Admin Upload
// -------------------------------------------------------------

app.use(express.urlencoded({ extended: true }));
app.use(fileUpload());

const VOUCHER_FILE = path.join(__dirname, 'vouchers.txt');

// Helper: Read vouchers
function getVouchers() {
    if (!fs.existsSync(VOUCHER_FILE)) return [];
    return fs.readFileSync(VOUCHER_FILE, 'utf8')
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);
}

// 1. Homepage Utama (Biar orang iseng gak bisa ngeliat)
app.get('/', (req, res) => {
    res.status(403).send('<h2 style="font-family:sans-serif;text-align:center;margin-top:50px;">403 Forbidden: Access Denied</h2>');
});

// 2. Endpoint Barcode Image Generator
app.get('/barcode/:code', async (req, res) => {
    try {
        const png = await bwipjs.toBuffer({
            bcid: 'code128',
            text: req.params.code,
            scale: 3,
            height: 10,
            includetext: true,
            textxalign: 'center',
        });
        res.type('png').send(png);
    } catch (err) {
        res.status(500).send('Error generating barcode');
    }
});

// 3. Tampilan Dashboard Customer (Hanya bisa dibuka lewat URL Rahasia)
app.get(`/${SECRET_SLUG}`, (req, res) => {
    const vouchers = getVouchers();

    let cardsHtml = vouchers.map((code, index) => `
        <div class="card">
            <div class="badge">Voucher #${index + 1}</div>
            <div class="code-text">Kode: <strong>${code}</strong></div>
            <img src="/barcode/${code}" alt="${code}">
        </div>
    `).join('');

    const html = `
    <!DOCTYPE html>
    <html lang="id">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Voucher Alfamart Ready Scan</title>
        <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f6f9; margin: 0; padding: 20px; }
            .header { text-align: center; margin-bottom: 25px; }
            .header h1 { color: #e11932; margin-bottom: 5px; font-size: 24px; }
            .header p { color: #666; font-size: 14px; margin: 0; }
            .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 15px; max-width: 1000px; margin: 0 auto; }
            .card { background: white; padding: 15px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); text-align: center; border: 1px solid #eaeaea; }
            .badge { background: #e8f5e9; color: #2e7d32; font-weight: bold; font-size: 12px; padding: 4px 10px; border-radius: 20px; display: inline-block; margin-bottom: 8px; }
            .code-text { font-size: 14px; color: #333; margin-bottom: 10px; }
            .card img { max-width: 100%; height: auto; display: block; margin: 0 auto; }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>🎟️ Voucher Alfamart Ready Scan</h1>
            <p>Tunjukkan halaman ini ke kasir untuk di-scan langsung dari HP.</p>
        </div>
        <div class="grid">${cardsHtml || '<p style="grid-column:1/-1;text-align:center;">Tidak ada voucher aktif.</p>'}</div>
    </body>
    </html>
    `;
    res.send(html);
});

// 4. Halaman Admin Upload (Khusus Lu)
app.get('/admin', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>Admin Panel - Update Voucher</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            body { font-family: sans-serif; padding: 20px; max-width: 500px; margin: 0 auto; background: #f9f9f9; }
            .box { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
            input, textarea, button { width: 100%; margin-bottom: 12px; padding: 10px; border-radius: 5px; border: 1px solid #ccc; box-sizing: border-box; }
            button { background: #e11932; color: white; border: none; font-weight: bold; cursor: pointer; }
        </style>
    </head>
    <body>
        <div class="box">
            <h2>🔑 Admin Panel Voucher</h2>
            <form action="/admin/update" method="POST" enctype="multipart/form-data">
                <label>Password Admin:</label>
                <input type="password" name="password" required placeholder="Masukkan Password Admin">
                
                <hr style="margin: 15px 0;">
                
                <label>Option A: Paste Kode Voucher (1 Kode per baris)</label>
                <textarea name="voucher_text" rows="8" placeholder="B0498FE98BZT&#10;B6196CD5CRC0"></textarea>
                
                <label>Option B: Upload File vouchers.txt</label>
                <input type="file" name="voucher_file" accept=".txt">
                
                <button type="submit">💾 Simpan & Update Voucher</button>
            </form>
        </div>
    </body>
    </html>
    `);
});

// 5. Action Process Upload Admin
app.post('/admin/update', (req, res) => {
    const { password, voucher_text } = req.body;

    if (password !== ADMIN_PASSWORD) {
        return res.status(401).send('<h3>❌ Password Admin Salah!</h3><a href="/admin">Kembali</a>');
    }

    let content = '';

    if (req.files && req.files.voucher_file) {
        content = req.files.voucher_file.data.toString('utf8');
    } else if (voucher_text && voucher_text.trim() !== '') {
        content = voucher_text;
    } else {
        return res.status(400).send('<h3>⚠️ Harap isi teks kode voucher atau upload file txt!</h3><a href="/admin">Kembali</a>');
    }

    fs.writeFileSync(VOUCHER_FILE, content.trim());
    res.send(`<h3>✅ Berhasil Update Voucher!</h3><p><a href="/${SECRET_SLUG}" target="_blank">Lihat Hasil Web Voucher Customer</a> | <a href="/admin">Kembali ke Admin</a></p>`);
});

app.listen(PORT, () => console.log(`Server aktif di port ${PORT}`));
