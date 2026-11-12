const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

const DATA_FILE = path.join(__dirname, 'data.json');

function readData() {
    if (!fs.existsSync(DATA_FILE)) {
        try {
            fs.writeFileSync(DATA_FILE, JSON.stringify([], null, 2));
        } catch (e) {
            return [];
        }
        return [];
    }
    try {
        const content = fs.readFileSync(DATA_FILE, 'utf8');
        return content ? JSON.parse(content) : [];
    } catch (e) {
        return [];
    }
}

function writeData(data) {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    } catch (e) {
        console.error("Gagal menulis data:", e);
    }
}

app.get('/api/pengiriman', (req, res) => {
    res.json(readData());
});

app.post('/api/pengiriman', (req, res) => {
    try {
        const list = readData();
        const invoiceNum = `INV-${Date.now().toString().slice(-6)}`;
        const newItem = {
            id: Date.now(),
            invoiceNumber: invoiceNum,
            tanggal: req.body.tanggal || new Date().toISOString().split('T')[0],
            kecamatan: req.body.kecamatan,
            kios: req.body.kios,
            komoditas: req.body.komoditas,
            qty: req.body.qty,
            statusBayar: req.body.statusBayar
        };
        list.push(newItem);
        writeData(list);
        res.json({ success: true, data: newItem });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Export CSV 32 Kolom Mekari Jurnal
app.get('/api/export-jurnal', (req, res) => {
    const list = readData();
    const headers = [
        "*Customer", "Email", "BillingAddress", "ShippingAddress", "*InvoiceDate", 
        "*DueDate", "ShippingDate", "ShipVia", "TrackingNo", "CustomerRefNo", 
        "*InvoiceNumber", "Message", "Memo", "*ProductName", "Description", 
        "*Quantity", "*Unit", "*UnitPrice", "ProductDiscountRate(%)", "InvoiceDiscount(value or %)", 
        "TaxName", "TaxRate(%)", "ShippingFee", "WitholdingAccountCode", "WitholdingAmount(value or %)", 
        "#paid?(yes/no)", "#PaymentMethod", "#PaidToAccountCode", "Tags (use ; to separate tags)", "WarehouseName", 
        "#currency code(example: IDR, USD, CAD)", "Custom_Fields_[Nama_Fields]"
    ];

    let csv = headers.join(",") + "\n";

    list.forEach(item => {
        let prefix = item.kecamatan === 'WONOSALAM' ? 'WNS' : (item.kecamatan === 'GUNTUR' ? 'GNT' : 'DMK');
        let prodCode = '';
        if (item.komoditas === 'UREA') prodCode = `${prefix}-UR50`;
        else if (item.komoditas === 'NPK') prodCode = `${prefix}-NPK50`;
        else if (item.komoditas === 'POG') prodCode = `${prefix}-POG40`;

        let invDate = new Date(item.tanggal);
        let dueDate = new Date(invDate);
        dueDate.setDate(dueDate.getDate() + 30);
        let dueDateStr = dueDate.toISOString().split('T')[0];

        const row = [
            `"${item.kios}"`, "", "", "", item.tanggal,
            dueDateStr, item.tanggal, "", "", "",
            item.invoiceNumber, `"Terima kasih atas pembelian di perusahaan kami."`, "", prodCode, "",
            item.qty, "SAK", "", "", "",
            "", "", "", "", "",
            "no", "", "", "", "PI-GUDANG PENYANGGA",
            "IDR", ""
        ];
        csv += row.join(",") + "\n";
    });

    res.header('Content-Type', 'text/csv');
    res.attachment(`SalesInvoice_Import_${new Date().toISOString().split('T')[0]}.csv`);
    res.send(csv);
});

if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`Server jalan di http://localhost:${PORT}`);
    });
}

module.exports = app;