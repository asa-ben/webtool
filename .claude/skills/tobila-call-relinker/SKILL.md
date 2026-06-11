---
name: tobila-call-relinker
description: 朝日弁護士法人のトビラフォンCloud架電記録（Salesforce Task）を、電話相手のAccountから本来の事件（BasicInfo__c＝基本情報）に紐付け直すスキル。対象は所属弁護士全員（福井・菊井・高梨・千葉・福本・岩山・桑田・安川・牛尾・戸井）。「今日の架電を紐付けて」「トビラフォンの記録を整理して」「架電履歴を基本情報に紐付けて」「電話のWhatIdを直して」「架電と事件を結び付けて」「全弁護士分の架電を処理して」と要求された場合に必ず起動する。各弁護士本人の発信・着信に加え、事務員が一次受電して弁護士に内線転送した架電も対象とする。WhatIdを電話相手AccountからBasicInfo__cに付け替える。対話モード（承認制）と無人実行モード（定期実行用・高確度のみ自動紐付け）の2モードを持つ。
---

# トビラフォン架電紐付けスキル（朝日弁護士法人・全弁護士版）

## 背景と問題

朝日弁護士法人ではTobila Cloud × Salesforce連携により、架電記録がSalesforce上にTaskとして自動作成される。しかしWhatIdが**電話相手のAccount**（Tobila電話帳とSalesforce Accountの自動マッチング結果）に紐づくだけで、**本来の事件（BasicInfo__c＝基本情報）には紐づかない**。これにより、せっかくの音声テキスト化された架電記録が事件に紐づかず活用できない状態になっている。

本スキルは、毎日（または任意の期間）の架電TaskのWhatIdを、会話内容と関係者情報から特定した適切なBasicInfo__cに付け替える。

## 実行モード

| モード | 起動条件 | 紐付け実行 |
|---|---|---|
| **対話モード**（デフォルト） | チャットで起動された場合 | 候補を提示し、ユーザ承認後に更新 |
| **無人実行モード** | 定期実行（Routine/Scheduled Task）から起動された場合、またはプロンプトに「無人実行」「自動モード」と明記された場合 | 高確度判定のみ自動更新。それ以外は保留リストとしてメール報告 |

## 対象弁護士マスタ

| 弁護士 | Salesforce User ID | 音声テキストの名前揺れ例 |
|---|---|---|
| 福井 康朝 | `0052v00000ZWtuFAAT` | 福井／フクイ／福居／吹井 |
| 菊井 聡 | `0052j0000010P2gAAE` | 菊井／キクイ／菊池／菊地 |
| 高梨 翔太 | `005Ij000000xZ14IAE` | 高梨／タカナシ／タカハシ／高橋 |
| 千葉 梢 | `0052u000000nRVPAA2` | 千葉／チバ／千場 |
| 福本 浩志 | `0052j0000010LQZAA2` | 福本／フクモト／福元 |
| 岩山 勝湖 | `005Q800000HhBxhIAF` | 岩山／イワヤマ／岩谷 |
| 桑田 貴大 | `005Ij000000xZRHIA2` | 桑田／クワタ／クワダ／鍬田 |
| 安川 愼二 | `005Ij000000xZPQIA2` | 安川／ヤスカワ／保川 |
| 牛尾 貴子 | `0052u000000nwj8AAA` | 牛尾／ウシオ／潮／牛男 |
| 戸井 良和 | `005Ij000000xZBsIAM` | 戸井／トイ／土井／問井 |

**対象外（2026年6月時点）**: 松井 淳。対象外弁護士宛の架電は「件外」として件数のみ報告する。対象に追加する場合は上の表に行を追加するだけでよい。

**取次ぎ先判定の特記事項：**
- 「**フクイ**」と「**フクモト**」は音声認識で相互誤認識の可能性がある。Description全体の文脈（取次ぎ完了時の名乗り「お電話代わりました、○○です」側を優先）で判定し、確信が持てない場合は保留する。
- 「**タカハシ**」は高梨先生の誤認識である可能性が高いが、相手の**名乗り**が「タカハシ」の場合は別人（取次ぎ先を見る）。
- 「**トイ**」は「**ドイ（土井）**」と相互誤認識されやすい。弊所に土井姓の弁護士はいないため「土井先生」への取次ぎ依頼は戸井先生宛の可能性が高いが、確信が持てない場合は保留する。
- 「福井先生」は代表のため、特定事件と無関係な事務所宛一般電話（営業・団体関係等）の可能性も考慮する。事件性のない会話は紐付け対象外として報告のみ。

## 対象範囲

### 1. 対象弁護士本人がOwnerの架電
- `OwnerId IN (対象弁護士IDリスト)`
- `Subject LIKE '%トビラ%'` の Task
- 各弁護士の発信・直接着信

### 2. 事務員受電→対象弁護士に内線転送された架電
事務員ユーザIDの一覧（2026年5月時点）：
- 井上 史菜：`005Ij000000xYQgIAM`
- 丸尾 恵理奈：`0052j000000w39cAAA`
- 溝口 恵理：`005Q800000JDVavIAH`
- 溝口 妙子：`0052j000000vx4vAAA`
- 三善 長子：`005Q800000DFDrtIAH`
- 四方 亜依：`0052v00000cluZFAAY`
- 小川 明日香：`005Q800000HoGEHIA3`
- 深山 遼：`005Q800000BPdkcIAD`
- 大室 拓矢：`005Ij000000xZSjIAM`
- 白土 友梨香：`0052u000001RD4PAAW`
- 平 朋佳：`005Ij000000xZRMIA2`
- 鈴木 侑：`005Ij000000xZQ4IAM`
- 帶 陽子：`005Q800000DFcByIAL`

**事務員リストは時間経過で変わる可能性があるため、起動時に必ず最新のActiveユーザを再取得して確認すること**（実行手順Step 1参照）。

転送先弁護士の判定基準（音声テキストDescription内）：
- 相手先が「**○○先生**いらっしゃいますか」「**○○先生**お願いします」等と取次ぎを依頼している
- かつ事務員が「お待ちください」→ 後段で「**お電話代わりました、○○です**」のような取次ぎ完了の発話がある
- ○○を上記マスタの名前揺れ例と照合して、どの弁護士宛かを判定する
- 注意：相手先の**名乗り**が弁護士と同姓の場合（例：「タカハシミチオと申しますが、〇〇先生」）は別人。取次ぎ先で判定する

## 識別ロジック詳細

音声テキストは精度が完璧ではない。全員「先生」を付けるため、「○○先生」の○○部分を抽出し、マスタの揺れ例と照合する。

検出は緩めに広く拾い、最終判定は対話モードでは**人間（弁護士本人または福井先生）に確認**する。無人実行モードでは後述の高確度基準を満たすもののみ自動実行する。

## 実行手順

### Step 0: 起動時の現状確認
- `getUserInfo` で現在のユーザを確認
- 対話モードの場合：処理対象を確認する
  - 「私は○○です」と名乗りがあれば、その弁護士分のみ処理（本人モード）
  - 福井先生からの起動、または指定がなければ**全対象弁護士分**を処理（全所モード）
- 対象期間をユーザに確認（デフォルト：昨日分のみ（朝一に前日分をまとめて処理する運用））
- 無人実行モードの場合：全対象弁護士・前日分を自動選択し、確認をスキップ

### Step 1: 事務員ユーザリストの再取得
```sql
SELECT Id, Name FROM User WHERE IsActive = true ORDER BY Name
```
取得後、所属弁護士（マスタ記載の全員＋松井）とシステムユーザ（Integration Insights, Platform Integration User, Process Automated）を除いた残りを「事務員候補」とみなす。スキルファイル冒頭のIDリストと突き合わせ、増減があればユーザに知らせる（無人実行モードでは報告メールに記載）。

### Step 2: 対象Taskの抽出

**(a) 対象弁護士本人Owner分：**
```sql
SELECT Id, Subject, CallType, CallDurationInSeconds, ActivityDate, CreatedDate,
       WhatId, What.Name, What.Type, AccountId, Account.Name, OwnerId, Owner.Name, Description
FROM Task
WHERE OwnerId IN ({対象弁護士IDリスト})
  AND Subject LIKE '%トビラ%'
  AND ActivityDate >= {対象期間開始}
  AND ActivityDate <= {対象期間終了}
ORDER BY OwnerId, CreatedDate ASC
```

**(b) 事務員Owner着信分：**
```sql
SELECT Id, CallType, CallDurationInSeconds, ActivityDate, CreatedDate,
       WhatId, What.Name, What.Type, OwnerId, Owner.Name, Description
FROM Task
WHERE Subject LIKE '%トビラ%'
  AND CallType = 'Inbound'
  AND ActivityDate >= {対象期間開始}
  AND ActivityDate <= {対象期間終了}
  AND OwnerId IN ({事務員IDリスト})
ORDER BY CreatedDate ASC
```

### Step 3: 既に基本情報に紐づいているものを除外
WhatIdが既に`a01`（BasicInfo__c）で始まるものは処理済みなので**スキップ**。
処理対象は WhatId が `001`（Account）または null のもののみ。

### Step 4: 事務員受電の取次ぎ先判定

事務員Owner着信Taskの各Descriptionを読み、以下を判定する：

1. 「**○○先生**」「**○○弁護士**」が**取次ぎを依頼する文脈**で出現 → マスタの揺れ例と照合して取次ぎ先弁護士を特定
2. 直後に「**お電話代わりました、○○です**」等の取次ぎ完了発話があれば、その名乗りを判定の最優先根拠とする

**振り分け：**
- 取次ぎ先が**対象弁護士**のいずれか → その弁護士の処理対象に追加
- 取次ぎ先が**対象外弁護士**（松井等） → 件外。件数のみ報告
- 取次ぎ先が判定不能（揺れ例に合致しない、複数候補で文脈からも絞れない） → 保留リストへ

**除外パターン：**
- 相手先の名乗りが弁護士と同姓の場合（取次ぎ先で判定し、取次ぎ先がなければ件外）
- 事務員が「○○は不在です」等と回答して取次ぎがなかった場合 → ただし**伝言内容から事件が特定できる場合は紐付け候補にしてよい**（担当弁護士＝伝言の宛先弁護士として扱う）

判定根拠を「該当する会話の冒頭〜取次ぎ部分」の抜粋として記録し、後で提示する。

### Step 5: 各架電について基本情報候補を特定

Description（音声テキスト）から以下のキーワードを抽出：
- 相手の名乗り（「○○と申します」「○○です」）
- 言及された人物名・会社名・事件キーワード
- 取次ぎを求めた相手弁護士名（取次ぎ電話の場合）
- 案件特定に役立つ文脈（金額、日付、不動産名、訴訟段階等）

以下のクエリでは `{担当弁護士ID}` に**当該架電の対象弁護士のUser ID**を入れる。担当弁護士で絞っても候補が出ない場合は、`BasicInfo__r.User__c` / `User__c` の絞り込みを外して再検索してよい（復代理・共同受任の場合があるため）。その場合は担当不一致である旨を候補に明記する。

**(a) 電話相手Accountから基本情報を逆引き**
```sql
SELECT Id, Name, BasicInfo__c, BasicInfo__r.Name, BasicInfo__r.User__r.Name,
       BasicInfo__r.StageName__c, BasicInfo__r.Account__r.Name,
       BasicInfo__r.Treatment__c, Account__c, Account__r.Name,
       Dairinin_aitegata__c, Dairinin_aitegata__r.Name, AgentName__c, PersonType__c
FROM DefendantInfo__c
WHERE (Account__c = '{相手AccountId}' OR Dairinin_aitegata__c = '{相手AccountId}')
  AND BasicInfo__r.User__c = '{担当弁護士ID}'
LIMIT 30
```

**(b) 会話内の人物・代理人名から検索**
```sql
SELECT Id, Name, BasicInfo__c, BasicInfo__r.Name, BasicInfo__r.User__r.Name,
       BasicInfo__r.StageName__c, Account__r.Name, AgentName__c,
       Dairinin_aitegata__r.Name, PersonType__c
FROM DefendantInfo__c
WHERE (AgentName__c LIKE '%キーワード%'
       OR Dairinin_aitegata__r.Name LIKE '%キーワード%'
       OR Account__r.Name LIKE '%キーワード%')
  AND BasicInfo__r.User__c = '{担当弁護士ID}'
LIMIT 30
```

**(c) 依頼者名で検索（相手先がよく聞いてくる事件の場合）**
```sql
SELECT Id, Name, Account__r.Name, User__r.Name, StageName__c, Treatment__c, Jiken_shurui__c
FROM BasicInfo__c
WHERE Account__r.Name LIKE '%キーワード%'
  AND User__c = '{担当弁護士ID}'
LIMIT 20
```

### Step 6: 確度判定

各候補について以下の基準で確度を判定する：

**高確度（無人実行モードで自動紐付け可）— 以下をすべて満たす：**
1. Step 5(a)のAccount逆引きで候補が**ちょうど1件**ヒット
2. 候補基本情報の担当弁護士（`BasicInfo__r.User__c`）が当該架電の対象弁護士と**一致**
3. 候補基本情報のフェーズが終了・完了系でない（StageName__cが進行中の案件）
4. 会話内容（Description）に候補事件と矛盾する要素がない

**中・低確度（要承認）— 上記以外すべて：**
- 候補が複数件
- 担当弁護士不一致
- キーワード検索（b)(c)）経由でのみヒット
- 音声テキストが断片的

### Step 7: 結果の提示と承認

**対話モード：** 以下の形式で確認を取る：
```
【架電N】時刻 通話時間 (発信/着信、事務員受電の場合はその旨)
対象弁護士: ○○先生
電話相手（現WhatId）: 〇〇
会話の要点: 〜〜〜
取次ぎ先（事務員受電の場合）: 〇〇先生（取次ぎ会話の引用）

候補基本情報: a01XXXX「事件名」
  担当弁護士: ○○ ✓/✗
  フェーズ: 受任中
  確度: 高/中/低
  紐付け根拠: 〇〇が相手方代理人として登録 + 会話の「○○」と整合
```
全所モードの場合は**弁護士ごとにセクション分け**して提示する。

**無人実行モード：** 高確度のみStep 9へ進み自動更新。中・低確度と候補なしは保留リストへ。

### Step 8: ロールバック用CSVの作成

実行前に `whatid_rollback_{YYYYMMDD}.csv` を作成。
カラム：TaskId, Subject, CallType, ActivityDate, 対象弁護士, 旧WhatId, 旧What_Name, 旧AccountId, 旧Account_Name, 新WhatId, 新BasicInfo_Name, 確度, 実行日時

- 対話モード：`/home/claude/` に作成しユーザに提示
- 無人実行モード：Google Driveの管理フォルダ（基本情報フォルダ直下の「_tobila_rollback」フォルダ。なければ作成）にアップロードし、報告メールにリンクを記載

### Step 9: WhatIdの更新

```
updateSobjectRecord(
  sobject-name='Task',
  id='{TaskId}',
  body={"WhatId": "{新BasicInfoId}"}
)
```

**Owner は変更しない**（事務員受電の場合も事務員のOwnerのまま）。これにより誰が受電したかの記録が残る。

### Step 10: 結果検証
更新後に以下で確認：
```sql
SELECT Id, Subject, ActivityDate, WhatId, What.Type, What.Name,
       AccountId, Account.Name, OwnerId, Owner.Name
FROM Task WHERE Id IN ({更新したTaskIdリスト})
```
WhatIdが`a01...`（BasicInfo__c）に変わり、AccountIdが`null`になることを確認。

### Step 11: 報告（無人実行モードのみ）

Gmailで報告メールを**福井先生宛の1通のみ**送信する：
- 宛先：fukui@a-fukui-law.com
- 内容：弁護士ごとにセクション分けし、各弁護士の (a)自動紐付け分（事件名・確度・根拠つき）、(b)保留分（候補と根拠、または候補なし）、(c)件外件数 を記載。末尾にロールバックCSVのDriveリンクを記載
- 処理対象が0件の日も「本日0件」のメールを1通送る（実行確認のため）

**将来の拡張：** 各弁護士宛の個別報告メール（kikui@ / takanashi@ / chiba@ / fukumoto@ / iwayama@ / kuwada@ / yasukawa@ / ushio@ / toi@ ＠a-fukui-law.com に自分の分のみを送る方式）は設計済みだが、当面は実施しない。福井先生からの指示があった場合のみ有効化する。

## 注意事項

### 不可逆性とロールバック
- WhatIdを基本情報に付け替えると、`AccountId`は**自動的にnull**になる（Salesforceの仕様。WhatIdとAccountIdは連動）
- 元の相手方Account情報は`Description`内のTobilaURL・通話日時・音声テキストから復元可能
- 万一誤った紐付けの場合、Step 8で保存したロールバックCSVから旧WhatIdに戻せる

### 判断保留すべきケース
以下の場合は無理に紐付けず、対話モードではユーザに確認、無人実行モードでは保留リストに回す：
- 複数の基本情報が候補に挙がり、会話内容だけでは1つに絞れない
- 相手Accountが複数の基本情報に登場している
- 音声テキストが断片的すぎて事案を特定できない
- 取次ぎ先弁護士が判定できない（フクイ／フクモト混同の可能性など）

### 候補なしのTaskの扱い
- 手動でBasicInfo IDを指示してもらう
- 今回はスキップ（WhatIdは現状維持）
- 該当する基本情報が未作成の可能性 → case-initializer 起動を提案（対話モードのみ）

### プライバシーへの配慮
- **本人モード**で起動された場合、他の弁護士宛架電のDescriptionも検出フローで確認することになるが、これは技術的に避けられない。**判定後、起動者以外の弁護士宛と判明した架電のDescription内容は要約・引用しない**。「○○先生宛て、件外、N件」とのみ報告する
- **無人実行モードの報告メール**は代表（福井先生）宛の管理者報告であるため、全弁護士分の要点を記載してよい。ただし会話内容の引用は紐付け根拠の説明に必要な最小限にとどめる
- 対象外弁護士（松井等）宛の架電内容は引用せず、件数のみ

## ファイル出力

最終的に以下を提示：
1. 紐付け完了したTaskの一覧（弁護士別、基本情報名、現WhatId、新WhatId、確度）
2. ロールバック用CSV
3. 保留・候補なしTaskの一覧（あれば）
4. 件外（対象外弁護士宛・事件性なし）の件数
