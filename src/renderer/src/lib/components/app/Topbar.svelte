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
        SideNavDivider,
    } from 'carbon-components-svelte';
    import Close from 'carbon-icons-svelte/lib/Close.svelte';
    import Maximize from 'carbon-icons-svelte/lib/Maximize.svelte';
    import Minimize from 'carbon-icons-svelte/lib/Minimize.svelte';
    import SubtractLarge from 'carbon-icons-svelte/lib/SubtractLarge.svelte';
    import { maximized } from '@lib/stores/app/maximized';
    import { darkmode } from '@lib/stores/app/darkmode';
    import { EVENT_DOCK_RESET_LAYOUT, EVENT_SHUTDOWN } from '@lib/constants/events';
    import {
        buildIsVisible,
        conversationEditorIsVisible,
        conversationFinderIsVisible,
        inspectorIsVisible,
        localizationEditorIsVisible,
        searchIsVisible,
        settingsIsVisible,
    } from '@lib/stores/app/layout';
    import { NotificationItem, notificationManager } from '@lib/stores/app/notifications';
    import { APP_NAME } from '@common/constants';

    let isSideNavOpen = false;

    function shutdown(): void {
        dispatchEvent(new CustomEvent(EVENT_SHUTDOWN));
        window.api.window.close();
    }
</script>

<Header
    platformName={APP_NAME}
    style="width: 100%; -webkit-app-region: drag;"
    bind:isSideNavOpen
    persistentHamburgerMenu={true}
>
    <HeaderUtilities>
        <HeaderGlobalAction icon={SubtractLarge} on:click={window.api.window.minimize} />
        <HeaderGlobalAction
            icon={$maximized ? Minimize : Maximize}
            on:click={() => {
                $maximized ? window.api.window.unmaximize() : window.api.window.maximize();
            }}
        />
        <HeaderGlobalAction icon={Close} on:click={shutdown} />
    </HeaderUtilities>
</Header>

<SideNav bind:isOpen={isSideNavOpen}>
    <SideNavItems>
        <SideNavLink
            text="Throw Error"
            on:click={() => {
                throw new Error('Error was thrown!');
            }}
        />
        <SideNavLink
            text="Show Notification"
            on:click={() => {
                notificationManager.showNotification(
                    new NotificationItem('info', 'Title', 'subtitle'),
                );
            }}
        />
        <SideNavMenu text="Layout">
            <SideNavMenuItem
                text="Load Default Layout"
                on:click={() => dispatchEvent(new CustomEvent(EVENT_DOCK_RESET_LAYOUT))}
            />

            <SideNavDivider />

            <SideNavMenuItem
                text="Build"
                isSelected={$buildIsVisible}
                on:click={() => ($buildIsVisible = !$buildIsVisible)}
            />
            <SideNavMenuItem
                text="Conversation Editor"
                isSelected={$conversationEditorIsVisible}
                on:click={() => ($conversationEditorIsVisible = !$conversationEditorIsVisible)}
            />
            <SideNavMenuItem
                text="Conversation Finder"
                isSelected={$conversationFinderIsVisible}
                on:click={() => ($conversationFinderIsVisible = !$conversationFinderIsVisible)}
            />
            <SideNavMenuItem
                text="Inspector"
                isSelected={$inspectorIsVisible}
                on:click={() => ($inspectorIsVisible = !$inspectorIsVisible)}
            />
            <SideNavMenuItem
                text="Localization Editor"
                isSelected={$localizationEditorIsVisible}
                on:click={() => ($localizationEditorIsVisible = !$localizationEditorIsVisible)}
            />
            <SideNavMenuItem
                text="Search"
                isSelected={$searchIsVisible}
                on:click={() => ($searchIsVisible = !$searchIsVisible)}
            />
            <SideNavMenuItem
                text="Settings"
                isSelected={$settingsIsVisible}
                on:click={() => ($settingsIsVisible = !$settingsIsVisible)}
            />
        </SideNavMenu>
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
