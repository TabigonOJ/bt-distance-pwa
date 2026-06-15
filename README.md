# BT Distance PWA

Bluetoothデバイスとの推定距離をリアルタイム表示するPWAアプリです。

## 機能

- **ソナーレーダー表示** — デバイスの位置と距離をリアルタイムアニメーション
- **RSSI → 距離変換** — Free Space Path Loss モデルによる推定距離計算
- **信号強度インジケーター** — 色分けされた電波強度バー
- **履歴グラフ** — 過去30秒間のRSSI推移をミニチャート表示
- **複数デバイス対応** — 複数のBLEデバイスを同時スキャン
- **PWAインストール** — ホーム画面への追加に対応
- **オフライン動作** — Service Workerによるキャッシュ

## 対応ブラウザ

Web Bluetooth APIが必要です：
- ✅ Chrome (PC / Android)
- ❌ Firefox (未対応)
- ❌ Safari / iOS (未対応)

**非対応ブラウザではデモモードで動作確認できます。**

## GitHub Pages へのデプロイ

1. このリポジトリをGitHubにプッシュ
2. Settings → Pages → Source: **GitHub Actions** を選択
3. `main` ブランチにプッシュすると自動デプロイ

## ローカル開発

```bash
npm install
npm run dev       # 開発サーバー起動 (http://localhost:5173)
npm run build     # 本番ビルド
npm run preview   # ビルド結果を確認
```

## 距離計算について

RSSI値からの距離推定にはFree Space Path Loss (FSPL) モデルを使用：

```
distance = 10 ^ ((TxPower - RSSI) / (10 * n))
```

- `TxPower = -59 dBm`（1m地点での標準BLE送信電力）
- `n = 2.5`（実環境の伝播係数）

**注意:** Bluetoothによる距離推定は壁・障害物・電波干渉の影響を受けるため、
あくまで目安の値です。

## RSSI取得について

Web Bluetooth APIではRSSIの直接取得に制限があります：
- `watchAdvertisements()` API（Chrome 79+、一部制限あり）でアドバタイズメントパケットのRSSIを取得
- 取得できない環境ではGATT接続後にシミュレーション値を表示
