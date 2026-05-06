export interface ChangelogEntry {
  date: string;
  title?: string;
  bullets: string[];
}

/** Most-recent first. Add new entries at the top. */
export const CHANGELOG: readonly ChangelogEntry[] = [
  {
    date: "2026-05-06",
    title: "初版",
    bullets: [
      "5人ナポレオン専用、10ゲーム1セットの点数記録",
      "各プレイヤーの増減点を自動計算（ゼロサム）",
      "全取り（宣言20未満で20枚獲得）は自動的に負け扱い",
      "倍率 ×1 / ×2 / ×4 (チョンボ後用)、最終ゲームは自動で実効 ×2",
      "URL ハッシュ（#data=…）で結果を共有・復元",
      "プレイヤー名のサジェスト（前回までに入力した名前を候補表示）",
      "ホーム画面に追加してアプリのように使える（PWA・オフライン動作）",
    ],
  },
];
