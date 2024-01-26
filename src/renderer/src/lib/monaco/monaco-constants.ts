import type { DropdownItem } from 'carbon-components-svelte/types/Dropdown/Dropdown.svelte';
import { languages } from 'monaco-editor';

export const AUTO_COMPLETE_ICONS: languages.CompletionItemKind[] = [
    languages.CompletionItemKind.Function,
    languages.CompletionItemKind.Variable,
];
export type AutoCompleteIconId = (typeof AUTO_COMPLETE_ICONS)[number];
export const AUTO_COMPLETE_ICON_DROP_DOWN_ITEMS: DropdownItem[] = AUTO_COMPLETE_ICONS.map(
    (kind: languages.CompletionItemKind, index: number) =>
        <DropdownItem>{
            id: index,
            text: languages.CompletionItemKind[kind],
        },
);
export const AUTO_COMPLETE_RULES: languages.CompletionItemInsertTextRule[] = [
    languages.CompletionItemInsertTextRule.None,
    languages.CompletionItemInsertTextRule.InsertAsSnippet,
    languages.CompletionItemInsertTextRule.KeepWhitespace,
];
export type AutoCompleteRuleId = (typeof AUTO_COMPLETE_RULES)[number];
export const AUTO_COMPLETE_RULE_DROP_DOWN_ITEMS: DropdownItem[] = AUTO_COMPLETE_RULES.map(
    (rule: languages.CompletionItemInsertTextRule) =>
        <DropdownItem>{
            id: rule,
            text: languages.CompletionItemInsertTextRule[rule].replace(/([a-z])([A-Z])/g, '$1 $2'),
        },
);
