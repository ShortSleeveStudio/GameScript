// Main app
import '@lib/css/carbon.css'; // This needs to be updated everytime you upgrade the library
// import 'golden-layout/dist/css/goldenlayout-base.css';
// import 'golden-layout/dist/css/themes/goldenlayout-dark-theme.css';
import '@lib/css/golden-layout-base-custom.css';
import '@lib/css/golden-layout-theme-custom.css';
// import '@lib/vendor/golden-layout/css/goldenlayout-base.css';
// import '@lib/vendor/golden-layout/css/themes/goldenlayout-dark-theme.css';
import App from '@lib/components/app/App.svelte';

const app = new App({
    target: <Element>document.getElementById('app'),
});
export default app;
