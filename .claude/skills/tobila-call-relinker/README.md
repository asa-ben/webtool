# tobila-call-relinker

トビラフォンCloud架電記録（Salesforce Task）のWhatIdを、電話相手のAccountから本来の事件（BasicInfo__c＝基本情報）に紐付け直すスキル。

- `SKILL.md` — スキル本体（対象弁護士マスタ・実行手順・確度判定基準）
- `SETUP.md` — クラウドScheduled Task（Routine）での定期実行セットアップガイド

対話モード（チャットから「昨日の架電を紐付けて」等で起動）と、無人実行モード（毎朝6:00 JSTのRoutineから起動、高確度のみ自動紐付け）の2モードで動作する。
