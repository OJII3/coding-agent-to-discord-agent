# coding agent to discord agent

公式 CLI コーディングエージェント（gemini-cli、claude code 等）を Discord エージェントとして動作させるツール。非公式クライアントではなく、公式 CLI をヘッドレスモードでラップして使用する。

## 特徴

**メリット**

- 非公式クライアント（openclaw、opencode 等）を使わずに済む
- 公式 CLI をそのまま利用するため、CLI の機能（MCP ツール、コード実行等）がそのまま使える
- 手軽に AI Discord bot を構築できる

**デメリット**

- 公式 CLI の制約を受ける（機能・性能の制限）
- 利用規約への制限の可能性（各自の責任で使用）
- 公式 CLI の更新により動作が影響を受ける可能性
- CLI の内部設定・プロンプトにより、応答スタイルが制限される

## 技術スタック

| 項目 | 選定 |
|------|------|
| ランタイム | Bun |
| 言語 | TypeScript |
| テスト | `bun:test` |
| MCP SDK | `@modelcontextprotocol/sdk` v1.x |
| Discord | `discord.js` v14.x |
| スキーマ | `zod` v3 |
| 初期対応 CLI | gemini-cli |

## アーキテクチャ

### 全体構成

```
[ランチャー (src/launcher/)]
  │  .gemini/settings.json (MCP 設定) を生成
  │  GEMINI.md (システムプロンプト) を生成
  │
  └─ Bun.spawn("gemini", ["-p", "初期プロンプト", "--yolo"])
       │
       └─ gemini-cli が MCP サーバーを stdio 子プロセスとして起動
            │  command: "bun"
            │  args: ["run", "src/mcp-server/index.ts"]
            │
            └─ [MCP サーバー (src/mcp-server/)]
                 ├─ discord.js で Discord Gateway に接続
                 ├─ wait_until_event: イベント待ち (Promise ブロック)
                 ├─ send_message: メッセージ送信
                 ├─ get_channel_messages: メッセージ履歴取得
                 └─ add_reaction: リアクション追加
```

TS スクリプト自体が MCP サーバープロセスとして動作し、gemini-cli から stdio で呼び出される構成。ランチャーは gemini-cli の起動と設定ファイル生成を担当する別モジュール。

### イベントループ

インタラクティブモードを使わず、`wait_until_event` MCP ツールによるイベント駆動で動作する。

```
gemini-cli 起動（-p フラグ、ヘッドレスモード）
  → 初期プロンプト実行
  → システムプロンプトの指示に従い wait_until_event を呼ぶ
  → MCP サーバーが Promise でブロック（Discord イベント待ち）
  → Discord でメッセージ受信
  → Promise resolve → gemini-cli にイベント内容を返却
  → gemini-cli が内容を判断し send_message 等で返信
  → 再び wait_until_event を呼ぶ
  → (繰り返し)
```

**重要**: システムプロンプトに「すべてのアクション完了後、必ず `wait_until_event` を呼び出すこと」を明記する。これにより、CLI エージェントが自律的にイベントループを維持する。

### `wait_until_event` の実装方式

Promise ベースのブロッキングパターンを採用する。

```
MCP ツールハンドラ (async)
  → new Promise() を作成
  → resolve コールバックを Map に登録
  → Discord イベントリスナーがイベントを検知
  → Map から resolve コールバックを取り出して呼び出し
  → Promise が resolve → MCP レスポンスとしてイベント内容を返却
```

タイムアウトは `Promise.race` または `AbortSignal.timeout` で実現。タイムアウト時はタイムアウトした旨を返し、CLI エージェントに再度 `wait_until_event` を呼ばせる。

### 回復機構

ランチャーが gemini-cli プロセスのライフサイクルを管理し、自動再起動を行う。

**再起動が必要なケース**:

| ケース | 検知方法 | 対応 |
|--------|----------|------|
| コンテキスト上限到達 | gemini-cli プロセスの終了コード (53: ターン制限超過) | 自動再起動 |
| CLI プロセスクラッシュ | プロセスの異常終了 | 自動再起動（バックオフ付き） |
| `wait_until_event` 呼び忘れ | MCP サーバー側でのタイムアウト監視 | CLI プロセスを kill して再起動 |
| MCP サーバーの Discord 切断 | discord.js の disconnect イベント | 再接続（discord.js 内蔵）またはプロセス再起動 |

**再起動時の状態**:

- CLI エージェントのコンテキストはリセットされる（ステートレス再起動）
- Discord 接続は MCP サーバーのプロセスも再起動されるため再接続される
- 永続化が必要な状態がある場合はファイルや DB に保存する（将来の拡張）

## MCP ツール仕様

### `wait_until_event`

Discord イベントを待ち受け、イベント発生時にその内容を返す。

**入力パラメータ**:

| パラメータ | 型 | 必須 | 説明 |
|-----------|------|------|------|
| `event_type` | `string` | No | 待ち受けるイベントタイプ。デフォルト: `"message_create"` |
| `channel_id` | `string` | No | フィルタするチャンネル ID。省略時は全チャンネル |
| `timeout_ms` | `number` | No | タイムアウト（ミリ秒）。デフォルト: 300000 (5分) |

**対応イベントタイプ**:

| イベントタイプ | Discord.js イベント | 説明 |
|---------------|-------------------|------|
| `message_create` | `messageCreate` | 新規メッセージ受信 |
| `message_update` | `messageUpdate` | メッセージ編集 |
| `reaction_add` | `messageReactionAdd` | リアクション追加 |

**出力**:

```json
{
  "event_type": "message_create",
  "timed_out": false,
  "data": {
    "message_id": "123456789",
    "channel_id": "987654321",
    "guild_id": "111222333",
    "author": {
      "id": "444555666",
      "username": "user",
      "bot": false
    },
    "content": "メッセージ内容",
    "timestamp": "2025-01-01T00:00:00.000Z"
  }
}
```

タイムアウト時:

```json
{
  "event_type": "timeout",
  "timed_out": true,
  "data": null
}
```

**自己メッセージ除外**: Bot 自身が送信したメッセージは `wait_until_event` の対象外とする。

### `send_message`

Discord チャンネルにメッセージを送信する。

**入力パラメータ**:

| パラメータ | 型 | 必須 | 説明 |
|-----------|------|------|------|
| `channel_id` | `string` | Yes | 送信先チャンネル ID |
| `content` | `string` | Yes | メッセージ内容 |
| `reply_to` | `string` | No | リプライ先メッセージ ID |

**出力**:

```json
{
  "success": true,
  "message_id": "123456789"
}
```

### `get_channel_messages`

チャンネルのメッセージ履歴を取得する。

**入力パラメータ**:

| パラメータ | 型 | 必須 | 説明 |
|-----------|------|------|------|
| `channel_id` | `string` | Yes | チャンネル ID |
| `limit` | `number` | No | 取得件数。デフォルト: 10、最大: 50 |
| `before` | `string` | No | このメッセージ ID より前のメッセージを取得 |

**出力**:

```json
{
  "messages": [
    {
      "message_id": "123456789",
      "author": { "id": "444555666", "username": "user", "bot": false },
      "content": "メッセージ内容",
      "timestamp": "2025-01-01T00:00:00.000Z"
    }
  ]
}
```

### `add_reaction`

メッセージにリアクションを追加する。

**入力パラメータ**:

| パラメータ | 型 | 必須 | 説明 |
|-----------|------|------|------|
| `message_id` | `string` | Yes | メッセージ ID |
| `channel_id` | `string` | Yes | チャンネル ID |
| `emoji` | `string` | Yes | 絵文字（Unicode or カスタム絵文字 ID） |

**出力**:

```json
{
  "success": true
}
```

## モジュール構成

```
src/
  mcp-server/
    index.ts              # MCP サーバーエントリポイント（stdio トランスポート起動）
    discord-client.ts     # discord.js クライアント管理（接続・切断・イベント）
    tools/
      wait-until-event.ts # wait_until_event ツール実装
      send-message.ts     # send_message ツール実装
      get-channel-messages.ts # get_channel_messages ツール実装
      add-reaction.ts     # add_reaction ツール実装
  launcher/
    index.ts              # ランチャーエントリポイント
    process-manager.ts    # gemini-cli プロセスの起動・監視・再起動
    config-generator.ts   # .gemini/settings.json、GEMINI.md の生成
  config/
    index.ts              # 設定読み込み（環境変数、設定ファイル）
    types.ts              # 設定の型定義

spec/
  mcp-server/
    tools/
      wait-until-event.spec.ts
      send-message.spec.ts
      get-channel-messages.spec.ts
      add-reaction.spec.ts
  launcher/
    process-manager.spec.ts
    config-generator.spec.ts
```

## 設定

### 環境変数

| 変数名 | 必須 | 説明 |
|--------|------|------|
| `DISCORD_BOT_TOKEN` | Yes | Discord Bot トークン |
| `DISCORD_CHANNEL_ID` | No | デフォルトチャンネル ID |
| `GEMINI_API_KEY` | Yes | Gemini API キー（gemini-cli 用） |

### Discord Bot 要件

- **Privileged Intents**: `MessageContent`, `GuildMessages`, `GuildMessageReactions`
- **Permissions**: `Send Messages`, `Read Message History`, `Add Reactions`

## システムプロンプト設計

gemini-cli に渡す GEMINI.md（システムプロンプト）の核心部分:

```
あなたは Discord エージェントです。以下のルールに従って動作してください。

1. すべてのアクション（メッセージ送信、リアクション追加等）の完了後、
   必ず wait_until_event ツールを呼び出して次のイベントを待ってください。
2. wait_until_event がタイムアウトした場合も、再度 wait_until_event を呼び出してください。
3. Bot 自身のメッセージには反応しないでください。
4. メッセージへの返信時は reply_to パラメータを使用してください。
```

## 開発計画

### Phase 1: MCP サーバー（コア）

- `wait_until_event` と `send_message` を実装
- discord.js クライアント接続
- stdio トランスポートでの動作確認

### Phase 2: ランチャー

- gemini-cli の起動・設定ファイル生成
- プロセス監視・自動再起動

### Phase 3: 追加ツール

- `get_channel_messages`
- `add_reaction`

### Phase 4: 安定化

- 回復機構の強化
- エラーハンドリング
- ログ出力

### 将来の拡張

- claude code (`claude -p`) 対応
- 複数チャンネル対応
- メンション・スレッド対応
- 永続化（会話コンテキストの保存）
