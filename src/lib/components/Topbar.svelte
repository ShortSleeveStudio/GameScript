<script lang="ts">
	import { maximized } from '$lib/stores/maximized';
	import { appWindow } from '@tauri-apps/api/window';
</script>

<div
	data-tauri-drag-region
	class="inline-grid w-full grid-cols-3 items-center
	bg-slate-300
	text-slate-950
	dark:bg-slate-700
	dark:text-slate-300
	"
>
	<span class="inline-grid grid-cols-1 items-center justify-self-start">
		<button
			type="button"
			class="border-r border-slate-200 px-3.5 py-1
			hover:bg-slate-100
			hover:focus:z-10
			active:text-slate-400
			dark:border-slate-600
			dark:hover:bg-slate-600
			dark:active:text-slate-800
			"
		>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				viewBox="0 0 20 20"
				fill="currentColor"
				class="h-5 w-5"
			>
				<path
					fill-rule="evenodd"
					d="M2 4.75A.75.75 0 012.75 4h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 4.75zM2 10a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 10zm0 5.25a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75a.75.75 0 01-.75-.75z"
					clip-rule="evenodd"
				/>
			</svg>
		</button>
	</span>
	<span data-tauri-drag-region class="justify-self-center">GameScript</span>
	<span class="inline-grid grid-cols-3 items-center justify-self-end">
		<!-- Minimize -->
		<button
			on:click={appWindow.minimize}
			type="button"
			class="border-x border-slate-200 px-3.5 py-1
			hover:bg-slate-100
			hover:focus:z-10
			dark:border-slate-600
			dark:hover:bg-slate-600
			dark:active:text-slate-800
			"
		>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				viewBox="0 0 20 20"
				fill="currentColor"
				class="h-5 w-5"
			>
				<path
					fill-rule="evenodd"
					d="M4 10a.75.75 0 01.75-.75h10.5a.75.75 0 010 1.5H4.75A.75.75 0 014 10z"
					clip-rule="evenodd"
				/>
			</svg>
		</button>
		<!-- Maximize -->
		<button
			on:click={appWindow.toggleMaximize}
			type="button"
			class="border-r border-slate-200 px-3.5 py-1
			hover:bg-slate-100
			hover:focus:z-10
			dark:border-slate-600
			dark:hover:bg-slate-600
			dark:active:text-slate-800
			"
		>
			{#if $maximized}
				<svg
					xmlns="http://www.w3.org/2000/svg"
					viewBox="0 0 20 20"
					fill="currentColor"
					class="h-5 w-5"
				>
					<path
						d="M3.28 2.22a.75.75 0 00-1.06 1.06L5.44 6.5H2.75a.75.75 0 000 1.5h4.5A.75.75 0 008 7.25v-4.5a.75.75 0 00-1.5 0v2.69L3.28 2.22zM13.5 2.75a.75.75 0 00-1.5 0v4.5c0 .414.336.75.75.75h4.5a.75.75 0 000-1.5h-2.69l3.22-3.22a.75.75 0 00-1.06-1.06L13.5 5.44V2.75zM3.28 17.78l3.22-3.22v2.69a.75.75 0 001.5 0v-4.5a.75.75 0 00-.75-.75h-4.5a.75.75 0 000 1.5h2.69l-3.22 3.22a.75.75 0 101.06 1.06zM13.5 14.56l3.22 3.22a.75.75 0 101.06-1.06l-3.22-3.22h2.69a.75.75 0 000-1.5h-4.5a.75.75 0 00-.75.75v4.5a.75.75 0 001.5 0v-2.69z"
					/>
				</svg>
			{:else}
				<svg
					xmlns="http://www.w3.org/2000/svg"
					viewBox="0 0 20 20"
					fill="currentColor"
					class="h-5 w-5"
				>
					<path
						d="M13.28 7.78l3.22-3.22v2.69a.75.75 0 001.5 0v-4.5a.75.75 0 00-.75-.75h-4.5a.75.75 0 000 1.5h2.69l-3.22 3.22a.75.75 0 001.06 1.06zM2 17.25v-4.5a.75.75 0 011.5 0v2.69l3.22-3.22a.75.75 0 011.06 1.06L4.56 16.5h2.69a.75.75 0 010 1.5h-4.5a.747.747 0 01-.75-.75zM12.22 13.28l3.22 3.22h-2.69a.75.75 0 000 1.5h4.5a.747.747 0 00.75-.75v-4.5a.75.75 0 00-1.5 0v2.69l-3.22-3.22a.75.75 0 10-1.06 1.06zM3.5 4.56l3.22 3.22a.75.75 0 001.06-1.06L4.56 3.5h2.69a.75.75 0 000-1.5h-4.5a.75.75 0 00-.75.75v4.5a.75.75 0 001.5 0V4.56z"
					/>
				</svg>
			{/if}
		</button>
		<!-- Close -->
		<button
			on:click={appWindow.close}
			type="button"
			class="border-slate-200 px-3.5 py-1
			hover:bg-slate-100
			hover:focus:z-10
			dark:border-slate-600
			dark:hover:bg-slate-600
			dark:active:text-slate-800
			"
		>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				viewBox="0 0 20 20"
				fill="currentColor"
				class="h-5 w-5"
			>
				<path
					d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z"
				/>
			</svg>
		</button>
	</span>
</div>
