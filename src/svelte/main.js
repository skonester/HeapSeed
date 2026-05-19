import App from './App.svelte';
import { mount } from 'svelte';
import 'plyr/dist/plyr.css';
import './styles.css';

const app = mount(App, {
  target: document.getElementById('app')
});

export default app;
