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
- applyStore, combineStore
- useState

<details>
<summary>1. global state: useStore</summary>

```js
import { useStore } from 'react-immut'

function MyComponent() {
  const [some = {}, dispatch] = useStore('some') // when there is not a `some` in global state, state will receive undefined
  // ...
}
```
</details>

<details>
<summary>2. namespace state: applyStore</summary>

```js
import { applyStore } from 'react-immut'

const Some = {
  state: [],
  setSome: (dispatch) => (items) => {
    dispatch(items)
  },
  fetchSome: (dispatch) => () => {
    fetch(...).then(res => res.json()).then(items => dispatch(items))
  },
}

const { useStore, connect } = applyStore(Some)

export { useStore, connect } // use these functions in other files, share a store with several components
```
</details>

<details>
<summary>3. namespace state: combineStore</summary>

```js
// some.js
export const name = Symbol('some') // use Symbol to create unique namespace
export const state = []
export const setSome = (dispatch) => (items) => {
  dispatch(items)
}
export const fetchSome = (dispatch) => () => {
  fetch(...).then(res => res.json()).then(items => dispatch(items))
}

// --------------------------------------------------

// componentA.jsx
import { combineStore } from 'react-immut'
import * as Some from './some.js' // some.js can be import anywhere to combine to global store

const { useSome, connect } = combineStore({ Some })

function ComponentA() {
  const [some = {}, dispatch] = useSome() // referer to Symbol('some') namespace
  // ...
}

// --------------------------------------------------

// componentB.jsx
import { combineStore } from 'react-immut'
import * as One from './some.js' // some.js can be import anywhere to combine to global store

const { useOne, connect } = combineStore({ One })

function ComponentB() {
  const [some = {}, dispatch] = useOne() // referer to Symbol('some') namespace
  // ...
}
```
</details>

<details>
<summary>4. local state</summary>

```js
import { useState } from 'react-immut'

function MyComponent() {
  const [state, setState] = useState(0) // enhance react useState, which will be collected by ReactImmut
  // ...
}
```
</details>

<details>
<summary>5. global state: createStore+Provider+connect</summary>

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
</details>

## :beers: useStore(keyPath, options)

- keyPath: the key path of state node in global state
- options:
  - store: which store to use
  - context: which context to use, you can use your own global context

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

## :loud_sound: dispatch(keyPath?, update)

To change state, you will use `dispatch`. It receive two parameters:

```ts
dispatch(keyPath?:string|array, update:Function|any)
```

- `keyPath` is optional, it means which state (which should must be an object) node you want to change. When not pass, the whole state will be replaced.
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

## :art: Namespace State

In many situations, developers want to split the whole big state and put component and its store files tegother. We provide a way to implement this easily. A namespace is a set of properties to describe the scope state like this:

```js
// components/a-some/store.js
export const name = Symbol('Asome') // name of the state
export const state = { // initial state
  name: 'Tom',
  age: 10,
}
export const changeName = (dispatch) => (name) => {
  dispatch(state => {
    state.name = name
  })
}
export const changeAge = (dispatch, getState) => (age) => {
  const state = getState() // get the current scope state (not the global state)
  dispatch(state => {
    state.age = age
  })
}
```

The file expose `name` `state` and other methods. This is a namespace which is used to create a special scope state in global state.
In one namespace, you have no idea to operate other namespaces' state, it is isolated.

The method functions are currying functions. Method functions should return functions. The first parameter is `dispatch` which is to operate current namespace's state. The second parameter is `getState` to get current namespace scope state. The returned function will be what you get when use hook function in component.

<details>
<summary>Example</summary>

```js
// `data` is what you passed when you invoke this method in components
export const updateSome = (dispatch, getState) => (data) => {
  const state = getState()
  if (state.sex === 'F') {
    dispatch(data)
  }
}
```
</details>

**applyStore**

To make this namespace work in ReactImmut, you need to apply it into an isolated shared store by:

```js
import * as Some from './store.js'
import { applyStore } from 'react-immut'

const { useStore, connect } = applyStore(Some)

function MyComponent() {
  const [state, { changeName, changeAge }] = useStore()
  // ..
  changeAge(10)
}

const ConnectedComponent = connect(mapStateToProps, mapDispatchToPorps, mergeProps)(MyComponent)
```

**combineStore**

`applyStore` only apply one store, and the state is shared in an isolated scope. `combineStore` allows you to patch several states into an isolated scope.

```js
import { combineStore } from 'react-immut'

const { useAname, useBname, connect } = combineStore({
  Aname,
  Bname,
})
```

The return outputs are like `applyStore`'s, but some difference, hooks functions are named by passed names as here `useAname` `useBname` because we pass `Aname` and `Bname` as keys. The `connect` function is not like `applyStore`'s, you can find all properties of global state in `mapStateToProps`.

**createStore**

On the other hand, namespace state can be registered into global store. In some cases, you need to provide some methods for some special global states, you should give namespace states into second parameter of `createStore` like this:

```js
import * as A from './a.store.js'
import * as B from './b.store.js'

const namespaces = {
  A,
  B,
}

const store = createStore(initState, namespaces) // initState should must be an object
```
*The difference between `combineStore` and `createStore` is `createStore` will ignore namespace `name` property, it will be merged into global state with given property names.*

`namespaces` will be merged into global state, and can be call like this:

```js
import { useStore } from 'react-immut'

function MyComponent() {
  const [stateA, { changeA }] = useStore('A', { store }) // use A, not the `name` property of namespace
  // ...
}
```

Pass `keyPath` into `useStore` to attach `A` namespace, so that you can get namespace methods.

## :smile: useState(initState)

`React.useState` state updating will be lost in state changing collecting, so that we can not replay componet changing. So I provide a `useState` to collect local states.

```js
import { useState } from 'react-immut'

function MyComponent() {
  const [state, dispatch] = useState(0)
  // ...
}
```

Now, we can collect the state changing of `MyComponent` local state.

## Replay

Each `store` has `subscribe` and `dispatch` methods, so we can use them to record and replay state changes.

<details>
<summary>Example</summary>

```js
import { createStore } from 'react-immut'

const store = createStore({})
const records = []

store.subscribe((state) => {
  records.push({ state, time: Date.now() })
})

createReplayer(records, item => item.time).run((item) => {
  store.dispatch(item.state)
})
```
</details>

## :see_no_evil: License

MIT.
