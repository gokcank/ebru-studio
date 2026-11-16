# Ebru Studio — Çalışma Kuralları

Tarayıcıda ebru sanatı: sıfır bağımlılık, Canvas 2D, TypeScript, GitHub Pages.
**Her işten önce `BLUEPRINT.md`'ye bak** — kapsam, mimari ve kilometre taşları orada; bu dosya yalnız çalışma kurallarıdır.

## Komutlar

```bash
npm run dev        # Vite geliştirme sunucusu
npm run build      # üretim derlemesi (dist/)
npm test           # vitest — yalnız src/engine testleri
npm run typecheck  # tsc --noEmit
```

(Depo henüz iskelet aşamasındaysa ve bu komutlar yoksa: ilk iş M0'dır, bunları kuran PR'dır.)

## Mimari kuralları (ihlal = yanlış çözüm)

1. **Katman yönü:** `engine` → hiçbir şey import etmez (DOM, Canvas, `window` yasak). `render` yalnız `engine`. `ui` ikisini bağlar. Ters import görürsen durdur ve düzelt.
2. **Op günlüğü tek gerçek:** Tuval durumu = `Op[]` listesinin sonucu. Yeni özellik "drops dizisini elle değiştirme" içeriyorsa tasarım yanlıştır; yeni bir `Op` türü tanımla.
3. **Tüm katsayılar `src/engine/params.ts`'te.** Koda gömülü sihirli sayı ekleme; his ayarı tek dosyadan yapılır.
4. **Rastgelelik yalnız `engine/rng.ts`** (tohumlu). `Math.random()` engine ve presets içinde yasak (UI'da serbest).
5. **Sıfır çalışma zamanı bağımlılığı.** `npm i <paket>` önerme; gerekçesi olağanüstüyse önce sor.

## Kod stili

- TypeScript strict; `any` yok; named export; dosya başına tek sorumluluk.
- Yorumlar ve tanımlayıcı UI metinleri Türkçe; tip/fonksiyon adları İngilizce (`tine`, `comb`, `refine` — alan terimleri aynen).
- CSS: tüm renkler `theme.css` tokenlarından; bileşen içinde literal renk yok. Açık/koyu çift blok deseni korunur.
- Erişilebilirlik varsayılan: yeni her düğmeye `aria-label`, odak görünür, `prefers-reduced-motion` kontrolü animasyonlu her özellikte.

## Test yaklaşımı

- Engine fonksiyonları için vitest: bilinen girdi → nokta koordinatları (altın dosya karşılaştırması `test/engine/golden/`).
- Deterministik: testlerde sabit tohum.
- UI için otomatik test yok; onun yerine her görsel değişiklikte şu el listesi:
  telefon genişliği (≈400px) · açık + koyu tema · damla/biz/tarak hissi · undo 10 hamle · FPS (debug sayacı).

## Çalışma ritmi

- **Bir oturum = bir kilometre taşı parçası.** Oturum başında hangi M# üzerinde çalışıldığını söyle; kapsam dışına çıkan fikri koda değil `BLUEPRINT.md` §9 fikir havuzuna yaz.
- Commit mesajları İngilizce, kısa emir kipi ("Move comb spacing into params").
- `main` her zaman yayınlanabilir; büyük işler dalda.
- "His" değişikliklerinde (params) commit mesajına eski→yeni değerleri yaz; geri dönmek kolay olsun.

## Bilinen tuzaklar

- WebKitGTK/NVIDIA'da boş pencere gerekirse: `WEBKIT_DISABLE_DMABUF_RENDERER=1` (yalnız yerel Linux testi; siteyle ilgisiz).
- `P === C` damla deformasyonunda sıfıra bölme → `ε` koruması kalsın.
- Refine tavanları kaldırılırsa uzun tarak seanslarında nokta patlar; tavan değişikliği performans ölçümüyle gelir.
- iOS Safari: pointer capture + `touch-action:none` olmadan kaydırma çizimi bozar.

## Durum (16 Kasım 2026 itibarıyla)

- Depoda yalnız dokümanlar ve `prototip/ebru-studio.html` var; uygulama kodu, test ve yayın akışı henüz yok.
- Sıradaki iş M0: iskelet → engine (testleriyle) → render → ui → Pages yayını.
- İsim kesin: Ebru Studio.

## Açık işler

- His kalibrasyonu (damla / biz / tarak) için sahibinden geri bildirim bekleniyor.
- Gerçek cihaz testi (iOS Safari, orta sınıf Android) yapılmadı.
- `LICENSE` (MIT) ve `README.md` henüz yok.

## Daha fazla bağlam

Arka plan, kararlar ve geçmiş ikinci beyinde: `/home/gokcank/ikinci-beyin/projects/ebru-studio.md` (gerektiğinde oku).
