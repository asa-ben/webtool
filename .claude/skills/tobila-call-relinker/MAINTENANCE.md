# tobila-call-relinker スキル修正手順書

このスキルを今後修正・調整するための手順をまとめたものです。対象読者は福井先生（および保守を引き継ぐ方）を想定しています。

## 1. スキルの構成と置き場所

スキルの実体はGitHubリポジトリ **asa-ben/webtool** の以下のファイルです。

```
.claude/skills/tobila-call-relinker/
├── SKILL.md        ← スキル本体（判定ロジック・実行手順のすべて）
├── SETUP.md        ← 定期実行（Routine）のセットアップガイドとプロンプト
├── MAINTENANCE.md  ← 本書
└── README.md       ← 概要
```

**重要な仕組み：** 毎朝6:00の定期実行（Routine）は、実行のたびにこのリポジトリの **mainブランチ** をクローンしてSKILL.mdを読み込みます。つまり：

- **mainブランチに変更が入れば、翌朝の実行から自動で反映される**（Routine本体の再設定は不要）
- 逆に、作業ブランチにpushしただけ・mainにマージし忘れた場合は**反映されない**
- 例外：Routineの「プロンプト」「実行時刻」「コネクタ」を変える場合だけは、claude.ai/code/scheduled でRoutine本体の設定変更が必要（→ §4）

※チャットからの対話モード起動用に claude.ai 側のユーザスキルにも同じものを登録している場合は、そちらにも同じ変更を反映してください（二重管理になっている点に注意）。

## 2. 修正のやり方（簡単な順）

### 方法A：Claude Codeのチャットで指示する（推奨）

このセッションと同じように、Claude Code（claude.ai/code またはCLI）でwebtoolリポジトリを開いて自然文で指示するだけです。編集・コミット・push・mainへのマージまでClaudeが行います。

指示の例：
- 「tobila-call-relinkerスキルの対象弁護士に○○先生（User ID不明なら名前だけでよい）を追加して、mainに反映して」
- 「tobila-call-relinkerの確認通知メールの文面を○○に変えて、mainに反映して」
- 「tobila-call-relinkerで△△のパターンは保留にするようルールを追加して、mainに反映して」

**コツ：「mainに反映して」まで明示する**こと。ブランチへのpushで止まると翌朝に反映されません。

### 方法B：GitHubのWeb画面で直接編集する

1. https://github.com/asa-ben/webtool を開く
2. `.claude/skills/tobila-call-relinker/SKILL.md` を開き、鉛筆アイコン（Edit）をクリック
3. 編集して「Commit changes」→ コミット先に **main** を選んで保存

表の行を1行足す程度の軽微な修正（弁護士追加・名前揺れ追加など）はこれが最速です。

### 方法C：ローカルにcloneして編集する

```bash
git clone https://github.com/asa-ben/webtool.git
# .claude/skills/tobila-call-relinker/SKILL.md を編集
git add -A && git commit -m "変更内容" && git push origin main
```

## 3. よくある修正と該当箇所（SKILL.md内）

| やりたいこと | 修正箇所 |
|---|---|
| 弁護士の追加・削除 | 「対象弁護士マスタ」の表に行を追加／削除。User IDはSalesforceで `SELECT Id, Name FROM User WHERE Name LIKE '%○○%'` で調べられる（Claudeに「○○先生のUser IDを調べて」と頼めばよい） |
| 音声認識の名前揺れを追加 | マスタ表の「名前揺れ例」列に「／○○」を追記。誤認識パターンに気付いたら都度足すと精度が上がる |
| 事務員の増減 | 「事務員ユーザIDの一覧」を更新。ただし実行時に毎回Activeユーザを再取得して突合するので、放置しても動作はする（報告メールに差分が出る） |
| 自動紐付けの基準を変える（厳しく／緩く） | 「Step 6: 確度判定」。高確度・中確度・保留の条件を編集 |
| 通知メールの宛先・件名・文面 | 「Step 11: 報告」。弁護士のメールアドレス一覧と定型文がここにある |
| 各弁護士への個別通知をやめる／福井先生宛のみに戻す | Step 11の(b)を削除し、実行モード表・Step 6・Step 7の「確認通知」記述も合わせて修正 |
| 対象期間のデフォルトを変える | 「Step 0」とSETUP.mdのRoutineプロンプト（→ §4） |
| スキルの自動起動キーワードを変える | ファイル冒頭のYAML frontmatter内 `description`。**ここはチャットでスキルが自動起動する条件なので、削りすぎに注意** |

## 4. Routine本体の変更が必要なケース

以下はSKILL.mdではなく、**claude.ai/code/scheduled** で該当Routine（tobila-call-relinker-nightly）を開いて変更します：

- 実行時刻・頻度の変更（例：毎朝6:00→7:00）
- 使用コネクタの追加・削除（Salesforce／Gmail／Drive）
- Routineプロンプト自体の変更（例：ドライランへの切り替え）

Routineプロンプトを変えた場合は、**SETUP.mdの「Routineプロンプト（コピペ用）」も同じ内容に更新**しておくこと（ドキュメントと実体のずれ防止）。

## 5. 変更時の安全策（推奨ワークフロー）

1. **判定基準やロジックを変えたときは、いきなり無人実行に任せず対話モードで試運転する**
   - チャットで「昨日の架電を紐付けて」と起動し、判定結果を目視確認（2026/6/11の試運転と同じ要領）
2. **大きな変更はドライランを1〜2回挟む**
   - SETUP.md §4の手順どおり、Routineプロンプトを一時的に「WhatIdの更新は一切行わず、更新予定リストをメール報告するだけにする（ドライラン）」に差し替え、報告メールの精度を確認してから戻す
3. **ロールバックCSV作成（Step 8）の手順は削らない**
   - 誤紐付け時の唯一の復元手段
4. **変更後の最初の朝は報告メールを確認する**
   - メールが来ない＝実行失敗の可能性。claude.ai/code/scheduled の実行履歴でセッションログを確認

## 6. 変更履歴の確認と巻き戻し

- 過去の変更履歴：GitHubでファイルを開き「History」、またはローカルで `git log -- .claude/skills/tobila-call-relinker/`
- スキルを以前の版に戻したい：Claudeに「tobila-call-relinkerスキルを○月○日時点の内容に戻してmainに反映して」と指示するか、GitHubのHistoryから当該コミットの内容で上書き

## 7. トラブルシューティング

| 症状 | 確認すること |
|---|---|
| 朝の報告メールが来ない | claude.ai/code/scheduled の実行履歴→セッションログ。コネクタの認証切れ（Salesforce／Gmailの再接続）が典型 |
| 変更したはずなのに旧仕様で動く | mainブランチにマージされているか確認（GitHubでSKILL.mdをmainで開いて目視） |
| 誤った紐付けが行われた | 報告メール記載のロールバックCSV（Google Drive「_tobila_rollback」フォルダ）から旧WhatIdを確認し、SalesforceでTaskのWhatIdを戻す。Claudeに「このCSVの○件目をロールバックして」と指示してもよい |
| 誤判定が同じパターンで繰り返される | そのパターンをSKILL.mdの「判断保留すべきケース」または名前揺れマスタに追記する（§3参照） |
