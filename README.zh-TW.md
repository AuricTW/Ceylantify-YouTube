<div align="center">

<h1>Ceylantify-YouTube</h1>

<p><strong>你的 YouTube 不需要更多插件，但它需要Ceylantify-YouTube。</strong></p>

<p>
  覺得 YouTube 縮圖太正常了嗎？<br>
  Ceylantify YouTube 會把隨機錫蘭透明 PNG 疊到 YouTube 縮圖上。
</p>

<p>
  <a href="https://chromewebstore.google.com/detail/ceylantify-youtube/lhmecnaopjkaogbmgmcmmgecmfmdllga">
    <img alt="Install on Chrome" src="https://img.shields.io/badge/Chrome-Install-4285F4?style=for-the-badge&logo=googlechrome&logoColor=white">
  </a>
  <a href="https://addons.mozilla.org/zh-TW/firefox/addon/ceylantify-youtube/">
    <img alt="Install on Firefox" src="https://img.shields.io/badge/Firefox-Add--ons-FF7139?style=for-the-badge&logo=firefoxbrowser&logoColor=white">
  </a>
  <a href="https://microsoftedge.microsoft.com/addons/detail/ceylantify-youtube/lphhacbckifmfamlbobpfhapkbjbbepm">
    <img alt="Install on Microsoft Edge" src="https://img.shields.io/badge/Edge-Add--ons-0078D7?style=for-the-badge&logo=microsoftedge&logoColor=white">
  </a>
</p>

<p>
  <a href="README.md">English</a> |
  <a href="README.zh-TW.md">繁體中文</a>
</p>

</div>

---

Ceylantify YouTube 是一個 Manifest V3 擴充功能，用來在 YouTube 影片縮圖上加上隨機的錫蘭透明 PNG overlay。目前已上架 Chrome Web Store、Firefox Add-ons 和 Microsoft Edge Add-ons，也可以用 unpacked extension 方式本機載入開發。

## 功能

- Manifest V3 browser extension。
- Content script 會自動掃描 YouTube 縮圖容器。
- 對每個縮圖插入一張隨機錫蘭透明 PNG overlay。
- 使用 `MutationObserver` 處理 YouTube 的動態載入。
- 目標支援首頁、搜尋結果、影片右側推薦、無限滾動等常見 YouTube 頁面。
- overlay 使用 `pointer-events: none`，不會阻擋原本縮圖點擊。

## 安裝

從 [Chrome Web Store](https://chromewebstore.google.com/detail/ceylantify-youtube/lhmecnaopjkaogbmgmcmmgecmfmdllga)、[Firefox Add-ons](https://addons.mozilla.org/zh-TW/firefox/addon/ceylantify-youtube/) 或 [Microsoft Edge Add-ons](https://microsoftedge.microsoft.com/addons/detail/ceylantify-youtube/lphhacbckifmfamlbobpfhapkbjbbepm) 安裝。

## 專案結構

```text
.
|-- ceylan-youtube-overlay-extension/
|   |-- manifest.json
|   |-- content.js
|   |-- content.css
|   `-- assets/
|       `-- overlays/
|           |-- 001.png
|           |-- 002.png
|           `-- ...
|-- data/
|   |-- Ceylan_AI_Transparent/
|   |-- Ceylan_Cleaning/
|   `-- Ceylan_Cover/
`-- download_ceylan_thumbnails.py
```

## 本機開發安裝

1. 開啟 Chrome，前往 `chrome://extensions`。
2. 開啟 Developer mode。
3. 點選 Load unpacked。
4. 選擇這個資料夾：

```text
ceylan-youtube-overlay-extension
```

5. 開啟或重新整理 YouTube。

如果 extension 已經載入過，請先在 extension 卡片上按重新整理圖示，再回到 YouTube 使用 `Ctrl + F5` 強制重新整理。

## 開發

extension 的主要入口：

```text
ceylan-youtube-overlay-extension/content.js
```

樣式檔案：

```text
ceylan-youtube-overlay-extension/content.css
```

overlay 圖片資源：

```text
ceylan-youtube-overlay-extension/assets/overlays
```

基本語法檢查：

```bash
node --check ceylan-youtube-overlay-extension/content.js
```

## Debug

開啟 YouTube DevTools Console，搜尋：

```text
[Ceylan Overlay] applied ... thumbnail overlays
```

如果有出現這行，但畫面上看不到 overlay，通常是 CSS stacking 或 YouTube 縮圖版面層級問題。

如果沒有出現這行，代表目前 YouTube DOM 結構可能需要在 `content.js` 補新的 selector。

## 靈感來源

本專案靈感來源於 [MagicJinn/MrBeastify-Youtube](https://github.com/MagicJinn/MrBeastify-Youtube)。

## 隱私

這個 extension 不會收集、儲存或傳送使用者資料。它只會在本機 YouTube 頁面上執行，並載入 extension package 內附的 PNG 圖片資源。

## Roadmap

- 新增 popup 開關。
- 新增 overlay 密度或出現機率設定。
- 新增 overlay 圖片選擇模式。
- 改善更多 YouTube 版面的 selector 支援。

## 狀態

已上架 Chrome Web Store、Firefox Add-ons 和 Microsoft Edge Add-ons。本機仍可用 unpacked extension 方式載入開發。
