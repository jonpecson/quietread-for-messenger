import { DNR_RULE_ID_START } from '../shared/constants';
import { log, warn } from '../shared/logger';
import type { RuleStatus } from '../shared/types';

/**
 * Candidate URL patterns associated with read receipt / "seen" acknowledgements
 * on Messenger Web. These are EXPERIMENTAL and may change as Facebook updates
 * its internal APIs.
 *
 * Methodology: Identified via network instrumentation observing requests that
 * fire when opening an unread conversation thread. Patterns target the
 * GraphQL-based read receipt mutation endpoints.
 *
 * IMPORTANT: These patterns are best-effort. Facebook frequently changes
 * endpoint structures. Use debug mode to validate and discover new patterns.
 */
const CANDIDATE_RULES: chrome.declarativeNetRequest.Rule[] = [
  {
    id: DNR_RULE_ID_START,
    priority: 1,
    action: { type: chrome.declarativeNetRequest.RuleActionType.BLOCK },
    condition: {
      urlFilter: '*/ajax/mercury/change_read_status*',
      initiatorDomains: ['www.messenger.com', 'www.facebook.com'],
      resourceTypes: [chrome.declarativeNetRequest.ResourceType.XMLHTTPREQUEST],
    },
  },
  {
    id: DNR_RULE_ID_START + 1,
    priority: 1,
    action: { type: chrome.declarativeNetRequest.RuleActionType.BLOCK },
    condition: {
      urlFilter: '*mark_read*',
      initiatorDomains: ['www.messenger.com', 'www.facebook.com'],
      resourceTypes: [chrome.declarativeNetRequest.ResourceType.XMLHTTPREQUEST],
    },
  },
  {
    id: DNR_RULE_ID_START + 2,
    priority: 1,
    action: { type: chrome.declarativeNetRequest.RuleActionType.BLOCK },
    condition: {
      urlFilter: '*/api/graphql*ReadReceipt*',
      initiatorDomains: ['www.messenger.com', 'www.facebook.com'],
      resourceTypes: [chrome.declarativeNetRequest.ResourceType.XMLHTTPREQUEST],
    },
  },
  {
    id: DNR_RULE_ID_START + 3,
    priority: 1,
    action: { type: chrome.declarativeNetRequest.RuleActionType.BLOCK },
    condition: {
      urlFilter: '*/api/graphqlbatch*ReadReceipt*',
      initiatorDomains: ['www.messenger.com', 'www.facebook.com'],
      resourceTypes: [chrome.declarativeNetRequest.ResourceType.XMLHTTPREQUEST],
    },
  },
  {
    id: DNR_RULE_ID_START + 4,
    priority: 1,
    action: { type: chrome.declarativeNetRequest.RuleActionType.BLOCK },
    condition: {
      // Messenger's LS (Lightspeed) protocol may carry read state updates
      urlFilter: '*thread_read_state*',
      initiatorDomains: ['www.messenger.com', 'www.facebook.com'],
      resourceTypes: [chrome.declarativeNetRequest.ResourceType.XMLHTTPREQUEST],
    },
  },
];

const ALL_RULE_IDS = CANDIDATE_RULES.map((r) => r.id);

export async function enableReadReceiptBlocking(): Promise<void> {
  try {
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: ALL_RULE_IDS,
      addRules: CANDIDATE_RULES,
    });
    log('Read receipt blocking rules enabled:', CANDIDATE_RULES.length, 'rules');
  } catch (e) {
    warn('Failed to enable blocking rules:', e);
  }
}

export async function disableReadReceiptBlocking(): Promise<void> {
  try {
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: ALL_RULE_IDS,
      addRules: [],
    });
    log('Read receipt blocking rules disabled');
  } catch (e) {
    warn('Failed to disable blocking rules:', e);
  }
}

export async function getRuleStatus(): Promise<RuleStatus> {
  try {
    const rules = await chrome.declarativeNetRequest.getDynamicRules();
    const activeRules = rules.filter((r) => ALL_RULE_IDS.includes(r.id));
    return {
      enabled: activeRules.length > 0,
      ruleCount: activeRules.length,
      rulesetIds: activeRules.map((r) => String(r.id)),
    };
  } catch {
    return { enabled: false, ruleCount: 0, rulesetIds: [] };
  }
}
