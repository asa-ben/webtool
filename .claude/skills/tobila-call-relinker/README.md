# tobila-call-relinker

トビラフォンCloud架電記録（Salesforce Task）のWhatIdを、電話相手のAccountから本来の事件（BasicInfo__c＝基本情報）に紐付け直すスキル。

- `SKILL.md` — スキル本体（対象弁護士マスタ・実行手順・確度判定基準）
- `SETUP.md` — クラウドScheduled Task（Routine）での定期実行セットアップガイド
- `MAINTENANCE.md` — スキルの修正手順書（保守ガイド）
- `SendTobilaDrafts.gs` — 確認通知メールの下書きを毎朝送信するGoogle Apps Script（Gmailコネクタが送信非対応のため）

対話モード（チャットから「昨日の架電を紐付けて」等で起動）と、無人実行モード（毎朝6:00 JSTのRoutineから起動）の2モードで動作する。無人実行モードでは高確度・中確度を自動紐付けし、中確度分は当該弁護士へ毎朝確認通知メールを送る（誤りは弁護士自身が修正）。未登録・判定不能のものは保留として手動紐付けに委ねる。
