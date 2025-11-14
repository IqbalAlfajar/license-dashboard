import { supabase } from './app.js'

document.addEventListener("DOMContentLoaded", async () => {

  // --- Fungsi memuat semua license dari database ---
  async function loadLicenses() {
    const table = document.getElementById("license-table");
    table.innerHTML = `<tr><td colspan="5" class="text-center py-4">Loading...</td></tr>`;

    const { data, error } = await supabase
      .from('licenses')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error(error);
      table.innerHTML = `<tr><td colspan="5" class="text-center text-red-500 py-4">Gagal memuat data</td></tr>`;
      return;
    }

    if (!data.length) {
      table.innerHTML = `<tr><td colspan="5" class="text-center text-gray-500 py-4">Belum ada license</td></tr>`;
      return;
    }

    // Isi tabel dengan data dari Supabase
    table.innerHTML = data.map(l => `
      <tr>
        <td class="border px-3 py-2 font-mono">${l.user_email}</td>
        <td class="border px-3 py-2">${new Date(l.valid_until).toLocaleDateString()}</td>
        <td class="border px-3 py-2 text-center">${l.status}</td>
        <td class="border px-3 py-2 text-center">
          <button data-id="${l.id}" class="download-btn bg-blue-500 text-white px-3 py-1 rounded text-xs hover:bg-blue-600">
            Download
          </button>
          <button data-id="${l.id}" class="delete-btn bg-red-500 text-white px-3 py-1 rounded text-xs hover:bg-red-600">
            Hapus
          </button>
        </td>
      </tr>
    `).join('');

    // --- Tombol Download ---
    document.querySelectorAll('.download-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        const { data, error } = await supabase
          .from('licenses')
          .select('license_key, user_email')
          .eq('id', id)
          .single();

        if (error) {
          alert("Gagal mengambil license!");
          console.error(error);
          return;
        }

        const blob = new Blob([data.license_key], { type: "application/octet-stream" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `license_${data.user_email}.enc`;
        a.click();
        window.URL.revokeObjectURL(url);
      });
    });

    // --- Tombol Hapus ---
    document.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        console.log("Menghapus license ID:", id);

        if (!id) return alert("❌ ID license tidak ditemukan");

        if (confirm("Yakin ingin hapus license ini?")) {
          const { error } = await supabase.from('licenses').delete().eq('id', id);

          if (error) {
            alert("Gagal menghapus license: " + error.message);
            console.error(error);
          } else {
            alert("✅ License berhasil dihapus!");
            await loadLicenses(); // reload tabel
          }
        }
      });
    });
  }

  // --- Generate License ---
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
      const res = await fetch("/api/generate-license", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user, expire_days: days }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Gagal generate license");

      status.textContent = "✅ License berhasil dibuat!";
      status.className = "text-green-600";
      loadLicenses();
    } catch (err) {
      console.error(err);
      status.textContent = "❌ " + err.message;
      status.className = "text-red-600";
    }
  });

  // --- Logout ---
  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      const { error } = await supabase.auth.signOut();
      localStorage.removeItem("supabase_session");

      if (!error) {
        alert("Logout berhasil!");
        window.location.href = "index.html";
      } else {
        alert("Logout gagal: " + error.message);
      }
    });
  } else {
    console.warn("⚠️ Logout button not found in DOM.");
  }

  // --- Jalankan saat halaman dibuka ---
  loadLicenses();
});
