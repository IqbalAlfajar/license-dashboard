import { supabase } from './app.js'

// --- Generate License Key Random ---
function generateLicenseKey() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    return Array.from({ length: 20 }, () =>
        chars[Math.floor(Math.random() * chars.length)]
    ).join('-').match(/.{1,5}/g).join('-')
}

// --- Tampilkan Semua License ---
async function loadLicenses() {
    const table = document.getElementById("license-table")
    table.innerHTML = `<tr><td colspan="5" class="text-center py-4">Loading...</td></tr>`

    const { data, error } = await supabase.from('licenses').select('*').order('created_at', { ascending: false })

    if (error) {
        table.innerHTML = `<tr><td colspan="5" class="text-center text-red-500 py-4">Gagal memuat data</td></tr>`
        console.error(error)
        return
    }

    if (data.length === 0) {
        table.innerHTML = `<tr><td colspan="5" class="text-center text-gray-500 py-4">Belum ada license</td></tr>`
        return
    }

    table.innerHTML = data.map(l => `
    <tr>
      <td class="border px-3 py-2 font-mono">${l.license_key}</td>
      <td class="border px-3 py-2">${l.user_email || '-'}</td>
      <td class="border px-3 py-2 text-center">${l.valid_until || '-'}</td>
      <td class="border px-3 py-2 text-center">${l.status}</td>
      <td class="border px-3 py-2 text-center">
        <button data-id="${l.id}" class="revoke-btn bg-red-500 text-white px-3 py-1 rounded text-xs hover:bg-red-600">
          Hapus
        </button>
      </td>
    </tr>
  `).join('')

    document.querySelectorAll('.revoke-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            if (confirm('Yakin ingin menghapus license ini?')) {
                await supabase.from('licenses').delete().eq('id', btn.dataset.id)
                loadLicenses()
            }
        })
    })
}

document.getElementById("generate_license").addEventListener("click", async () => {
    const user = document.getElementById("license_user").value.trim();
    const days = parseInt(document.getElementById("license_days").value.trim());
    const status = document.getElementById("gen_status");

    if (!user || !days) {
        status.textContent = "⚠️ Lengkapi semua field!";
        status.className = "text-red-500";
        return;
    }

    status.textContent = "⏳ Generating license...";
    status.className = "text-gray-500";

    try {
        const response = await fetch("/api/generate-license", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ user, expire_days: days }),
        });

        if (!response.ok) throw new Error("Gagal generate license");
        const blob = await response.blob();

        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `license_${user}.enc`;
        a.click();
        window.URL.revokeObjectURL(url);

        status.textContent = "✅ License berhasil dibuat dan diunduh!";
        status.className = "text-green-600";
    } catch (err) {
        console.error(err);
        status.textContent = "❌ Gagal generate license!";
        status.className = "text-red-600";
    }
});


// --- Tambah License Baru ---
document.getElementById('add-license-btn').addEventListener('click', async () => {

    const validUntil = document.getElementById('license-valid').value
    const key = generateLicenseKey()

    if (!email || !validUntil) {
        alert("Isi semua field terlebih dahulu!")
        return
    }

    const { error } = await supabase.from('licenses').insert([
        {
            license_key: key,
            valid_until: validUntil,
            status: 'active'
        }
    ])

    if (error) {
        alert("Gagal menambah license: " + error.message)
    } else {
        alert("License berhasil dibuat:\n" + key)
        loadLicenses()
    }
})

// --- Download ---
// contoh: panggil endpoint dan download file license.enc
async function generateAndDownload(user, days) {
    const resp = await fetch('/api/generate-license', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user, expire_days: days })
    });
    if (!resp.ok) throw new Error('Generate failed');
    const blob = await resp.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `license_${user}.enc`;
    a.click();
    URL.revokeObjectURL(url);
}
// ----------------


// --- Logout ---
document.getElementById("logout-btn").addEventListener("click", async () => {
    await supabase.auth.signOut()
    localStorage.removeItem("supabase_session")
    window.location.href = "index.html"
})

// --- Inisialisasi ---
loadLicenses()
