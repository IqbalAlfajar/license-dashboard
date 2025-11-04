// js/login.js
import { supabase } from './app.js'

async function checkSession() {
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
        window.location.href = "dashboard.html"
    }
}

checkSession()

document.getElementById("login-btn").addEventListener("click", async () => {
    const email = document.getElementById("email").value.trim()
    const password = document.getElementById("password").value.trim()
    const message = document.getElementById("message")

    message.textContent = ""

    if (!email || !password) {
        message.textContent = "Email dan password wajib diisi."
        return
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
        message.textContent = "❌ " + error.message
    } else {
        message.style.color = "green"
        message.textContent = "✅ Login berhasil!"

        localStorage.setItem("supabase_session", JSON.stringify(data.session))

        setTimeout(() => {
            window.location.href = "dashboard.html"
        }, 1000)
    }
})
