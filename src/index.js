import React, {
  Component,
  createContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
  useContext,
} from 'react'
import produce from 'immer'
import { parse, assign } from 'ts-fns/cjs/key-path'

export class Store {
  constructor(initState) {
    this.state = initState
    this.subscribers = []
    this.dispatch = this.dispatch.bind(this)
  }
  getState() {
    return this.state
  }
  subscribe(fn) {
    const index = this.subscribers.length
    this.subscribers.push(fn)
    return () => this.subscribers.splice(index, 1)
  }
  dispatch(keyPath, fn) {
    if (arguments.length === 1) {
      fn = keyPath
      keyPath = ''
    }

    const prev = this.state
    const next = produce(this.state, (state) => {
      if (keyPath) {
        const node = parse(state, keyPath)
        const res = typeof fn === 'function' ? fn(node) : fn
        if (typeof res !== 'undefined') {
          assign(state, keyPath, res)
        }
        return state
      }
      else {
        return typeof fn === 'function' ? fn(state) : fn
      }
    })
    this.state = next
    this.subscribers.forEach((fn) => {
      fn(next, prev)
    })
  }
}

const defaultContext = createContext('aaa')

export function Provider(props) {
  const { store, context = defaultContext, children } = props
  const [state, setState] = useState(store.state)

  const value = useMemo(() => {
    const { dispatch } = store
    return { state, dispatch }
  }, [state])

  useEffect(() => {
    const unsubscribe = store.subscribe((next) => setState(next))
    return unsubscribe
  }, [])

  const { Provider } = context

  return <Provider value={value}>{children}</Provider>
}

export function connect(mapStateToProps, mapDispatchToPorps, mergeProps, { context = defaultContext } = {}) {
  return function(C) {
    const { Consumer } = context
    const componentName = C.name
    class ConnectedComponent extends Component {
      static name = componentName
      render() {
        const props = this.props
        return (
          <Consumer>{
            ({ state, dispatch }) => {
              const stateProps = mapStateToProps ? mapStateToProps(state, props) : {}
              const dispatchProps = mapDispatchToPorps ? mapDispatchToPorps(dispatch, props) : {}
              const combinedProps = mergeProps ? mergeProps(stateProps, dispatchProps, props) : {
                ...stateProps,
                ...dispatchProps,
                ...props,
              }
              return <C {...combinedProps} />
            }
          }</Consumer>
        )
      }
    }
    return ConnectedComponent
  }
}

export function useStore(keyPath, { context = defaultContext } = {}) {
  const { state, dispatch } = useContext(context)
  const state2 = keyPath ? parse(state, keyPath) : state
  const dispatch2 = useCallback((fn) => {
    if (keyPath) {
      dispatch(keyPath, fn)
    }
    else {
      dispatch(fn)
    }
  }, [keyPath])

  // patch dispatchers to dispatch
  if (typeof keyPath === 'string' && dispatch[keyPath]) {
    Object.assign(dispatch2, dispatch[keyPath])
  }

  return [state2, dispatch2]
}

export function createStore(initState) {
  return new Store(initState)
}

export function combineStore(namespaces) {
  const initState = {}
  const fns = []

  Object.keys(namespaces).forEach((name) => {
    const { state, ...actions } = namespaces[name]
    initState[name] = state
    fns.push({ name, actions })
  })

  const store = new Store(initState)
  const { dispatch } = store

  fns.forEach(({ name, actions }) => {
    Object.keys(actions).forEach((key) => {
      const action = actions[key]
      if (typeof action !== 'function') {
        return
      }
      const fn = (...args) => {
        const update = (fn) => {
          dispatch(name, fn)
        }
        action(update, ...args)
      }
      dispatch[name] = dispatch[name] || {}
      dispatch[name][key] = fn
    })
  })

  return store
}
