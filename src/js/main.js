document.addEventListener("DOMContentLoaded", () => {
  console.log("ritiriamoauto.it ready");

  // anno footer
  const y = document.getElementById("y");
  if (y) y.textContent = new Date().getFullYear();

  // ✅ ENDPOINT nuovo (multi-client)
  const ENDPOINT =
    "https://script.google.com/macros/s/AKfycbxvXF1UYa7sY78X3tzDFGMdrcMDAntpf9-s3d3COMpf6DxeIHYLSbloeeDFAWswuUoZ0Q/exec";

  const form = document.getElementById("leadForm");
  if (!form) return console.error("leadForm non trovato");

  const btn = form.querySelector('button[type="submit"]');
  const msg = document.getElementById("formMsg");

  // -------- Multi uploader state (thumbnails) --------
  const fileInput = document.getElementById("librettoInput");
  const uplGrid = document.getElementById("uplGrid");
  const uplCount = document.getElementById("uplCount");
  const uplClear = document.getElementById("uplClear");
  const uplHint = document.getElementById("uplHint");

  // ---------------- CAMERA / GALLERY BUTTONS ----------------
  const btnCamera = document.getElementById("btnCamera");
  const btnGallery = document.getElementById("btnGallery");

  // SCATTA FOTO (apre direttamente la fotocamera)
  if (btnCamera && fileInput) {
    btnCamera.addEventListener("click", () => {
      // una foto alla volta (UX migliore su telefono)
      fileInput.removeAttribute("multiple");
      fileInput.setAttribute("capture", "environment");
      fileInput.click();
    });
  }

  // GALLERIA (foto già presenti, anche multiple)
  if (btnGallery && fileInput) {
    btnGallery.addEventListener("click", () => {
      fileInput.setAttribute("multiple", "multiple");
      fileInput.removeAttribute("capture");
      fileInput.click();
    });
  }

  /** @type {{file: File, url: string}[]} */
  let selected = [];

  function updateUploaderUI() {
    if (!uplGrid || !uplCount || !uplClear) return;

    uplGrid.innerHTML = "";
    uplCount.textContent = `${selected.length} foto`;
    uplClear.disabled = selected.length === 0;

    if (uplHint) {
      uplHint.innerHTML =
        selected.length > 0
          ? `<i class="bi bi-check2-circle"></i> ${selected.length} foto selezionate`
          : `<i class="bi bi-camera"></i> Scatta o scegli foto (anche più di una)`;
    }

    selected.forEach((item, idx) => {
      const wrap = document.createElement("div");
      wrap.className = "uplItem";

      const img = document.createElement("img");
      img.src = item.url;
      img.alt = `Foto ${idx + 1}`;

      const badge = document.createElement("div");
      badge.className = "uplBadge";
      badge.textContent = `${idx + 1}`;

      const rm = document.createElement("button");
      rm.type = "button";
      rm.className = "uplRm";
      rm.innerHTML = '<i class="bi bi-x-lg"></i>';
      rm.addEventListener("click", () => {
        try {
          URL.revokeObjectURL(item.url);
        } catch {}
        selected = selected.filter((_, i) => i !== idx);
        updateUploaderUI();
      });

      wrap.appendChild(img);
      wrap.appendChild(badge);
      wrap.appendChild(rm);
      uplGrid.appendChild(wrap);
    });
  }

  function resetUploader() {
    selected.forEach((it) => {
      try {
        URL.revokeObjectURL(it.url);
      } catch {}
    });
    selected = [];
    if (fileInput) fileInput.value = "";
    updateUploaderUI();
  }

  if (fileInput) {
    fileInput.addEventListener("change", () => {
      const files = Array.from(fileInput.files || []);
      if (!files.length) return;

      // aggiunge (non sostituisce)
      const newItems = files.map((f) => ({
        file: f,
        url: URL.createObjectURL(f),
      }));
      selected = selected.concat(newItems);

      // limite foto (evita payload enormi)
      const MAX_FILES = 6;
      if (selected.length > MAX_FILES) {
        // revoca quelle in eccesso
        selected.slice(MAX_FILES).forEach((it) => {
          try {
            URL.revokeObjectURL(it.url);
          } catch {}
        });
        selected = selected.slice(0, MAX_FILES);
        alert(`Massimo ${MAX_FILES} foto.`);
      }

      fileInput.value = ""; // permette di scegliere di nuovo gli stessi file
      updateUploaderUI();
    });
  }

  if (uplClear) uplClear.addEventListener("click", resetUploader);
  updateUploaderUI();

  // timestamp anti-bot
  form.dataset.t0 = String(Date.now());

  // blocco anti-doppio submit
  let isSubmitting = false;

  // evidenzia campi invalidi (UX)
  const markInvalids = () => {
    form.querySelectorAll("input, select, textarea").forEach((el) => {
      if (el.checkValidity()) {
        el.style.borderColor = "";
        el.style.boxShadow = "";
      } else {
        el.style.borderColor = "#dc2626";
        el.style.boxShadow = "0 0 0 0.15rem rgba(220,38,38,.15)";
      }
    });
  };

  form.addEventListener("input", markInvalids);

  // ---------- Utils ----------
  function normalizePhone(raw) {
    const s = String(raw || "").trim();
    return s.replace(/[^\d+]/g, "");
  }

  function slug(s) {
    return String(s || "")
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9\-]/g, "")
      .slice(0, 40);
  }

  function pad2(n) {
    return String(n).padStart(2, "0");
  }

  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result || ""));
      r.onerror = reject;
      r.readAsDataURL(file);
    });
  }

  async function compressImage(file, opts = {}) {
    const maxW = opts.maxW || 1600;
    const maxH = opts.maxH || 1600;
    const quality = opts.quality || 0.78;
    const outName = opts.outName || "foto.jpg";

    if (!file.type || !file.type.startsWith("image/")) return file;

    const dataUrl = await fileToBase64(file);

    const img = await new Promise((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = rej;
      i.src = dataUrl;
    });

    let w = img.width;
    let h = img.height;
    const ratio = Math.min(maxW / w, maxH / h, 1);
    w = Math.round(w * ratio);
    h = Math.round(h * ratio);

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0, w, h);

    const outDataUrl = canvas.toDataURL("image/jpeg", quality);
    const blob = await (await fetch(outDataUrl)).blob();
    return new File([blob], outName, { type: "image/jpeg" });
  }

  // ---------- Queue (solo senza foto) ----------
  const QUEUE_KEY = "ritiriamoauto_lead_queue_v3";

  function loadQueue() {
    try {
      return JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]");
    } catch {
      return [];
    }
  }
  function saveQueue(q) {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(q));
  }

  function genId() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return String(Date.now()) + "-" + String(Math.random()).slice(2);
  }

  function enqueue(payload) {
    const id = genId();
    const q = loadQueue();
    q.push({ id, ts: Date.now(), payload });
    saveQueue(q);
    return id;
  }

  function removeFromQueue(id) {
    const q = loadQueue().filter((x) => x.id !== id);
    saveQueue(q);
  }

  async function sendPayload(payload) {
    const body = JSON.stringify(payload);
    const bytes = new Blob([body]).size;

    const SMALL_LIMIT = 55_000; // ~55KB
    const canKeepalive = bytes <= SMALL_LIMIT;
    const hasPhotos = !!(payload.libretti && payload.libretti.length);

    try {
      await fetch(ENDPOINT, {
        method: "POST",
        mode: "no-cors",
        keepalive: canKeepalive && !hasPhotos,
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body,
      });
      return true;
    } catch (e) {
      console.warn("fetch fallito", e, { bytes, canKeepalive, hasPhotos });
    }

    // fallback beacon SOLO se piccolo
    if (canKeepalive) {
      try {
        const ok = navigator.sendBeacon(
          ENDPOINT,
          new Blob([body], { type: "text/plain;charset=utf-8" }),
        );
        return !!ok;
      } catch (e) {
        console.warn("sendBeacon fallito", e);
      }
    }

    return false;
  }

  async function flushQueue() {
    if (!navigator.onLine) return;

    for (let i = 0; i < 3; i++) {
      const q = loadQueue();
      if (!q.length) break;

      const item = q[0];
      const ok = await sendPayload(item.payload);

      if (ok) {
        q.shift();
        saveQueue(q);
      } else {
        break;
      }
    }
  }

  window.addEventListener("online", flushQueue);
  flushQueue();

  // ---------- Submit ----------
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (isSubmitting) return;
    isSubmitting = true;

    if (msg) msg.textContent = "";

    if (!form.checkValidity()) {
      markInvalids();
      form.reportValidity();
      isSubmitting = false;
      return;
    }
    markInvalids();

    const fd = new FormData(form);

    // anti-bot honeypot
    const website = String(fd.get("website") || "").trim();
    if (website) {
      if (msg) msg.textContent = "Richiesta inviata.";
      form.reset();
      resetUploader();
      form.dataset.t0 = String(Date.now());
      isSubmitting = false;
      return;
    }

    // anti-bot timing
    const t0 = Number(form.dataset.t0 || 0);
    if (t0 && Date.now() - t0 < 2500) {
      if (msg) msg.textContent = "Riprova tra un attimo.";
      isSubmitting = false;
      return;
    }

    const phone = normalizePhone(fd.get("phone"));
    if (phone.length < 9) {
      alert("Inserisci un numero valido (WhatsApp o telefono).");
      isSubmitting = false;
      return;
    }

    // ✅ validazione numerica (ora obbligatori)
    const yearNum = Number(String(fd.get("year") || "").trim());
    const kmNum = Number(String(fd.get("km") || "").trim());
    const maxYear = new Date().getFullYear() + 1;

    if (!Number.isFinite(yearNum) || yearNum < 1950 || yearNum > maxYear) {
      alert("Inserisci un anno valido.");
      isSubmitting = false;
      return;
    }
    if (!Number.isFinite(kmNum) || kmNum < 0 || kmNum > 2000000) {
      alert("Inserisci km validi.");
      isSubmitting = false;
      return;
    }

    const source =
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1"
        ? "ritiriamoauto.it"
        : window.location.hostname.replace(/^www\./, "").split(":")[0];

    // ✅ payload aggiornato (brand/model/fuel obbligatori)
    const payload = {
      name: String(fd.get("name") || "").trim(),
      phone,
      city: String(fd.get("city") || "").trim(),
      brand: String(fd.get("brand") || "").trim(),
      model: String(fd.get("model") || "").trim(),
      fuel: String(fd.get("fuel") || "").trim(),
      condition: String(fd.get("condition") || "").trim(),
      year: String(fd.get("year") || "").trim(),
      km: String(fd.get("km") || "").trim(),
      notes: String(fd.get("notes") || "").trim(),
      userAgent: navigator.userAgent,
      source,
      t0: String(t0 || ""),
      website: "",
    };

    const prev = btn ? btn.innerHTML : "";
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<i class="bi bi-hourglass-split"></i> Invio...';
    }

    try {
      // ---- FOTO: rinomina + comprimi + base64 ----
      if (selected.length > 0) {
        const MAX_EACH = 2_200_000; // post-compressione
        const photos = [];

        const ts = new Date().toISOString().replace(/[:.]/g, "-");
        const prefix = [
          slug(fd.get("name")),
          slug(`${fd.get("brand")} ${fd.get("model")}`),
          slug(fd.get("city")),
          ts,
        ]
          .filter(Boolean)
          .join("_");

        for (let i = 0; i < selected.length; i++) {
          const file = selected[i].file;
          if (!(file instanceof File) || file.size <= 0) continue;

          const outName = `${prefix}_foto_${pad2(i + 1)}.jpg`;

          const compressed = await compressImage(file, {
            maxW: 1600,
            maxH: 1600,
            quality: 0.78,
            outName,
          });

          if (compressed.size > MAX_EACH) {
            alert(
              `La foto ${i + 1} è ancora troppo grande. Prova uno screenshot o una foto più ravvicinata.`,
            );
            throw new Error("file-too-big");
          }

          photos.push({
            base64: await fileToBase64(compressed),
            filename: compressed.name, // ✅ rinominata
            mimeType: compressed.type || "image/jpeg",
          });
        }

        payload.libretti = photos;
      }

      const hasPhotos = !!(payload.libretti && payload.libretti.length);

      // ✅ Queue solo se NON ci sono foto
      let queuedId = null;
      if (!hasPhotos) queuedId = enqueue(payload);

      const ok = await sendPayload(payload);

      if (ok && queuedId) removeFromQueue(queuedId);

      // se fallisce e ci sono foto -> non possiamo accodare
      if (!ok && hasPhotos) {
        throw new Error("upload-failed");
      }

      form.reset();
      resetUploader();
      form.dataset.t0 = String(Date.now());
      markInvalids();

      if (btn) {
        btn.innerHTML = '<i class="bi bi-check2"></i> Inviato';
        setTimeout(() => {
          btn.innerHTML = prev || '<i class="bi bi-send"></i> Invia richiesta';
          btn.disabled = false;
        }, 1400);
      }

      if (msg) {
        msg.textContent =
          "Richiesta inviata. Se non ricevi risposta, scrivici su WhatsApp.";
      }

      flushQueue();
    } catch (err) {
      console.error("Errore invio:", err);

      if (btn) {
        btn.innerHTML = '<i class="bi bi-x"></i> Errore: riprova';
        btn.disabled = false;
        setTimeout(() => {
          btn.innerHTML = prev || '<i class="bi bi-send"></i> Invia richiesta';
        }, 2000);
      }

      if (msg) {
        msg.textContent =
          "Invio non riuscito. Riprova (meglio con rete stabile). Se non va, invia meno foto o una foto più leggera.";
      }
    } finally {
      isSubmitting = false;
    }
  });
});
