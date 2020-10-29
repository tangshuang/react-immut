<h1 align="center"><a href="https://github.com/tangshuang/react-immut"><img src="react-immut.png" alt="react-immut" width="120" height="120"/></a></h1>
<p align="center">The world's easiest react global state manangement.</p>

<br />
<br />
<br />

<p align="center"><a href="https://github.com/tangshuang/jqvm"><img src="https://camo.githubusercontent.com/3b69fdf3e874a6cc64012c5a1a858767155a95d9/687474703a2f2f72616e646f6a732e636f6d2f696d616765732f64726f70536861646f772e706e67" width="100%"/></a></p>

<br />
<br />
<br />
<br />

## :hear_no_evil:  What's all the react-immut?

React global state management is a big topic in development. I like immutable characteristics, but I don't like the operation of getting/setting immutable data. Luckly, [immer](https://github.com/immerjs/immer) gives us a way to get/set immutable data very easy. Based on immer, I create react-immut to manage our global state in react applications.
React-immut is a easy, lightweight and trending react global state manager, after you try it in 10 seconds, I belive, you will like it.

## :rocket: Install

```
npm i react-immut
```

## :package: Usage

- createStore, Provider, connect
- useStore
- applyStore

```js
import { createStore, Provider, connect } from 'react-immut'

// Step 1: create a store
const store = createStore({
  name: 'Tom',
  age: 10,
})

// Step 2: wrap with Provider
function App() {
  return (
    <Provider store={store}>
      <div>title</div>
      <MyComponent />
    </Provider>
  )
}

// Step 3: use connect & mapStateToProps & mapDispatchToProps & mergeToProps

const mapStateToProps = (state) => {
  const { name } = state
  return { name }
}

const mapDispatchToProps = (dispatch) => {
  const changeName = (newName) => dispatch(state => {
    state.name = newName
  })
  return { changeName }
}

// Step 4: connect component
export default connect(mapStateToProps, mapDispatchToProps)(MyComponent)

function MyComponent(props) {
  const { name } = props
  return <span>{name}</span>
}
```

```js
import { createStore, Provider, useStore } from 'react-immut'

const store = createStore({
  name: 'tom',
  age: 10,
})

function App() {
  return (
    <Provider store={store}>
      <div class="container">
        <h3>Some Person</h3>
        <Person />
      </div>
    </Provider>
  )
}

function Person() {
  const [state, dispatch] = useStore() // get store from `Provider` store prop
  const { name, age } = state
  const grow = () => dispatch(state => {
    // here `state` is a draft of global state driven by immer
    state.age ++
  })
  return (
    <div>
      <span>Name: {name}</span>
      <span>Age: {age} <button onClick={grow}>Grow</button></span>
    </div>
  )
}
```

## :beers: useStore(keyPath)

If you do not pass `keyPath`, you will get the whole state and dispatch which operate the whole state.

```js
function MyComponent() {
  const [state, dispatch] = useStore()

  const changeName = () => {
    dispatch(state => {
      // state is a draft of whole global state
      state.name = 'tomy'
    })
  }
}
```

If you pass a `keyPath`, you will get the scoped state and dispatch which operate the target state node.

```js
function MyComponent() {
  const [book, dispatchBook] = useStore('books[0]')

  const changeName = () => {
    dispatchBook(book => {
      // book is a part of whole global state, which is read from state.books[0]
      book.price = 12.5
    })
  }

  // ...
}
```

*Notice, `Provider` is not required in ReactImmut, you can use `useStore` in your application directly.*

## :loud_sound: dispatch(keyPath?, update)

To change state, you will use `dispatch`. It receive two parameters:

```ts
dispatch(keyPath?:string|array, update:Function|any)
```

- `keyPath` is optional, it means which state (should must be an object) node you want to change. When not pass, the whole state will be replaced.
- `update` is a function, which receives the state (or picked node) to be modified and returns the new value

```js
// replace the whole state
dispatch({ ... })

// replace books[0] scoped state
dispatch('books[0]', { ... })

// use a function to modify the whole state
dispatch(state => {
  state.name = 'New Name'
})

// use a function to modify the scoped state
dispatch('books[0]', book => {
  book.name = 'New Name'
})

// with return value
dispatch(state => {
  return {
    ...state,
    name: 'New Name',
  }
})
dispatch('books[0].name', name => {
  return 'New Name'
})
```

Learn more about the deep knowledge from [immer](https://github.com/immerjs/immer).

## :art: Combined State

In many situations, developers want to split the whole big state and put component and its store files tegother. We provide a way to implement this easily - A combined state namespace like this:

```js
// components/a-some/store.js

export const state = {
  name: 'Tom',
  age: 10,
}

export const changeName = (dispatch) => (name) => {
  dispatch(state => {
    state.name = name
  })
}

export const changeAge = (dispatch) => (age) => {
  dispatch(state => {
    state.age = age
  })
}
```

The file expose `state` and other methods.

The method functions are currying functions. Method functions should return functions. The first parameter is `dispatch` which is to operate current namespace's state. The second parameter is `getState` to get current namespace state copy (cloned). The returned function will be what you get when use hook function in component.

```js
// `data` is what you passed when you invoke this method in components
export const updateSome = (dispatch, getState) => (data) => {
  const state = getState()
  if (state.sex === 'F') {
    dispatch(data)
  }
}
```

In one namespace, you have no idea to operate other namespaces' state, it is isolated. To make this namespace work in ReactImmut, you need to apply it into a store by:

```js
import * as Some from './store.js'
import { applyStore } from 'react-immut'

const { useStore, connect } = applyStore(Some)
```

Next, you need to use `useStore` or `connect` to call this special combined state in components.

```js
function MyComponent() {
  const [state, { changeName, changeAge }] = useStore()
  // ..
  changeAge(10)
}
```

```js
connect(mapStateToProps, mapDispatchToPorps, mergeProps)(MyComponent)
```

On the other hand, combined state can be registered into global store. In some cases, you need to provide some methods for some special global states, you should give combined states into second parameter of `createStore` like this:

```js
import * as A from './a.store.js'
import * as B from './b.store.js'

const combinedStates = {
  A,
  B,
}

const store = createStore(initState, combinedStates)

<Provider store={store}> ...
```

`combinedStates` will be merged into global state, and can be call like this:

```js
import { useStore } from 'react-immut'

function MyComponent() {
  const [stateA, { changeA }] = useStore('A')
  // ...
}
```

Pass `keyPath` into `useStore` to attach `A` namespace, so that you can get namespace methods.

## :see_no_evil: License

MIT.
