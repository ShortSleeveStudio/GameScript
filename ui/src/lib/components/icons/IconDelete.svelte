<script lang="ts">
    /** Size in pixels (default 16) */
    export let size: number = 16;
    /** Additional CSS style */
    export let style: string = '';
</script>

<svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 32 32"
    fill="currentColor"
    preserveAspectRatio="xMidYMid meet"
    width={size}
    height={size}
    aria-hidden="true"
    {style}
>
    <path d="M12 12H14V24H12zM18 12H20V24H18z"></path>
    <path d="M4 6V8H6V28a2 2 0 002 2H24a2 2 0 002-2V8h2V6zM8 28V8H24V28zM12 2H20V4H12z"></path>
</svg>
