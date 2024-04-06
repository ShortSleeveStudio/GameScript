<script lang="ts">
    import type { Routine } from '@common/common-schema';
    import type { IDbRowView } from '@lib/api/db/db-view-row-interface';
    import { programmingLanguagePrincipal } from '@lib/tables/programming-language-principal';
    import { TooltipIcon } from 'carbon-components-svelte';
    import { CheckmarkOutline, ErrorOutline } from 'carbon-icons-svelte';
    import type {
        TranspileValidateRequest,
        TranspileValidateResponse,
    } from 'preload/api-transpile';
    import { onDestroy } from 'svelte';
    import { get, type Unsubscriber } from 'svelte/store';

    const VALID: string = 'Code is Valid';
    export let rowView: IDbRowView<Routine>;
    let valid: boolean = true;
    let message: string = VALID;
    let codeUnsubscriber: Unsubscriber;
    $: {
        if (rowView) {
            if (codeUnsubscriber) codeUnsubscriber();
            codeUnsubscriber = rowView.subscribe(onChange);
        }
    }

    async function onChange(routine: Routine): Promise<void> {
        if (programmingLanguagePrincipal) {
            const response: TranspileValidateResponse = await window.api.transpile.validate(<
                TranspileValidateRequest
            >{
                routine: routine,
                language: get(programmingLanguagePrincipal).principal,
            });
            valid = response.isValid;
            message = valid ? VALID : response.message;
        }
    }

    onDestroy(() => {
        if (codeUnsubscriber) codeUnsubscriber();
    });
</script>

{#if valid}
    <TooltipIcon icon={CheckmarkOutline} direction="left"
        ><span slot="tooltipText">{message}</span></TooltipIcon
    >
{:else}
    <TooltipIcon icon={ErrorOutline} direction="left">
        <span slot="tooltipText">{message}</span>
    </TooltipIcon>
{/if}
