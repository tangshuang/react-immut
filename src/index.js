import React, {
  createContext,
  useState,
  useMemo,
  useEffect,
  useContext,
  memo,
} from 'react'
import produce from 'immer'
import { parse, assign } from 'ts-fns/cjs/key-path'

export class Store {
  constructor(initState) {
    this.state = initState
    this.subscribers = []
    this.dispatch = this.dispatch.bind(this)
    this.debug = false
  }
  getState() {
    return this.state
  }
  subscribe(fn) {
    const index = this.subscribers.length
    this.subscribers.push(fn)
    return () => this.subscribers.splice(index, 1)
  }
  dispatch(keyPath, update) {
    if (arguments.length === 1) {
      update = keyPath
      keyPath = ''
    }

    const prev = this.state
    const next = produce(prev, (state) => {
      if (keyPath) {
        const node = parse(state, keyPath)
        const res = typeof update === 'function' ? update(node) : update
        if (typeof res !== 'undefined') {
          assign(state, keyPath, res)
        }
        return state
      }
      else {
        return typeof update === 'function' ? update(state) : update
      }
    })

    this.state = next
    this.subscribers.forEach((fn) => {
      fn(next, prev)
    })

    if (this.debug) {
      console.log('[ReactImmut]: state has change.', { prev, next, time: new Date() })
    }
  }
  combine(namespaces) {
    const { dispatch, state: storeState } = this

    if (!(storeState && typeof storeState === 'object')) {
      if (this.debug) {
        console.error(`[ReactImmut]: store.combine should must use with object state, but current state is `, storeState)
      }
      return
    }

    const patchState = (name, state2) => {
      storeState[name] = state2
    }

    const patchDispatch = (name, actions) => {
      dispatch[name] = dispatch[name] || {}

      Object.keys(actions).forEach((key) => {
        const action = actions[key]
        if (typeof action !== 'function') {
          return
        }
        const fn = (...args) => {
          const dispatch2 = (keyPath, update) => {
            if (arguments.length === 1) {
              update = keyPath
              keyPath = ''
            }

            const chain = Array.isArray(keyPath) ? [name, ...keyPath]
              : keyPath ? [name, keyPath]
              : [name]

            dispatch(chain, update)
          }
          return action(dispatch2, ...args)
        }
        dispatch[name][key] = fn
      })
    }

    Object.keys(namespaces).forEach((name) => {
      if (this.debug && name in storeState) {
        console.error(`[ReactImmut]: namespace '${name}' has been registered before, will be overrided.`)
      }

      const { state, ...actions } = namespaces[name]
      patchState(name, state)
      patchDispatch(name, actions)
    })
  }
}

const defaultContext = createContext()
const defaultStore = new Store({})

export function Provider(props) {
  const { store = defaultStore, context = defaultContext, children } = props
  const [state, setState] = useState(store.state)

  const value = useMemo(() => {
    const { dispatch } = store
    return { state, dispatch }
  }, [state])

  useEffect(() => {
    const unsubscribe = store.subscribe(next => setState(next))
    return unsubscribe
  }, [])

  const { Provider } = context
  return <Provider value={value}>{children}</Provider>
}

export function useStore(keyPath, options = {}) {
  // only use options once
  const { context, store } = useMemo(() => {
    const { context = defaultContext, store = defaultStore } = options
    return { context, store }
  }, [])

  const ctx = useContext(context || {})
  const hasContext = ctx && ctx.state && ctx.dispatch
  const { state, dispatch } = hasContext ? ctx : store

  const [_, forceUpdate] = useState(null)
  useEffect(() => {
    if (hasContext) {
      return
    }
    return store.subscribe((next, prev) => {
      if (keyPath) {
        if (parse(next, keyPath) !== parse(prev, keyPath)) {
          forceUpdate({})
        }
      }
      else {
        forceUpdate({})
      }
    })
  }, [keyPath, hasContext])

  const state2 = keyPath ? parse(state, keyPath) : state
  const dispatch2 = keyPath ? update => dispatch(keyPath, update) : dispatch

  // patch dispatchers to dispatch
  if (typeof keyPath === 'string' && dispatch[keyPath]) {
    Object.assign(dispatch2, dispatch[keyPath])
  }

  return [state2, dispatch2]
}

export function connect(mapStateToProps, mapDispatchToPorps, mergeProps, options) {
  return function(C) {
    const Component = memo(C)
    const componentName = C.name
    const ConnectedComponent = function(props) {
      const [state, dispatch] = useStore(null, options)
      const stateProps = mapStateToProps ? mapStateToProps(state, props) : {}
      const dispatchProps = mapDispatchToPorps ? mapDispatchToPorps(dispatch, props) : {}
      const combinedProps = mergeProps ? mergeProps(stateProps, dispatchProps, props) : {
        ...props,
        ...stateProps,
        ...dispatchProps,
      }
      return <Component {...combinedProps} />
    }
    Object.defineProperty(ConnectedComponent, 'name', {
      value: componentName,
      writable: true,
      configurable: true,
    })
    return ConnectedComponent
  }
}

export function createStore(initState, namespaces) {
  const store = new Store(initState || {})
  if (namespaces) {
    store.combine(namespaces)
  }
  return store
}

function create(store, hooks) {
  const options = { context: null, store }
  if (hooks) {
    const names = Object.keys(namespaces)
    const hookFns = {}
    names.forEach((name) => {
      const key = 'use' + name.replace(name[0], name[0].toUpperCase())
      hookFns[key] = () => useStore(name, options)
    })
    return hookFns
  }
  else {
    return (mapStateToProps, mapDispatchToPorps, mergeProps) => connect(mapStateToProps, mapDispatchToPorps, mergeProps, options)
  }
}

export function init(initState, { store = defaultStore, hooks } = {}) {
  store.state = initState
  return create(store, hooks)
}

export function combine(namespaces, { store = defaultStore, hooks } = {}) {
  store.combine(namespaces)
  return create(store, hooks)
}

export function dispatch(keyPath, update, { store = defaultStore } = {}) {
  store.dispatch(keyPath, update)
}

export function subscribe(fn, { store = defaultStore } = {}) {
  return store.subscribe(fn)
}

export function debug(switchto, { store = defaultStore } = {}) {
  store.debug = !!switchto
}
