<script lang="ts">
    import { Button, ProgressBar, TextInput, TooltipIcon } from 'carbon-components-svelte';
    import { Information, SearchLocate } from 'carbon-icons-svelte';
    import { open } from '@tauri-apps/plugin-dialog';
    import { codeScanInProgress } from '@lib/stores/settings/settings';
    import { wait } from '@lib/utility/wait';
    import { fade } from 'svelte/transition';
    import { durationFast02 } from '@lib/constants/motion';

    let scanPath: string = '';
    let codeScanProgress: number = 0;
    let progressBarAnimating: boolean = false;
    async function beginAutoCompleteScan(): Promise<void> {
        // TODO: implement me
        console.log('implement me');
        if ($codeScanInProgress) return;
        codeScanProgress = 0;
        $codeScanInProgress = true;
        for (; codeScanProgress < 100; codeScanProgress += 10) {
            await wait(300);
        }
        await wait(600);
        $codeScanInProgress = false;
    }

    async function openDirectorySelectDialog() {
        let file: string | null = await open({
            multiple: false,
            directory: true,
        });
        if (file) {
            scanPath = file;
        }
    }
</script>

<p class={progressBarAnimating ? 'subtract-progress-bar' : ''}>
    <sup class="sup-with-tooltip">
        Auto-Complete Directory Scanner
        <TooltipIcon
            tooltipText="You can scan a directory with code in it to extract all functions for use 
            with auto-complete."
            icon={Information}
        />
    </sup>
    <span>
        <span class="button-set">
            <Button size="small" disabled={$codeScanInProgress} on:click={openDirectorySelectDialog}
                >Select Directory</Button
            >
            <TextInput
                size="sm"
                value={scanPath}
                disabled={true}
                placeholder="Select a directory to scan..."
            />
            <Button
                size="small"
                disabled={(scanPath === '' ? true : false) || $codeScanInProgress}
                iconDescription="Start Scan"
                tooltipPosition="left"
                icon={SearchLocate}
                on:click={beginAutoCompleteScan}
            />
        </span>

        {#if $codeScanInProgress}
            <span
                transition:fade={{ duration: durationFast02 }}
                class=""
                on:introstart={() => (progressBarAnimating = true)}
                on:outroend={() => (progressBarAnimating = false)}
            >
                <ProgressBar
                    class="defeat-progress-bar-label defeat-progress-bar-track"
                    value={codeScanProgress}
                />
            </span>
        {/if}
    </span>
</p>

<style>
    .sup-with-tooltip {
        display: flex;
        gap: 5px;
        align-items: center;
    }
    .subtract-progress-bar {
        margin-bottom: calc(var(--cds-layout-02) - 0.5rem);
    }
</style>
