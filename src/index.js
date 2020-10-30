import React, {
  createContext,
  useState,
  useMemo,
  useEffect,
  useContext,
  memo,
} from 'react'
import produce from 'immer'
import { parse, assign, makeKeyChain, isArray, isString, isFunction } from 'ts-fns'

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
        const node = parse(state, keyPath)
        const res = isFunction(update) ? update(node) : update
        if (typeof res !== 'undefined') {
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
          : [name]

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

    const names = Object.keys(namespaces).concat(Object.getOwnPropertySymbols(namespaces))
    names.forEach((name) => {
      if (this.debug && name in prevState) {
        console.error(`[ReactImmut]: namespace '${name}' has been registered before, will be overrided.`)
      }

      const { state, ...actions } = namespaces[name]
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
    const [state, update] = useState(store.state[name])
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

function create(store, namespaces, hooks) {
  const options = { context: null, store }
  if (hooks) {
    const names = Object.keys(namespaces).concat(Object.getOwnPropertySymbols(namespaces))
    const hookFns = {}
    const getSymbolName = (symb) => {
      const str = symb.toString()
      return symb.description ? symb.description : str.substring(7, str.length - 1)
    }
    names.forEach((name) => {
      const isSymbol = typeof name === 'symbol'
      const symb = isSymbol ? getSymbolName(name) : ''
      const key = isSymbol && symb ? 'use' + symb.replace(symb[0], symb[0].toUpperCase())
        : isSymbol ? ''
        : 'use' + name.replace(name[0], name[0].toUpperCase())
      if (key) {
        hookFns[key] = () => useStore(name, options)
      }
    })
    return hookFns
  }
  else {
    return (mapStateToProps, mapDispatchToPorps, mergeProps) => connect(mapStateToProps, mapDispatchToPorps, mergeProps, options)
  }
}

export function combine(namespaces, { store = defaultStore, hooks = true } = {}) {
  store.combine(namespaces)
  return create(store, namespaces, hooks)
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
