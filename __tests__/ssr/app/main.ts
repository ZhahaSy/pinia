import { createPinia, PiniaPlugin } from '../../../src'
import Vue from 'vue'
// import VueCompositionApi from '@vue/composition-api'
import App from './App'

// Done in setup.ts
// Vue.use(VueCompositionApi)

export function createApp() {
  // create the app instance, injecting both the router and the store
  const pinia = createPinia()
  Vue.use(PiniaPlugin)
  const app = new Vue({
    pinia,
    render: (h) => h(App),
  })

  // expose the app, the router and the store.
  return { app, pinia }
}
