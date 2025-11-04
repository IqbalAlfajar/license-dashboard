// /api/generate-license.js
import crypto from "crypto";
import fernet from "fernet";

export default async function handler(req, res) {
    if (req.method !== "POST")
        return res.status(405).json({ error: "Only POST allowed" });

    try {
        const { user, expire_days } = req.body;
        if (!user || !expire_days)
            return res.status(400).json({ error: "Missing parameters" });

        const FERNET_KEY = process.env.FERNET_KEY;
        const HMAC_SECRET = process.env.HMAC_SECRET;

        if (!FERNET_KEY || !HMAC_SECRET)
            return res.status(500).json({ error: "Server keys not configured" });

        // 1️⃣ Buat payload license
        const payload = {
            user,
            expire: new Date(Date.now() + expire_days * 24 * 3600 * 1000).toISOString(),
            created: new Date().toISOString(),
            license_id: crypto.randomUUID(),
        };

        // 2️⃣ Enkripsi dengan Fernet
        const key = new fernet.Secret(FERNET_KEY);
        const token = new fernet.Token({
            secret: key,
            time: Date.now(),
            iv: crypto.randomBytes(16),
            ttl: 0,
        });
        const encrypted = token.encode(JSON.stringify(payload));

        // 3️⃣ Tambahkan HMAC untuk verifikasi integritas
        const hmac = crypto
            .createHmac("sha256", HMAC_SECRET)
            .update(encrypted)
            .digest("hex");

        const finalLicense = JSON.stringify({
            data: encrypted,
            hmac,
        });

        // 4️⃣ Kirim hasil sebagai file license.enc
        res.setHeader("Content-Disposition", `attachment; filename="license_${user}.enc"`);
        res.setHeader("Content-Type", "application/octet-stream");
        res.status(200).send(finalLicense);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Internal server error: " + err.message });
    }
}
