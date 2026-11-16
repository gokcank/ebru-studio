# 🎨 Ebru Studio — Proje Planı (Blueprint)

> **Tek cümle:** Geleneksel ebru sanatını tarayıcıya taşıyan, sıfır bağımlılıklı, çevrimdışı çalışan, çıktısı paylaşılabilir bir sanat oyuncağı.
>
> Durum: planlama · Bu klasör ileride kendi deposuna (`gokcank/ebru-studio`) ayrılacak; her şey bu klasörün kök olacağı varsayımıyla yazıldı.
> Çalışan ön çalışma: [`prototip/ebru-studio.html`](prototip/ebru-studio.html) (tek dosya, v2).

---

## 1. Vizyon ve Ölçütler

**Kim için?** Ebruyu hiç bilmeyen ama 30 saniyede güzel bir şey üretip paylaşmak isteyen herkes; ikinci halka: sanat/tasarım meraklıları.

**Deneyim hedefi:** Aç → 5 saniyede anla → 2 dakikada "bunu ben mi yaptım?" dedirten bir görsel → indir/paylaş.

**Başarı ölçütleri (v1.0):**
- İlk etkileşime kadar < 2 sn (orta sınıf telefonda)
- Oturum başına ≥ 1 PNG indirme / paylaşım hedefi
- Lighthouse: Performance ≥ 95, Accessibility ≥ 95
- Sıfır çalışma zamanı bağımlılığı, sıfır izleme (analitik eklenirse yalnız GoatCounter gibi çerezsiz sayaç)

**Kapsam DIŞI (bilinçli):** hesap/giriş, sunucu, galeri/keşfet akışı, çok katmanlı düzenleme, gerçek akışkan simülasyonu (Navier-Stokes), WebGL (v1.0 için Canvas 2D yeter).

---

## 2. Teknik Çerçeve

| Konu | Karar | Gerekçe |
|---|---|---|
| Dil | TypeScript (strict) | Engine matematiği tip güvenliğinden kazanır |
| Derleme | Vite | Hızlı; `base` ayarıyla Pages alt yoluna uyum |
| Çalışma zamanı bağımlılığı | **Yok** | 150 KB bütçe; kırılma yüzeyi sıfır |
| Çizim | Canvas 2D | Prototipte 60fps doğrulandı; WebGL v2+ konusu |
| Test | Vitest (yalnız engine) | Saf fonksiyonlar DOM'suz test edilir |
| Barındırma | GitHub Pages (`gokcank.github.io/ebru-studio`) | Actions ile otomatik yayın |
| Lisans | MIT | |
| UI dili | Türkçe (EN v1.1'de `?lang=en`) | Kimlik Türkçe; terimler zaten Türkçe (biz, tarak, battal, gelgit) |

**Tarayıcı matrisi:** Son 2 yılın Chrome / Firefox / Safari'si + iOS Safari ve Android Chrome. Pointer Events temel alınır; `CompressionStream` gibi yeni API'ler yalnız isteğe bağlı özelliklerde ve yetenek kontrolüyle.

---

## 3. Mimari

**Katman kuralı: `engine` hiçbir şeyi bilmez → `render` yalnız `engine`'i bilir → `ui` ikisini bağlar.** Ters yönde import yasak.

```
ebru-studio/
├── index.html
├── src/
│   ├── engine/            # SAF TypeScript — DOM yok, Canvas yok, yan etki yok
│   │   ├── types.ts       # Drop, Op, Vec2, Palette
│   │   ├── params.ts      # ★ TÜM katsayılar tek dosyada (his ayarı buradan)
│   │   ├── marbling.ts    # dropDeform, addDrop, tine (biz), comb (tarak), refine, sprinkle
│   │   ├── state.ts       # applyOp, replayOps: Op[] → tekne durumu
│   │   ├── history.ts     # hamle günlüğü + geri alma (ara anlık görüntüden yeniden oynatma)
│   │   ├── color.ts       # shade, jitterTone (yalnız 6 haneli hex)
│   │   ├── palettes.ts    # 5 pigment paleti
│   │   ├── presets.ts     # gelgit, şal, bülbül yuvası, çiçekler → Op[] üretir
│   │   ├── replay.ts      # Op[] ⇄ URL-güvenli dize (kodla/çöz)
│   │   └── rng.ts         # tohumlu PRNG (replay determinizmi için)
│   ├── render/
│   │   ├── canvas.ts      # draw(drops, ctx, theme): doku, pigment kenarı, vinyet
│   │   └── export.ts      # 2x PNG + köşe imzası (offscreen canvas)
│   ├── ui/
│   │   ├── app.ts         # durum, hamle günlüğü, pointer akışı
│   │   ├── toolbar.ts     # araçlar, paletler, boylar
│   │   └── toast.ts
│   ├── theme.css          # tokenlar (aşağıda)
│   └── main.ts
├── test/engine/*.test.ts
├── public/ (manifest.json, og.png, ikonlar)
├── .github/workflows/deploy.yml
├── BLUEPRINT.md (bu dosya) · CLAUDE.md · README.md · LICENSE
```

**Veri modeli (çekirdek):**

```ts
type Drop = { c: string; e: string; p: Float32Array };  // renk, kenar rengi, nokta halkası
type Op =                                                // her kullanıcı hamlesi bir Op
  | { t:'drop'; x:number; y:number; r:number; c:string }  // c: nihai renk (ton titreşimi dahil)
  | { t:'tine'; path:[number,number][] }                 // biz: örneklenmiş yol
  | { t:'comb'; path:[number,number][] }
  | { t:'sprinkle'; seed:number; n:number; w:number; h:number; colors:string[] }
  | { t:'clear'; w:number; h:number };                    // yeni tekne: boyutu da belirler; günlüğün ilk hamlesi
```

**Önemli ilke — Op günlüğü tek gerçek:** Tuval her zaman `Op[]` listesinin sonucudur. Undo = son Op'u at, baştan (ya da ara anlık görüntüden) tekrar oynat; replay paylaşımı = aynı listenin kodlanmış hâli; testler = Op listesi ver, nokta koordinatlarını doğrula. Rastgelelik yalnız `rng.ts` üzerinden (tohumlu) — determinizm bozulmaz. Bu yüzden her Op sonucu tek başına belirleyen bilgiyi taşır: serpme alan boyutunu ve renk sırasını, damla nihai rengini içerir. Her Op inceltmeyle (refine) biter.

**Tekne boyutu ekrandan bağımsızdır:** Tekne, sayfa açılırkenki tuval boyutunu alır (ilk `clear` hamlesi) ve durumun parçasıdır. Ekran dönünce ya da pencere değişince durum değişmez; `render` tekneyi oranını koruyarak ekrana sığdırır ve ortalar. Teknenin dışı tezgâh rengindedir, çerçeveyle ayrılır ve oraya çizilemez. "Temizle" yeni tekneyi o anki ekran boyutunda açar; geri alınınca eski boyut da döner.

---

## 4. Ebru Matematiği (spec)

Klasik sayısal ebru ("mathematical marbling") yaklaşımı; her damla deforme olan kapalı bir nokta halkası.

| İşlem | Formül | Not |
|---|---|---|
| **Damla** (C, r) | Her mevcut P için: `P' = C + (P−C)·√(1 + r²/|P−C|²)` | `|P−C|² < ε` koruması şart |
| **Biz** (uç x,y; yön M; adım len) | `P' = P + M · z·u^d`, `d = |P − uç|` | Yerel çekme. `z = min(len·k_biz, z_biz_max)` |
| **Tarak** (uç; yön M; normal N) | `t = ((P−uç)·N) mod aralık; d = min(t, aralık−t)` sonra aynı itme | Dişler M'ye paralel çizgiler; tüm tekneyi etkiler |
| **Refine** | Komşu nokta arası > eşik ise orta nokta ekle | Her etkileşim sonunda; tavanlar aşılamaz |

**Başlangıç katsayıları** (prototip v2'de doğrulanan his; tamamı `engine/params.ts`'te):

```
damla.nokta=96  damla.boylar=[13,24,40]  damla.tavan=240
biz.u=0.93   biz.k=1.2  biz.zmax=14  biz.menzil=160
tarak.u=0.88 tarak.zmax=9  tarak.aralık=46
refine.eşik=7  refine.koordinatTavanı=3200   (= damla başına 1600 nokta; prototipteki gerçek davranış)
serpme.n=16  serpme.r=[5,31]
```

**Islak yayılma (v1.0):** Damla eklenince deformasyon final `r` ile bir kez uygulanır; yalnız **çizimde** damlanın görünen yarıçapı 90–120 ms'de `0.6r → r` büyür (ease-out). Fizik değişmez, his "ıslak" olur. `prefers-reduced-motion` → kapalı.

---

## 5. Araçlar ve Desen Hareketleri

**Temel araçlar (prototipten):** Damla 💧 · Biz 🪡 · Tarak 🪮 · Serpme ✨ · Geri al · Temizle.
Dokunma: tek parmak çizer; iki parmak hareketi yok (v1'de zoom yok). Klavye: `1–4` araç, `Ctrl+Z` geri al.

**Hazır hareketler (`presets.ts` — tek düğme, klasik desen):**

| Desen | Üretilen Op dizisi |
|---|---|
| **Gelgit** | Tüm tuval boyunca soldan sağa paralel tarak geçişi, ardından sağdan sola yarım aralık kaydırılmış geçiş |
| **Şal** | Gelgit + geniş aralıklı (×2) çapraz (45°) iki tarak geçişi |
| **Bülbül yuvası** | Merkez etrafında içe sarılan spiral biz yolu (4–5 tur, azalan yarıçap) |
| **Taraklı battal** | Serpme ×2 + tek yönlü tarak |

**Çiçek modu (v1.0'ın vitrin özelliği):**
- **Lale:** aynı noktaya 2–3 iç içe damla (dış koyu, iç açık) → tek biz çekişi yukarı (sap + taç kıvrımı)
- **Karanfil:** iç içe damlalar → uçtan merkeze 5–6 kısa biz çekişi (yaprak dişleri)
- UI: "Çiçek" aracı seçiliyken dokun = iç içe damlaları bırakır, sürükle = sapı çeker. İç içe renkleri paletten otomatik (koyu→açık).

---

## 6. Görsel Kimlik

**Tipografi:** Fraunces (yalnız başlık/imza, 600) + sistem yazı yığını (UI). Google Fonts `display=swap`, gerçek fallback.

**Tema tokenları** (prototipten; `theme.css`'te `:root` + çift koyu blok deseniyle):

| Token | Açık | Koyu |
|---|---|---|
| `--water` | `#e8e0cc` (aharlı kâğıt) | `#141a21` (gece teknesi) |
| `--ink` | `#2b2217` | `#e7e1d4` |
| `--panel` | `rgba(252,249,241,.92)` | `rgba(24,30,38,.92)` |
| `--accent` | `#8a3324` (kiremit) | `#d98e73` |

**Pigment paletleri (5):** Klasik · Çini · Gece · Gülkurusu · Zümrüt (hex listeleri prototipte; pigmentler iki temada da aynı kalır — değişen yalnız su rengi).

**Doku dili:** pigment kenar hattı (ton −30), kitre grain'i (×0.06 multiply), vinyet (0.12) — üçü `render/canvas.ts`'te kalır, engine'e sızmaz.

---

## 7. Dışa Aktarım ve Paylaşım

**PNG indir:** Offscreen canvas, 2× çözünürlük, sağ altta imza: `ebru · gokcank.github.io/ebru-studio` (Fraunces, %40 mürekkep tonu). Dosya adı `ebru-YYYYMMDD-HHMM.png`.

**Replay linki:** `Op[]` → JSON → `CompressionStream('deflate-raw')` → base64url → `#r=...`
- Sınır: kodlanmış dize > 6 KB ise "Bu eser link için çok uzun — PNG olarak paylaş" uyarısı.
- Açılışta `#r` varsa: hamleler 15–25 ms arayla **izletilerek** oynatılır ("canlı ebru" etkisi), sonra kontrol kullanıcıya geçer.
- `CompressionStream` yoksa (eski tarayıcı): özellik gizlenir, uygulama çalışmaya devam eder.

**OG kartı:** `public/og.png` — koyu teknede tek lale, 1200×630.

---

## 8. Kalite Bütçeleri

| Bütçe | Sınır |
|---|---|
| JS (gzip) | ≤ 60 KB (hedef), 150 KB (tavan) |
| Kare süresi | Etkileşim sırasında ≤ 16 ms (orta sınıf Android'de test) |
| Nokta toplamı | ~240 damla × ort. ~400 nokta sorunsuz; tavanlar `params.ts`'te |
| Erişilebilirlik | Tüm düğmelerde `aria-label`; toast `role=status`; görünür odak; `prefers-reduced-motion` |
| Çevrimdışı | PWA: ikinci ziyaret tamamen çevrimdışı |

---

## 9. Yol Haritası

| Kilometre taşı | İçerik | Tahmin | Bitti sayılır ("DoD") |
|---|---|---|---|
| **M0 İskelet** | Vite+TS kurulumu, prototipin katmanlara taşınması, Pages+Actions yayını | 6–10 sa | Prototipteki her şey yeni mimaride, canlı URL'de çalışıyor |
| **M1 Çekirdek** | `engine` testleri (damla/biz/tarak/refine), Op günlüğü + tekrar-oynatmalı undo, ıslak yayılma | 8–14 sa | `npm test` yeşil; undo 50 hamlede stabil |
| **M2 Desenler** | Hazır hareketler (4 desen) + Çiçek modu | 10–16 sa | Lale tek denemede "lale gibi" görünüyor |
| **M3 Paylaşım** | PNG 2× + imza, replay linki + izletme, OG kartı | 6–10 sa | WhatsApp'ta link zengin açılıyor; PNG galeriye düşüyor |
| **M4 Yayın** | PWA, erişilebilirlik turu, README + ekran kaydı GIF, sürüm v1.0 | 6–10 sa | Lighthouse ≥95/95; tanıtım gönderisi hazır |
| **Toplam** | | **36–60 sa** | Yarı zamanlı ~4–6 hafta |

**v1.1+ fikir havuzu (şimdi yapılmaz):** EN dili · galeri sayfası (statik, elle seçki) · WebGL renderer · zoom/pan · kâğıt dokusu seçenekleri · "günün deseni" tohumlu meydan okuma.

---

## 10. Riskler

| Risk | Azaltma |
|---|---|
| "His" ayarı uzar (en gerçek risk) | Tüm katsayılar `params.ts`'te; `?debug` ile ekranda canlı kaydırıcılar (yalnız dev build) |
| Refine sonrası nokta patlaması → kasma | Tavanlar + damla başı nokta limiti; FPS sayacı debug modunda |
| Replay determinizmi bozulur | Rastgelelik yalnız tohumlu `rng.ts`; engine testlerinde altın-dosya (golden) karşılaştırma |
| Safari dokunma tuhaflıkları | Erken gerçek cihaz testi (M0'da), `touch-action:none` + pointer capture |
| Kapsam kayması | Bu dosyadaki "Kapsam DIŞI" listesi; yeni fikir → §9 fikir havuzuna, koda değil |

---

## 11. Depo Ayrılma Planı

Şimdilik bu klasör `claude-bulut-gecici/ebru-studio/` altında. Ayrılırken:

1. Yeni depo `gokcank/ebru-studio` (public, MIT).
2. Bu klasörün içeriği yeni deponun köküne (`git filter-repo` gerekmez; dosya kopyası yeter, tarih kritik değil).
3. Pages: Settings → Pages → GitHub Actions; `vite.config.ts` içinde `base:'/ebru-studio/'`.
4. Bu depodaki kopya silinir; `Web_Sitesi_Fikirleri_GitHub_Pages.md`'ye yeni depo linki eklenir.
