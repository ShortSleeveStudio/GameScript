<script lang="ts">
    import { selectedProgrammingLanguageTableView } from '@lib/tables/selected-programming-language';
    import { Column, Row } from 'carbon-components-svelte';
    import CodingLanguageDropdown from './CodingLanguageDropdown.svelte';
</script>

<Row>
    <Column>
        <h2>Coding</h2>
        <p>
            <sup>Programming Language</sup>
            {#each $selectedProgrammingLanguageTableView as selectedRow}
                <CodingLanguageDropdown rowView={selectedRow} />
            {/each}
        </p>
    </Column>
</Row>
