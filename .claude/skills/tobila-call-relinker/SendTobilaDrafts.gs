/**
 * SendTobilaDrafts.gs
 *
 * 目的：
 *   毎朝6:00のClaude Code Routine（tobila-call-relinker）は、中確度で自動紐付けした
 *   架電について各弁護士宛の確認通知メール（および福井先生宛の管理者報告）を作成する。
 *   ただしGmailコネクタは下書き作成（createDraft）のみで送信ができないため、これらは
 *   「下書き」のまま残る。本スクリプトは、そのうち本スキルが作成した下書きだけを抽出して
 *   送信する。
 *
 * 前提：
 *   - 本スクリプトは、Routineが下書きを作成するGoogleアカウント（＝Gmailコネクタで接続して
 *     いる福井先生のアカウント）と同一アカウントのApps Scriptとして実行すること。
 *     別アカウントのドラフトは見えないため送信できない。
 *   - 送信対象は「件名に SUBJECT_MARKER を含む下書き」。SKILL.md Step 11で全メールの件名に
 *     必ず [tobila-relinker] を付ける運用に揃えてある。
 *
 * 使い方：
 *   1. https://script.google.com で新規プロジェクトを作成し、本ファイルを貼り付ける
 *   2. CONFIG.DRY_RUN = true のまま sendTobilaDrafts() を手動実行し、実行ログ（表示→ログ）で
 *      送信予定の宛先・件名を確認する
 *   3. 問題なければ CONFIG.DRY_RUN = false に変更
 *   4. setUpTrigger() を一度だけ実行し、毎朝の時刻トリガーを作成する
 *      （Routineの6:00実行が確実に終わった後に動くよう、既定では7:00に設定）
 *
 * 安全策：
 *   - 件名マーカー一致・宛先ドメイン一致・作成からの経過時間（MAX_AGE_HOURS以内）の
 *     3条件をすべて満たす下書きのみ送信する。無関係な個人下書きや古い下書きは送らない。
 *   - 送信済みの下書きはGmailから消えるため、トリガーの再実行で二重送信されない。
 */

var CONFIG = {
  // true: 送信せずログ出力のみ（初回検証用） / false: 実送信
  DRY_RUN: true,

  // 送信対象とする下書きの件名マーカー（部分一致）。
  // SKILL.md Step 11で全メールの件名にこの文字列を必ず含めること。
  SUBJECT_MARKER: '[tobila-relinker]',

  // 安全策：宛先がこのドメインを含む下書きのみ送信する
  ALLOWED_DOMAIN: '@a-fukui-law.com',

  // 安全策：作成からこの時間（時間単位）以内の下書きのみ送信する（古い下書きの誤送信防止）
  MAX_AGE_HOURS: 12,

  // 時刻トリガーの実行時刻（スクリプトのタイムゾーン基準。日本のアカウントは通常JST）
  TRIGGER_HOUR: 7,
  TRIGGER_MINUTE: 0
};

/**
 * 本スキルが作成した下書きを送信する。トリガーから毎朝呼ばれる。
 */
function sendTobilaDrafts() {
  var drafts = GmailApp.getDrafts();
  var now = new Date();
  var sent = 0, skipped = 0, failed = 0;
  var lines = [];

  for (var i = 0; i < drafts.length; i++) {
    var draft = drafts[i];
    var msg = draft.getMessage();
    var subject = msg.getSubject() || '';
    var to = msg.getTo() || '';
    var date = msg.getDate();

    // 1. 件名マーカーで本スキルの下書きだけに絞る
    if (subject.indexOf(CONFIG.SUBJECT_MARKER) === -1) {
      continue;
    }

    // 2. 宛先ドメインチェック
    if (to.indexOf(CONFIG.ALLOWED_DOMAIN) === -1) {
      lines.push('SKIP(domain): ' + to + ' | ' + subject);
      skipped++;
      continue;
    }

    // 3. 作成時刻チェック（古い下書きは送らない）
    var ageHours = (now.getTime() - date.getTime()) / 3600000;
    if (ageHours > CONFIG.MAX_AGE_HOURS) {
      lines.push('SKIP(age ' + ageHours.toFixed(1) + 'h): ' + to + ' | ' + subject);
      skipped++;
      continue;
    }

    // 送信
    try {
      if (CONFIG.DRY_RUN) {
        lines.push('DRY_RUN would-send: ' + to + ' | ' + subject);
      } else {
        draft.send();
        lines.push('SENT: ' + to + ' | ' + subject);
      }
      sent++;
    } catch (e) {
      lines.push('FAILED: ' + to + ' | ' + subject + ' -> ' + e);
      failed++;
    }
  }

  var summary = (CONFIG.DRY_RUN ? '[DRY_RUN] ' : '') +
                'sent=' + sent + ' skipped=' + skipped + ' failed=' + failed;
  Logger.log(summary + '\n' + lines.join('\n'));
  return summary;
}

/**
 * 毎朝 sendTobilaDrafts() を実行する時刻トリガーを作成する。
 * 既存の同名トリガーは削除してから作り直す（重複防止）。一度だけ手動実行すればよい。
 */
function setUpTrigger() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'sendTobilaDrafts') {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }
  ScriptApp.newTrigger('sendTobilaDrafts')
    .timeBased()
    .everyDays(1)
    .atHour(CONFIG.TRIGGER_HOUR)
    .nearMinute(CONFIG.TRIGGER_MINUTE)
    .create();
  Logger.log('Trigger set: sendTobilaDrafts daily ~' +
             CONFIG.TRIGGER_HOUR + ':' + ('0' + CONFIG.TRIGGER_MINUTE).slice(-2) +
             ' (timezone: ' + Session.getScriptTimeZone() + ')');
}
