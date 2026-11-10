require("dotenv").config();
const express = require("express");
const bwipjs = require("bwip-js");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3003;

// Fungsi membaca kode voucher dari file vouchers.txt atau ENV
function getVouchers() {
    if (process.env.VOUCHERS) {
        return process.env.VOUCHERS.split(",").map(v => v.trim()).filter(Boolean);
    }
    const filePath = path.join(__dirname, "vouchers.txt");
    if (fs.existsSync(filePath)) {
        return fs.readFileSync(filePath, "utf8")
            .split("\n")
            .map(v => v.trim())
            .filter(v => v && !v.startsWith("#"));
    }
    return [];
}

// Endpoint generate gambar Barcode Code-128
app.get("/barcode/:code", (req, res) => {
    const textCode = req.params.code;
    bwipjs.toBuffer({
        bcid: "code128",
        text: textCode,
        scale: 3,
        height: 10,
        includetext: true,
        textxalign: "center",
    }, (err, png) => {
        if (err) {
            res.status(500).send("Gagal membuat barcode");
        } else {
            res.writeHead(200, {
                "Content-Type": "image/png",
                "Content-Length": png.length
            });
            res.end(png);
        }
    });
});

// Halaman Utama Dashboard Barcode
app.get("/", (req, res) => {
    const vouchers = getVouchers();

    let htmlCards = vouchers.length > 0 
        ? vouchers.map((v, index) => `
            <div class="voucher-card">
                <div class="badge">Voucher #${index + 1}</div>
                <p class="code-title">Kode: <b>${v}</b></p>
                <div class="barcode-wrapper">
                    <img src="/barcode/${v}" alt="Barcode ${v}">
                </div>
            </div>
        `).join("")
        : `<p style="color: #888;">Belum ada data voucher di file vouchers.txt.</p>`;

    res.send(`
        <!DOCTYPE html>
        <html lang="id">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Voucher Alfamart Barcode</title>
            <style>
                * { box-sizing: border-box; }
                body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background-color: #f4f6f9; margin: 0; padding: 20px; text-align: center; color: #333; }
                h2 { color: #d9534f; margin: 10px 0 5px 0; font-size: 24px; }
                p.sub { color: #666; margin-bottom: 25px; font-size: 14px; }
                .container { display: flex; flex-wrap: wrap; justify-content: center; gap: 20px; max-width: 900px; margin: 0 auto; }
                .voucher-card { background: white; padding: 18px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.08); width: 280px; text-align: center; border: 1px solid #e1e4e8; position: relative; }
                .badge { background: #e6f4ea; color: #137333; display: inline-block; padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: bold; margin-bottom: 8px; }
                .code-title { margin: 5px 0 12px 0; font-size: 15px; color: #444; letter-spacing: 0.5px; }
                .barcode-wrapper { background: #ffffff; border: 1px solid #eee; padding: 10px; border-radius: 8px; }
                .barcode-wrapper img { width: 100%; height: auto; display: block; }
            </style>
        </head>
        <body>
            <h2>🎟️ Voucher Alfamart Ready Scan</h2>
            <p class="sub">Tunjukkan halaman ini ke kasir untuk di-scan langsung dari HP.</p>
            <div class="container">
                ${htmlCards}
            </div>
        </body>
        </html>
    `);
});

app.listen(PORT, () => {
    console.log(`========================================`);
    console.log(`🚀 Barcode Web Server Aktif di Port ${PORT}`);
    console.log(`🌐 Akses: http://localhost:${PORT}`);
    console.log(`========================================`);
});
