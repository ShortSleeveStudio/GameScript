<script lang="ts">
	import {
		Header,
		HeaderUtilities,
		HeaderGlobalAction,
		SideNav,
		SideNavItems,
		SideNavMenu,
		SideNavMenuItem,
		SideNavLink,
	} from 'carbon-components-svelte';
	import Close from 'carbon-icons-svelte/lib/Close.svelte';
	import Maximize from 'carbon-icons-svelte/lib/Maximize.svelte';
	import Minimize from 'carbon-icons-svelte/lib/Minimize.svelte';
	import SubtractLarge from 'carbon-icons-svelte/lib/SubtractLarge.svelte';
	import { maximized } from '@lib/stores/maximized';
	import { mainWindow } from '@lib/api/window';
	import { darkmode } from '@lib/stores/darkmode';
	import { SHUTDOWN } from '@lib/events/events';

	let isSideNavOpen = false;

	function shutdown() {
		dispatchEvent(new CustomEvent(SHUTDOWN));
		mainWindow.close();
	}
</script>

<Header
	data-tauri-drag-region
	platformName="GameScript"
	style="width:100%"
	bind:isSideNavOpen
	persistentHamburgerMenu={true}
>
	<HeaderUtilities>
		<HeaderGlobalAction icon={SubtractLarge} on:click={mainWindow.minimize} />
		<HeaderGlobalAction
			icon={$maximized ? Minimize : Maximize}
			on:click={mainWindow.toggleMaximize}
		/>
		<HeaderGlobalAction icon={Close} on:click={shutdown} />
	</HeaderUtilities>
</Header>

<SideNav bind:isOpen={isSideNavOpen}>
	<SideNavItems>
		<SideNavLink
			text="Throw Error"
			on:click={() => {
				throw new Error('Parameter is not a number!');
			}}
		/>
		<SideNavMenu text="Darkmode">
			<SideNavMenuItem
				text="System"
				isSelected={$darkmode === 'System'}
				on:click={() => ($darkmode = 'System')}
			/>
			<SideNavMenuItem
				text="Dark"
				isSelected={$darkmode === 'Dark'}
				on:click={() => ($darkmode = 'Dark')}
			/>
			<SideNavMenuItem
				text="Light"
				isSelected={$darkmode === 'Light'}
				on:click={() => ($darkmode = 'Light')}
			/>
		</SideNavMenu>
	</SideNavItems>
</SideNav>
