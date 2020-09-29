# REACT IMMUT

React immutable global state management.

## Install

```
npm i react-immut
```

## Usage

```js
import { useStore } from 'react-immut'

function MyComponent() {
  const [state, dispatch] = useStore()
  return <button onClick={() => dispatch(state => { state.some = 'new' })}>{state.some}</button>
}
```

## useStore(keyPath)

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

```js
function MyComponent() {
  const [book, dispatch] = useStore('books[0]')

  const changeName = () => {
    dispatch(book => {
      // book is a part of whole global state, which is read from state.books[0]
      book.price = 12.5
    })
  }
}
```

## Typical Usage

```js
import { createStore, Provider, connect } from 'react-immut'

// Step 1: create a store
const store = createStore({ name: 'Tom' })

// Step 2: wrap with Provider
function App() {
  return (
    <Provider store={store}>
      <div>title</div>
      <MyComponent />
    </Provider>
  )
}

// Step 3: use connect & mapStateToProps & mapDispatchToProps

const mapStateToProps = (state) => {
  const { name } = state
  return { name }
}

const mapDispatchToProps = (dispatch) => {
  const changeName = (newName) => {
    dispatch(state => state.name = newName)
  }
  return { changeName }
}

// Step 4: connect component
export default connect(mapStateToProps, mapDispatchToProps)(MyComponent)

function MyComponent(props) {
  const { name } = props
  return <span>{name}</span>
}
```

### Provider

```
<Provider store? context?>
```

When you did not pass a `store` and `context` it will use default built in store and context.

```jsx
<Provider>
  <App />
</Provider>
```

*Notice: `Provider` in react-immut is optional, you can use `useStore` or `connect` directly (using default global store).*

## dispatch(keyPath?, update)

To change state, you will use `dispatch` method. It receive two parameters:

```ts
dispatch(keyPath?: string|array, update: function)
```

- `keyPath` is optional, it means which state (should must be an object) node you want to change.
- `update` is a function, which receives the state (or picked node) to be modified and returns the new value

```js
// normal usage
dispatch(state => {
  state.name = 'New Name'
})

// with keyPath
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

```js
// magic key=>value
dispatch('books[0].price', 12.4)

// replace whole state
dispatch({ ... })
```


## Async Operation

You can call dispatch directly when you can invoke dispatch.

```js
fetch(url).then(res => res.json()).then(data => dispatch(state => {
  const { name } = data
  state.name = name
}))
```

## Combined Store

In many situations, developers want to split the whole state and put component's files tegother. We provide a way to implement this easily.

```js
// components/a-some/store.js

export const state = {
  name: 'Tom',
  age: 10,
}

export function changeName(dispatch, name) {
  dispatch(state => {
    state.name = name
  })
}

export function changeAge(dispatch, age) {
  dispatch(state => {
    state.age = age
  })
}
```

```js
// app.js

import { createStore } from 'react-immut'
import * as Asome from './components/a-some/store.js' // import this namespace as Asome (its name)

// set namespaces into the second parameter
// the first parameter should be an object or null
const store = createStore(null, {
  Asome,
})

export default function App() {
  return (
    <Provider store={store}>
      ...
    </Provider>
  )
}
```

`Asome` is a namespace, you can use this namespace in a component like this:

```js
// components/a-some/index.jsx

import { connect } from 'react-immut'

const mapStateToProps = (state) => {
  const { Asome } = state // use namespace as a property of state, the state properties are on it
  return { ...Asome }
}

const mapDispatchToProps = (dispatch) => {
  // here dispatch is a function, but defined dispatchers in store.js are patched on it
  const { Asome } = dispatch // use namespace as a property, the methods are on it
  return { ...Asome }
}

export default connect(mapStateToProps, mapDispatchToProps)(Asome)

function Asome(props) {
  const { name, age, changeName, changeAge } = props

  return (
    <>
      <button onClick={() => changeName('new name')}>change name</button>
      <button onClick={() => changeAge(20)}>change age</button>
    </>
  )
}
```

In the previous code block, we use `changeName('new name')` directly the parameter will be passed into defined `changeName` as the second parameter in `store.js`.

`useStore` works:

```js
function Asome(props) {
  const [{ name, age }, { changeName, changeAge }] = useStore('Asome')

  return (
    <>
      <button onClick={() => changeName('new name')}>change name</button>
      <button onClick={() => changeAge(20)}>change age</button>
    </>
  )
}
```

**combine**

```
combine(namespaces, { store?, hooks? })
```

```js
import { combine } from 'react-immut'

const { useAname, useBname } = combine({
  // named namespace
  Aname: {
    state: {}
    fnA() {},
    fnB() {},
  },
  // symbol namespace
  [Symbol('Bname')]: {
    state: {}
    fnA() {},
    fnB() {},
  },
})

function MyComponent() {
  const [stateA, { fnA: A_fnA, fnB: A_fnB }] = useAname()
  const [stateB, { fnA: B_fnA, fnB: B_fnB }] = useBname()
  // ...
}
```

`hooks` parameter default is `true`, if you set it to be `false`, you will get a `connect` function:

```js
const connect = combine({
  Aname: {
    state: {}
    fnA() {},
    fnB() {},
  },
  Bname: {
    state: {}
    fnA() {},
    fnB() {},
  },
}, {
  // store, // use you use a custom store, you should must pass this parameter
  hooks: false, // notice here
})

const mapStateToProps = (state) => {
  const { Aname, Bname } = state
  return {
    Aname,
    Bname,
  }
}

const mapDispatchToProps = (dispatch) => {
  const { Aname, Bname } = dispatch
  const { fnA: A_fnA, fnB: A_fnB } = Aname
  const { fnA: B_fnA, fnB: B_fnB } = Bname

  return {
    A_fnA,
    A_fnB,
    B_fnA,
    B_fnB,
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(MyComponent)

function MyComponent(props) {
  const {
    Aname,
    Bname,
    A_fnA,
    A_fnB,
    B_fnA,
    B_fnB,
  } = props
  // ...
}
```

Namespaces are registered into global state, you can reuse them again by using `useStore`:

```js
import { combine, useStore } from 'react-immut'

combine({
  Aname: {
    state: {}
    fnA() {},
    fnB() {},
  },
  Bname: {
    state: {}
    fnA() {},
    fnB() {},
  },
})

function MyComponent() {
  const [stateA, { fnA: A_fnA, fnB: A_fnB }] = useStore('Aname')
  const [stateB, { fnA: B_fnA, fnB: B_fnB }] = useStore('Bname')
  // ...
}
```

## License

MIT.
