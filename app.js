const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const imagePreview = document.getElementById('imagePreview');
const statusDiv = document.getElementById('status');
const ocrResultDiv = document.getElementById('ocrResult');
const translatedResultDiv = document.getElementById('translatedResult');
const targetLangSelect = document.getElementById('targetLang');
const ocrHeader = document.getElementById('ocrHeader');

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
    if (ocrHeader) ocrHeader.textContent = "Algılanan Metin (OCR):";

    try {
        // Tesseract.js cihaz içi OCR çalıştırır
        const worker = await Tesseract.createWorker('eng+tur+deu+fra+ita+spa');
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

// Dil kodlarını okunabilir Türkçe isimlere çeviren tablo
const dilIsimleri = {
    'fr': 'Fransızca',
    'de': 'Almanca',
    'it': 'İtalyanca',
    'en': 'İngilizce',
    'es': 'İspanyolca',
    'tr': 'Türkçe',
    'ru': 'Rusça'
};

// Uzun metinleri parçalayarak çeviren ve algılanan dili başlığa yazan fonksiyon
async function metniCevir(metin) {
    const targetLang = targetLangSelect.value;
    
    // Metni cümlelere/parçalara böl (500 karakter sınırını aşmamak için)
    const cumleler = metin.match(/[^.!?]+[.!?]+/g) || [metin];
    let parcalar = [];
    let mevcutParca = "";

    for (let cumle of cumleler) {
        if ((mevcutParca + cumle).length < 350) {
            mevcutParca += " " + cumle;
        } else {
            if (mevcutParca.trim()) parcalar.push(mevcutParca.trim());
            mevcutParca = cumle;
        }
    }
    if (mevcutParca.trim()) parcalar.push(mevcutParca.trim());

    translatedResultDiv.textContent = "Çeviriler birleştiriliyor...";

    try {
        let ceviriSonuclari = [];
        let algilananDilKodu = "";

        for (let parca of parcalar) {
            const apiUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(parca)}&langpair=Autodetect|${targetLang}`;
            const response = await fetch(apiUrl);
            const data = await response.json();

            // İlk parçadan tespit edilen kaynak dili al
            if (!algilananDilKodu && data.responseData && data.responseData.detectedLanguage) {
                algilananDilKodu = data.responseData.detectedLanguage.toLowerCase();
            }

            if (data.responseData && data.responseData.translatedText) {
                ceviriSonuclari.push(data.responseData.translatedText);
            } else {
                ceviriSonuclari.push(parca);
            }
        }

        // Başlıkta tespit edilen dili göster
        if (ocrHeader) {
            const dilAdi = dilIsimleri[algilananDilKodu] || (algilananDilKodu ? algilananDilKodu.toUpperCase() : "Tespit Edildi");
            ocrHeader.textContent = `Algılanan Metin (OCR) [Algılanan Dil: ${dilAdi}]:`;
        }

        translatedResultDiv.textContent = ceviriSonuclari.join(" ");
        statusDiv.textContent = "İşlem Tamamlandı";

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

// Service Worker Kaydı
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(err => console.log("SW hatası:", err));
}

initCamera();