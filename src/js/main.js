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

  /** @type {File[]} */
  let selectedFiles = [];

  function updateUploaderUI() {
    if (!uplGrid || !uplCount || !uplClear) return;

    uplGrid.innerHTML = "";
    uplCount.textContent = `${selectedFiles.length} foto`;
    uplClear.disabled = selectedFiles.length === 0;

    if (uplHint) {
      uplHint.innerHTML =
        selectedFiles.length > 0
          ? `<i class="bi bi-check2-circle"></i> ${selectedFiles.length} foto selezionate`
          : `<i class="bi bi-camera"></i> Scatta o scegli foto (anche più di una)`;
    }

    selectedFiles.forEach((file, idx) => {
      const url = URL.createObjectURL(file);

      const item = document.createElement("div");
      item.className = "uplItem";

      const img = document.createElement("img");
      img.src = url;
      img.alt = `Foto ${idx + 1}`;

      const badge = document.createElement("div");
      badge.className = "uplBadge";
      badge.textContent = `${idx + 1}`;

      const rm = document.createElement("button");
      rm.type = "button";
      rm.className = "uplRm";
      rm.innerHTML = '<i class="bi bi-x-lg"></i>';
      rm.addEventListener("click", () => {
        // revoke URL per evitare leak
        URL.revokeObjectURL(url);
        selectedFiles = selectedFiles.filter((_, i) => i !== idx);
        updateUploaderUI();
      });

      item.appendChild(img);
      item.appendChild(badge);
      item.appendChild(rm);
      uplGrid.appendChild(item);
    });
  }

  function resetUploader() {
    // le ObjectURL vanno revocate (quelle create sopra)
    // NB: qui non abbiamo i singoli url, quindi puliamo la UI e basta
    selectedFiles = [];
    if (fileInput) fileInput.value = "";
    updateUploaderUI();
  }

  if (fileInput) {
    fileInput.addEventListener("change", () => {
      const files = Array.from(fileInput.files || []);
      if (!files.length) return;

      // aggiunge (non sostituisce) — l’utente può selezionare più volte
      selectedFiles = selectedFiles.concat(files);

      // limite foto per evitare payload enormi
      const MAX_FILES = 6;
      if (selectedFiles.length > MAX_FILES) {
        selectedFiles = selectedFiles.slice(0, MAX_FILES);
        alert(`Massimo ${MAX_FILES} foto.`);
      }

      fileInput.value = ""; // permette di selezionare di nuovo gli stessi file
      updateUploaderUI();
    });
  }

  if (uplClear) uplClear.addEventListener("click", resetUploader);

  updateUploaderUI();

  // timestamp anti-bot
  form.dataset.t0 = String(Date.now());

  // blocco anti-doppio submit (double tap / enter / lag)
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
    return new File([blob], "libretto.jpg", { type: "image/jpeg" });
  }

  // ---------- Queue (no-duplicate) ----------
  const QUEUE_KEY = "ritiriamoauto_lead_queue_v2";

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

    // Soglia prudente: keepalive / sendBeacon con payload grandi spesso falliscono
    const SMALL_LIMIT = 55_000; // ~55KB

    const canKeepalive = bytes <= SMALL_LIMIT;
    const hasPhotos = !!(payload.libretti && payload.libretti.length);

    // 1) FETCH (sempre prima scelta)
    try {
      await fetch(ENDPOINT, {
        method: "POST",
        mode: "no-cors",
        // keepalive SOLO se piccolo e senza foto (o comunque piccolo)
        keepalive: canKeepalive && !hasPhotos,
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body,
      });
      return true;
    } catch (e) {
      console.warn("fetch fallito", e, { bytes, canKeepalive, hasPhotos });
    }

    // 2) FALLBACK sendBeacon SOLO se payload piccolo
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

    const payload = {
      name: String(fd.get("name") || "").trim(),
      phone,
      city: String(fd.get("city") || "").trim(),
      car: String(fd.get("car") || "").trim(),
      condition: String(fd.get("condition") || "").trim(),
      year: String(fd.get("year") || "").trim(),
      km: String(fd.get("km") || "").trim(),
      notes: String(fd.get("notes") || "").trim(),
      userAgent: navigator.userAgent,
      source:
        window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1"
          ? "ritiriamoauto.it"
          : window.location.hostname.replace(/^www\./, "").split(":")[0],
      t0: String(t0 || ""),
      website: "",
    };

    const prev = btn ? btn.innerHTML : "";
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<i class="bi bi-hourglass-split"></i> Invio...';
    }

    try {
      // foto opzionali (multi): comprimi + base64
      if (selectedFiles.length > 0) {
        const MAX_EACH = 2_200_000; // dopo compressione
        const photos = [];

        for (let i = 0; i < selectedFiles.length; i++) {
          const file = selectedFiles[i];

          const compressed = await compressImage(file, {
            maxW: 1600,
            maxH: 1600,
            quality: 0.78,
          });

          if (compressed.size > MAX_EACH) {
            alert(
              `La foto ${i + 1} è ancora troppo grande. Prova uno screenshot o una foto più ravvicinata.`,
            );
            throw new Error("file-too-big");
          }

          photos.push({
            base64: await fileToBase64(compressed),
            filename: compressed.name || `libretto_${i + 1}.jpg`,
            mimeType: compressed.type || "image/jpeg",
          });
        }

        // ✅ array di foto
        payload.libretti = photos;
      }

      // enqueue + invio singolo (no doppioni)
      const hasPhotos = !!(payload.libretti && payload.libretti.length);

      // ✅ Queue solo se NON ci sono foto (evita localStorage pieno)
      let queuedId = null;
      if (!hasPhotos) queuedId = enqueue(payload);

      const ok = await sendPayload(payload);

      // se era in coda e l’invio è andato ok, rimuovi
      if (ok && queuedId) removeFromQueue(queuedId);

      // se NON ok e c'erano foto, avvisa (non possiamo accodare base64)
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
      if (msg)
        msg.textContent =
          "Invio non riuscito. Riprova (meglio con rete stabile). Se non va, invia meno foto o una foto più leggera.";
    } finally {
      isSubmitting = false;
    }
  });
});
