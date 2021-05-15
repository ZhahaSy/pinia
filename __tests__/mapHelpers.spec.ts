import {
  createPinia,
  defineStore,
  mapActions,
  mapGetters,
  mapState,
  mapStores,
  PiniaPlugin,
  mapWritableState,
  setMapStoreSuffix,
} from '../src'
import { createLocalVue, mount } from '@vue/test-utils'
import { nextTick, defineComponent } from '@vue/composition-api'
import { mockWarn } from 'jest-mock-warn'

describe('Map Helpers', () => {
  const useCartStore = defineStore({ id: 'cart' })
  const useStore = defineStore({
    id: 'main',
    state: () => ({
      a: true,
      n: 0,
      nested: {
        foo: 'foo',
        a: { b: 'string' },
      },
    }),
    getters: {
      double: (state) => state.n * 2,
      notA: (state) => !state.a,
    },
    actions: {
      doubleCount() {
        this.n = this.n * 2
      },
    },
  })

  const localVue = createLocalVue()
  localVue.use(PiniaPlugin)

  describe('mapStores', () => {
    mockWarn()
    it('mapStores computes only once when mapping one store', async () => {
      const pinia = createPinia()
      const fromStore = jest.fn(function () {
        // @ts-expect-error
        return this.mainStore
      })
      const Component = defineComponent({
        template: `<p @click="fromStore.n++">{{ fromStore.n }}</p>`,
        computed: {
          ...mapStores(useStore),
          fromStore,
        },
      })

      const wrapper = mount(Component, { localVue, pinia })
      // const store = useStore()
      // const other = useCartStore()
      // @ts-expect-error: not handled by VTU
      expect(wrapper.vm.mainStore).toBeDefined()
      expect(wrapper.text()).toBe('0')
      await nextTick()
      expect(fromStore).toHaveBeenCalledTimes(1)

      await wrapper.trigger('click')
      expect(wrapper.text()).toBe('1')
      // NOTE: when using Vue.set, this is 1, but this is probably due
      expect(fromStore).toHaveBeenCalledTimes(2)
      await wrapper.trigger('click')
      expect(wrapper.text()).toBe('2')
      await wrapper.trigger('click')
      expect(wrapper.text()).toBe('3')
      expect(fromStore).toHaveBeenCalledTimes(2)
    })

    it('mapStores computes only once when mapping multiple stores', async () => {
      const pinia = createPinia()
      const fromStore = jest.fn(function () {
        // @ts-expect-error
        return this.mainStore
      })
      const Component = defineComponent({
        template: `<p @click="fromStore.n++">{{ mainStore.n }} {{ fromStore.n }} {{ cartStore.$id }}</p>`,
        computed: {
          ...mapStores(useStore, useCartStore),
          fromStore,
        },
      })

      const wrapper = mount(Component, { localVue, pinia })
      expect(wrapper.text()).toBe('0 0 cart')
      await nextTick()
      // NOTE: it seems to be the same as the number of stores, probably because
      // we use Vue.set
      expect(fromStore).toHaveBeenCalledTimes(2)

      await wrapper.trigger('click')
      expect(wrapper.text()).toBe('1 1 cart')
      expect(fromStore).toHaveBeenCalledTimes(2)
      await wrapper.trigger('click')
      expect(wrapper.text()).toBe('2 2 cart')
      expect(fromStore).toHaveBeenCalledTimes(2)
    })

    it('can set custom suffix', async () => {
      const pinia = createPinia()
      setMapStoreSuffix('')
      const Component = defineComponent({
        template: `<p @click="main.n++">{{ main.n }}</p>`,
        computed: {
          ...mapStores(useStore),
        },
      })

      const wrapper = mount(Component, { localVue, pinia })
      // const store = useStore()
      // const other = useCartStore()
      // @ts-expect-error: not handled by VTU
      expect(wrapper.vm.main).toBeDefined()
      // @ts-expect-error: not handled by VTU
      expect(wrapper.vm.mainStore).not.toBeDefined()
      expect(wrapper.text()).toBe('0')
      await nextTick()

      await wrapper.trigger('click')
      expect(wrapper.text()).toBe('1')
      await wrapper.trigger('click')
      expect(wrapper.text()).toBe('2')
    })

    it('should warn when an array is passed', () => {
      mapStores([])
      expect('pass all stores to "mapStores()"').toHaveBeenWarned()
    })
  })

  it('mapGetters', () => {
    expect(mapGetters).toBe(mapState)
  })

  describe('mapState', () => {
    async function testComponent(
      computedProperties: any,
      template: string,
      expectedText: string
    ) {
      const pinia = createPinia()
      const Component = defineComponent({
        template: `<p>${template}</p>`,
        computed: {
          ...computedProperties,
        },
      })

      const wrapper = mount(Component, { localVue, pinia })

      expect(wrapper.text()).toBe(expectedText)
    }

    it('array', async () => {
      await testComponent(
        mapState(useStore, ['n', 'a']),
        `{{ n }} {{ a }}`,
        `0 true`
      )
    })

    it('object', async () => {
      await testComponent(
        mapState(useStore, { count: 'n', myA: 'a' }),
        `{{ count }} {{ myA }}`,
        `0 true`
      )
    })

    it('object with functions', async () => {
      await testComponent(
        mapState(useStore, { triple: (state) => (state.n + 1) * 3, myA: 'a' }),
        `{{ triple }} {{ myA }}`,
        `3 true`
      )
    })

    it('uses component context', async () => {
      const pinia = createPinia()
      let vm
      const Component = defineComponent({
        template: `<p>{{ n }}</p>`,
        computed: {
          ...mapState(useStore, {
            n(store) {
              vm = this
              return store.n
            },
          }),
        },
      })

      const wrapper = mount(Component, { localVue, pinia })
      expect(vm).toBe(wrapper.vm)
    })

    it('getters', async () => {
      await testComponent(
        mapState(useStore, ['double', 'notA', 'a']),
        `{{ a }} {{ notA }} {{ double }}`,
        `true false 0`
      )
    })
  })

  describe('mapActions', () => {
    const useStore = defineStore({
      id: 'main',
      state: () => ({ n: 0 }),
      actions: {
        increment() {
          this.n++
        },
        setN(newN: number) {
          return (this.n = newN)
        },
      },
    })

    it('array', () => {
      const pinia = createPinia()
      const Component = defineComponent({
        template: `<p></p>`,
        methods: {
          ...mapActions(useStore, ['increment', 'setN']),
        },
      })

      const wrapper = mount(Component, { localVue, pinia })

      // @ts-expect-error: not handled by VTU
      expect(wrapper.vm.increment()).toBe(undefined)
      // @ts-expect-error: not handled by VTU
      expect(wrapper.vm.setN(4)).toBe(4)
    })

    it('object', () => {
      const pinia = createPinia()
      const Component = defineComponent({
        template: `<p></p>`,
        methods: {
          ...mapActions(useStore, { inc: 'increment', set: 'setN' }),
        },
      })

      const wrapper = mount(Component, { localVue, pinia })

      // @ts-expect-error: not handled by VTU
      expect(wrapper.vm.inc()).toBe(undefined)
      // @ts-expect-error: not handled by VTU
      expect(wrapper.vm.set(4)).toBe(4)
    })
  })

  describe('mapWritableState', () => {
    async function testComponent(
      computedProperties: any,
      template: string,
      expectedText: string,
      expectedText2: string
    ) {
      const pinia = createPinia()
      const Component = defineComponent({
        template: `<p>${template}</p>`,
        computed: {
          ...computedProperties,
        },
        methods: Object.keys(computedProperties).reduce((methods, name) => {
          // @ts-expect-error
          methods['set_' + name] = function (v: any) {
            // @ts-expect-error
            this[name] = v
          }
          return methods
        }, {}),
      })

      const wrapper = mount(Component, { localVue, pinia })

      expect(wrapper.text()).toBe(expectedText)

      for (const key in computedProperties) {
        // @ts-expect-error
        wrapper.vm['set_' + key]('replaced')
      }

      await nextTick()

      expect(wrapper.text()).toBe(expectedText2)
    }

    it('array', async () => {
      await testComponent(
        mapWritableState(useStore, ['n', 'a']),
        `{{ n }} {{ a }}`,
        `0 true`,
        'replaced replaced'
      )
    })

    it('object', async () => {
      await testComponent(
        mapWritableState(useStore, { count: 'n', myA: 'a' }),
        `{{ count }} {{ myA }}`,
        `0 true`,
        'replaced replaced'
      )
    })
  })
})
