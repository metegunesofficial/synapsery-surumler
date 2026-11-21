# Synapsery — indir

**[⬇ Synapsery'yi indir](https://github.com/metegunesofficial/synapsery-surumler/releases/latest)**

## Windows

1. En son sürümün **Assets** bölümünden `Synapsery_<sürüm>_x64-setup.exe` dosyasını indir ve çalıştır. Yönetici yetkisi gerekmez.
2. "Windows bilgisayarınızı korudu" penceresi çıkarsa **Ek bilgi > Yine de çalıştır**'a tıkla (bir kez).

Microsoft Store sürümü yayınlandığında Store'dan uyarısız kurulabilecek; bağlantı buraya eklenecek.

Gereksinim: Windows 10/11, 64 bit.

## macOS

macOS paketleri sürümün **Assets** bölümünde göründüğünde:

1. Apple Silicon için `Synapsery_<sürüm>_aarch64.dmg`, Intel için `Synapsery_<sürüm>_x64.dmg` dosyasını indir, aç ve Synapsery'yi **Uygulamalar** klasörüne sürükle.
2. Synapsery'yi aç. "Apple doğrulayamadı" uyarısında **Bitti**'ye tıkla (Çöp Sepeti'ne taşıma).
3. **Sistem Ayarları > Gizlilik ve Güvenlik**'te aşağı kaydır, "Synapsery engellendi" satırında **Yine de Aç**'a tıkla; çıkan pencerede yine **Yine de Aç**'ı seç ve Mac parolanı gir.

Bu onay bir kez verilir. macOS 14 ve öncesinde Synapsery'ye Control tuşuyla tıklayıp **Aç** demek de yeter.

DMG "hasarlı" uyarısı verirse yeniden indir; sürerse Terminal'de `xattr -d com.apple.quarantine ~/Downloads/Synapsery_*.dmg` çalıştırıp DMG'yi yeniden aç.

## Güncellemeler

Uygulama açılışta yeni sürümü kendisi denetler; güncelleme tek tıkla iner, imzası doğrulanır ve kurulur.

---

Bu depo yalnız imzalı kurulum paketlerini ve güncelleme bilgisini (`latest.json`) taşır. Kod gizli depodadır.
