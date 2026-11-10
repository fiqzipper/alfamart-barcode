const express = require('express');
const bwipjs = require('bwip-js');
const fs = require('fs');
const path = require('path');
const fileUpload = require('express-fileupload');

const app = express();
const PORT = process.env.PORT || 3003;

// --- KONFIGURASI ADMIN ---
const ADMIN_PASSWORD = 'adminrahasia123';
// -------------------------

app.use(express.urlencoded({ extended: true }));
app.use(fileUpload());

const VOUCHER_FILE = path.join(__dirname, 'vouchers.txt');

let activeSessions = {};

function generateRandomSlug() {
    return 'srv-' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 8);
}

app.get('/', (req, res) => {
    res.status(403).send('<h2 style="font-family:sans-serif;text-align:center;margin-top:50px;">403 Forbidden: Access Denied</h2>');
});

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

app.get('/v/:slug', (req, res) => {
    const slug = req.params.slug;
    const vouchers = activeSessions[slug];

    if (!vouchers) {
        return res.status(404).send(`
            <!DOCTYPE html>
            <html lang="id">
            <head><title>Link Kadaluarsa</title><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
            <body style="font-family:sans-serif;text-align:center;padding-top:50px;background:#f9f9f9;">
                <h2 style="color:#d9534f;">❌ Link Tidak Valid atau Sudah Berakhir</h2>
                <p>Link voucher ini sudah tidak aktif atau salah.</p>
            </body>
            </html>
        `);
    }

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
        <div class="grid">${cardsHtml}</div>
    </body>
    </html>
    `;
    res.send(html);
});

app.get('/admin', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>Admin Panel - Generate Voucher Link</title>
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
            <h2>🔑 Buat Link Voucher Unik Baru</h2>
            <form action="/admin/update" method="POST" enctype="multipart/form-data">
                <label>Password Admin:</label>
                <input type="password" name="password" required placeholder="Masukkan Password Admin">
                <hr style="margin: 15px 0;">
                <label>Paste Kode Voucher (1 Kode per baris untuk Customer ini)</label>
                <textarea name="voucher_text" rows="8" placeholder="B0498FE98BZT&#10;B6196CD5CRC0"></textarea>
                <label>Atau Upload File .txt</label>
                <input type="file" name="voucher_file" accept=".txt">
                <button type="submit">🚀 Generate Link Unik Baru</button>
            </form>
        </div>
    </body>
    </html>
    `);
});

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
        return res.status(400).send('<h3>⚠️ Harap isi teks kode voucher atau upload file!</h3><a href="/admin">Kembali</a>');
    }

    const vouchersList = content.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    
    if (vouchersList.length === 0) {
        return res.status(400).send('<h3>⚠️ Daftar voucher kosong!</h3><a href="/admin">Kembali</a>');
    }

    const newSlug = generateRandomSlug();
    activeSessions[newSlug] = vouchersList;

    const host = req.get('host');
    const protocol = req.protocol;
    const generatedLink = `${protocol}://${host}/v/${newSlug}`;

    res.send(`
    <!DOCTYPE html>
    <html>
    <head><title>Link Berhasil Dibuat</title><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
    <body style="font-family:sans-serif;padding:30px;max-width:500px;margin:0 auto;background:#f9f9f9;text-align:center;">
        <div style="background:white;padding:25px;border-radius:10px;box-shadow:0 2px 10px rgba(0,0,0,0.1);">
            <h2 style="color:#2e7d32;">✅ Link Unik Customer Berhasil Dibuat!</h2>
            <p style="font-size:14px;color:#555;">Kirim link di bawah ini khusus ke customer tersebut:</p>
            <input type="text" id="linkBox" value="${generatedLink}" readonly style="width:100%;padding:10px;font-size:14px;text-align:center;background:#eee;border:1px solid #ccc;border-radius:5px;margin-bottom:15px;" />
            <br>
            <button onclick="navigator.clipboard.writeText(document.getElementById('linkBox').value); alert('Link berhasil dicopy!');" style="background:#2e7d32;color:white;border:none;padding:10px 20px;font-weight:bold;border-radius:5px;cursor:pointer;margin-right:10px;">📋 Copy Link</button>
            <a href="${generatedLink}" target="_blank" style="display:inline-block;background:#e11932;color:white;text-decoration:none;padding:10px 20px;font-weight:bold;border-radius:5px;">👁️ Lihat Web</a>
            <br><br>
            <a href="/admin" style="color:#666;font-size:14px;">&larr; Buat Link untuk Customer Lain</a>
        </div>
    </body>
    </html>
    `);
});

app.listen(PORT, () => console.log(`Server aktif di port ${PORT}`));
