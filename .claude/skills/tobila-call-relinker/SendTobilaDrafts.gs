/**
 * SendTobilaDrafts.gs
 *
 * 目的：
 *   毎朝のClaude Code Routine（tobila-call-relinker）は、中確度で自動紐付けした架電の
 *   確認通知メール（各弁護士宛）、手動紐付けが必要な架電の通知（各弁護士宛）、および
 *   管理者報告（福井先生宛）を作成する。ただしGmailコネクタは下書き作成（createDraft）
 *   のみで送信ができないため、これらは「下書き」のまま残る。
 *   本スクリプトは、そのうち本スキルが作成した下書きだけを抽出して送信する。
 *
 * 前提：
 *   - 本スクリプトは、Routineが下書きを作成するGoogleアカウント（＝Gmailコネクタで接続して
 *     いる福井先生のアカウント）と同一アカウントのApps Scriptとして実行すること。
 *     別アカウントのドラフトは見えないため送信できない。
 *
 * 関数：
 *   - sendTobilaDrafts()    … 毎朝の時刻トリガー用。作成からMAX_AGE_HOURS以内の下書きのみ送信
 *   - sendTobilaDraftsNow() … 手動用。経過時間を無視して該当下書きを一括送信（溜まった分の掃き出し）
 *   - listDrafts()          … 診断用。全下書きの宛先・件名・日時をログ出力
 *   - setUpTrigger()        … sendTobilaDrafts() の毎朝トリガーを作成
 *
 * 使い方（初回）：
 *   1. script.google.com で新規プロジェクトを作成し、本ファイルを貼り付ける
 *   2. CONFIG.DRY_RUN = true のまま sendTobilaDraftsNow() を実行し、ログで送信予定を確認
 *   3. 問題なければ CONFIG.DRY_RUN = false にして sendTobilaDraftsNow() を実行（溜まった下書きを送信）
 *   4. CONFIG.DRY_RUN = false のまま setUpTrigger() を一度実行し、毎朝の自動送信を有効化
 */

var CONFIG = {
  // true: 送信せずログ出力のみ（検証用） / false: 実送信
  DRY_RUN: true,

  // 送信対象とする下書きの件名マーカー（いずれかを部分一致で含めば対象）。
  // 先頭は今後のRoutineが全メールに付与する共通マーカー。以降は導入前の既存下書き用の
  // 件名パターン。無関係な下書き（例：【朝のメール棚卸し】）は一致しないので送信されない。
  SUBJECT_MARKERS: [
    '[tobila-relinker]',              // 今後のRoutineが付与する共通マーカー
    '架電の自動紐付け',                // 既存：中確度の確認通知（各弁護士宛）
    '手動紐付けが必要',                // 既存：手動紐付けが必要の通知（各弁護士宛）
    '架電紐付け・管理者報告'           // 既存：管理者報告（福井先生宛）。不要なら削除可
  ],

  // 安全策：宛先がこのドメインを含む下書きのみ送信する
  ALLOWED_DOMAIN: '@a-fukui-law.com',

  // 安全策：作成からこの時間（時間単位）以内の下書きのみ送信する（毎朝トリガー時の誤送信防止）。
  // sendTobilaDraftsNow() ではこのチェックは無視される。
  MAX_AGE_HOURS: 12,

  // 時刻トリガーの実行時刻（スクリプトのタイムゾーン基準。日本のアカウントは通常JST）
  TRIGGER_HOUR: 7,
  TRIGGER_MINUTE: 0
};

/** 毎朝の時刻トリガー用：作成からMAX_AGE_HOURS以内の下書きのみ送信 */
function sendTobilaDrafts() {
  return _sendTobilaDrafts(false);
}

/** 手動用：経過時間を無視して該当下書きを一括送信（溜まった下書きの掃き出し） */
function sendTobilaDraftsNow() {
  return _sendTobilaDrafts(true);
}

function _sendTobilaDrafts(ignoreAge) {
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

    // 1. 件名マーカー（いずれか）で本スキルの下書きだけに絞る
    if (!_matchesAnyMarker(subject)) {
      continue;
    }

    // 2. 宛先ドメインチェック
    if (to.indexOf(CONFIG.ALLOWED_DOMAIN) === -1) {
      lines.push('SKIP(domain): ' + to + ' | ' + subject);
      skipped++;
      continue;
    }

    // 3. 作成時刻チェック（毎朝トリガー時のみ。手動一括送信では無視）
    if (!ignoreAge) {
      var ageHours = (now.getTime() - date.getTime()) / 3600000;
      if (ageHours > CONFIG.MAX_AGE_HOURS) {
        lines.push('SKIP(age ' + ageHours.toFixed(1) + 'h): ' + to + ' | ' + subject);
        skipped++;
        continue;
      }
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
                (ignoreAge ? '(now) ' : '(daily) ') +
                'sent=' + sent + ' skipped=' + skipped + ' failed=' + failed;
  Logger.log(summary + '\n' + lines.join('\n'));
  return summary;
}

function _matchesAnyMarker(subject) {
  for (var i = 0; i < CONFIG.SUBJECT_MARKERS.length; i++) {
    if (subject.indexOf(CONFIG.SUBJECT_MARKERS[i]) !== -1) {
      return true;
    }
  }
  return false;
}

/** 診断用：全下書きの宛先・件名・日時をログ出力する */
function listDrafts() {
  var drafts = GmailApp.getDrafts();
  Logger.log('total drafts: ' + drafts.length);
  for (var i = 0; i < drafts.length; i++) {
    var m = drafts[i].getMessage();
    Logger.log((i + 1) + '. [' + m.getDate() + '] match=' + _matchesAnyMarker(m.getSubject() || '') +
               ' to=' + m.getTo() + ' | subj=' + m.getSubject());
  }
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
