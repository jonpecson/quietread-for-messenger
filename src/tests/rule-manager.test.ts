import { describe, it, expect, vi, beforeEach } from 'vitest';

const dynamicRules: chrome.declarativeNetRequest.Rule[] = [];

const chromeDnrMock = {
  declarativeNetRequest: {
    updateDynamicRules: vi.fn(async (options: { removeRuleIds: number[]; addRules: chrome.declarativeNetRequest.Rule[] }) => {
      // Remove
      for (const id of options.removeRuleIds) {
        const idx = dynamicRules.findIndex((r) => r.id === id);
        if (idx >= 0) dynamicRules.splice(idx, 1);
      }
      // Add
      dynamicRules.push(...(options.addRules ?? []));
    }),
    getDynamicRules: vi.fn(async () => [...dynamicRules]),
    RuleActionType: { BLOCK: 'block' as const },
    ResourceType: { XMLHTTPREQUEST: 'xmlhttprequest' as const },
  },
};

vi.stubGlobal('chrome', chromeDnrMock);

const { enableReadReceiptBlocking, disableReadReceiptBlocking, getRuleStatus } = await import('../background/dnr-rules');

describe('dnr-rules', () => {
  beforeEach(() => {
    dynamicRules.length = 0;
    vi.clearAllMocks();
  });

  it('enables blocking rules', async () => {
    await enableReadReceiptBlocking();
    const status = await getRuleStatus();
    expect(status.enabled).toBe(true);
    expect(status.ruleCount).toBeGreaterThan(0);
  });

  it('disables blocking rules', async () => {
    await enableReadReceiptBlocking();
    await disableReadReceiptBlocking();
    const status = await getRuleStatus();
    expect(status.enabled).toBe(false);
    expect(status.ruleCount).toBe(0);
  });

  it('returns correct rule count', async () => {
    await enableReadReceiptBlocking();
    const status = await getRuleStatus();
    expect(status.ruleCount).toBe(5); // number of candidate rules
  });
});
