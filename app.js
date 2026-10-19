const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const imagePreview = document.getElementById('imagePreview');
const statusDiv = document.getElementById('status');
const ocrResultDiv = document.getElementById('ocrResult');
const translatedResultDiv = document.getElementById('translatedResult');
const targetLangSelect = document.getElementById('targetLang');

// Kamera Başlatma
async function initCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        video.srcObject = stream;
        statusDiv.textContent = "Kamera Hazır";
    } catch (err) {
        statusDiv.textContent = "Kamera izni verilemedi. Galeri veya elle metin girişini kullanabilirsiniz.";
    }
}

// Kameradan Kare Yakalama ve OCR İle Çevirme
async function yakalaVeCevir() {
    if (!video.srcObject) return;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    const imageDataUrl = canvas.toDataURL('image/png');
    
    // Önizleme
    imagePreview.src = imageDataUrl;
    imagePreview.style.display = 'block';
    video.style.display = 'none';
    
    await ocrVeCevir(imageDataUrl);
}

// Galeriden Görsel Yükleme
function galeridenYukle(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async function(e) {
        imagePreview.src = e.target.result;
        imagePreview.style.display = 'block';
        video.style.display = 'none';
        
        await ocrVeCevir(e.target.result);
    };
    reader.readAsDataURL(file);
}

// Cihaz Üzerinde OCR İşlemi (Tesseract.js) ve Otomatik Çeviri
async function ocrVeCevir(imageSource) {
    statusDiv.textContent = "Görseldeki metin okunuyor (Cihaz içi OCR)...";
    ocrResultDiv.textContent = "...";
    translatedResultDiv.textContent = "...";

    try {
        // Tesseract.js cihaz içi OCR çalıştırır
        const worker = await Tesseract.createWorker('eng+tur'); // Çoklu dil OCR desteği
        const ret = await worker.recognize(imageSource);
        await worker.terminate();

        const okunanMetin = ret.data.text.trim();

        if (!okunanMetin) {
            statusDiv.textContent = "Görselde okunabilir metin bulunamadı.";
            ocrResultDiv.textContent = "-";
            return;
        }

        ocrResultDiv.textContent = okunanMetin;
        statusDiv.textContent = "Metin çevriliyor...";
        
        await metniCevir(okunanMetin);

    } catch (error) {
        console.error(error);
        statusDiv.textContent = "OCR işlemi sırasında hata oluştu.";
    }
}

// Ücretsiz & API Key İstemeyen Çeviri Servisi (MyMemory API)
async function metniCevir(metin) {
    const targetLang = targetLangSelect.value;
    // MyMemory API: 'AUTODETECT' desteği ile otomatik kaynak dil tanıma
    const apiUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(metin)}&langpair=Autodetect|${targetLang}`;

    try {
        const response = await fetch(apiUrl);
        const data = await response.json();

        if (data.responseData && data.responseData.translatedText) {
            translatedResultDiv.textContent = data.responseData.translatedText;
            statusDiv.textContent = "İşlem Tamamlandı";
        } else {
            translatedResultDiv.textContent = "Çeviri yapılamadı.";
            statusDiv.textContent = "Çeviri Hatası";
        }
    } catch (err) {
        console.error(err);
        translatedResultDiv.textContent = "Çeviri servisine ulaşılamadı.";
        statusDiv.textContent = "Bağlantı Hatası";
    }
}

// Elle Girilen Metni Çevirme
function elleCevir() {
    const text = document.getElementById('manualText').value.trim();
    if (!text) return;
    
    ocrResultDiv.textContent = text + " (Elle Girildi)";
    statusDiv.textContent = "Metin çevriliyor...";
    metniCevir(text);
}

// Service Worker Kaydı (PWA Kurulabilirliği için)
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(err => console.log("SW hatası:", err));
}

initCamera();