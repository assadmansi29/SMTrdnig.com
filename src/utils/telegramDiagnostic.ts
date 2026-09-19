/**
 * Telegram Diagnostic Utility
 * 
 * Inspects TELEGRAM_BOT_ENABLED state, verifies network connectivity to the
 * official Telegram Bot API (api.telegram.org), tests bot authentication credentials (/getMe),
 * evaluates channel accessibility (/getChat), and inspects channel administrator/posting permissions.
 * 
 * Can be imported in application components or run standalone via:
 *   npx tsx src/utils/telegramDiagnostic.ts
 */

export interface TelegramBotInfo {
  id: number;
  isBot: boolean;
  firstName: string;
  username: string;
  canJoinGroups?: boolean;
  canReadAllGroupMessages?: boolean;
  supportsInlineQueries?: boolean;
}

export interface TelegramChannelInfo {
  id: number | string;
  title: string;
  username?: string;
  type: string;
  description?: string;
  hasVisibleHistory?: boolean;
}

export interface TelegramPermissionReport {
  isMemberOrAdmin: boolean;
  statusText: string;
  memberListAccessible: boolean;
  canPostMessages: boolean;
  rawDetails?: any;
}

export interface TelegramDiagnosticIssue {
  code: 
    | 'TELEGRAM_BOT_DISABLED'
    | 'MISSING_BOT_TOKEN'
    | 'MISSING_CHANNEL_ID'
    | 'NETWORK_UNREACHABLE'
    | 'AUTHENTICATION_FAILED'
    | 'CHANNEL_NOT_FOUND'
    | 'FORBIDDEN_NOT_ADMINISTRATOR'
    | 'UNKNOWN_ERROR';
  severity: 'info' | 'warning' | 'error';
  message: string;
  remediation: string;
}

export interface TelegramDiagnosticResult {
  timestamp: string;
  environment: {
    botEnabled: boolean;
    botEnabledRaw: string | null;
    hasBotToken: boolean;
    maskedBotToken: string | null;
    channelId: string | null;
  };
  connectivity: {
    apiReachable: boolean;
    latencyMs?: number;
    httpStatus?: number;
  };
  authentication: {
    authenticated: boolean;
    botInfo?: TelegramBotInfo;
    error?: string;
  };
  channel: {
    accessible: boolean;
    channelInfo?: TelegramChannelInfo;
    error?: string;
  };
  permissions: TelegramPermissionReport;
  overallStatus: 'healthy' | 'warning' | 'failed';
  summary: string;
  issues: TelegramDiagnosticIssue[];
  recommendedSteps: string[];
}

export interface TelegramDiagnosticOptions {
  botToken?: string;
  channelId?: string;
  botEnabled?: boolean | string;
  silent?: boolean;
}

/**
 * Mask a token for secure logging/display (e.g. "894756...cNY8")
 */
export function maskTelegramToken(token: string | null | undefined): string | null {
  if (!token) return null;
  const trimmed = token.trim();
  if (trimmed.length <= 10) return '***';
  return `${trimmed.slice(0, 6)}...${trimmed.slice(-4)}`;
}

/**
 * Core Diagnostic Execution Function
 */
export async function runTelegramDiagnostic(
  options?: TelegramDiagnosticOptions
): Promise<TelegramDiagnosticResult> {
  const silent = options?.silent ?? false;
  const startTime = Date.now();

  // 1. Resolve environment variables or explicit options
  const envBotEnabled = typeof process !== 'undefined' && process.env ? process.env.TELEGRAM_BOT_ENABLED : undefined;
  const envBotToken = typeof process !== 'undefined' && process.env ? process.env.TELEGRAM_BOT_TOKEN : undefined;
  const envChannelId = typeof process !== 'undefined' && process.env ? process.env.TELEGRAM_CHANNEL_ID : undefined;

  const rawBotEnabled = options?.botEnabled !== undefined 
    ? String(options.botEnabled) 
    : (envBotEnabled ?? 'true');
  
  const isBotEnabled = rawBotEnabled !== 'false';
  const botToken = (options?.botToken || envBotToken || '').trim();
  const channelId = (options?.channelId || envChannelId || '').trim();

  // Log current state of TELEGRAM_BOT_ENABLED as required
  if (!silent) {
    console.info(`[Telegram Diagnostic] ========================================`);
    console.info(`[Telegram Diagnostic] Timestamp: ${new Date().toISOString()}`);
    console.info(`[Telegram Diagnostic] TELEGRAM_BOT_ENABLED: "${rawBotEnabled}" -> (Resolved: ${isBotEnabled ? 'ENABLED ✅' : 'DISABLED ⏸️'})`);
    console.info(`[Telegram Diagnostic] TELEGRAM_CHANNEL_ID: "${channelId || 'NOT SET ❌'}"`);
    console.info(`[Telegram Diagnostic] TELEGRAM_BOT_TOKEN: "${maskTelegramToken(botToken) || 'NOT SET ❌'}"`);
    console.info(`[Telegram Diagnostic] ========================================`);
  }

  const issues: TelegramDiagnosticIssue[] = [];
  const recommendedSteps: string[] = [];

  // Check Bot Enabled flag
  if (!isBotEnabled) {
    issues.push({
      code: 'TELEGRAM_BOT_DISABLED',
      severity: 'warning',
      message: 'TELEGRAM_BOT_ENABLED is set to "false". Outgoing automated dispatches are suspended.',
      remediation: 'Set TELEGRAM_BOT_ENABLED=true in your environment variables to allow message broadcasts.',
    });
    recommendedSteps.push('Enable the bot by setting TELEGRAM_BOT_ENABLED=true in Render / .env.');
  }

  // Check Token presence
  if (!botToken) {
    issues.push({
      code: 'MISSING_BOT_TOKEN',
      severity: 'error',
      message: 'TELEGRAM_BOT_TOKEN is not defined in the environment.',
      remediation: 'Obtain a bot token from @BotFather in Telegram and set TELEGRAM_BOT_TOKEN.',
    });
    recommendedSteps.push('Add TELEGRAM_BOT_TOKEN with your Telegram Bot token from @BotFather.');
  }

  // Check Channel ID presence
  if (!channelId) {
    issues.push({
      code: 'MISSING_CHANNEL_ID',
      severity: 'error',
      message: 'TELEGRAM_CHANNEL_ID is not defined in the environment.',
      remediation: 'Specify the target channel ID (e.g. -1001833256060) or public handle (e.g. @smtradingpro).',
    });
    recommendedSteps.push('Add TELEGRAM_CHANNEL_ID with your target Telegram channel ID.');
  }

  // If credentials are completely missing, return early with findings
  if (!botToken) {
    return {
      timestamp: new Date().toISOString(),
      environment: {
        botEnabled: isBotEnabled,
        botEnabledRaw: rawBotEnabled,
        hasBotToken: false,
        maskedBotToken: null,
        channelId: channelId || null,
      },
      connectivity: { apiReachable: false },
      authentication: { authenticated: false, error: 'No bot token provided' },
      channel: { accessible: false, error: 'Cannot check channel without bot token' },
      permissions: {
        isMemberOrAdmin: false,
        statusText: 'unknown',
        memberListAccessible: false,
        canPostMessages: false,
      },
      overallStatus: 'failed',
      summary: 'Diagnostic failed: TELEGRAM_BOT_TOKEN is missing from environment.',
      issues,
      recommendedSteps,
    };
  }

  // 2. Test Telegram API Reachability and Bot Authentication (/getMe)
  let apiReachable = false;
  let latencyMs = 0;
  let authenticated = false;
  let botInfo: TelegramBotInfo | undefined;
  let authError: string | undefined;

  try {
    const t0 = Date.now();
    const getMeUrl = `https://api.telegram.org/bot${botToken}/getMe`;
    const response = await fetch(getMeUrl, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(10000),
    });
    latencyMs = Date.now() - t0;
    apiReachable = true;

    const data: any = await response.json().catch(() => ({}));

    if (response.ok && data.ok && data.result) {
      authenticated = true;
      botInfo = {
        id: data.result.id,
        isBot: data.result.is_bot,
        firstName: data.result.first_name,
        username: data.result.username,
        canJoinGroups: data.result.can_join_groups,
        canReadAllGroupMessages: data.result.can_read_all_group_messages,
        supportsInlineQueries: data.result.supports_inline_queries,
      };
      if (!silent) {
        console.info(`[Telegram Diagnostic] Bot Auth: SUCCESS ✅ (@${botInfo.username}, ID: ${botInfo.id}, Latency: ${latencyMs}ms)`);
      }
    } else {
      authenticated = false;
      authError = data.description || `HTTP ${response.status} ${response.statusText}`;
      issues.push({
        code: 'AUTHENTICATION_FAILED',
        severity: 'error',
        message: `Telegram API rejected bot token: ${authError}`,
        remediation: 'Verify that the TELEGRAM_BOT_TOKEN matches the token provided by @BotFather and contains no extra spaces or line breaks.',
      });
      recommendedSteps.push('Check the TELEGRAM_BOT_TOKEN in @BotFather and update your environment configuration.');
      if (!silent) {
        console.error(`[Telegram Diagnostic] Bot Auth: FAILED ❌ (${authError})`);
      }
    }
  } catch (err: any) {
    apiReachable = false;
    authError = `Network connection error: ${err.message}`;
    issues.push({
      code: 'NETWORK_UNREACHABLE',
      severity: 'error',
      message: `Failed to reach api.telegram.org: ${err.message}`,
      remediation: 'Ensure the server has outbound HTTPS access to api.telegram.org and DNS resolution is operating normally.',
    });
    recommendedSteps.push('Verify network outbound connectivity and firewall rules to api.telegram.org.');
    if (!silent) {
      console.error(`[Telegram Diagnostic] Connectivity: FAILED ❌ (${err.message})`);
    }
  }

  // 3. Test Channel Accessibility (/getChat)
  let channelAccessible = false;
  let channelInfo: TelegramChannelInfo | undefined;
  let channelError: string | undefined;

  if (authenticated && channelId) {
    try {
      const getChatUrl = `https://api.telegram.org/bot${botToken}/getChat?chat_id=${encodeURIComponent(channelId)}`;
      const res = await fetch(getChatUrl, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(10000),
      });
      const data: any = await res.json().catch(() => ({}));

      if (res.ok && data.ok && data.result) {
        channelAccessible = true;
        channelInfo = {
          id: data.result.id,
          title: data.result.title || '(Untitled)',
          username: data.result.username,
          type: data.result.type,
          description: data.result.description,
          hasVisibleHistory: data.result.has_visible_history,
        };
        if (!silent) {
          console.info(`[Telegram Diagnostic] Channel Found: SUCCESS ✅ ("${channelInfo.title}", Type: ${channelInfo.type}, ID: ${channelInfo.id})`);
        }
      } else {
        channelAccessible = false;
        channelError = data.description || `HTTP ${res.status} ${res.statusText}`;
        issues.push({
          code: 'CHANNEL_NOT_FOUND',
          severity: 'error',
          message: `Unable to access chat "${channelId}": ${channelError}`,
          remediation: 'Verify that the TELEGRAM_CHANNEL_ID is correct. For private channels, make sure the ID begins with -100 (e.g. -1001833256060).',
        });
        recommendedSteps.push(`Confirm that "${channelId}" is the correct channel ID.`);
        if (!silent) {
          console.error(`[Telegram Diagnostic] Channel Check: FAILED ❌ (${channelError})`);
        }
      }
    } catch (err: any) {
      channelAccessible = false;
      channelError = err.message;
      if (!silent) {
        console.error(`[Telegram Diagnostic] Channel Check Network Error: ${err.message}`);
      }
    }
  }

  // 4. Test Channel Member / Administrator Rights (/getChatMember)
  const permissions: TelegramPermissionReport = {
    isMemberOrAdmin: false,
    statusText: 'unknown',
    memberListAccessible: false,
    canPostMessages: false,
  };

  if (authenticated && botInfo && channelId) {
    try {
      const getMemberUrl = `https://api.telegram.org/bot${botToken}/getChatMember?chat_id=${encodeURIComponent(channelId)}&user_id=${botInfo.id}`;
      const res = await fetch(getMemberUrl, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(10000),
      });
      const data: any = await res.json().catch(() => ({}));

      if (res.ok && data.ok && data.result) {
        permissions.memberListAccessible = true;
        permissions.statusText = data.result.status;
        permissions.rawDetails = data.result;

        if (data.result.status === 'creator' || data.result.status === 'administrator') {
          permissions.isMemberOrAdmin = true;
          // In Telegram channels, administrators have can_post_messages
          permissions.canPostMessages = Boolean(
            data.result.can_post_messages ?? (data.result.status === 'creator' ? true : false)
          );

          if (!permissions.canPostMessages) {
            issues.push({
              code: 'FORBIDDEN_NOT_ADMINISTRATOR',
              severity: 'error',
              message: `Bot @${botInfo.username} is an Administrator in "${channelInfo?.title || channelId}", but "Post Messages" permission is disabled.`,
              remediation: 'Edit administrator rights in Telegram Channel Settings and switch "Post Messages" to ON.',
            });
            recommendedSteps.push(`Enable "Post Messages" (نشر الرسائل) for @${botInfo.username} in Telegram Channel Settings.`);
          } else {
            if (!silent) {
              console.info(`[Telegram Diagnostic] Permissions: ALL OK ✅ (Bot is Administrator with Post Messages enabled)`);
            }
          }
        } else {
          // Regular member, not administrator
          permissions.isMemberOrAdmin = true;
          permissions.canPostMessages = false;
          issues.push({
            code: 'FORBIDDEN_NOT_ADMINISTRATOR',
            severity: 'error',
            message: `Bot @${botInfo.username} is only a member (${data.result.status}) in the channel, not an Administrator. Channels require Administrator rights to post.`,
            remediation: 'Promote the bot to Administrator in the channel with "Post Messages" permission.',
          });
          recommendedSteps.push(`Promote @${botInfo.username} to Administrator in Telegram Channel Settings.`);
        }
      } else {
        // Channel member list is inaccessible or bot is not in channel
        const desc = data.description || `HTTP ${res.status}`;
        permissions.statusText = desc;
        permissions.memberListAccessible = false;
        permissions.canPostMessages = false;

        issues.push({
          code: 'FORBIDDEN_NOT_ADMINISTRATOR',
          severity: 'error',
          message: `Bot @${botInfo.username} lacks Administrator privileges in "${channelInfo?.title || channelId}". Telegram returned: "${desc}".`,
          remediation: `Open your Telegram channel, tap Channel Settings > Administrators > Add Administrator, search for @${botInfo.username}, and enable "Post Messages".`,
        });

        recommendedSteps.push(
          `Open channel "${channelInfo?.title || channelId}" in Telegram.`,
          `Go to Settings > Administrators > Add Administrator.`,
          `Search for @${botInfo.username} and add it.`,
          `Turn ON the "Post Messages" (نشر الرسائل) toggle and save.`
        );

        if (!silent) {
          console.warn(`[Telegram Diagnostic] Permissions: LACKING ADMIN RIGHTS ⚠️ (${desc})`);
          console.warn(`[Telegram Diagnostic] -> Bot @${botInfo.username} must be added as an Administrator in channel "${channelInfo?.title || channelId}" with "Post Messages" rights.`);
        }
      }
    } catch (err: any) {
      permissions.statusText = `Error checking permissions: ${err.message}`;
    }
  }

  // 5. Compute Overall Status and Summary
  let overallStatus: 'healthy' | 'warning' | 'failed' = 'healthy';
  let summary = '';

  if (!apiReachable || !authenticated || issues.some(i => i.code === 'MISSING_BOT_TOKEN' || i.code === 'AUTHENTICATION_FAILED')) {
    overallStatus = 'failed';
    summary = `Authentication or network failure: Unable to communicate with Telegram Bot API. (${authError || 'Unknown auth error'})`;
  } else if (!channelAccessible || !permissions.canPostMessages) {
    overallStatus = 'warning';
    summary = `Bot is authenticated as @${botInfo?.username}, but cannot post to channel "${channelInfo?.title || channelId}" due to missing Administrator permissions.`;
  } else if (!isBotEnabled) {
    overallStatus = 'warning';
    summary = `Bot is verified and authorized to post to "${channelInfo?.title}", but TELEGRAM_BOT_ENABLED is currently set to false.`;
  } else {
    overallStatus = 'healthy';
    summary = `All checks passed! Bot @${botInfo?.username} is authenticated and has Administrator posting permissions in "${channelInfo?.title}".`;
  }

  if (!silent) {
    console.info(`[Telegram Diagnostic] Overall Status: ${overallStatus.toUpperCase()}`);
    console.info(`[Telegram Diagnostic] Summary: ${summary}`);
    console.info(`[Telegram Diagnostic] Total Time: ${Date.now() - startTime}ms`);
    console.info(`[Telegram Diagnostic] ========================================`);
  }

  return {
    timestamp: new Date().toISOString(),
    environment: {
      botEnabled: isBotEnabled,
      botEnabledRaw: rawBotEnabled,
      hasBotToken: Boolean(botToken),
      maskedBotToken: maskTelegramToken(botToken),
      channelId: channelId || null,
    },
    connectivity: {
      apiReachable,
      latencyMs,
    },
    authentication: {
      authenticated,
      botInfo,
      error: authError,
    },
    channel: {
      accessible: channelAccessible,
      channelInfo,
      error: channelError,
    },
    permissions,
    overallStatus,
    summary,
    issues,
    recommendedSteps: Array.from(new Set(recommendedSteps)),
  };
}

// If executed directly from Node/tsx CLI
if (typeof process !== 'undefined' && process.argv && process.argv[1]?.endsWith('telegramDiagnostic.ts')) {
  runTelegramDiagnostic({ silent: false })
    .then((report) => {
      if (report.overallStatus === 'failed') {
        process.exitCode = 1;
      }
    })
    .catch((err) => {
      console.error('[Telegram Diagnostic Fatal]:', err);
      process.exitCode = 1;
    });
}
