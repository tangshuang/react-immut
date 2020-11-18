import React, {
  createContext,
  useState as useReactState,
  useMemo,
  useEffect,
  useContext,
  memo,
} from 'react'
import produce from 'immer'
import { parse, assign, makeKeyChain, isArray, isString, isFunction, isSymbol, isUndefined } from 'ts-fns'

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
  dispatch(...args) {
    let [keyPath, update] = args
    if (args.length === 1) {
      update = keyPath
      keyPath = ''
    }

    const prev = this.state
    const next = produce(prev, (state) => {
      if (keyPath) {
        const node = isSymbol(keyPath) ? state[keyPath] : parse(state, keyPath)
        const res = isFunction(update) ? update(node) : update
        if (!isUndefined(res) && isSymbol(keyPath)) {
          state[keyPath] = res
        }
        else if (!isUndefined(res)) {
          assign(state, keyPath, res)
        }
        return state
      }
      else {
        return isFunction(update) ? update(state) : update
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
    const { dispatch, state: prevState } = this
    const nextState = { ...prevState }

    if (!(prevState && typeof prevState === 'object')) {
      if (this.debug) {
        console.error(`[ReactImmut]: store.combine should must use with object state, but current state is `, prevState)
      }
      return
    }

    const patchState = (name, state2) => {
      nextState[name] = state2
    }

    const patchDispatch = (name, actions) => {
      const getState = () => this.state[name]
      const dispatchState = (...args) => {
        let [keyPath, update] = args
        if (args.length === 1) {
          update = keyPath
          keyPath = ''
        }

        const chain = isArray(keyPath) ? [name, ...keyPath]
          : keyPath && isString(keyPath) ? [name, ...makeKeyChain(keyPath)]
          : keyPath && isSymbol(keyPath) ? [name, keyPath]
          : name

        dispatch(chain, update)
      }
      dispatch[name] = dispatch[name] || dispatchState

      Object.keys(actions).forEach((key) => {
        const action = actions[key]
        if (isFunction(action)) {
          dispatch[name][key] = action(dispatchState, getState)
        }
      })
    }

    const keys = Object.keys(namespaces).concat(Object.getOwnPropertySymbols(namespaces))
    keys.forEach((key) => {
      const { name = key, state, ...actions } = namespaces[key]

      patchState(name, state)
      patchDispatch(name, actions)
    })

    this.state = nextState
    this.subscribers.forEach((fn) => {
      fn(nextState, prevState)
    })
  }
  seclude(name) {
    const { dispatch, state: prevState } = this
    const nextState = { ...prevState }

    delete dispatch[name]
    delete nextState[name]

    this.state = nextState
    this.subscribers.forEach((fn) => {
      fn(nextState, prevState)
    })
  }
}

const defaultContext = createContext()
const defaultStore = new Store({})

export function Provider(props) {
  const { store = defaultStore, context = defaultContext, children } = props
  const [state, setState] = useReactState(store.state)

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

  const [_, forceUpdate] = useReactState(null)
  useEffect(() => {
    if (hasContext) {
      return
    }
    return store.subscribe((next, prev) => {
      if (keyPath) {
        if (isSymbol(keyPath) && next[keyPath] !== prev[keyPath]) {
          forceUpdate({})
        }
        else if ((isArray(keyPath) || isString(keyPath)) && parse(next, keyPath) !== parse(prev, keyPath)) {
          forceUpdate({})
        }
      }
      else {
        forceUpdate({})
      }
    })
  }, [keyPath, hasContext])

  const state2 = keyPath && isSymbol(keyPath) ? state[keyPath] : keyPath ? parse(state, keyPath) : state
  const dispatch2 = (...args) => {
    let [subKeyPath, update] = args
    if (args.length === 1) {
      update = subKeyPath
      subKeyPath = ''
    }

    const roots = keyPath ? makeKeyChain(keyPath) : []
    const chain = isArray(subKeyPath) ? [...roots, ...subKeyPath]
      : subKeyPath && isString(subKeyPath) ? [...roots, ...makeKeyChain(subKeyPath)]
      : subKeyPath && isSymbol(subKeyPath) ? [...roots, subKeyPath]
      : roots.length ? roots
      : ''

    dispatch(chain, update)
  }

  // patch dispatchers to dispatch
  if (typeof keyPath === 'string' || isSymbol(keyPath) && dispatch[keyPath]) {
    Object.assign(dispatch2, dispatch[keyPath])
  }

  return [state2, dispatch2]
}

export function connect(mapStateToProps, mapDispatchToPorps, mergeProps, options) {
  return function(C) {
    const Component = memo(C)
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

export function applyStore(namespace, { store = defaultStore } = {}) {
  const name = Symbol('shared state')
  const namespaces = {
    [name]: namespace,
  }
  store.combine(namespaces)

  const useStore = () => {
    const [state, update] = useReactState(store.state[name])
    const dispatch = store.dispatch[name]

    useEffect(() => {
      const unsubscribe = store.subscribe((next, prev) => {
        if (next[name] !== prev[name]) {
          update(next[name])
        }
      })
      return unsubscribe
    }, [])

    return [state, dispatch]
  }

  const connect = (mapStateToProps, mapDispatchToPorps, mergeProps) => {
    return function(C) {
      const Component = memo(C)
      const ConnectedComponent = function(props) {
        const [state, dispatch] = useStore()
        const stateProps = mapStateToProps ? mapStateToProps(state, props) : {}
        const dispatchProps = mapDispatchToPorps ? mapDispatchToPorps(dispatch, props) : {}
        const combinedProps = mergeProps ? mergeProps(stateProps, dispatchProps, props) : {
          ...props,
          ...stateProps,
          ...dispatchProps,
        }
        return <Component {...combinedProps} />
      }
      return ConnectedComponent
    }
  }

  const seclude = () => {
    store.seclude(name)
  }

  return { useStore, connect, seclude }
}

export function combineStores(namespaces, { store = defaultStore } = {}) {
  store.combine(namespaces)

  const options = { context: null, store }
  const keys = Object.keys(namespaces).concat(Object.getOwnPropertySymbols(namespaces))
  const hookFns = {}
  const getSymbolName = (symb) => {
    const str = symb.toString()
    return symb.description ? symb.description : str.substring(7, str.length - 1)
  }
  keys.forEach((key) => {
    const { name = key } = namespaces[key]
    const isSymbol = typeof key === 'symbol'
    const symb = isSymbol ? getSymbolName(key) : ''
    const fn = isSymbol && symb ? 'use' + symb.replace(symb[0], symb[0].toUpperCase())
      : isSymbol ? ''
      : 'use' + key.replace(key[0], key[0].toUpperCase())
    if (fn) {
      hookFns[fn] = () => useStore(name, options)
    }
  })
  const _connect = (mapStateToProps, mapDispatchToPorps, mergeProps) => connect(mapStateToProps, mapDispatchToPorps, mergeProps, options)
  return {
    ...hookFns,
    connect: _connect,
  }
}

export function dispatch(keyPath, update, { store = defaultStore } = {}) {
  const args = [keyPath]
  if (!isUndefined(update)) {
    args.push(update)
  }
  store.dispatch(...args)
}

export function subscribe(fn, { store = defaultStore } = {}) {
  return store.subscribe(fn)
}

export function debug(switchto, { store = defaultStore } = {}) {
  store.debug = !!switchto
}

export function useState(initState, { store = defaultStore } = {}) {
  const name = useMemo(() => {
    const name = Symbol('local state')
    store.dispatch(name, isFunction(initState) ? initState() : initState)
    return name
  }, [])

  useEffect(() => {
    return () => store.seclude(name)
  }, [])

  const [state, dispatch] = useStore(name, { context: null, store })
  return [state, dispatch]
}
