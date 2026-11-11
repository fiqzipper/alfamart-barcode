const express = require('express');
const bwipjs = require('bwip-js');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3003;

app.use(express.urlencoded({ extended: true }));

// =========================================================================
// 📌 DATABASE LINK ACAK PERMANEN
// Tinggal tambahin kode acak (slug) dan daftar voucher customer di sini,
// lalu Commit ke GitHub. Dijamin aman, gak bakal ilang & susah dilacak!
// =========================================================================
const customerLinks = {
    // Contoh link acak untuk Customer A (Misal linknya: /v/srv-8x9q2m4p7k)
    "srv-8x9q2m4p7k": [
        "B0498FE98BZT",
        "B6196CD5CRC0"
    ],
    
    // Contoh link acak untuk Customer B (Misal linknya: /v/srv-3p9f2w1q5z)
    "srv-3p9f2w1q5z": [
        "VOUCHERXYZ111",
        "VOUCHERXYZ222"
    ]
    
    // Cara tambah baru: tinggal copy format di atas ke bawah sini ya, bro!
};
// =========================================================================

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
    const vouchers = customerLinks[slug];

    if (!vouchers) {
        return res.status(404).send(`
            <!DOCTYPE html>
            <html lang="id">
            <head><title>Link Tidak Ditemukan</title><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
            <body style="font-family:sans-serif;text-align:center;padding-top:50px;background:#f9f9f9;">
                <h2 style="color:#d9534f;">❌ Link Tidak Valid atau Salah</h2>
                <p>Link voucher ini tidak terdaftar di sistem.</p>
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

app.listen(PORT, () => console.log(`Server aktif di port ${PORT}`));
