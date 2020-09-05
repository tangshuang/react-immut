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
  dispatch(keyPath, update) {
    if (arguments.length === 1) {
      update = keyPath
      keyPath = ''
    }

    const prev = this.state
    const next = produce(this.state, (state) => {
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

    return this
  }
  combine(namespaces) {
    const { dispatch, state } = this

    const patchState = (name, initState) => {
      if (name in state) {
        return
      }
      state[name] = initState
    }

    const patchDispatch = (name, actions) => {
      if (name in dispatch) {
        return
      }

      dispatch[name] = dispatch[name] || {}

      Object.keys(actions).forEach((key) => {
        const action = actions[key]
        if (typeof action !== 'function') {
          return
        }
        const fn = (...args) => {
          const update = (fn) => {
            dispatch(name, fn)
          }
          return action(update, ...args)
        }
        dispatch[name][key] = fn
      })
    }

    Object.keys(namespaces).forEach((name) => {
      const { state, ...actions } = namespaces[name]
      patchState(name, state)
      patchDispatch(name, actions)
    })

    return this
  }
}

const defaultContext = createContext()

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
  const dispatch2 = useCallback((update) => {
    if (keyPath) {
      dispatch(keyPath, update)
    }
    else {
      dispatch(update)
    }
  }, [keyPath])

  // patch dispatchers to dispatch
  if (typeof keyPath === 'string' && dispatch[keyPath]) {
    Object.assign(dispatch2, dispatch[keyPath])
  }

  return [state2, dispatch2]
}

export function createStore(initState, combined) {
  const store = new Store(initState || {})
  if (combined) {
    store.combine(combined)
  }
  return store
}
